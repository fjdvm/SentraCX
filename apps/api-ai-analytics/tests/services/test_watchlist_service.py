"""Tests for the WatchlistService."""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone
from app.services.watchlist_service import WatchlistService


@pytest.mark.asyncio
async def test_get_at_risk_customers_from_db() -> None:
    # Set up mock MongoDB
    db_mock = MagicMock()
    cursor_mock = AsyncMock()
    cursor_mock.__aiter__.return_value = [
        {
            "_id": "cust-db-001",
            "latest_features": {
                "days_since_last_order": 200,  # Score: +0.35
                "order_frequency_trend": -0.6, # Score: +0.25
                "ticket_count_last_90d": 6,   # Score: +0.20
                "account_age_days": 180,
                "total_orders": 10,
            }
        }
    ]
    db_mock["customer_feature_logs"].aggregate.return_value = cursor_mock

    # Set up mock CRM client
    crm_mock = AsyncMock()
    crm_mock.get_customer.return_value = {
        "id": "cust-db-001",
        "firstName": "Alice",
        "lastName": "Smith",
    }

    service = WatchlistService(database=db_mock, crm_client=crm_mock)
    results = await service.get_at_risk_customers(limit=5)

    assert len(results) == 1
    assert results[0]["customer_id"] == "cust-db-001"
    assert results[0]["name"] == "Alice Smith"
    assert results[0]["risk_level"] == "critical"


@pytest.mark.asyncio
async def test_get_at_risk_customers_fallback_to_crm() -> None:
    # MongoDB returns nothing
    db_mock = MagicMock()
    cursor_mock = AsyncMock()
    cursor_mock.__aiter__.return_value = []
    db_mock["customer_feature_logs"].aggregate.return_value = cursor_mock

    # CRM returns list of customers and orders
    crm_mock = AsyncMock()
    crm_mock.get_customers.return_value = [
        {
            "id": "cust-crm-atrisk",
            "firstName": "Bob",
            "lastName": "Jones",
            "createdAt": "2025-01-01T00:00:00Z",
            "ticketCount": 6,
        }
    ]
    old_date = datetime(2025, 4, 1, tzinfo=timezone.utc)
    crm_mock.get_customer_orders.return_value = [
        {
            "id": "order-1",
            "totalAmount": 100.0,
            "createdAt": old_date.isoformat()
        },
        {
            "id": "order-2",
            "totalAmount": 100.0,
            "createdAt": old_date.isoformat()
        },
        {
            "id": "order-3",
            "totalAmount": 100.0,
            "createdAt": old_date.isoformat()
        }
    ]
    crm_mock.get_customer.return_value = {
        "id": "cust-crm-atrisk",
        "firstName": "Bob",
        "lastName": "Jones",
    }
    crm_mock.get_tickets_count_by_customer.return_value = 6

    service = WatchlistService(database=db_mock, crm_client=crm_mock)
    results = await service.get_at_risk_customers(limit=5)
    assert len(results) == 1
    assert results[0]["customer_id"] == "cust-crm-atrisk"
    assert results[0]["name"] == "Bob Jones"
    assert results[0]["risk_level"] in ["high", "critical"]
