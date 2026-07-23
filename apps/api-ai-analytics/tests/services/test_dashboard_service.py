"""Tests for dashboard service."""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone

from app.services.dashboard_service import DashboardService
from app.lib.groq_client import GroqClient


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
    db = MagicMock()
    return db


@pytest.fixture
def groq_client() -> AsyncMock:
    return AsyncMock(spec=GroqClient)


@pytest.fixture
def service(database, groq_client) -> DashboardService:
    return DashboardService(database, groq_client)


async def test_get_summary(service: DashboardService, database: MagicMock) -> None:
    collection_mock = MagicMock()
    collection_mock.aggregate.side_effect = [
        MockCursor([{"total_tickets": 10, "avg_sentiment": 0.5}]),
        MockCursor([{"latest_features": {"total_orders": 3, "days_since_last_order": 10}}])
    ]
    database.__getitem__.return_value = collection_mock

    resp = await service.get_summary()

    assert resp["total_tickets"] == 10
    assert resp["average_sentiment"] == 0.5
    assert resp["active_campaigns"] == 3


async def test_get_anomalies(service: DashboardService, database: MagicMock) -> None:
    collection_mock = MagicMock()
    collection_mock.aggregate.return_value = MockCursor([{"count": 5}])
    database.__getitem__.return_value = collection_mock

    resp = await service.get_anomalies()

    assert len(resp) > 0
    assert resp[0]["severity"] in ["high", "medium", "low"]


async def test_execute_nl_query(service: DashboardService, groq_client: AsyncMock) -> None:
    groq_client.analyze.return_value = {
        "interpreted_query": "SELECT count FROM tickets",
        "result": {"count": 100},
    }

    resp = await service.execute_nl_query("How many tickets?")

    assert resp["query"] == "How many tickets?"
    assert resp["interpreted_query"] == "SELECT count FROM tickets"
    assert resp["result"]["count"] == 100
