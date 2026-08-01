"""Seeder and helper utility class for forecast data backfilling."""

from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.ml import churn_model, clv_model
from app.lib.crm_client import CrmClient
from app.helpers.customer_feature_seeder import ensure_customer_features_seeded


class ForecastSeeder:
    """Handles seeding of features, churn, clv, and sentiment data from CRM."""

    def __init__(self, database: AsyncIOMotorDatabase, crm_client: CrmClient | None) -> None:
        self._db = database
        self._crm = crm_client

    async def get_clvs_by_segment(self) -> dict[str, list[float]]:
        """Calculate and group CLVs by segment from MongoDB or seed if empty."""
        pipeline = [
            {"$sort": {"recorded_at": -1}},
            {
                "$group": {
                    "_id": "$customer_id",
                    "latest_features": {"$first": "$features"},
                }
            },
        ]
        clvs_by_segment = {"High-Value": [], "Regular": [], "New": [], "At-Risk": []}
        has_data = False
        try:
            cursor = self._db["customer_feature_logs"].aggregate(pipeline)
            async for doc in cursor:
                feat = doc.get("latest_features")
                if feat:
                    has_data = True
                    clv = clv_model.predict(feat)
                    orders = feat.get("total_orders", 0)
                    value = feat.get("total_order_value", 0.0)
                    churn = churn_model.predict(feat)
                    if churn > 0.6:
                        segment = "At-Risk"
                    elif orders >= 5 or value >= 1000:
                        segment = "High-Value"
                    elif orders <= 1:
                        segment = "New"
                    else:
                        segment = "Regular"
                    clvs_by_segment[segment].append(clv)
        except Exception:
            pass

        if not has_data and self._crm:
            await ensure_customer_features_seeded(self._db, self._crm, min_count=1)
            return await self.get_clvs_by_segment()

        for seg, vals in clvs_by_segment.items():
            if not vals:
                clvs_by_segment[seg] = [0.0]
        return clvs_by_segment

    async def seed_sentiment_from_crm(self) -> None:
        """Seed conversation transcripts sentiment scores by querying CRM tickets."""
        if not self._crm:
            return
        tickets = await self._crm.get_tickets(page_size=50)
        for ticket in tickets:
            ticket_id = ticket.get("id")
            if not ticket_id:
                continue
            messages = await self._crm.get_ticket_messages(ticket_id)
            if not messages:
                continue
            
            sentiment_score = 0.0
            msg_texts = [str(m.get("content", "")).lower() for m in messages]
            positive_words = ["thanks", "thank you", "great", "helpful", "resolved", "solved", "good"]
            negative_words = ["broken", "error", "fail", "slow", "bad", "terrible", "issue", "problem"]
            
            pos_count = sum(1 for text in msg_texts for w in positive_words if w in text)
            neg_count = sum(1 for text in msg_texts for w in negative_words if w in text)
            
            if pos_count + neg_count > 0:
                sentiment_score = (pos_count - neg_count) / (pos_count + neg_count)
            
            doc = {
                "crms_ticket_id": ticket_id,
                "sentiment_score": round(sentiment_score, 2),
                "analyzed_at": datetime.now(timezone.utc),
                "predicted_category": "general_inquiry"
            }
            await self._db["ConversationTranscripts"].insert_one(doc)
