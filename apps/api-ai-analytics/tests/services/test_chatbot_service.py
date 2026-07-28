"""Tests for chatbot service."""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone

from app.services.chatbot_service import ChatbotService
from app.lib.oos_client import OosClient
from app.ml.conversation_analyzer import ConversationAnalyzer
from app.lib.groq_client import GroqClient


@pytest.fixture
def oos_client() -> AsyncMock:
    return AsyncMock(spec=OosClient)


@pytest.fixture
def analyzer() -> AsyncMock:
    return AsyncMock(spec=ConversationAnalyzer)


@pytest.fixture
def groq_client() -> AsyncMock:
    return AsyncMock(spec=GroqClient)


@pytest.fixture
def service(oos_client, analyzer, groq_client) -> ChatbotService:
    settings = MagicMock()
    settings.confidence_threshold_sentiment = 0.60
    return ChatbotService(oos_client, analyzer, groq_client, settings=settings)


async def test_reply_faq_heuristic(service: ChatbotService, analyzer: AsyncMock) -> None:
    # Arrange
    analyzer.detect_intent.return_value = {"intent": "general_inquiry", "confidence": 0.90}
    analyzer.analyze_message.return_value = {"escalation_flag": False}

    # Act
    res = await service.reply("What are your hours?", customer_id=None)

    # Assert
    assert res["intent"] == "faq"
    assert "open 24/7" in res["reply"]
    assert res["should_escalate"] is False


async def test_reply_order_tracking_unauthenticated(service: ChatbotService, analyzer: AsyncMock) -> None:
    # Arrange
    analyzer.detect_intent.return_value = {"intent": "track_order", "confidence": 0.85}
    analyzer.analyze_message.return_value = {"escalation_flag": False}

    # Act
    res = await service.reply("where is my order", customer_id=None)

    # Assert
    assert res["intent"] == "account_specific"
    assert "log in" in res["reply"]
    assert res["should_escalate"] is False


async def test_reply_order_tracking_authenticated_with_orders(
    service: ChatbotService, analyzer: AsyncMock, oos_client: AsyncMock
) -> None:
    # Arrange
    analyzer.detect_intent.return_value = {"intent": "track_order", "confidence": 0.85}
    analyzer.analyze_message.return_value = {"escalation_flag": False}
    
    oos_client.get_orders.return_value = [
        {
            "id": "order-1",
            "customer_id": "cust-123",
            "order_number": "OOS-1001",
            "status": "Shipped",
            "total_amount": 99.50,
            "ordered_at": datetime.now(timezone.utc).isoformat()
        }
    ]

    # Act
    res = await service.reply("where is my order", customer_id="cust-123")

    # Assert
    assert res["intent"] == "track_order"
    assert "OOS-1001" in res["reply"]
    assert "Shipped" in res["reply"]
    assert "$99.50" in res["reply"]
    assert res["should_escalate"] is False


async def test_reply_order_tracking_authenticated_by_id(
    service: ChatbotService, analyzer: AsyncMock, oos_client: AsyncMock
) -> None:
    # Arrange
    analyzer.detect_intent.return_value = {"intent": "track_order", "confidence": 0.85}
    analyzer.analyze_message.return_value = {"escalation_flag": False}
    
    order_id = "550e8400-e29b-41d4-a716-446655440000"
    oos_client.get_order.return_value = {
        "id": order_id,
        "customer_id": "cust-123",
        "order_number": "OOS-2002",
        "status": "Delivered",
        "total_amount": 49.99
    }

    # Act
    res = await service.reply(f"status of order {order_id}", customer_id="cust-123")

    # Assert
    assert res["intent"] == "track_order"
    assert "OOS-2002" in res["reply"]
    assert "Delivered" in res["reply"]
    assert "$49.99" in res["reply"]
    oos_client.get_order.assert_called_once_with(order_id)


async def test_reply_escalate_intent(
    service: ChatbotService, analyzer: AsyncMock, groq_client: AsyncMock
) -> None:
    # Arrange
    analyzer.detect_intent.return_value = {"intent": "escalate", "confidence": 0.95}
    analyzer.analyze_message.return_value = {"escalation_flag": True}
    groq_client.analyze.return_value = {"summary": "Customer wanted human support."}

    # Act
    res = await service.reply("let me talk to an agent", customer_id="cust-123")

    # Assert
    assert res["intent"] == "escalate"
    assert res["should_escalate"] is True
    assert "agent" in res["reply"]
    assert res["bot_summary"] == "Customer wanted human support."


async def test_reply_low_confidence_escalates(
    service: ChatbotService, analyzer: AsyncMock, groq_client: AsyncMock
) -> None:
    # Arrange
    # Confidence is 0.50 (less than 0.60 threshold)
    analyzer.detect_intent.return_value = {"intent": "general_inquiry", "confidence": 0.50}
    analyzer.analyze_message.return_value = {"escalation_flag": False}
    groq_client.analyze.return_value = {"summary": "Escalated due to low confidence."}

    # Act
    res = await service.reply("weird question", customer_id="cust-123")

    # Assert
    assert res["intent"] == "escalate"
    assert res["should_escalate"] is True
    assert res["bot_summary"] == "Escalated due to low confidence."


async def test_reply_sensitive_billing_escalates(
    service: ChatbotService, analyzer: AsyncMock, groq_client: AsyncMock
) -> None:
    # Arrange
    analyzer.detect_intent.return_value = {"intent": "billing_issue", "confidence": 0.90}
    analyzer.analyze_message.return_value = {"escalation_flag": False}
    groq_client.analyze.return_value = {"summary": "Billing inquiry."}

    # Act
    res = await service.reply("i got overcharged", customer_id="cust-123")

    # Assert
    assert res["intent"] == "escalate"
    assert res["should_escalate"] is True
    assert "billing issue" in res["reply"].lower()


async def test_reply_llm_fallback(
    service: ChatbotService, analyzer: AsyncMock, groq_client: AsyncMock
) -> None:
    # Arrange
    analyzer.detect_intent.return_value = {"intent": "general_inquiry", "confidence": 0.90}
    analyzer.analyze_message.return_value = {"escalation_flag": False}
    groq_client.analyze.return_value = {"reply": "Here is a smart answer from LLM."}

    # Act
    res = await service.reply("How are you today?", customer_id=None)

    # Assert
    assert res["intent"] == "general_inquiry"
    assert res["reply"] == "Here is a smart answer from LLM."
    assert res["should_escalate"] is False


async def test_reply_logs_interaction(
    oos_client: AsyncMock, analyzer: AsyncMock, groq_client: AsyncMock
) -> None:
    log_repo = AsyncMock()
    settings = MagicMock()
    settings.confidence_threshold_sentiment = 0.60
    svc = ChatbotService(oos_client, analyzer, groq_client, settings=settings, log_repo=log_repo)

    analyzer.detect_intent.return_value = {"intent": "general_inquiry", "confidence": 0.90}
    analyzer.analyze_message.return_value = {"escalation_flag": False}

    res = await svc.reply("What are your hours?", customer_id="c-1")
    assert res["intent"] == "faq"

    # Allow fire-and-forget task to complete
    import asyncio
    await asyncio.sleep(0.05)

    log_repo.insert.assert_called_once()

