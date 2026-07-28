"""Chatbot Service for handling bot-first flow and FAQ replies."""

import logging
import re
from datetime import datetime, timezone
from app.lib.oos_client import OosClient
from app.ml.conversation_analyzer import ConversationAnalyzer
from app.lib.groq_client import GroqClient, GroqClientError

logger = logging.getLogger(__name__)


class ChatbotService:
    """Orchestrates chatbot reply logic, intent detection, and escalation triggers."""

    def __init__(
        self,
        oos_client: OosClient,
        analyzer: ConversationAnalyzer,
        groq_client: GroqClient,
        settings=None,
    ) -> None:
        self._oos_client = oos_client
        self._analyzer = analyzer
        self._groq_client = groq_client
        from app.core.config import get_settings
        self._settings = settings or get_settings()

    async def reply(
        self,
        message: str,
        customer_id: str | None = None,
        ticket_id: str | None = None,
        conversation_history: list[dict] | None = None,
    ) -> dict:
        """Process customer message and return appropriate chatbot response."""
        conversation_history = conversation_history or []

        # 1. Detect Intent
        intent_res = await self._analyzer.detect_intent(message)
        intent = intent_res.get("intent", "general_inquiry")
        confidence = intent_res.get("confidence", 0.70)

        # 2. Check for explicit or low-confidence escalation trigger
        confidence_threshold = getattr(self._settings, "confidence_threshold_sentiment", 0.60)
        should_escalate = False
        bot_summary = None

        # Check message content for direct escalation indicators (using ML analyzer check if possible)
        analysis = await self._analyzer.analyze_message(message, "customer")
        if analysis.get("escalation_flag") or confidence < confidence_threshold or intent == "escalate":
            should_escalate = True
            intent = "escalate"

        # 3. Generate response based on intent and authentication status
        reply_text = ""

        if should_escalate:
            reply_text = "I am connecting you with a live support agent right now. Please hold."
            bot_summary = await self.generate_bot_summary(message, conversation_history)

        elif intent == "track_order":
            if not customer_id:
                reply_text = "Please log in to track your orders."
                intent = "account_specific"
            else:
                reply_text = await self._handle_track_order(customer_id, message)

        elif intent in ("cancel_order", "billing_issue", "refund_request"):
            if not customer_id:
                reply_text = "Please log in to manage your account or request refunds/cancellations."
                intent = "account_specific"
            else:
                # Sensitive actions escalate immediately
                should_escalate = True
                reply_text = f"I've categorized this as a {intent.replace('_', ' ')}. I'll connect you with a live agent to assist you."
                intent = "escalate"
                bot_summary = await self.generate_bot_summary(message, conversation_history)

        else:
            # Check for general FAQ questions via heuristics
            faq_reply = self._handle_faq_heuristics(message)
            if faq_reply:
                reply_text = faq_reply
                intent = "faq"
            else:
                # LLM response
                reply_text = await self._generate_llm_reply(message, conversation_history)

        return {
            "reply": reply_text,
            "intent": intent,
            "should_escalate": should_escalate,
            "confidence": confidence,
            "bot_summary": bot_summary,
        }

    async def _handle_track_order(self, customer_id: str, message: str) -> str:
        """Fetch order status from OOS API and generate a tracking response."""
        # Check if there is an order number/id in the message using regex (e.g. UUID format or digits)
        order_match = re.search(r"order\s*#?\s*([a-fA-F0-9\-]{8,36})", message, re.IGNORECASE)
        if order_match:
            order_id = order_match.group(1)
            try:
                order = await self._oos_client.get_order(order_id)
                if order:
                    status = order.get("status", "unknown")
                    total = order.get("total_amount", 0.0)
                    ord_num = order.get("order_number", order_id)
                    return f"Your order #{ord_num} status is: {status}. Total: ${total:.2f}."
            except Exception as e:
                logger.error("Error looking up order by id: %s", e)

        # Fallback: List recent orders
        try:
            orders = await self._oos_client.get_orders()
            # Filter orders by customer ID
            user_orders = [o for o in orders if str(o.get("customer_id")) == str(customer_id)]
            if not user_orders:
                return "We couldn't find any orders for your account."
            
            # Sort by ordered_at or equivalent descending
            user_orders.sort(key=lambda o: o.get("ordered_at", ""), reverse=True)
            latest = user_orders[0]
            status = latest.get("status", "unknown")
            total = latest.get("total_amount", 0.0)
            ord_num = latest.get("order_number", latest.get("id"))
            return f"Your most recent order #{ord_num} status is: {status}. Total: ${total:.2f}."
        except Exception as e:
            logger.error("Error looking up customer orders: %s", e)
            return "I'm having trouble fetching your order history right now. Please try again later."

    def _handle_faq_heuristics(self, message: str) -> str | None:
        """Handle common FAQ queries via simple heuristics."""
        text = message.lower()
        if any(w in text for w in ["hours", "open", "time"]):
            return "Our online store is open 24/7. Customer support agents are available Monday to Friday from 9 AM to 5 PM."
        if any(w in text for w in ["shipping", "delivery", "cost", "ship"]):
            return "We offer standard shipping (3-5 business days) and express shipping (1-2 business days). Shipping costs are calculated at checkout."
        if any(w in text for w in ["return", "refund policy", "policy"]):
            return "You can return any product within 30 days of purchase for a full refund. The item must be in its original packaging."
        return None

    async def _generate_llm_reply(self, message: str, history: list[dict]) -> str:
        """Generate chatbot reply using Groq LLM."""
        system_prompt = (
            "You are a friendly customer service virtual assistant. "
            "Answer the customer's query politely. "
            "Keep your response concise (under 3 sentences)."
        )
        
        # Build context from recent history
        formatted_history = []
        for entry in history[-5:]:  # Last 5 exchanges
            role = entry.get("role")
            role_name = "Customer" if role == "customer" else "Assistant"
            formatted_history.append(f"{role_name}: {entry.get('content')}")
            
        user_prompt = ""
        if formatted_history:
            user_prompt += "Previous conversation:\n" + "\n".join(formatted_history) + "\n\n"
        user_prompt += f"Customer message: {message}"

        try:
            res = await self._groq_client.analyze(system_prompt, user_prompt)
            return res.get("reply", res.get("response", "How can I help you today?"))
        except (GroqClientError, Exception) as e:
            logger.warning("Groq chatbot reply failed, falling back to static fallback: %s", e)
            return "Thank you for your message. How can I assist you further?"

    async def generate_bot_summary(self, latest_message: str, history: list[dict]) -> str:
        """Generate a text summary of the bot conversation history for escalation context."""
        summary_lines = []
        for entry in history:
            role = "Customer" if entry.get("role") == "customer" else "Bot"
            summary_lines.append(f"{role}: {entry.get('content')}")
        summary_lines.append(f"Customer (latest): {latest_message}")
        
        history_str = "\n".join(summary_lines)
        
        system_prompt = (
            "You are a customer service assistant. Summarize the conversation history between "
            "the customer and the virtual assistant. Provide a brief 1-2 sentence summary of "
            "the customer's issue and what the bot has suggested so far."
        )
        
        try:
            res = await self._groq_client.analyze(system_prompt, f"Conversation history:\n{history_str}")
            return res.get("summary", res.get("response", f"Customer asked: {latest_message}"))
        except Exception:
            return f"Bot conversation ended at {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}. Latest message: {latest_message}"
