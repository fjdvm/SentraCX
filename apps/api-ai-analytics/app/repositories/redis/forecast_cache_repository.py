"""Redis cache repository for forecast results."""

import json
import redis.asyncio as aioredis


class ForecastCacheRepository:
    """Repository for caching forecasting results in Redis."""

    def __init__(self, redis_client: aioredis.Redis) -> None:
        self._redis = redis_client

    async def get_forecast(self, key: str) -> dict | None:
        """Retrieve cached forecast data.

        Returns None if no cached data or cache expired.
        """
        data = await self._redis.get(key)
        if data is None:
            return None
        try:
            return json.loads(data)
        except (TypeError, ValueError):
            return None

    async def set_forecast(self, key: str, data: dict, ttl: int) -> None:
        """Cache forecast data with a specific TTL (in seconds)."""
        serialized = json.dumps(data, default=str)
        await self._redis.set(key, serialized, ex=ttl)

    async def invalidate(self, key: str) -> None:
        """Remove cached forecast data."""
        await self._redis.delete(key)
