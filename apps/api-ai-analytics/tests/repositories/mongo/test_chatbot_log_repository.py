"""Tests for ChatbotLogRepository."""

from datetime import datetime, timezone
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.repositories.mongo.chatbot_log_repository import ChatbotLogRepository
from app.schemas.chatbot_log_schemas import ChatbotLogDocument


@pytest.fixture
def mock_db():
    db = MagicMock()
    collection = MagicMock()
    db.__getitem__.return_value = collection
    return db, collection


async def test_insert_chatbot_log(mock_db):
    db, collection = mock_db
    collection.insert_one = AsyncMock()

    repo = ChatbotLogRepository(db)
    log_doc = ChatbotLogDocument(
        ticket_id="ticket-123",
        customer_id="cust-456",
        message="Hello",
        reply="Hi there",
        intent="general_inquiry",
        should_escalate=False,
        confidence=0.9,
        bot_summary=None,
        created_at=datetime.now(timezone.utc),
    )

    await repo.insert(log_doc)
    collection.insert_one.assert_called_once()


async def test_list_chatbot_logs(mock_db):
    db, collection = mock_db

    class AsyncCursorMock:
        def __init__(self, items):
            self.items = items

        def sort(self, *args, **kwargs):
            return self

        def skip(self, *args, **kwargs):
            return self

        def limit(self, *args, **kwargs):
            return self

        def __aiter__(self):
            return self._iter()

        async def _iter(self):
            for item in self.items:
                yield item

    docs = [
        {"_id": "1", "message": "msg1", "reply": "r1", "should_escalate": True},
        {"_id": "2", "message": "msg2", "reply": "r2", "should_escalate": False},
    ]
    collection.find.return_value = AsyncCursorMock(docs)

    repo = ChatbotLogRepository(db)
    results = await repo.list(skip=0, limit=10, escalated_only=True)

    assert len(results) == 2
    assert results[0]["id"] == "1"
    collection.find.assert_called_once_with({"should_escalate": True})


async def test_count_chatbot_logs(mock_db):
    db, collection = mock_db
    collection.count_documents = AsyncMock(return_value=5)

    repo = ChatbotLogRepository(db)
    count = await repo.count(escalated_only=False)

    assert count == 5
    collection.count_documents.assert_called_once_with({})
