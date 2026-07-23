"""Tests for conversation API routes."""

import pytest
from datetime import datetime, timezone
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock
from app.main import app
from app.api.v1.deps import get_conversation_analysis_service


@pytest.fixture(autouse=True)
def mock_conversation_service():
    service_mock = AsyncMock()
    service_mock.analyze_message.return_value = {
        "sentiment": "neutral",
        "sentiment_score": 0.0,
        "escalation_flag": False,
        "reason": None,
    }
    service_mock.get_summary.return_value = {
        "summary": "Customer inquired about order status and delivery timeline.",
        "key_points": ["Inquired about order delivery", "Provided order number OOS-998877"],
        "resolved": True,
        "computed_at": datetime.now(timezone.utc),
    }
    service_mock.suggest_replies.return_value = [
        {"text": "Sure, I can help you look up that order status.", "confidence": 0.91},
        {"text": "Could you please confirm your shipping address?", "confidence": 0.74},
    ]
    service_mock.detect_intent.return_value = {
        "intent": "track_order",
        "confidence": 0.88,
    }
    service_mock.get_entities.return_value = [
        {
            "entity_type": "order_number",
            "value": "OOS-998877",
            "meta": {"exists_in_oos": True, "status": "shipped"},
        }
    ]

    app.dependency_overrides[get_conversation_analysis_service] = lambda: service_mock
    yield service_mock
    app.dependency_overrides.clear()


async def test_analyze_message() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/conversations/conv-123/analyze-message",
            json={"text": "Hello, my order has not arrived yet.", "sender_role": "customer"}
        )
    assert response.status_code == 200
    data = response.json()
    assert data["sentiment"] in ["positive", "neutral", "negative"]
    assert "sentiment_score" in data
    assert "escalation_flag" in data


async def test_get_conversation_summary() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/conversations/conv-123/summary")
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert isinstance(data["key_points"], list)
    assert "resolved" in data
    assert "computed_at" in data


async def test_suggest_replies() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/conversations/conv-123/suggest-replies")
    assert response.status_code == 200
    data = response.json()
    assert "suggestions" in data
    assert isinstance(data["suggestions"], list)


async def test_detect_intent() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/conversations/conv-123/detect-intent",
            json={"text": "I need help with my tracking number"}
        )
    assert response.status_code == 200
    data = response.json()
    assert "intent" in data
    assert "confidence" in data


async def test_get_conversation_entities() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/conversations/conv-123/entities")
    assert response.status_code == 200
    data = response.json()
    assert "entities" in data
    assert isinstance(data["entities"], list)
