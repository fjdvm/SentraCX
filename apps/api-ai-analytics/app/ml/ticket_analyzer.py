"""Ticket analyzer ML module."""

import logging
from app.lib.groq_client import GroqClient, GroqClientError

logger = logging.getLogger(__name__)

class TicketAnalyzer:
    """LLM-powered ticket analysis with heuristic fallback."""

    def __init__(self, groq_client: GroqClient) -> None:
        self._groq_client = groq_client
        self._categories = [
            "billing", "shipping", "technical_issue", "complaint", 
            "refund_request", "general_inquiry", "product_quality", "account_issue"
        ]
        self._system_prompt = (
            "You are a customer support ticket analyzer. "
            "Analyze the following ticket title, description, and message history. "
            "Return a JSON object with exactly these fields: "
            "'sentiment' (must be 'positive', 'neutral', or 'negative'), "
            "'sentiment_score' (float between -1.0 and 1.0), "
            f"'category' (must be one of: {', '.join(self._categories)}), "
            "'urgency_score' (float between 0.0 and 1.0), "
            "'confidence' (float between 0.0 and 1.0, reflecting your confidence in these classifications), "
            "'reasoning' (a brief explanation of your analysis)."
        )

    async def analyze(self, title: str, description: str, messages: list[str]) -> dict:
        """Analyze ticket using Groq LLM, fallback to heuristics on error."""
        user_prompt = f"Title: {title}\nDescription: {description}\n"
        if messages:
            user_prompt += "Messages:\n" + "\n".join(f"- {msg}" for msg in messages)

        try:
            result = await self._groq_client.analyze(self._system_prompt, user_prompt)
            # Basic validation
            if result.get("sentiment") not in ["positive", "neutral", "negative"]:
                result["sentiment"] = "neutral"
            if result.get("category") not in self._categories:
                result["category"] = "general_inquiry"
            try:
                result["confidence"] = max(0.0, min(1.0, float(result.get("confidence", 0.8))))
            except (ValueError, TypeError):
                result["confidence"] = 0.8
            return result
        except GroqClientError as e:
            logger.warning("Groq analysis failed, using fallback: %s", e)
            return self._heuristic_analyze(title, description, messages)

    def _heuristic_analyze(self, title: str, description: str, messages: list[str]) -> dict:
        """Fallback analysis using keywords."""
        text = f"{title} {description} {' '.join(messages)}".lower()
        
        # Category heuristics
        category = "general_inquiry"
        if any(w in text for w in ["bill", "charge", "invoice", "payment", "card"]):
            category = "billing"
        elif any(w in text for w in ["shipping", "delivery", "track", "package", "arrived"]):
            category = "shipping"
        elif any(w in text for w in ["bug", "error", "crash", "login", "password"]):
            category = "technical_issue"
        elif any(w in text for w in ["refund", "money back", "return"]):
            category = "refund_request"
        elif any(w in text for w in ["broken", "terrible", "awful", "unacceptable"]):
            category = "complaint"
            
        # Sentiment heuristics
        negative_words = ["angry", "upset", "terrible", "awful", "unacceptable", "broken", "worst", "fail"]
        positive_words = ["great", "awesome", "thanks", "thank you", "perfect", "good", "love"]
        
        neg_count = sum(1 for w in negative_words if w in text)
        pos_count = sum(1 for w in positive_words if w in text)
        
        if neg_count > pos_count:
            sentiment = "negative"
            sentiment_score = -0.5 - (min(neg_count, 5) * 0.1)
        elif pos_count > neg_count:
            sentiment = "positive"
            sentiment_score = 0.5 + (min(pos_count, 5) * 0.1)
        else:
            sentiment = "neutral"
            sentiment_score = 0.0
            
        # Urgency heuristics
        urgency_score = 0.5
        if any(w in text for w in ["urgent", "asap", "emergency", "immediately"]):
            urgency_score = 0.9
        elif sentiment == "negative":
            urgency_score = 0.7
            
        # Confidence heuristics
        cat_confidence = 0.75 if category != "general_inquiry" else 0.40
        sent_confidence = 0.70 if sentiment != "neutral" else 0.50
        confidence = round((cat_confidence + sent_confidence) / 2.0, 2)
            
        return {
            "sentiment": sentiment,
            "sentiment_score": round(sentiment_score, 2),
            "category": category,
            "urgency_score": round(urgency_score, 2),
            "confidence": confidence,
            "reasoning": "Fallback heuristic analysis."
        }

    async def generate_smart_reply(self, title: str, description: str, messages: list[str]) -> str:
        """Generate a contextual smart reply for the agent to use."""
        system_prompt = (
            "You are a helpful customer support AI. "
            "Suggest a concise, professional, and helpful reply (under 3 sentences) that the support agent can send to the customer based on the conversation history. "
            "Return a JSON object with exactly one field: 'smart_reply' containing your reply."
        )
        user_prompt = f"Ticket Title: {title}\nDescription: {description}\n"
        if messages:
            user_prompt += "Messages:\n" + "\n".join(f"- {msg}" for msg in messages)
            
        try:
            result = await self._groq_client.analyze(system_prompt, user_prompt)
            return result.get("smart_reply", "I'm looking into your issue now.")
        except GroqClientError as e:
            logger.warning("Groq smart reply failed: %s", e)
            return "I'm currently reviewing your request and will get back to you shortly."
