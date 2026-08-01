"""Redis cache repository for context snapshot results."""

import json
import redis.asyncio as aioredis


class ContextSnapshotCacheRepository:
    """Repository for caching global aggregate context snapshots in Redis."""

    def __init__(self, redis_client: aioredis.Redis) -> None:
        self._redis = redis_client
        self._key = "sentracx:analytics:global_snapshot"

    async def get_snapshot(self) -> dict | None:
        """Retrieve cached global aggregate snapshot."""
        data = await self._redis.get(self._key)
        if data is None:
            return None
        try:
            return json.loads(data)
        except (TypeError, ValueError):
            return None

    async def set_snapshot(self, data: dict, ttl: int = 60) -> None:
        """Cache global aggregate snapshot with TTL (60s default)."""
        serialized = json.dumps(data, default=str)
        await self._redis.set(self._key, serialized, ex=ttl)

    async def invalidate(self) -> None:
        """Invalidate cached global aggregate snapshot."""
        await self._redis.delete(self._key)
