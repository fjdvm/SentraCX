"""Tests for watchlist and anomaly acknowledge API routes."""

import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock
from app.main import app
from app.api.v1.deps import get_dashboard_service


@pytest.fixture(autouse=True)
def mock_dashboard_service():
    service_mock = AsyncMock()
    service_mock.get_at_risk_customers.return_value = [
        {
            "customer_id": "cust-001",
            "name": "John Doe",
            "churn_score": 0.88,
            "risk_level": "critical",
            "contributing_factors": ["Order decline"],
            "recommended_action": "Retention offer",
        }
    ]
    service_mock.acknowledge_anomaly.return_value = True

    app.dependency_overrides[get_dashboard_service] = lambda: service_mock
    yield service_mock
    app.dependency_overrides.clear()


async def test_get_at_risk_customers() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/dashboard/at-risk-customers?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert "customers" in data
    assert len(data["customers"]) == 1
    assert data["customers"][0]["name"] == "John Doe"


async def test_acknowledge_anomaly() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/anomalies/anom-001/acknowledge")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "acknowledged"
    assert data["anomaly_id"] == "anom-001"
