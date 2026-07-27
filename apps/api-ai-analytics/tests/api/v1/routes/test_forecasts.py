"""Tests for forecasting API routes."""

import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock
from app.main import app
from app.api.v1.deps import get_forecast_service


@pytest.fixture(autouse=True)
def mock_forecast_service():
    service_mock = AsyncMock()
    service_mock.get_ticket_volume_forecast.return_value = {
        "historical_series": [{"date": "2026-07-20", "count": 10}],
        "forecast_series": [{"date": "2026-07-21", "count": 12.0}],
        "confidence_band_upper": [{"date": "2026-07-21", "count": 14.0}],
        "confidence_band_lower": [{"date": "2026-07-21", "count": 10.0}],
        "threshold": 30.0,
        "alert_triggered": False,
    }
    service_mock.get_revenue_forecast.return_value = {
        "forecast_series": [{"date": "2026-07-21", "revenue": 100.0}],
        "by_segment": {"High-Value": 5000.0},
        "total_projected": 500.0,
        "confidence": 0.85,
    }
    service_mock.get_churn_distribution.return_value = {
        "low": 100,
        "medium": 40,
        "high": 10,
        "critical": 5,
        "trend_series": [{"date": "2026-07-20", "low": 100, "medium": 40, "high": 10, "critical": 5}],
    }
    service_mock.get_sentiment_trend.return_value = {
        "daily_scores": [{"date": "2026-07-20", "score": 0.5}],
        "moving_average": [{"date": "2026-07-20", "score": 0.5}],
        "forecast_next_7d": [{"date": "2026-07-21", "score": 0.6}],
    }

    app.dependency_overrides[get_forecast_service] = lambda: service_mock
    yield service_mock
    app.dependency_overrides.clear()


async def test_get_ticket_volume_forecast() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/forecasts/ticket-volume?range=7d")
    assert response.status_code == 200
    data = response.json()
    assert "historical_series" in data
    assert "forecast_series" in data
    assert "alert_triggered" in data


async def test_get_revenue_forecast() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/forecasts/revenue?range=30d")
    assert response.status_code == 200
    data = response.json()
    assert "forecast_series" in data
    assert "total_projected" in data


async def test_get_churn_distribution() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/forecasts/churn-distribution")
    assert response.status_code == 200
    data = response.json()
    assert "low" in data
    assert "trend_series" in data


async def test_get_sentiment_trend() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/forecasts/sentiment-trend?range=30d")
    assert response.status_code == 200
    data = response.json()
    assert "daily_scores" in data
    assert "forecast_next_7d" in data
