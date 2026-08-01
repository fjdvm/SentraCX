"""Service for detecting real-time anomalies and trend deviations from CRM data."""

from datetime import datetime, timezone
import hashlib
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.lib.crm_client import CrmClient
from app.ml import churn_model

class AnomalyDetectionService:
    """Detects and records anomalies dynamically by analyzing CRM data."""

    def __init__(self, database: AsyncIOMotorDatabase, crm_client: CrmClient) -> None:
        self._db = database
        self._crm = crm_client

    async def detect_and_sync_anomalies(self) -> list[dict]:
        """Run anomaly detection checks, sync with MongoDB store, and return active anomalies."""
        if not self._crm:
            return []

        anomalies = []
        now = datetime.now(timezone.utc)

        try:
            # 1. Fetch tickets and customers from CRM
            customers = await self._crm.get_customers(page_size=100)
            
            # 2. Check 1: Unclaimed support ticket backlog volume spike
            unclaimed_count = await self._crm.get_tickets_count("Unclaimed")
            if unclaimed_count > 5:
                anomalies.append({
                    "anomaly_type": "ticket_volume_spike",
                    "description": f"Support backlog alert: {unclaimed_count} unclaimed tickets require urgent agent assignment.",
                    "severity": "high" if unclaimed_count < 15 else "critical",
                    "status": "open",
                    "detected_at": now,
                })

            # 3. Check 2: Churn risk cluster (High Watchlist volume)
            at_risk_count = 0
            for c in customers:
                cust_id = c.get("id") or c.get("customerId")
                if not cust_id:
                    continue
                orders = await self._crm.get_customer_orders(cust_id)
                # A quick manual inline check to estimate churn score
                # Fetch ticket count
                tickets_count = await self._crm.get_tickets_count_by_customer(cust_id)
                
                # Simple recency
                days_since_last_order = 365
                if orders:
                    last_order = orders[0]
                    order_date_str = last_order.get("orderedAt") or last_order.get("orderDate") or last_order.get("createdAt")
                    if order_date_str:
                        try:
                            order_date = datetime.fromisoformat(str(order_date_str).replace("Z", "+00:00"))
                            days_since_last_order = max((now - order_date).days, 0)
                        except Exception:
                            pass
                
                features = {
                    "days_since_last_order": days_since_last_order,
                    "order_frequency_trend": -0.3 if len(orders) >= 3 and days_since_last_order > 60 else 0.0,
                    "ticket_count_last_90d": tickets_count,
                    "account_age_days": 100, # default to avoid new account discount
                    "total_orders": len(orders)
                }
                score = churn_model.predict(features)
                if score >= 0.4:
                    at_risk_count += 1

            if at_risk_count > 0:
                anomalies.append({
                    "anomaly_type": "churn_risk_elevation",
                    "description": f"Elevation in churn risk: {at_risk_count} customers have hit elevated churn risk scores >= 40%.",
                    "severity": "medium" if at_risk_count < 3 else "high",
                    "status": "open",
                    "detected_at": now,
                })

            # 4. Check 3: Idle customers with no engagement (Lost Leads)
            idle_count = 0
            for c in customers:
                cust_id = c.get("id") or c.get("customerId")
                if not cust_id:
                    continue
                orders = await self._crm.get_customer_orders(cust_id)
                if len(orders) == 0:
                    created_at_str = c.get("createdAt")
                    if created_at_str:
                        try:
                            created_at = datetime.fromisoformat(str(created_at_str).replace("Z", "+00:00"))
                            age = (now - created_at).days
                            if age > 60:
                                idle_count += 1
                        except Exception:
                            pass
            
            if idle_count > 0:
                anomalies.append({
                    "anomaly_type": "engagement_drop",
                    "description": f"Engagement deficit: {idle_count} registered customer profiles have never completed an order.",
                    "severity": "low",
                    "status": "open",
                    "detected_at": now,
                })

        except Exception:
            pass

        # Sync detected anomalies to DB
        synced = []
        for anom in anomalies:
            # Deterministic ID based on description and type so we do not duplicate
            unique_str = f"{anom['anomaly_type']}:{anom['description']}"
            anom_id = "anom-" + hashlib.md5(unique_str.encode()).hexdigest()[:8]
            anom["anomaly_id"] = anom_id

            try:
                # Find existing anomaly by ID
                existing = await self._db["anomalies"].find_one({"anomaly_id": anom_id})
                if existing:
                    # Keep existing status (e.g. if acknowledged or resolved)
                    anom["status"] = existing.get("status", "open")
                    anom["detected_at"] = existing.get("detected_at", now)
                    # Update status in the dict
                else:
                    # Insert new anomaly
                    await self._db["anomalies"].insert_one(anom.copy())
                
                synced.append(anom)
            except Exception:
                synced.append(anom)

        return synced
