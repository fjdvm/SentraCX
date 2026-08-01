"""Tests for context snapshot service."""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone

from app.services.context_snapshot_service import ContextSnapshotService


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
def crm_client() -> AsyncMock:
    crm = AsyncMock()
    crm.get_tickets_count = AsyncMock(return_value=5)
    crm.get_active_campaigns_count = AsyncMock(return_value=3)
    crm.get_resolution_stats = AsyncMock(return_value={"avgResolutionHours": 4.5, "prevAvgResolutionHours": 5.0})
    crm.get_claimed_tickets_by_agent = AsyncMock(return_value=[
        {
            "id": "t-1",
            "title": "Cannot login",
            "status": "Claimed",
            "customer": {
                "customerType": "High-Value",
                "user": {
                    "firstName": "John",
                    "lastName": "Doe",
                    "email": "john@doe.com"
                }
            }
        }
    ])
    crm.get_customers = AsyncMock(return_value=[])
    return crm


@pytest.fixture
def cache() -> AsyncMock:
    c = AsyncMock()
    c.get_snapshot = AsyncMock(return_value=None)
    c.set_snapshot = AsyncMock()
    return c


@pytest.fixture
def service(database, crm_client, cache) -> ContextSnapshotService:
    return ContextSnapshotService(database, crm_client, cache)


async def test_get_global_snapshot(service: ContextSnapshotService, database: MagicMock, cache: AsyncMock) -> None:
    collection_mock = MagicMock()
    collection_mock.count_documents = AsyncMock(return_value=1)
    collection_mock.aggregate.side_effect = [
        # Churn/CLV cursor
        MockCursor([
            {"customer_id": "cust-1", "latest_features": {"total_orders": 3, "days_since_last_order": 10}},
        ]),
        # Sentiment cursor
        MockCursor([{"avg_sentiment": 0.5}]),
        # Categories cursor
        MockCursor([
            {"_id": "billing", "count": 2},
            {"_id": "shipping", "count": 1},
        ])
    ]
    database.__getitem__.return_value = collection_mock

    res = await service.get_global_snapshot()

    assert res["open_tickets"] == 15  # 5 + 5 + 5
    assert res["active_campaigns"] == 3
    assert res["avg_resolution_hours"] == 4.5
    assert res["csat_score"] == 4.0  # (0.5+1)*2 + 1
    assert res["top_ticket_categories"] == {"billing": 2, "shipping": 1}

    # Verify set_snapshot was called to cache compile result
    cache.set_snapshot.assert_called_once()


async def test_get_global_snapshot_cached(service: ContextSnapshotService, cache: AsyncMock) -> None:
    cached_data = {
        "open_tickets": 22,
        "unclaimed": 10,
        "claimed": 8,
        "ongoing": 4,
        "active_campaigns": 5,
        "avg_resolution_hours": 3.0,
        "churn_rate_pct": 5.0,
        "avg_clv": 5000.0,
        "csat_score": 4.2,
        "top_ticket_categories": {"billing": 3},
    }
    cache.get_snapshot.return_value = cached_data

    res = await service.get_global_snapshot()

    assert res == cached_data


async def test_get_snapshot_text(service: ContextSnapshotService, database: MagicMock) -> None:
    collection_mock = MagicMock()
    collection_mock.count_documents = AsyncMock(return_value=1)
    collection_mock.aggregate.side_effect = [
        MockCursor([]),
        MockCursor([]),
        MockCursor([])
    ]
    database.__getitem__.return_value = collection_mock

    text = await service.get_snapshot_text(agent_id="agent-123")

    assert "=== SentraCX Live Snapshot ===" in text
    assert "YOUR CLAIMED TICKETS (Agent: agent-123):" in text
    assert '1. "Cannot login" — John Doe (john@doe.com) | Status: Claimed | Type: High-Value' in text
    assert "=== End of snapshot ===" in text
