"""Ticket analysis service."""

from datetime import datetime, timezone, timedelta
import time
import random
from app.lib.crm_client import CrmClient
from app.ml.ticket_analyzer import TicketAnalyzer
from app.repositories.redis.ticket_sentiment_repository import TicketSentimentRepository
from app.repositories.mongo.conversation_transcript_repository import ConversationTranscriptRepository
from app.schemas.ticket_schemas import TicketAnalysisRequest, TicketAnalysisResponse

class TicketNotFoundError(Exception):
    """Raised when a ticket is not found in the CRM."""
    pass

class CrmUnavailableError(Exception):
    """Raised when the CRM API is unavailable."""
    pass

class TicketAnalysisService:
    """Service for analyzing ticket sentiment, category, and urgency."""

    def __init__(
        self,
        crm_client: CrmClient,
        analyzer: TicketAnalyzer,
        redis_repo: TicketSentimentRepository,
        mongo_repo: ConversationTranscriptRepository,
        settings = None
    ) -> None:
        self._crm_client = crm_client
        self._analyzer = analyzer
        self._redis_repo = redis_repo
        self._mongo_repo = mongo_repo
        from app.core.config import get_settings
        self._settings = settings or get_settings()

    def _apply_thresholds(self, sentiment: str, category: str, confidence: float) -> tuple[str, str]:
        """Apply confidence thresholds to sentiment and category."""
        final_sentiment = sentiment
        final_category = category

        if confidence < self._settings.confidence_threshold_sentiment:
            final_sentiment = "neutral"
        if confidence < self._settings.confidence_threshold_ticket:
            final_category = "Uncategorized"

        return final_sentiment, final_category

    async def analyze_ticket(self, request: TicketAnalysisRequest) -> TicketAnalysisResponse:
        """Run analysis on a ticket, using cache if available."""
        if not request.ticket_id:
            raise ValueError("ticket_id is required")
            
        ticket_id = request.ticket_id

        # 1. Check Redis cache
        cached = await self._redis_repo.get_cached_analysis(ticket_id)
        if cached:
            confidence = cached.get("confidence", 1.0)
            final_sentiment, final_category = self._apply_thresholds(
                cached["sentiment"], cached["predicted_category"], confidence
            )
            return TicketAnalysisResponse(
                ticket_id=ticket_id,
                sentiment=final_sentiment,
                sentiment_score=cached["sentiment_score"],
                predicted_category=final_category,
                urgency_score=cached["urgency_score"],
                confidence=confidence,
                reasoning=cached.get("reasoning", ""),
                computed_at=datetime.fromisoformat(cached["analyzed_at"]),
                cached=True
            )

        # 2. Fetch ticket from CRM
        try:
            ticket = await self._crm_client.get_ticket(ticket_id)
        except Exception as e:
            raise CrmUnavailableError("CRM is unavailable") from e
            
        if ticket is None:
            raise TicketNotFoundError(f"Ticket {ticket_id} not found")

        # 3. Fetch messages from CRM
        messages = []
        if request.include_messages:
            try:
                messages_data = await self._crm_client.get_ticket_messages(ticket_id)
                messages = [msg["content"] for msg in messages_data if "content" in msg]
            except Exception as e:
                raise CrmUnavailableError("CRM is unavailable") from e

        title = ticket.get("title", "")
        description = ticket.get("description", "")
        if request.text:
            description += "\n" + request.text

        # 5. Run analysis
        analysis = await self._analyzer.analyze(title, description, messages)
        
        # 6. Cache full result
        timestamp = time.time()
        analyzed_at = datetime.fromtimestamp(timestamp, timezone.utc)
        
        cache_data = {
            "sentiment": analysis["sentiment"],
            "sentiment_score": analysis["sentiment_score"],
            "predicted_category": analysis["category"],
            "urgency_score": analysis["urgency_score"],
            "confidence": analysis.get("confidence", 1.0),
            "reasoning": analysis.get("reasoning", ""),
            "analyzed_at": analyzed_at.isoformat(),
        }
        await self._redis_repo.set_cached_analysis(ticket_id, cache_data, ttl=3600)

        # 7. Add sentiment score to Redis Sorted Set
        await self._redis_repo.add_sentiment_score(ticket_id, analysis["sentiment_score"], timestamp)

        # 8. Save to MongoDB
        transcript_text = f"Title: {title}\nDescription: {description}\n"
        if messages:
            transcript_text += "Messages:\n" + "\n".join(f"- {msg}" for msg in messages)
            
        from app.core.config import get_settings
        settings = get_settings()
        mongo_data = {
            "full_transcript_text": transcript_text,
            "sentiment": analysis["sentiment"],
            "sentiment_score": analysis["sentiment_score"],
            "predicted_category": analysis["category"],
            "urgency_score": analysis["urgency_score"],
            "confidence": analysis.get("confidence", 1.0),
            "reasoning": analysis.get("reasoning", ""),
            "model_version_sentiment": settings.model_version_sentiment,
            "model_version_category": settings.model_version_category,
        }
        await self._mongo_repo.save_analysis(ticket_id, mongo_data)

        # 9. Return response with thresholds applied
        confidence = analysis.get("confidence", 1.0)
        final_sentiment, final_category = self._apply_thresholds(
            analysis["sentiment"], analysis["category"], confidence
        )
        return TicketAnalysisResponse(
            ticket_id=ticket_id,
            sentiment=final_sentiment,
            sentiment_score=analysis["sentiment_score"],
            predicted_category=final_category,
            urgency_score=analysis["urgency_score"],
            confidence=confidence,
            reasoning=analysis.get("reasoning", ""),
            computed_at=analyzed_at,
            cached=False
        )

    async def get_resolution_estimate(self, ticket_id: str) -> dict:
        """Estimate hours to resolve a ticket based on category."""
        # Check cache or run analysis to determine category
        analysis_data = await self._redis_repo.get_cached_analysis(ticket_id)
        if not analysis_data:
            req = TicketAnalysisRequest(ticket_id=ticket_id, include_messages=True)
            res = await self.analyze_ticket(req)
            category = res.predicted_category
            confidence = res.confidence
        else:
            category = analysis_data.get("predicted_category", "general_inquiry")
            confidence = analysis_data.get("confidence", 0.8)

        estimates = {
            "billing": 4.0,
            "shipping": 24.0,
            "technical_issue": 8.0,
            "complaint": 12.0,
            "refund_request": 6.0,
            "general_inquiry": 2.0,
            "product_quality": 16.0,
            "account_issue": 5.0,
        }
        
        hours = estimates.get(category, 4.5)
        return {
            "estimated_hours": hours,
            "confidence": confidence,
        }

    async def get_volume_forecast(self, range_val: str) -> dict:
        """Forecast future ticket volumes."""
        days = 30 if range_val == "30d" else 7
        now = datetime.now(timezone.utc)
        
        # Calculate historical daily average from MongoDB transcripts
        pipeline = [
            {
                "$match": {
                    "analyzed_at": {
                        "$gte": now - timedelta(days=90)
                    }
                }
            },
            {
                "$group": {
                    "_id": {
                        "$dateToString": {
                            "format": "%Y-%m-%d",
                            "date": "$analyzed_at"
                        }
                    },
                    "count": {"$sum": 1}
                }
            }
        ]
        
        avg_daily = 15.0
        try:
            cursor = self._mongo_repo._collection.aggregate(pipeline)
            counts = []
            async for doc in cursor:
                counts.append(doc["count"])
            if counts:
                avg_daily = sum(counts) / len(counts)
        except Exception:
            pass

        series = []
        threshold = 25.0
        alert_triggered = False
        
        for i in range(1, days + 1):
            future_date = now + timedelta(days=i)
            # Add slight variance
            val = avg_daily * (1.0 + (random.random() - 0.5) * 0.2)
            val = round(max(val, 0.0), 1)
            series.append({
                "timestamp": future_date,
                "value": val
            })
            if val > threshold:
                alert_triggered = True

        return {
            "forecast_series": series,
            "threshold": threshold,
            "alert_triggered": alert_triggered,
        }

