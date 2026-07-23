"""Tests for dashboard API routes."""

import pytest
from datetime import datetime, timezone
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock
from app.main import app
from app.api.v1.deps import get_dashboard_service


@pytest.fixture(autouse=True)
def mock_dashboard_service():
    service_mock = AsyncMock()
    service_mock.get_summary.return_value = {
        "churn_rate": 0.18,
        "average_sentiment": 0.35,
        "total_tickets": 150,
        "resolved_tickets": 130,
        "active_campaigns": 3,
        "computed_at": datetime.now(timezone.utc),
    }
    service_mock.get_anomalies.return_value = [
        {
            "anomaly_id": "anom-001",
            "anomaly_type": "ticket_volume_spike",
            "description": "Spike in ticket volume regarding billing errors",
            "severity": "high",
            "status": "open",
            "detected_at": datetime.now(timezone.utc),
        }
    ]
    service_mock.execute_nl_query.return_value = {
        "query": "how many billing tickets were resolved last month?",
        "interpreted_query": "SELECT COUNT(*) FROM tickets WHERE category = 'billing' AND sentiment = 'negative'",
        "result": {"count": 14, "timeframe": "last_30_days"},
        "computed_at": datetime.now(timezone.utc),
    }

    app.dependency_overrides[get_dashboard_service] = lambda: service_mock
    yield service_mock
    app.dependency_overrides.clear()


async def test_get_dashboard_summary() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/dashboard/summary?from=2026-07-01T00:00:00Z&to=2026-07-23T00:00:00Z")
    assert response.status_code == 200
    data = response.json()
    assert "churn_rate" in data
    assert "average_sentiment" in data
    assert "total_tickets" in data
    assert "resolved_tickets" in data
    assert "active_campaigns" in data
    assert "computed_at" in data


async def test_get_anomalies() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/anomalies?from=2026-07-01T00:00:00Z&to=2026-07-23T00:00:00Z&status=open")
    assert response.status_code == 200
    data = response.json()
    assert "anomalies" in data
    assert isinstance(data["anomalies"], list)
    if len(data["anomalies"]) > 0:
        anomaly = data["anomalies"][0]
        assert "anomaly_id" in anomaly
        assert "anomaly_type" in anomaly
        assert "severity" in anomaly
        assert "status" in anomaly


async def test_execute_natural_language_query() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/query",
            json={"query": "how many billing tickets were resolved last month?"}
        )
    assert response.status_code == 200
    data = response.json()
    assert data["query"] == "how many billing tickets were resolved last month?"
    assert "interpreted_query" in data
    assert "result" in data
    assert "computed_at" in data
