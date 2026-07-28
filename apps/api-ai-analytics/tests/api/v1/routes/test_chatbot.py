"""Tests for chatbot API routes."""

import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock
from app.main import app
from app.api.v1.deps import get_chatbot_service


@pytest.fixture(autouse=True)
def mock_chatbot_service():
    service_mock = AsyncMock()
    service_mock.reply.return_value = {
        "reply": "This is a chatbot reply",
        "intent": "general_inquiry",
        "should_escalate": False,
        "confidence": 0.95,
        "bot_summary": None,
    }
    app.dependency_overrides[get_chatbot_service] = lambda: service_mock
    yield service_mock
    app.dependency_overrides.clear()


async def test_chatbot_reply(mock_chatbot_service: AsyncMock) -> None:
    payload = {
        "message": "hello",
        "customer_id": "cust-1",
        "ticket_id": None,
        "conversation_history": [
            {"role": "customer", "content": "hi"},
            {"role": "bot", "content": "hello there"}
        ]
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/chatbot/reply", json=payload)
        
    assert response.status_code == 200
    data = response.json()
    assert data["reply"] == "This is a chatbot reply"
    assert data["intent"] == "general_inquiry"
    assert data["should_escalate"] is False
    assert data["confidence"] == 0.95
    assert data["bot_summary"] is None

    mock_chatbot_service.reply.assert_called_once_with(
        message="hello",
        customer_id="cust-1",
        ticket_id=None,
        conversation_history=[
            {"role": "customer", "content": "hi"},
            {"role": "bot", "content": "hello there"}
        ]
    )
