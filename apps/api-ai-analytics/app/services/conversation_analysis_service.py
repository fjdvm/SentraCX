"""Conversation Analysis service."""

import uuid
from datetime import datetime, timezone
import httpx

from app.lib.crm_client import CrmClient
from app.ml.conversation_analyzer import ConversationAnalyzer
from app.repositories.redis.conversation_cache_repository import ConversationCacheRepository
from app.repositories.mongo.conversation_transcript_repository import ConversationTranscriptRepository
from app.models.ticket_models import ConversationMessage


class ConversationAnalysisService:
    """Orchestrates real-time conversation analysis, intent, and summarization."""

    def __init__(
        self,
        crm_client: CrmClient,
        analyzer: ConversationAnalyzer,
        cache_repo: ConversationCacheRepository,
        mongo_repo: ConversationTranscriptRepository,
        settings=None,
    ) -> None:
        self._crm = crm_client
        self._analyzer = analyzer
        self._cache = cache_repo
        self._mongo = mongo_repo
        from app.core.config import get_settings
        self._settings = settings or get_settings()

    async def analyze_message(self, ticket_id: str, text: str, sender_role: str) -> dict:
        """Analyze message for sentiment and escalation, appending it to the history."""
        # 1. Run ML analysis
        analysis = await self._analyzer.analyze_message(text, sender_role)

        # 2. Append message to MongoDB ConversationTranscripts
        msg = ConversationMessage(
            message_id=str(uuid.uuid4()),
            sender_id=sender_role,
            content=text,
            sent_at=datetime.now(timezone.utc),
        )
        await self._mongo.append_message(ticket_id, msg)

        # 3. Invalidate cached summary/replies
        await self._cache.invalidate(ticket_id)

        return analysis

    async def get_summary(self, ticket_id: str) -> dict:
        """Retrieve conversation summary, using cache when possible."""
        cached = await self._cache.get_summary(ticket_id)
        if cached:
            return cached

        # Fetch message history from CRM
        messages_data = await self._crm.get_ticket_messages(ticket_id)
        messages = [
            f"{'Agent' if m.get('senderId') != 'customer' else 'Customer'}: {m.get('content')}"
            for m in messages_data
            if "content" in m
        ]

        summary_data = await self._analyzer.summarize_conversation(messages)
        summary_data["computed_at"] = datetime.now(timezone.utc).isoformat()

        await self._cache.set_summary(ticket_id, summary_data)
        return summary_data

    async def suggest_replies(self, ticket_id: str) -> list[dict]:
        """Suggest quick responses for the agent, using cache when possible."""
        cached = await self._cache.get_suggested_replies(ticket_id)
        if cached:
            return cached

        messages_data = await self._crm.get_ticket_messages(ticket_id)
        messages = [
            f"{'Agent' if m.get('senderId') != 'customer' else 'Customer'}: {m.get('content')}"
            for m in messages_data
            if "content" in m
        ]

        replies = await self._analyzer.suggest_replies(messages)

        await self._cache.set_suggested_replies(ticket_id, replies)
        return replies

    async def detect_intent(self, text: str) -> dict:
        """Detect intent of customer message."""
        return await self._analyzer.detect_intent(text)

    async def get_entities(self, ticket_id: str) -> list[dict]:
        """Extract key entities from conversation history and cross-reference with OOS."""
        messages_data = await self._crm.get_ticket_messages(ticket_id)
        text = "\n".join([m.get("content", "") for m in messages_data])

        entities = await self._analyzer.extract_entities(text)

        # Cross-reference order numbers with OOS
        for ent in entities:
            if ent["entity_type"] == "order_number":
                order_num = ent["value"]
                ent["meta"] = {"exists_in_oos": False, "status": "unknown"}
                if self._settings.oos_api_base_url:
                    try:
                        url = f"{self._settings.oos_api_base_url}/api/v1/orders/{order_num}"
                        headers = {}
                        if self._settings.oos_service_token:
                            headers["Authorization"] = f"Bearer {self._settings.oos_service_token}"
                        async with httpx.AsyncClient(timeout=3.0) as client:
                            response = await client.get(url, headers=headers)
                            if response.status_code == 200:
                                order_data = response.json()
                                ent["meta"] = {
                                    "exists_in_oos": True,
                                    "status": order_data.get("status", "pending"),
                                }
                    except Exception:
                        pass
        return entities
