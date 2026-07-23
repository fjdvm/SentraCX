"""Tests for ticket API routes."""

import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock
from app.main import app
from app.services.ticket_analysis_service import TicketNotFoundError, CrmUnavailableError

@pytest.fixture
def mock_service():
    service_mock = AsyncMock()
    return service_mock

async def test_analyze_intent_success(mock_service) -> None:
    from app.api.v1.deps import get_ticket_analysis_service
    from app.schemas.ticket_schemas import TicketAnalysisResponse
    from datetime import datetime, timezone

    expected_response = TicketAnalysisResponse(
        ticket_id="tick-1",
        sentiment="positive",
        sentiment_score=0.8,
        predicted_category="general_inquiry",
        urgency_score=0.2,
        confidence=0.85,
        reasoning="Good",
        computed_at=datetime.now(timezone.utc),
        cached=False
    )
    
    mock_service.analyze_ticket.return_value = expected_response
    
    app.dependency_overrides[get_ticket_analysis_service] = lambda: mock_service
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/tickets/analyze-intent",
            json={"ticket_id": "tick-1", "include_messages": True}
        )
    
    assert response.status_code == 200
    data = response.json()
    assert data["ticket_id"] == "tick-1"
    assert data["sentiment"] == "positive"
    
    app.dependency_overrides.clear()

async def test_analyze_intent_not_found(mock_service) -> None:
    from app.api.v1.deps import get_ticket_analysis_service
    
    mock_service.analyze_ticket.side_effect = TicketNotFoundError("Not found")
    app.dependency_overrides[get_ticket_analysis_service] = lambda: mock_service
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/tickets/analyze-intent",
            json={"ticket_id": "tick-1"}
        )
    
    assert response.status_code == 404
    assert response.json()["detail"] == "Not found"
    
    app.dependency_overrides.clear()

async def test_analyze_intent_crm_unavailable(mock_service) -> None:
    from app.api.v1.deps import get_ticket_analysis_service

    mock_service.analyze_ticket.side_effect = CrmUnavailableError("CRM is unavailable")
    app.dependency_overrides[get_ticket_analysis_service] = lambda: mock_service

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/tickets/analyze-intent",
            json={"ticket_id": "tick-1"}
        )

    assert response.status_code == 503
    assert response.json()["detail"] == "CRM is unavailable"

    app.dependency_overrides.clear()


async def test_analyze_ticket(mock_service) -> None:
    from app.api.v1.deps import get_ticket_analysis_service
    from app.schemas.ticket_schemas import TicketAnalysisResponse
    from datetime import datetime, timezone
    
    mock_service.analyze_ticket.return_value = TicketAnalysisResponse(
        ticket_id="tick-1",
        sentiment="neutral",
        sentiment_score=0.0,
        predicted_category="billing",
        urgency_score=0.45,
        confidence=0.88,
        reasoning="Reason",
        computed_at=datetime.now(timezone.utc),
        cached=False
    )
    app.dependency_overrides[get_ticket_analysis_service] = lambda: mock_service
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/tickets/analyze",
            json={"ticket_id": "tick-1", "text": "Billing issue"}
        )
    assert response.status_code == 200
    data = response.json()
    assert data["sentiment"] == "neutral"
    assert data["category"] == "billing"
    assert data["priority_score"] == 0.45
    assert data["confidence"] == 0.88
    
    app.dependency_overrides.clear()


async def test_get_ticket_resolution_estimate(mock_service) -> None:
    from app.api.v1.deps import get_ticket_analysis_service
    mock_service.get_resolution_estimate.return_value = {
        "estimated_hours": 4.5,
        "confidence": 0.78
    }
    app.dependency_overrides[get_ticket_analysis_service] = lambda: mock_service
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/tickets/tick-1/resolution-estimate")
    assert response.status_code == 200
    data = response.json()
    assert data["estimated_hours"] == 4.5
    assert data["confidence"] == 0.78
    
    app.dependency_overrides.clear()


async def test_get_ticket_volume_forecast(mock_service) -> None:
    from app.api.v1.deps import get_ticket_analysis_service
    from datetime import datetime, timezone
    
    mock_service.get_volume_forecast.return_value = {
        "forecast_series": [
            {"timestamp": datetime.now(timezone.utc), "value": 12.5},
            {"timestamp": datetime.now(timezone.utc), "value": 15.0}
        ],
        "threshold": 25.0,
        "alert_triggered": False
    }
    app.dependency_overrides[get_ticket_analysis_service] = lambda: mock_service
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/tickets/volume-forecast?range=14d")
    assert response.status_code == 200
    data = response.json()
    assert "forecast_series" in data
    assert len(data["forecast_series"]) == 2
    assert data["threshold"] == 25.0
    assert data["alert_triggered"] is False
    
    app.dependency_overrides.clear()
