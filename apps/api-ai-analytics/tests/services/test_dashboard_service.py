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
        MockCursor([{"total_tickets": 10, "avg_sentiment": 0.5, "categories": ["billing"]}]),
        MockCursor([{"total_tickets": 8, "avg_sentiment": 0.4, "categories": ["billing"]}]),
        MockCursor([{"customer_id": "cust-1", "latest_features": {"total_orders": 3, "days_since_last_order": 10}}]),
        MockCursor([{"customer_id": "cust-1", "latest_features": {"total_orders": 2, "days_since_last_order": 12}}]),
    ]
    database.__getitem__.return_value = collection_mock

    resp = await service.get_summary()

    assert resp["active_tickets"]["value"] == 15
    assert resp["avg_sentiment"]["value"] == 0.5
    assert resp["active_campaigns"]["value"] == 3



async def test_get_anomalies(service: DashboardService, database: MagicMock) -> None:
    collection_mock = MagicMock()
    collection_mock.count_documents = AsyncMock(return_value=1)
    find_mock = MagicMock()
    find_mock.sort.return_value = MockCursor([
        {
            "anomaly_id": "anom-001",
            "anomaly_type": "ticket_volume_spike",
            "description": "Spike in ticket volume",
            "severity": "high",
            "status": "open",
            "detected_at": datetime.now()
        }
    ])
    collection_mock.find.return_value = find_mock
    database.__getitem__.return_value = collection_mock

    resp = await service.get_anomalies()

    assert len(resp) > 0
    assert resp[0]["severity"] in ["high", "medium", "low", "critical"]


async def test_acknowledge_anomaly(service: DashboardService, database: MagicMock) -> None:
    collection_mock = MagicMock()
    collection_mock.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
    database.__getitem__.return_value = collection_mock

    resp = await service.acknowledge_anomaly("anom-001")
    assert resp is True


async def test_get_at_risk_customers(service: DashboardService, database: MagicMock) -> None:
    collection_mock = MagicMock()
    collection_mock.aggregate.return_value = MockCursor([])
    database.__getitem__.return_value = collection_mock

    resp = await service.get_at_risk_customers(limit=5)
    assert len(resp) > 0
    assert resp[0]["name"] == "Olivia Vance"



async def test_execute_nl_query(service: DashboardService, groq_client: AsyncMock) -> None:
    groq_client.analyze.return_value = {
        "interpreted_query": "SELECT count FROM tickets",
        "result": {"count": 100},
    }

    resp = await service.execute_nl_query("How many tickets?")

    assert resp["query"] == "How many tickets?"
    assert resp["interpreted_query"] == "SELECT count FROM tickets"
    assert resp["result"]["count"] == 100


async def test_execute_dashboard_ask_llm(service: DashboardService, groq_client: AsyncMock) -> None:
    groq_client.analyze.return_value = {
        "type": "chart",
        "content": {"series": [{"name": "Mon", "value": 10}]}
    }

    resp = await service.execute_dashboard_ask("volume forecast")
    assert resp["type"] == "chart"
    assert resp["content"]["series"][0]["name"] == "Mon"


async def test_execute_dashboard_ask_fallback(service: DashboardService, groq_client: AsyncMock) -> None:
    # Disable Groq client to trigger fallback
    service._groq = None
    resp = await service.execute_dashboard_ask("Who is at risk of leaving?")
    assert resp["type"] == "table"
    assert len(resp["content"]["rows"]) > 0

