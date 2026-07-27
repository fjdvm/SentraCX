"""Tests for ForecastService."""

import pytest
from unittest.mock import MagicMock
from app.services.forecast_service import ForecastService


class MockCursor:
    def __init__(self, items):
        self.items = items.copy()
    def __aiter__(self):
        return self
    async def __anext__(self):
        if not self.items:
            raise StopAsyncIteration
        return self.items.pop(0)


@pytest.fixture
def database() -> MagicMock:
    return MagicMock()


@pytest.fixture
def service(database) -> ForecastService:
    return ForecastService(database)


async def test_get_ticket_volume_forecast(service: ForecastService, database: MagicMock) -> None:
    collection_mock = MagicMock()
    collection_mock.aggregate.return_value = MockCursor([
        {"_id": "2026-07-20", "count": 10},
        {"_id": "2026-07-21", "count": 15},
    ])
    database.__getitem__.return_value = collection_mock

    resp = await service.get_ticket_volume_forecast("7d")

    assert len(resp["historical_series"]) == 2
    assert len(resp["forecast_series"]) == 7
    assert "confidence_band_upper" in resp


async def test_get_revenue_forecast(service: ForecastService, database: MagicMock) -> None:
    collection_mock = MagicMock()
    collection_mock.aggregate.return_value = MockCursor([
        {
            "customer_id": "c1",
            "latest_features": {
                "total_order_value": 1500.0,
                "total_orders": 6,
                "account_age_days": 200,
                "average_order_value": 250.0,
                "order_frequency_per_month": 2.0,
            }
        }
    ])
    database.__getitem__.return_value = collection_mock

    resp = await service.get_revenue_forecast("30d")

    assert resp["total_projected"] > 0
    assert "High-Value" in resp["by_segment"]


async def test_get_churn_distribution(service: ForecastService, database: MagicMock) -> None:
    collection_mock = MagicMock()
    collection_mock.aggregate.return_value = MockCursor([
        {
            "customer_id": "c1",
            "latest_features": {
                "total_orders": 3,
                "days_since_last_order": 10,
                "account_age_days": 100,
                "average_order_value": 100.0,
                "order_frequency_per_month": 1.0,
            }
        }
    ])
    database.__getitem__.return_value = collection_mock

    resp = await service.get_churn_distribution()

    assert resp["low"] >= 0
    assert len(resp["trend_series"]) == 5


async def test_get_sentiment_trend(service: ForecastService, database: MagicMock) -> None:
    collection_mock = MagicMock()
    collection_mock.aggregate.return_value = MockCursor([
        {"_id": "2026-07-20", "score": 0.5},
        {"_id": "2026-07-21", "score": 0.6},
    ])
    database.__getitem__.return_value = collection_mock

    resp = await service.get_sentiment_trend("7d")

    assert len(resp["daily_scores"]) == 2
    assert len(resp["moving_average"]) == 2
    assert len(resp["forecast_next_7d"]) == 7
