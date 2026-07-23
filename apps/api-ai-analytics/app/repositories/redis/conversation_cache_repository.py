"""Redis cache repository for conversation analysis."""

import json
from redis.asyncio import Redis

_DEFAULT_TTL = 3600  # 1 hour


class ConversationCacheRepository:
    """Repository for caching conversation summaries and reply suggestions in Redis."""

    def __init__(self, redis_client: Redis) -> None:
        self._redis = redis_client

    def _summary_key(self, ticket_id: str) -> str:
        return f"conversation:{ticket_id}:summary"

    def _replies_key(self, ticket_id: str) -> str:
        return f"conversation:{ticket_id}:replies"

    async def get_summary(self, ticket_id: str) -> dict | None:
        """Get cached conversation summary."""
        key = self._summary_key(ticket_id)
        data = await self._redis.get(key)
        if data:
            return json.loads(data)
        return None

    async def set_summary(self, ticket_id: str, summary: dict, ttl: int = _DEFAULT_TTL) -> None:
        """Cache conversation summary with TTL."""
        key = self._summary_key(ticket_id)
        await self._redis.setex(key, ttl, json.dumps(summary))

    async def get_suggested_replies(self, ticket_id: str) -> list[dict] | None:
        """Get cached reply suggestions."""
        key = self._replies_key(ticket_id)
        data = await self._redis.get(key)
        if data:
            return json.loads(data)
        return None

    async def set_suggested_replies(self, ticket_id: str, replies: list[dict], ttl: int = 300) -> None:
        """Cache suggested replies with a shorter TTL (5 mins)."""
        key = self._replies_key(ticket_id)
        await self._redis.setex(key, ttl, json.dumps(replies))

    async def invalidate(self, ticket_id: str) -> None:
        """Invalidate all cached data for a conversation."""
        await self._redis.delete(self._summary_key(ticket_id), self._replies_key(ticket_id))
