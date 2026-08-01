"""Watchlist service orchestrating at-risk customer aggregation and calculation."""

from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.ml import churn_model
from app.lib.crm_client import CrmClient


class WatchlistService:
    """Service to aggregate, predict, and retrieve customer churn risk details."""

    def __init__(
        self,
        database: AsyncIOMotorDatabase,
        crm_client: CrmClient = None,
    ) -> None:
        self._db = database
        self._crm = crm_client

    async def get_at_risk_customers(self, limit: int = 10) -> list[dict]:
        """Fetch top N customers with highest churn scores, using MongoDB logs or falling back to CRM."""
        # 1. Query MongoDB customer_feature_logs
        pipeline = [
            {"$sort": {"recorded_at": -1}},
            {
                "$group": {
                    "_id": "$customer_id",
                    "latest_features": {"$first": "$features"},
                }
            },
        ]

        candidates = []
        seen_ids = set()
        try:
            cursor = self._db["customer_feature_logs"].aggregate(pipeline)
            async for doc in cursor:
                cust_id = doc["_id"]
                feat = doc.get("latest_features")
                if feat:
                    score = churn_model.predict(feat)
                    if score >= 0.5:
                        candidates.append((cust_id, score, feat))
                        seen_ids.add(cust_id)
        except Exception:
            pass

        # 2. If fewer than requested, query CRM for fresh batch and predict on-the-fly
        if len(candidates) < limit and self._crm:
            try:
                crm_customers = await self._crm.get_customers(page_size=50)
                for cust in crm_customers:
                    cust_id = cust.get("id") or cust.get("customerId")
                    if not cust_id or cust_id in seen_ids:
                        continue

                    orders = await self._crm.get_customer_orders(cust_id)
                    feat = await self._compute_features_from_crm(cust_id, cust, orders)
                    score = churn_model.predict(feat)
                    if score >= 0.4:
                        candidates.append((cust_id, score, feat))
                        seen_ids.add(cust_id)
            except Exception:
                pass

        candidates.sort(key=lambda x: x[1], reverse=True)
        candidates = candidates[:limit]

        # 3. Enrich customer names from CRM and build standard items
        customers = []
        for cust_id, score, feat in candidates:
            # Fallback name
            name = f"Customer {cust_id[:4]}"
            if self._crm:
                try:
                    cust_data = await self._crm.get_customer(cust_id)
                    if cust_data:
                        name = f"{cust_data.get('firstName', '')} {cust_data.get('lastName', '')}".strip() or name
                except Exception:
                    pass

            entry = self._build_customer_entry(cust_id, score, feat, name)
            customers.append(entry)

        return customers

    async def _compute_features_from_crm(self, customer_id: str, customer: dict, orders: list[dict]) -> dict:
        """Compute the feature set manually from CRM details."""
        now = datetime.now(timezone.utc)
        
        # Account age
        created_at_str = customer.get("createdAt")
        account_age_days = 365
        if created_at_str:
            try:
                created_at = datetime.fromisoformat(str(created_at_str).replace("Z", "+00:00"))
                account_age_days = max((now - created_at).days, 1)
            except Exception:
                pass

        # Orders aggregation
        total_orders = len(orders)
        total_order_value = 0.0
        last_order_date = None
        for order in orders:
            total_value = order.get("totalAmount") or order.get("total") or 0.0
            total_order_value += float(total_value)
            order_date_str = order.get("orderDate") or order.get("orderedAt") or order.get("createdAt")
            if order_date_str:
                try:
                    order_date = datetime.fromisoformat(str(order_date_str).replace("Z", "+00:00"))
                    if last_order_date is None or order_date > last_order_date:
                        last_order_date = order_date
                except Exception:
                    pass

        days_since_last_order = 0
        if last_order_date:
            days_since_last_order = (now - last_order_date).days

        # Order frequency trend
        order_frequency_trend = 0.0
        if total_orders >= 3 and days_since_last_order > 60:
            order_frequency_trend = -0.3
        elif total_orders >= 3 and days_since_last_order < 30:
            order_frequency_trend = 0.2

        ticket_count = 0
        if self._crm:
            try:
                ticket_res = await self._crm.get_tickets_count_by_customer(customer_id)
                ticket_count = ticket_res
            except Exception:
                pass

        return {
            "customer_id": customer_id,
            "days_since_last_order": days_since_last_order,
            "order_frequency_trend": order_frequency_trend,
            "ticket_count_last_90d": ticket_count,
            "account_age_days": account_age_days,
            "total_orders": total_orders,
            "total_order_value": total_order_value,
        }

    def _build_customer_entry(self, cust_id: str, score: float, feat: dict, name: str) -> dict:
        """Enrich entry and construct Pydantic-compatible dict."""
        recommended_action = "Initiate follow-up call"
        factors = []

        days_since_last_order = feat.get("days_since_last_order", 0)
        ticket_count = feat.get("ticket_count_last_90d", 0)

        if days_since_last_order > 90:
            factors.append("No active orders in past 90 days")
        elif days_since_last_order > 30:
            factors.append("Inactivity for over 30 days")
            
        if score > 0.7:
            factors.append("Low overall engagement score")
        if feat.get("total_orders", 0) > 5 and days_since_last_order > 20:
            factors.append("Order frequency decline")
        if ticket_count >= 3:
            factors.append("Frequent support ticket submittals")

        if not factors:
            factors.append("Decreased interaction frequency")

        if score >= 0.8:
            risk_level = "critical"
            recommended_action = "Send personalized retention discount coupon"
        elif score >= 0.6:
            risk_level = "high"
            recommended_action = "Assign direct support manager account review"
        else:
            risk_level = "medium"
            recommended_action = "Send feedback survey email"

        return {
            "customer_id": cust_id,
            "name": name,
            "churn_score": round(score, 2),
            "risk_level": risk_level,
            "contributing_factors": factors,
            "recommended_action": recommended_action,
        }
