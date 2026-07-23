"""Tests for conversation analysis service."""

import pytest
from unittest.mock import AsyncMock
from datetime import datetime, timezone

from app.services.conversation_analysis_service import ConversationAnalysisService
from app.lib.crm_client import CrmClient
from app.ml.conversation_analyzer import ConversationAnalyzer
from app.repositories.redis.conversation_cache_repository import ConversationCacheRepository
from app.repositories.mongo.conversation_transcript_repository import ConversationTranscriptRepository


@pytest.fixture
def crm_client() -> AsyncMock:
    return AsyncMock(spec=CrmClient)


@pytest.fixture
def analyzer() -> AsyncMock:
    return AsyncMock(spec=ConversationAnalyzer)


@pytest.fixture
def cache_repo() -> AsyncMock:
    return AsyncMock(spec=ConversationCacheRepository)


@pytest.fixture
def mongo_repo() -> AsyncMock:
    return AsyncMock(spec=ConversationTranscriptRepository)


@pytest.fixture
def service(crm_client, analyzer, cache_repo, mongo_repo) -> ConversationAnalysisService:
    return ConversationAnalysisService(crm_client, analyzer, cache_repo, mongo_repo)


async def test_analyze_message(
    service: ConversationAnalysisService,
    analyzer: AsyncMock,
    mongo_repo: AsyncMock,
    cache_repo: AsyncMock,
) -> None:
    analyzer.analyze_message.return_value = {
        "sentiment": "negative",
        "sentiment_score": -0.8,
        "escalation_flag": True,
        "reason": "Upset customer",
    }

    res = await service.analyze_message("tick-1", "I am angry", "customer")

    assert res["sentiment"] == "negative"
    assert res["escalation_flag"] is True

    analyzer.analyze_message.assert_called_once_with("I am angry", "customer")
    mongo_repo.append_message.assert_called_once()
    cache_repo.invalidate.assert_called_once_with("tick-1")


async def test_get_summary_cached(
    service: ConversationAnalysisService, cache_repo: AsyncMock
) -> None:
    cached_summary = {
        "summary": "Customer needs refund",
        "key_points": ["Wants refund"],
        "resolved": False,
        "computed_at": datetime.now(timezone.utc).isoformat(),
    }
    cache_repo.get_summary.return_value = cached_summary

    res = await service.get_summary("tick-1")

    assert res["summary"] == "Customer needs refund"
    cache_repo.get_summary.assert_called_once_with("tick-1")


async def test_get_summary_uncached(
    service: ConversationAnalysisService,
    crm_client: AsyncMock,
    analyzer: AsyncMock,
    cache_repo: AsyncMock,
) -> None:
    cache_repo.get_summary.return_value = None
    crm_client.get_ticket_messages.return_value = [
        {"senderId": "customer", "content": "I need help"}
    ]
    analyzer.summarize_conversation.return_value = {
        "summary": "Customer needs help",
        "key_points": ["Customer help request"],
        "resolved": False,
    }

    res = await service.get_summary("tick-1")

    assert res["summary"] == "Customer needs help"
    crm_client.get_ticket_messages.assert_called_once_with("tick-1")
    analyzer.summarize_conversation.assert_called_once()
    cache_repo.set_summary.assert_called_once()


async def test_suggest_replies_cached(
    service: ConversationAnalysisService, cache_repo: AsyncMock
) -> None:
    cache_repo.get_suggested_replies.return_value = [
        {"text": "Ok", "confidence": 0.9}
    ]

    res = await service.suggest_replies("tick-1")

    assert len(res) == 1
    assert res[0]["text"] == "Ok"
    cache_repo.get_suggested_replies.assert_called_once_with("tick-1")


async def test_suggest_replies_uncached(
    service: ConversationAnalysisService,
    crm_client: AsyncMock,
    analyzer: AsyncMock,
    cache_repo: AsyncMock,
) -> None:
    cache_repo.get_suggested_replies.return_value = None
    crm_client.get_ticket_messages.return_value = [
        {"senderId": "customer", "content": "help"}
    ]
    analyzer.suggest_replies.return_value = [
        {"text": "Hello", "confidence": 0.8}
    ]

    res = await service.suggest_replies("tick-1")

    assert len(res) == 1
    assert res[0]["text"] == "Hello"
    analyzer.suggest_replies.assert_called_once()
    cache_repo.set_suggested_replies.assert_called_once()


async def test_detect_intent(
    service: ConversationAnalysisService, analyzer: AsyncMock
) -> None:
    analyzer.detect_intent.return_value = {
        "intent": "track_order",
        "confidence": 0.9,
    }

    res = await service.detect_intent("Where is my order?")

    assert res["intent"] == "track_order"
    analyzer.detect_intent.assert_called_once_with("Where is my order?")
