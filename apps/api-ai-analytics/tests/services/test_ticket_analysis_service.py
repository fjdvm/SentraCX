"""Tests for ticket analysis service."""

import pytest
from unittest.mock import AsyncMock
from datetime import datetime, timezone

from app.services.ticket_analysis_service import TicketAnalysisService, TicketNotFoundError, CrmUnavailableError
from app.schemas.ticket_schemas import TicketAnalysisRequest
from app.lib.crm_client import CrmClient
from app.ml.ticket_analyzer import TicketAnalyzer
from app.repositories.redis.ticket_sentiment_repository import TicketSentimentRepository
from app.repositories.mongo.conversation_transcript_repository import ConversationTranscriptRepository

@pytest.fixture
def crm_client() -> AsyncMock:
    return AsyncMock(spec=CrmClient)

@pytest.fixture
def analyzer() -> AsyncMock:
    return AsyncMock(spec=TicketAnalyzer)

@pytest.fixture
def redis_repo() -> AsyncMock:
    return AsyncMock(spec=TicketSentimentRepository)

@pytest.fixture
def mongo_repo() -> AsyncMock:
    return AsyncMock(spec=ConversationTranscriptRepository)

@pytest.fixture
def service(crm_client, analyzer, redis_repo, mongo_repo) -> TicketAnalysisService:
    return TicketAnalysisService(crm_client, analyzer, redis_repo, mongo_repo)


async def test_analyze_ticket_returns_cached(service: TicketAnalysisService, redis_repo: AsyncMock) -> None:
    cached_data = {
        "sentiment": "positive",
        "sentiment_score": 0.8,
        "predicted_category": "general_inquiry",
        "urgency_score": 0.2,
        "reasoning": "Good",
        "analyzed_at": datetime.now(timezone.utc).isoformat()
    }
    redis_repo.get_cached_analysis.return_value = cached_data
    
    req = TicketAnalysisRequest(ticket_id="tick-1")
    resp = await service.analyze_ticket(req)
    
    assert resp.cached is True
    assert resp.sentiment == "positive"
    assert resp.predicted_category == "general_inquiry"


async def test_analyze_ticket_fetches_and_caches(
    service: TicketAnalysisService, crm_client: AsyncMock, analyzer: AsyncMock, 
    redis_repo: AsyncMock, mongo_repo: AsyncMock
) -> None:
    redis_repo.get_cached_analysis.return_value = None
    crm_client.get_ticket.return_value = {"id": "tick-1", "title": "Test"}
    crm_client.get_ticket_messages.return_value = [{"content": "msg"}]
    
    analyzer.analyze.return_value = {
        "sentiment": "negative",
        "sentiment_score": -0.5,
        "category": "technical_issue",
        "urgency_score": 0.8,
        "reasoning": "Reason"
    }
    
    req = TicketAnalysisRequest(ticket_id="tick-1")
    resp = await service.analyze_ticket(req)
    
    assert resp.cached is False
    assert resp.sentiment == "negative"
    assert resp.predicted_category == "technical_issue"
    
    redis_repo.set_cached_analysis.assert_called_once()
    redis_repo.add_sentiment_score.assert_called_once()
    mongo_repo.save_analysis.assert_called_once()


async def test_analyze_ticket_not_found(service: TicketAnalysisService, redis_repo: AsyncMock, crm_client: AsyncMock) -> None:
    redis_repo.get_cached_analysis.return_value = None
    crm_client.get_ticket.return_value = None
    
    with pytest.raises(TicketNotFoundError):
        await service.analyze_ticket(TicketAnalysisRequest(ticket_id="tick-1"))


async def test_analyze_ticket_crm_error(service: TicketAnalysisService, redis_repo: AsyncMock, crm_client: AsyncMock) -> None:
    redis_repo.get_cached_analysis.return_value = None
    crm_client.get_ticket.side_effect = Exception("Network error")
    
    with pytest.raises(CrmUnavailableError):
        await service.analyze_ticket(TicketAnalysisRequest(ticket_id="tick-1"))


async def test_analyze_ticket_low_confidence_overrides(
    service: TicketAnalysisService, crm_client: AsyncMock, analyzer: AsyncMock, 
    redis_repo: AsyncMock, mongo_repo: AsyncMock
) -> None:
    redis_repo.get_cached_analysis.return_value = None
    crm_client.get_ticket.return_value = {"id": "tick-1", "title": "Test"}
    crm_client.get_ticket_messages.return_value = []
    
    # Confidence is 0.5 (less than 0.6 default thresholds)
    analyzer.analyze.return_value = {
        "sentiment": "negative",
        "sentiment_score": -0.5,
        "category": "technical_issue",
        "urgency_score": 0.8,
        "confidence": 0.5,
        "reasoning": "Reason"
    }
    
    req = TicketAnalysisRequest(ticket_id="tick-1")
    resp = await service.analyze_ticket(req)
    
    # Assert values returned to client are overridden
    assert resp.sentiment == "neutral"
    assert resp.predicted_category == "Uncategorized"
    assert resp.confidence == 0.5
    
    # Assert mongo_repo receives original predictions
    mongo_repo.save_analysis.assert_called_once()
    saved_mongo_data = mongo_repo.save_analysis.call_args[0][1]
    assert saved_mongo_data["sentiment"] == "negative"
    assert saved_mongo_data["predicted_category"] == "technical_issue"
    assert saved_mongo_data["confidence"] == 0.5


class MockCursor:
    def __init__(self, items):
        self.items = items.copy()
    def __aiter__(self):
        return self
    async def __anext__(self):
        if not self.items:
            raise StopAsyncIteration
        return self.items.pop(0)


async def test_get_resolution_estimate(service: TicketAnalysisService, redis_repo: AsyncMock) -> None:
    redis_repo.get_cached_analysis.return_value = {
        "predicted_category": "billing",
        "confidence": 0.9,
    }
    
    resp = await service.get_resolution_estimate("tick-1")
    assert resp["estimated_hours"] == 4.0
    assert resp["confidence"] == 0.9


async def test_get_volume_forecast(service: TicketAnalysisService, mongo_repo: AsyncMock) -> None:
    mongo_repo._collection = AsyncMock()
    mongo_repo._collection.aggregate.return_value = MockCursor([{"count": 10}, {"count": 20}])

    resp = await service.get_volume_forecast("7d")
    
    assert "forecast_series" in resp
    assert len(resp["forecast_series"]) == 7
    assert resp["threshold"] == 25.0
    assert isinstance(resp["alert_triggered"], bool)

