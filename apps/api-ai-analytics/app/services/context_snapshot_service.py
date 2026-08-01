"""Context snapshot service for compiling global aggregate and agent-scoped crm context."""

from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.lib.crm_client import CrmClient
from app.repositories.redis.context_snapshot_cache_repository import ContextSnapshotCacheRepository
from app.ml import churn_model, clv_model
from app.helpers.customer_feature_seeder import ensure_customer_features_seeded


class ContextSnapshotService:
    """Assembles operational snapshots of the CRM, mixing global metrics with agent context."""

    def __init__(
        self,
        database: AsyncIOMotorDatabase,
        crm_client: CrmClient | None,
        cache: ContextSnapshotCacheRepository | None,
    ) -> None:
        self._db = database
        self._crm = crm_client
        self._cache = cache

    async def get_global_snapshot(self) -> dict:
        """Fetch and compile global metrics, caching via Redis."""
        if self._cache:
            cached = await self._cache.get_snapshot()
            if cached:
                return cached

        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=30)
        end_date = now
        duration = end_date - start_date
        prev_start_date = start_date - duration
        prev_end_date = start_date

        # 1. CRM Counts
        unclaimed = 0
        claimed = 0
        ongoing = 0
        active_campaigns = 0
        avg_resolution_hours = 0.0

        if self._crm:
            unclaimed = await self._crm.get_tickets_count("Unclaimed")
            claimed = await self._crm.get_tickets_count("Claimed")
            ongoing = await self._crm.get_tickets_count("Ongoing")
            active_campaigns = await self._crm.get_active_campaigns_count()

            # Avg resolution stats
            from_str = start_date.strftime("%Y-%m-%dT%H:%M:%S")
            to_str = end_date.strftime("%Y-%m-%dT%H:%M:%S")
            res_stats = await self._crm.get_resolution_stats(from_str, to_str)
            avg_resolution_hours = res_stats.get("avgResolutionHours", 0.0)

        # Ensure features are seeded
        if self._crm:
            await ensure_customer_features_seeded(self._db, self._crm, min_count=1)

        # 2. Churn & CLV
        async def calc_churn_clv(start, end):
            pipeline = [
                {"$match": {"recorded_at": {"$gte": start, "$lte": end}}},
                {"$sort": {"recorded_at": -1}},
                {
                    "$group": {
                        "_id": "$customer_id",
                        "latest_features": {"$first": "$features"},
                    }
                },
            ]
            scores, clvs = [], []
            try:
                cursor = self._db["customer_feature_logs"].aggregate(pipeline)
                async for doc in cursor:
                    feat = doc.get("latest_features")
                    if feat:
                        scores.append(churn_model.predict(feat))
                        clvs.append(clv_model.predict(feat))
            except Exception:
                pass
            return (
                sum(scores) / len(scores) if scores else 0.0,
                sum(clvs) / len(clvs) if clvs else 0.0
            )

        churn, clv = await calc_churn_clv(start_date, end_date)

        # 3. Sentiment & Categories
        pipeline_sentiment = [
            {"$match": {"analyzed_at": {"$gte": start_date, "$lte": end_date}}},
            {"$group": {"_id": None, "avg_sentiment": {"$avg": "$sentiment_score"}}},
        ]
        avg_sentiment = 0.0
        try:
            cursor = self._db["ConversationTranscripts"].aggregate(pipeline_sentiment)
            async for doc in cursor:
                avg_sentiment = doc.get("avg_sentiment", 0.0) or 0.0
        except Exception:
            pass

        # CSAT map
        csat = (avg_sentiment + 1.0) * 2.0 + 1.0

        # Category breakdown
        pipeline_cats = [
            {"$match": {"analyzed_at": {"$gte": start_date, "$lte": end_date}}},
            {"$group": {"_id": "$predicted_category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        categories = {}
        try:
            cursor = self._db["ConversationTranscripts"].aggregate(pipeline_cats)
            async for doc in cursor:
                cat_id = doc.get("_id")
                if cat_id:
                    categories[cat_id] = doc.get("count", 0)
        except Exception:
            pass

        data = {
            "open_tickets": unclaimed + claimed + ongoing,
            "unclaimed": unclaimed,
            "claimed": claimed,
            "ongoing": ongoing,
            "active_campaigns": active_campaigns,
            "avg_resolution_hours": avg_resolution_hours,
            "churn_rate_pct": churn * 100.0,
            "avg_clv": clv,
            "csat_score": csat,
            "top_ticket_categories": categories,
        }

        if self._cache:
            await self._cache.set_snapshot(data, ttl=60)

        return data

    async def get_snapshot_text(self, agent_id: str | None = None) -> str:
        """Compile the complete text snapshot including global metrics and agent claimed tickets."""
        global_data = await self.get_global_snapshot()

        lines = [
            "=== SentraCX Live Snapshot ===",
            "SYSTEM METRICS:",
            f"- Open support requests: {global_data['open_tickets']} (Unclaimed: {global_data['unclaimed']}, Claimed: {global_data['claimed']}, Ongoing: {global_data['ongoing']})",
            f"- Active campaigns: {global_data['active_campaigns']}",
            f"- Avg resolution time (last 30 days): {global_data['avg_resolution_hours']:.1f} hours",
            f"- Portfolio churn rate: {global_data['churn_rate_pct']:.1f}%",
            f"- Avg customer lifetime value: ${global_data['avg_clv']:.2f}",
            f"- Customer satisfaction (CSAT): {global_data['csat_score']:.1f} / 5",
        ]

        if global_data["top_ticket_categories"]:
            cats_str = ", ".join(f"{k} ({v})" for k, v in global_data["top_ticket_categories"].items())
            lines.append(f"- Top ticket categories: {cats_str}")

        if agent_id and self._crm:
            tickets = await self._crm.get_claimed_tickets_by_agent(agent_id, page_size=20)
            if tickets:
                lines.append(f"\nYOUR CLAIMED TICKETS (Agent: {agent_id}):")
                for i, ticket in enumerate(tickets):
                    customer = ticket.get("customer") or {}
                    user = customer.get("user") or {}
                    name = f"{user.get('firstName', '')} {user.get('lastName', '')}".strip() or "Unknown"
                    email = user.get("email") or "No Email"
                    title = ticket.get("title") or "No Title"
                    t_status = ticket.get("status") or "Claimed"
                    ctype = customer.get("customerType") or "Regular"
                    
                    customer_id = customer.get("id")
                    churn_score = 0.0
                    if customer_id:
                        try:
                            feat_log = await self._db["customer_feature_logs"].find_one({"customer_id": customer_id})
                            if feat_log and "features" in feat_log:
                                churn_score = churn_model.predict(feat_log["features"])
                        except Exception:
                            pass
                    
                    churn_str = f", Churn Risk: {churn_score * 100.0:.1f}%" if churn_score > 0.0 else ""
                    lines.append(f"{i+1}. \"{title}\" — {name} ({email}) | Status: {t_status} | Type: {ctype}{churn_str}")
            else:
                lines.append(f"\nYOUR CLAIMED TICKETS (Agent: {agent_id}):\n- None found.")

        lines.append("=== End of snapshot ===")
        return "\n".join(lines)
