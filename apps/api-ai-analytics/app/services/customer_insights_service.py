"""Customer Insights service — orchestrates scoring pipeline."""

from datetime import datetime, timezone

from app.lib.crm_client import CrmClient
from app.ml import churn_model, clv_model, nba_model, segment_model
from app.repositories.mongo.customer_feature_repository import (
    CustomerFeatureRepository,
)
from app.repositories.redis.customer_cache_repository import (
    CustomerCacheRepository,
)
from app.schemas.customer_schemas import (
    CustomerFeatures,
    CustomerInsightsResponse,
    NextBestAction,
)
from app.services.config_service import ConfigService


class CustomerNotFoundError(Exception):
    """Raised when customer does not exist in CRM."""


class CrmUnavailableError(Exception):
    """Raised when CRM API is unreachable."""


class CustomerInsightsService:
    """Orchestrates churn, CLV, and NBA scoring for a customer."""

    def __init__(
        self,
        crm_client: CrmClient,
        cache_repo: CustomerCacheRepository,
        feature_repo: CustomerFeatureRepository,
        config_service: ConfigService = None,
    ) -> None:
        self._crm = crm_client
        self._cache = cache_repo
        self._features = feature_repo
        self._config = config_service

    async def get_insights(
        self, customer_id: str
    ) -> CustomerInsightsResponse:
        """Get customer insights, using cache when available."""
        # 1. Check cache
        cached = await self._cache.get_insights(customer_id)
        if cached:
            return CustomerInsightsResponse(
                customer_id=customer_id,
                churn_score=cached["churn_score"],
                clv_prediction=cached["clv_prediction"],
                next_best_action=NextBestAction(**cached["next_best_action"]),
                computed_at=cached["computed_at"],
                cached=True,
            )

        # 2. Fetch from CRM
        customer = await self._crm.get_customer(customer_id)
        if customer is None:
            raise CustomerNotFoundError(
                f"Customer {customer_id} not found"
            )

        orders = await self._crm.get_customer_orders(customer_id)

        # 3. Build feature vector
        features = self._build_features(customer_id, customer, orders)

        # 4. Run ML models
        churn_score = churn_model.predict(features.model_dump())
        clv_prediction = clv_model.predict(features.model_dump())

        nba_input = features.model_dump()
        nba_input["churn_score"] = churn_score
        nba_input["clv_prediction"] = clv_prediction
        nba_result = nba_model.predict(nba_input)

        segment = segment_model.predict(features.model_dump(), churn_score, clv_prediction)

        computed_at = datetime.now(timezone.utc)

        # 5. Build response
        response = CustomerInsightsResponse(
            customer_id=customer_id,
            churn_score=churn_score,
            clv_prediction=clv_prediction,
            next_best_action=NextBestAction(**nba_result),
            computed_at=computed_at,
            cached=False,
        )

        # 6. Cache result
        cache_data = response.model_dump(mode="json")
        cache_data["segment"] = segment
        await self._cache.set_insights(
            customer_id, cache_data
        )

        # 7. Log features to MongoDB
        from app.core.config import get_settings
        settings = get_settings()
        await self._features.save_feature_log(
            customer_id,
            features.model_dump(),
            derived_segments=[segment],
            model_versions={
                "churn": settings.model_version_churn,
                "clv": settings.model_version_clv,
            }
        )

        return response

    async def get_segment(self, customer_id: str) -> dict:
        """Get the customer segment category and model confidence."""
        cached = await self._cache.get_insights(customer_id)
        if not cached or "segment" not in cached:
            await self.get_insights(customer_id)
            cached = await self._cache.get_insights(customer_id)

        segment = cached.get("segment", "Standard")
        computed_at = cached.get("computed_at")
        if isinstance(computed_at, str):
            computed_at = datetime.fromisoformat(computed_at)

        # Segment confidence is 1.0 since it's rule-based heuristic
        confidence = 1.0

        # Apply confidence thresholds logic
        nba_threshold = 0.70
        if self._config:
            try:
                thresholds = await self._config.get_config("confidence-thresholds")
                nba_threshold = thresholds.get("nba_threshold", 0.70)
            except Exception:
                pass

        if confidence < nba_threshold:
            segment = "Unclassified"

        return {
            "segment": segment,
            "computed_at": computed_at,
            "confidence": confidence,
        }

    async def get_churn_score(self, customer_id: str) -> dict:
        """Get customer churn score, risk level, and contributing factors."""
        cached = await self._cache.get_insights(customer_id)
        if not cached:
            await self.get_insights(customer_id)
            cached = await self._cache.get_insights(customer_id)

        score = cached.get("churn_score", 0.0)
        computed_at = cached.get("computed_at")
        if isinstance(computed_at, str):
            computed_at = datetime.fromisoformat(computed_at)

        # Churn threshold check from ConfigService
        churn_threshold = 0.60
        if self._config:
            try:
                cfg = await self._config.get_config("churn-threshold")
                churn_threshold = cfg.get("churn_threshold", 0.60)
            except Exception:
                pass

        risk_level = "low"
        if score >= churn_threshold:
            risk_level = "high"
        elif score >= churn_threshold * 0.6:
            risk_level = "medium"

        # Construct contributing factors based on customer stats or NBA
        factors = []
        nba_reason = cached.get("next_best_action", {}).get("reason", "")
        if score >= churn_threshold * 0.6:
            factors.append(nba_reason)
        else:
            factors.append("Recent positive interactions and active orders")

        return {
            "score": score,
            "risk_level": risk_level,
            "contributing_factors": factors,
            "computed_at": computed_at,
        }

    async def get_clv(self, customer_id: str) -> dict:
        """Get customer predicted lifetime value."""
        cached = await self._cache.get_insights(customer_id)
        if not cached:
            await self.get_insights(customer_id)
            cached = await self._cache.get_insights(customer_id)

        clv = cached.get("clv_prediction", 0.0)
        computed_at = cached.get("computed_at")
        if isinstance(computed_at, str):
            computed_at = datetime.fromisoformat(computed_at)

        return {
            "predicted_clv": clv,
            "currency": "USD",
            "computed_at": computed_at,
        }

    async def get_next_action(self, customer_id: str) -> dict:
        """Get the recommended next-best-action for the customer."""
        cached = await self._cache.get_insights(customer_id)
        if not cached:
            await self.get_insights(customer_id)
            cached = await self._cache.get_insights(customer_id)

        nba = cached.get("next_best_action", {})
        action = nba.get("action", "continue_nurture_sequence")
        reason = nba.get("reason", "Customer is stable, continue regular engagement")
        confidence = nba.get("confidence", 0.5)

        computed_at = cached.get("computed_at")
        if isinstance(computed_at, str):
            computed_at = datetime.fromisoformat(computed_at)

        # Apply confidence threshold
        nba_threshold = 0.70
        if self._config:
            try:
                thresholds = await self._config.get_config("confidence-thresholds")
                nba_threshold = thresholds.get("nba_threshold", 0.70)
            except Exception:
                pass

        if confidence < nba_threshold:
            action = "continue_nurture_sequence"
            reason = "Confidence is below the threshold, falling back to standard nurturing"

        return {
            "action": action,
            "reason": reason,
            "confidence": confidence,
            "computed_at": computed_at,
        }

    async def submit_next_action_feedback(self, customer_id: str, feedback: str) -> None:
        """Submit feedback for the recommended next-best-action."""
        await self._features.save_action_feedback(customer_id, feedback)

    def _build_features(
        self, customer_id: str, customer: dict, orders: list[dict]
    ) -> CustomerFeatures:
        """Build ML feature vector from CRM data."""
        now = datetime.now(timezone.utc)

        # Account age
        created_at = customer.get("createdAt") or customer.get("created_at")
        account_age_days = 0
        if created_at:
            try:
                created = datetime.fromisoformat(str(created_at).replace("Z", "+00:00"))
                account_age_days = (now - created).days
            except (ValueError, TypeError):
                pass

        # Order statistics
        total_orders = len(orders)
        total_order_value = 0.0
        last_order_date = None

        for order in orders:
            total_value = order.get("totalAmount") or order.get("total") or 0
            total_order_value += float(total_value)
            order_date_str = order.get("orderDate") or order.get("createdAt")
            if order_date_str:
                try:
                    order_date = datetime.fromisoformat(
                        str(order_date_str).replace("Z", "+00:00")
                    )
                    if last_order_date is None or order_date > last_order_date:
                        last_order_date = order_date
                except (ValueError, TypeError):
                    pass

        days_since_last_order = 0
        if last_order_date:
            days_since_last_order = (now - last_order_date).days

        average_order_value = (
            total_order_value / total_orders if total_orders > 0 else 0.0
        )

        # Order frequency per month
        order_frequency_per_month = 0.0
        if account_age_days > 0:
            months = max(account_age_days / 30.0, 1.0)
            order_frequency_per_month = total_orders / months

        # Simplified trend (no historical comparison yet)
        order_frequency_trend = 0.0
        if total_orders >= 3 and days_since_last_order > 60:
            order_frequency_trend = -0.3
        elif total_orders >= 3 and days_since_last_order < 30:
            order_frequency_trend = 0.2

        # Ticket count (from customer profile if available)
        ticket_count = customer.get("ticketCount") or customer.get(
            "ticket_count_last_90d", 0
        )

        return CustomerFeatures(
            customer_id=customer_id,
            days_since_last_order=days_since_last_order,
            order_frequency_trend=order_frequency_trend,
            ticket_count_last_90d=int(ticket_count),
            account_age_days=account_age_days,
            total_orders=total_orders,
            total_order_value=total_order_value,
            average_order_value=average_order_value,
            order_frequency_per_month=round(order_frequency_per_month, 2),
        )
