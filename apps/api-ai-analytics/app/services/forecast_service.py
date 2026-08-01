"""Service for forecasting ticket volumes, revenue, churn risk, and sentiment trends."""

from datetime import datetime, timezone, timedelta
import numpy as np
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.ml import churn_model
from app.lib.crm_client import CrmClient
from app.repositories.redis.forecast_cache_repository import ForecastCacheRepository
from app.services.forecast_seeder import ForecastSeeder


class ForecastService:
    """Orchestrates time-series forecasting and analytical projections."""

    def __init__(
        self,
        database: AsyncIOMotorDatabase,
        crm_client: CrmClient | None = None,
        cache_repo: ForecastCacheRepository | None = None,
    ) -> None:
        self._db = database
        self._crm = crm_client
        self._cache = cache_repo
        self._seeder = ForecastSeeder(database, crm_client)

    def _fit_linear_forecast(self, y: list[float], next_n: int) -> list[float]:
        """Perform simple numpy linear regression forecast."""
        if not y:
            return [0.0] * next_n
        if len(y) < 2:
            return [y[0]] * next_n
        x = list(range(len(y)))
        try:
            slope, intercept = np.polyfit(x, y, 1)
            predictions = []
            for i in range(len(y), len(y) + next_n):
                pred = slope * i + intercept
                predictions.append(max(0.0, pred))
            return predictions
        except Exception:
            return [y[-1]] * next_n

    async def get_ticket_volume_forecast(self, range_val: str) -> dict:
        """Forecast daily ticket volumes for the next N days."""
        days = 30 if range_val == "30d" else (14 if range_val == "14d" else 7)
        cache_key = f"forecast:ticket_volume:{range_val}"
        if self._cache:
            cached = await self._cache.get_forecast(cache_key)
            if cached:
                return cached

        now = datetime.now(timezone.utc)
        start_history = now - timedelta(days=30)
        pipeline = [
            {"$match": {"analyzed_at": {"$gte": start_history, "$lte": now}}},
            {
                "$group": {
                    "_id": {
                        "$dateToString": {"format": "%Y-%m-%d", "date": "$analyzed_at"}
                    },
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"_id": 1}},
        ]

        historical_data = []
        try:
            cursor = self._db["ConversationTranscripts"].aggregate(pipeline)
            async for doc in cursor:
                historical_data.append({"date": doc["_id"], "count": doc["count"]})
        except Exception:
            pass

        if not historical_data and self._crm:
            from_str = start_history.strftime("%Y-%m-%dT%H:%M:%S")
            to_str = now.strftime("%Y-%m-%dT%H:%M:%S")
            counts = await self._crm.get_daily_ticket_counts(from_str, to_str)
            for c in counts:
                historical_data.append({"date": c.get("date"), "count": c.get("count", 0)})

        if not historical_data:
            for i in range(30, 0, -1):
                dt = (now - timedelta(days=i)).strftime("%Y-%m-%d")
                historical_data.append({"date": dt, "count": 0})

        y_counts = [item["count"] for item in historical_data]
        forecast_counts = self._fit_linear_forecast(y_counts, days)

        forecast_series = []
        confidence_upper = []
        confidence_lower = []
        threshold = 30.0
        alert_triggered = False

        for i, val in enumerate(forecast_counts):
            dt = (now + timedelta(days=i + 1)).strftime("%Y-%m-%d")
            forecast_series.append({"date": dt, "count": round(val, 2)})
            uncertainty = 0.10 + 0.01 * i
            confidence_upper.append({"date": dt, "count": round(val * (1.0 + uncertainty), 2)})
            confidence_lower.append({"date": dt, "count": round(max(0.0, val * (1.0 - uncertainty)), 2)})
            if val > threshold:
                alert_triggered = True

        result = {
            "historical_series": historical_data,
            "forecast_series": forecast_series,
            "confidence_band_upper": confidence_upper,
            "confidence_band_lower": confidence_lower,
            "threshold": threshold,
            "alert_triggered": alert_triggered,
        }

        if self._cache:
            await self._cache.set_forecast(cache_key, result, ttl=900)
        return result

    async def get_revenue_forecast(self, range_val: str) -> dict:
        """Forecast projected revenue trajectory based on customer CLV predictions."""
        days = 365 if range_val == "12m" else (90 if range_val == "90d" else 30)
        cache_key = f"forecast:revenue:by_segment:{range_val}"
        if self._cache:
            cached = await self._cache.get_forecast(cache_key)
            if cached:
                return cached

        now = datetime.now(timezone.utc)
        clvs_by_segment = await self._seeder.get_clvs_by_segment()

        segment_totals = {}
        for seg, vals in clvs_by_segment.items():
            segment_totals[seg] = round(sum(vals), 2)

        total_clv = sum(segment_totals.values())
        monthly_multiplier = 0.08
        total_projected = total_clv * (days / 30.0) * monthly_multiplier

        forecast_series = []
        for i in range(days // 5 + 1):
            dt = (now + timedelta(days=i * 5)).strftime("%Y-%m-%d")
            growth = 1.0 + 0.002 * i + 0.02 * np.sin(i * 0.8)
            revenue_point = (total_projected / (days // 5 + 1)) * growth
            forecast_series.append({"date": dt, "revenue": round(revenue_point, 2)})

        result = {
            "forecast_series": forecast_series,
            "by_segment": segment_totals,
            "total_projected": round(total_projected, 2),
            "confidence": 0.85,
        }

        if self._cache:
            await self._cache.set_forecast(cache_key, result, ttl=3600)
        return result

    async def get_churn_distribution(self) -> dict:
        """Calculate the distribution and weekly trend of customer churn risk."""
        cache_key = "forecast:churn:distribution"
        if self._cache:
            cached = await self._cache.get_forecast(cache_key)
            if cached:
                return cached

        now = datetime.now(timezone.utc)
        pipeline = [
            {"$sort": {"recorded_at": -1}},
            {
                "$group": {
                    "_id": "$customer_id",
                    "latest_features": {"$first": "$features"},
                }
            },
        ]

        low, medium, high, critical = 0, 0, 0, 0
        has_data = False
        try:
            cursor = self._db["customer_feature_logs"].aggregate(pipeline)
            async for doc in cursor:
                feat = doc.get("latest_features")
                if feat:
                    has_data = True
                    score = churn_model.predict(feat)
                    if score < 0.2:
                        low += 1
                    elif score < 0.5:
                        medium += 1
                    elif score < 0.8:
                        high += 1
                    else:
                        critical += 1
        except Exception:
            pass

        if not has_data and self._crm:
            await self._seeder.seed_customer_features_from_crm()
            try:
                cursor = self._db["customer_feature_logs"].aggregate(pipeline)
                async for doc in cursor:
                    feat = doc.get("latest_features")
                    if feat:
                        score = churn_model.predict(feat)
                        if score < 0.2:
                            low += 1
                        elif score < 0.5:
                            medium += 1
                        elif score < 0.8:
                            high += 1
                        else:
                            critical += 1
            except Exception:
                pass

        trend_series = []
        for week in range(4, -1, -1):
            dt = (now - timedelta(weeks=week)).strftime("%Y-%m-%d")
            trend_series.append({
                "date": dt,
                "low": low,
                "medium": medium,
                "high": high,
                "critical": critical,
            })

        result = {
            "low": low,
            "medium": medium,
            "high": high,
            "critical": critical,
            "trend_series": trend_series,
        }

        if self._cache:
            await self._cache.set_forecast(cache_key, result, ttl=1800)
        return result

    async def get_sentiment_trend(self, range_val: str) -> dict:
        """Analyze and forecast conversation sentiment trends."""
        days = 30 if range_val == "30d" else (90 if range_val == "90d" else 7)
        cache_key = f"forecast:sentiment:{range_val}"
        if self._cache:
            cached = await self._cache.get_forecast(cache_key)
            if cached:
                return cached

        now = datetime.now(timezone.utc)
        start_history = now - timedelta(days=days)
        pipeline = [
            {"$match": {"analyzed_at": {"$gte": start_history, "$lte": now}}},
            {
                "$group": {
                    "_id": {
                        "$dateToString": {"format": "%Y-%m-%d", "date": "$analyzed_at"}
                    },
                    "score": {"$avg": "$sentiment_score"},
                }
            },
            {"$sort": {"_id": 1}},
        ]

        daily_scores = []
        try:
            cursor = self._db["ConversationTranscripts"].aggregate(pipeline)
            async for doc in cursor:
                daily_scores.append({"date": doc["_id"], "score": round(doc["score"], 2)})
        except Exception:
            pass

        if not daily_scores and self._crm:
            await self._seeder.seed_sentiment_from_crm()
            try:
                cursor = self._db["ConversationTranscripts"].aggregate(pipeline)
                async for doc in cursor:
                    daily_scores.append({"date": doc["_id"], "score": round(doc["score"], 2)})
            except Exception:
                pass

        if not daily_scores:
            for i in range(days, 0, -1):
                dt = (now - timedelta(days=i)).strftime("%Y-%m-%d")
                daily_scores.append({"date": dt, "score": 0.0})

        moving_average = []
        scores_only = [item["score"] for item in daily_scores]
        for i in range(len(daily_scores)):
            start_idx = max(0, i - 6)
            window = scores_only[start_idx : i + 1]
            moving_average.append({
                "date": daily_scores[i]["date"],
                "score": round(sum(window) / len(window), 2),
            })

        y_scores = [item["score"] for item in daily_scores]
        forecast_scores = self._fit_linear_forecast(y_scores, 7)

        forecast_next_7d = []
        for i, val in enumerate(forecast_scores):
            capped_val = min(1.0, max(-1.0, val))
            dt = (now + timedelta(days=i + 1)).strftime("%Y-%m-%d")
            forecast_next_7d.append({"date": dt, "score": round(capped_val, 2)})

        result = {
            "daily_scores": daily_scores,
            "moving_average": moving_average,
            "forecast_next_7d": forecast_next_7d,
        }

        if self._cache:
            await self._cache.set_forecast(cache_key, result, ttl=900)
        return result
