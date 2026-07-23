"""Integration tests for customer insights routes."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.schemas.customer_schemas import CustomerInsightsResponse, NextBestAction
from app.services.customer_insights_service import (
    CrmUnavailableError,
    CustomerNotFoundError,
)
from app.api.v1.deps import get_customer_insights_service
from app.main import app


@pytest.fixture()
def sample_insights() -> CustomerInsightsResponse:
    """Build a sample insights response for mocking."""
    return CustomerInsightsResponse(
        customer_id="cust-001",
        churn_score=0.72,
        clv_prediction=1250.50,
        next_best_action=NextBestAction(
            action="send_retention_offer",
            reason="High churn risk with recent activity drop",
            confidence=0.85,
        ),
        computed_at=datetime(2026, 7, 17, 0, 0, 0, tzinfo=timezone.utc),
        cached=False,
    )


@pytest.fixture()
async def client():
    """Create an async test client with mocked lifespan dependencies."""
    with (
        patch("app.db.mongo.connect_mongo", new_callable=AsyncMock),
        patch("app.db.mongo.close_mongo", new_callable=AsyncMock),
        patch("app.db.redis.connect_redis", new_callable=AsyncMock),
        patch("app.db.redis.close_redis", new_callable=AsyncMock),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport, base_url="http://test"
        ) as ac:
            yield ac


class TestGetCustomerInsights:
    """Tests for GET /api/v1/customers/{customer_id}/insights."""

    async def test_returns_200_with_valid_insights(
        self, client: AsyncClient, sample_insights: CustomerInsightsResponse
    ):
        """Successful request returns 200 and complete insights payload."""
        mock_service = AsyncMock()
        mock_service.get_insights.return_value = sample_insights

        app.dependency_overrides[get_customer_insights_service] = lambda: mock_service
        try:
            response = await client.get("/api/v1/customers/cust-001/insights")
        finally:
            app.dependency_overrides.clear()

        assert response.status_code == 200
        body = response.json()
        assert body["customer_id"] == "cust-001"
        assert body["churn_score"] == 0.72
        assert body["clv_prediction"] == 1250.50
        assert body["cached"] is False
        mock_service.get_insights.assert_awaited_once_with("cust-001")

    async def test_response_matches_schema(
        self, client: AsyncClient, sample_insights: CustomerInsightsResponse
    ):
        """Response body validates against CustomerInsightsResponse schema."""
        mock_service = AsyncMock()
        mock_service.get_insights.return_value = sample_insights

        app.dependency_overrides[get_customer_insights_service] = lambda: mock_service
        try:
            response = await client.get("/api/v1/customers/cust-001/insights")
        finally:
            app.dependency_overrides.clear()

        body = response.json()
        parsed = CustomerInsightsResponse(**body)
        assert parsed.customer_id == sample_insights.customer_id
        assert parsed.churn_score == sample_insights.churn_score
        assert parsed.clv_prediction == sample_insights.clv_prediction
        assert parsed.next_best_action.action == "send_retention_offer"
        assert parsed.next_best_action.confidence == 0.85
        assert parsed.computed_at is not None

    async def test_next_best_action_fields(
        self, client: AsyncClient, sample_insights: CustomerInsightsResponse
    ):
        """Response contains correctly structured next_best_action."""
        mock_service = AsyncMock()
        mock_service.get_insights.return_value = sample_insights

        app.dependency_overrides[get_customer_insights_service] = lambda: mock_service
        try:
            response = await client.get("/api/v1/customers/cust-001/insights")
        finally:
            app.dependency_overrides.clear()

        nba = response.json()["next_best_action"]
        assert nba["action"] == "send_retention_offer"
        assert nba["reason"] == "High churn risk with recent activity drop"
        assert 0.0 <= nba["confidence"] <= 1.0

    async def test_returns_404_when_customer_not_found(
        self, client: AsyncClient
    ):
        """Returns 404 with descriptive detail when customer doesn't exist."""
        mock_service = AsyncMock()
        mock_service.get_insights.side_effect = CustomerNotFoundError()

        app.dependency_overrides[get_customer_insights_service] = lambda: mock_service
        try:
            response = await client.get(
                "/api/v1/customers/nonexistent-id/insights"
            )
        finally:
            app.dependency_overrides.clear()

        assert response.status_code == 404
        assert "nonexistent-id" in response.json()["detail"]
        assert "not found" in response.json()["detail"].lower()

    async def test_returns_503_when_crm_unavailable(
        self, client: AsyncClient
    ):
        """Returns 503 when CRM service cannot be reached."""
        mock_service = AsyncMock()
        mock_service.get_insights.side_effect = CrmUnavailableError()

        app.dependency_overrides[get_customer_insights_service] = lambda: mock_service
        try:
            response = await client.get("/api/v1/customers/cust-001/insights")
        finally:
            app.dependency_overrides.clear()

        assert response.status_code == 503
        assert "unavailable" in response.json()["detail"].lower()

    async def test_cached_response_indicates_cache_hit(
        self, client: AsyncClient
    ):
        """Cached results set the cached field to True."""
        cached_insights = CustomerInsightsResponse(
            customer_id="cust-002",
            churn_score=0.15,
            clv_prediction=3200.00,
            next_best_action=NextBestAction(
                action="upsell_premium",
                reason="Low churn risk, high engagement",
                confidence=0.90,
            ),
            computed_at=datetime(2026, 7, 16, 12, 0, 0, tzinfo=timezone.utc),
            cached=True,
        )
        mock_service = AsyncMock()
        mock_service.get_insights.return_value = cached_insights

        app.dependency_overrides[get_customer_insights_service] = lambda: mock_service
        try:
            response = await client.get("/api/v1/customers/cust-002/insights")
        finally:
            app.dependency_overrides.clear()

        assert response.status_code == 200
        assert response.json()["cached"] is True


class TestCustomerSubInsights:
    """Tests for individual customer insight contracts."""

    async def test_get_customer_segment(self, client: AsyncClient):
        mock_service = AsyncMock()
        mock_service.get_segment.return_value = {
            "segment": "VIP",
            "computed_at": datetime.now(timezone.utc),
            "confidence": 0.92,
        }
        app.dependency_overrides[get_customer_insights_service] = lambda: mock_service
        try:
            response = await client.get("/api/v1/customers/cust-001/segment")
        finally:
            app.dependency_overrides.clear()

        assert response.status_code == 200
        data = response.json()
        assert data["segment"] == "VIP"
        assert "confidence" in data
        assert "computed_at" in data

    async def test_get_customer_churn_score(self, client: AsyncClient):
        mock_service = AsyncMock()
        mock_service.get_churn_score.return_value = {
            "score": 0.15,
            "risk_level": "low",
            "contributing_factors": ["recent ticket resolved successfully"],
            "computed_at": datetime.now(timezone.utc),
        }
        app.dependency_overrides[get_customer_insights_service] = lambda: mock_service
        try:
            response = await client.get("/api/v1/customers/cust-001/churn-score")
        finally:
            app.dependency_overrides.clear()

        assert response.status_code == 200
        data = response.json()
        assert data["score"] == 0.15
        assert data["risk_level"] == "low"
        assert isinstance(data["contributing_factors"], list)
        assert "computed_at" in data

    async def test_get_customer_clv(self, client: AsyncClient):
        mock_service = AsyncMock()
        mock_service.get_clv.return_value = {
            "predicted_clv": 1250.00,
            "currency": "USD",
            "computed_at": datetime.now(timezone.utc),
        }
        app.dependency_overrides[get_customer_insights_service] = lambda: mock_service
        try:
            response = await client.get("/api/v1/customers/cust-001/clv")
        finally:
            app.dependency_overrides.clear()

        assert response.status_code == 200
        data = response.json()
        assert data["predicted_clv"] == 1250.00
        assert data["currency"] == "USD"
        assert "computed_at" in data

    async def test_get_customer_next_action(self, client: AsyncClient):
        mock_service = AsyncMock()
        mock_service.get_next_action.return_value = {
            "action": "offer_loyalty_discount",
            "reason": "Customer has low churn risk and high value, but hasn't ordered in 30 days.",
            "confidence": 0.85,
            "computed_at": datetime.now(timezone.utc),
        }
        app.dependency_overrides[get_customer_insights_service] = lambda: mock_service
        try:
            response = await client.get("/api/v1/customers/cust-001/next-action")
        finally:
            app.dependency_overrides.clear()

        assert response.status_code == 200
        data = response.json()
        assert data["action"] == "offer_loyalty_discount"
        assert "reason" in data
        assert "confidence" in data
        assert "computed_at" in data

    async def test_submit_next_action_feedback(self, client: AsyncClient):
        mock_service = AsyncMock()
        mock_service.submit_next_action_feedback.return_value = None
        app.dependency_overrides[get_customer_insights_service] = lambda: mock_service
        try:
            response = await client.post(
                "/api/v1/customers/cust-001/next-action/feedback",
                json={"feedback": "accept"}
            )
        finally:
            app.dependency_overrides.clear()

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "logged" in data["message"]


class TestHealthEndpoint:
    """Tests for GET /health."""

    async def test_health_returns_200(self, client: AsyncClient):
        """Health check returns 200 with healthy status."""
        response = await client.get("/health")

        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}
