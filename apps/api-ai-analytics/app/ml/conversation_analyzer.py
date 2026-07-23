"""LLM-powered conversation analysis with heuristic fallbacks."""

import re
import logging
from app.lib.groq_client import GroqClient, GroqClientError

logger = logging.getLogger(__name__)


class ConversationAnalyzer:
    """LLM-powered conversation analysis methods."""

    def __init__(self, groq_client: GroqClient) -> None:
        self._groq_client = groq_client

    async def analyze_message(self, text: str, sender_role: str) -> dict:
        """Analyze a single message for sentiment and escalation risk."""
        if sender_role != "customer":
            return {
                "sentiment": "neutral",
                "sentiment_score": 0.0,
                "escalation_flag": False,
                "reason": "Agent message, skipped escalation evaluation.",
            }

        system_prompt = (
            "You are a customer experience assistant analyzing a message. "
            "Analyze the sentiment and check if the customer is expressing severe frustration, "
            "threatening to cancel, demanding a manager, or raising legal issues. "
            "Return a JSON object with exactly these fields: "
            "'sentiment' (must be 'positive', 'neutral', or 'negative'), "
            "'sentiment_score' (float between -1.0 and 1.0), "
            "'escalation_flag' (boolean, true if severe frustration or escalation triggers are met), "
            "'reason' (brief explanation of your decision)."
        )
        user_prompt = f"Customer message: {text}"

        try:
            res = await self._groq_client.analyze(system_prompt, user_prompt)
            if res.get("sentiment") not in ["positive", "neutral", "negative"]:
                res["sentiment"] = "neutral"
            res["sentiment_score"] = float(res.get("sentiment_score", 0.0))
            res["escalation_flag"] = bool(res.get("escalation_flag", False))
            return res
        except (GroqClientError, Exception) as e:
            logger.warning("Groq message analysis failed, falling back to heuristics: %s", e)
            return self._heuristic_analyze_message(text)

    def _heuristic_analyze_message(self, text: str) -> dict:
        text_lower = text.lower()
        
        # Escalation keywords
        escalation_words = ["manager", "supervisor", "cancel", "refund", "chargeback", "sue", "legal", "lawyer", "worst", "scam"]
        escalation_flag = any(w in text_lower for w in escalation_words)

        # Sentiment keywords
        negative_words = ["angry", "upset", "terrible", "awful", "unacceptable", "broken", "worst", "fail", "slow", "poor"]
        positive_words = ["great", "awesome", "thanks", "thank you", "perfect", "good", "love", "helpful"]

        neg_count = sum(1 for w in negative_words if w in text_lower)
        pos_count = sum(1 for w in positive_words if w in text_lower)

        if neg_count > pos_count:
            sentiment = "negative"
            sentiment_score = -0.5
        elif pos_count > neg_count:
            sentiment = "positive"
            sentiment_score = 0.5
        else:
            sentiment = "neutral"
            sentiment_score = 0.0

        if escalation_flag:
            sentiment = "negative"
            sentiment_score = min(sentiment_score, -0.6)

        return {
            "sentiment": sentiment,
            "sentiment_score": sentiment_score,
            "escalation_flag": escalation_flag,
            "reason": "Fallback heuristic analysis.",
        }

    async def summarize_conversation(self, messages: list[str]) -> dict:
        """Summarize conversation history using LLM."""
        if not messages:
            return {
                "summary": "No messages in conversation.",
                "key_points": [],
                "resolved": False,
            }

        system_prompt = (
            "You are a customer support summarizer. "
            "Generate an executive summary and key takeaways from the conversation. "
            "Determine if the issue discussed has been resolved. "
            "Return a JSON object with exactly these fields: "
            "'summary' (string), "
            "'key_points' (array of strings), "
            "'resolved' (boolean)."
        )
        user_prompt = "Conversation History:\n" + "\n".join(messages)

        try:
            res = await self._groq_client.analyze(system_prompt, user_prompt)
            res["resolved"] = bool(res.get("resolved", False))
            if not isinstance(res.get("key_points"), list):
                res["key_points"] = []
            return res
        except (GroqClientError, Exception) as e:
            logger.warning("Groq conversation summarization failed: %s", e)
            return {
                "summary": f"Conversation contains {len(messages)} messages.",
                "key_points": ["Could not generate detailed summary via AI."],
                "resolved": False,
            }

    async def suggest_replies(self, messages: list[str]) -> list[dict]:
        """Suggest quick reply actions for the agent."""
        if not messages:
            return [
                {"text": "Hello, how can I help you today?", "confidence": 0.90}
            ]

        system_prompt = (
            "You are an assistant suggesting agent quick replies. "
            "Suggest exactly 2 helpful quick reply options based on the conversation history. "
            "Return a JSON object with exactly one field: "
            "'suggestions' (array of objects, each containing: 'text' (string) and 'confidence' (float between 0.0 and 1.0))."
        )
        user_prompt = "Conversation History:\n" + "\n".join(messages)

        try:
            res = await self._groq_client.analyze(system_prompt, user_prompt)
            suggestions = res.get("suggestions", [])
            if not isinstance(suggestions, list):
                suggestions = []
            return suggestions[:3]
        except (GroqClientError, Exception) as e:
            logger.warning("Groq reply suggestion failed: %s", e)
            return [
                {"text": "I am looking into that for you right now.", "confidence": 0.80},
                {"text": "Could you provide your order number please?", "confidence": 0.70},
            ]

    async def detect_intent(self, text: str) -> dict:
        """Detect customer intent from message."""
        system_prompt = (
            "You are an intent classifier. "
            "Detect the primary intent of the customer. "
            "Intents could be: 'track_order', 'cancel_order', 'billing_issue', 'refund_request', 'general_inquiry'. "
            "Return a JSON object with exactly these fields: "
            "'intent' (string), "
            "'confidence' (float between 0.0 and 1.0)."
        )
        user_prompt = f"Message: {text}"

        try:
            res = await self._groq_client.analyze(system_prompt, user_prompt)
            res["confidence"] = float(res.get("confidence", 0.70))
            return res
        except (GroqClientError, Exception) as e:
            logger.warning("Groq intent detection failed: %s", e)
            return self._heuristic_detect_intent(text)

    def _heuristic_detect_intent(self, text: str) -> dict:
        text_lower = text.lower()
        if any(w in text_lower for w in ["track", "status", "where is my", "shipped"]):
            return {"intent": "track_order", "confidence": 0.75}
        if any(w in text_lower for w in ["cancel", "stop"]):
            return {"intent": "cancel_order", "confidence": 0.70}
        if any(w in text_lower for w in ["refund", "return", "money back"]):
            return {"intent": "refund_request", "confidence": 0.80}
        if any(w in text_lower for w in ["bill", "charge", "invoice", "payment"]):
            return {"intent": "billing_issue", "confidence": 0.70}
        return {"intent": "general_inquiry", "confidence": 0.50}

    async def extract_entities(self, text: str) -> list[dict]:
        """Extract entities like order numbers, emails, product names."""
        system_prompt = (
            "You are an entity extractor. "
            "Extract entities from the customer text. "
            "Return a JSON object with exactly one field: "
            "'entities' (array of objects, each containing: 'entity_type' (must be 'order_number', 'product_name', 'email', or 'phone'), 'value' (string))."
        )
        user_prompt = f"Text: {text}"

        try:
            res = await self._groq_client.analyze(system_prompt, user_prompt)
            entities = res.get("entities", [])
            if not isinstance(entities, list):
                entities = []
            return entities
        except (GroqClientError, Exception) as e:
            logger.warning("Groq entity extraction failed: %s", e)
            return self._heuristic_extract_entities(text)

    def _heuristic_extract_entities(self, text: str) -> list[dict]:
        entities = []
        # Order numbers e.g. OOS-123456 or similar
        orders = re.findall(r'\b[a-zA-Z0-9]+-\d+\b|\b\d{6,8}\b', text)
        for order in orders:
            if "OOS" in order.upper() or "-" in order:
                entities.append({"entity_type": "order_number", "value": order})
        
        # Emails
        emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
        for email in emails:
            entities.append({"entity_type": "email", "value": email})

        return entities
