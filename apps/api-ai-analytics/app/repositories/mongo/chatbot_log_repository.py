"""MongoDB repository for logging chatbot interactions."""

from motor.motor_asyncio import AsyncIOMotorDatabase
from app.schemas.chatbot_log_schemas import ChatbotLogDocument


class ChatbotLogRepository:
    """Repository for managing chatbot logs in MongoDB."""

    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        self._collection = database["ChatbotLogs"]

    async def insert(self, log: ChatbotLogDocument) -> None:
        """Insert a chatbot interaction log document."""
        doc = log.model_dump()
        await self._collection.insert_one(doc)

    async def list(self, skip: int = 0, limit: int = 20, escalated_only: bool = False) -> list[dict]:
        """Fetch a paginated list of chatbot logs."""
        query = {}
        if escalated_only:
            query["should_escalate"] = True

        cursor = self._collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        results = []
        async for doc in cursor:
            doc["id"] = str(doc.get("_id", ""))
            results.append(doc)
        return results

    async def count(self, escalated_only: bool = False) -> int:
        """Get the total count of chatbot log documents matching filter."""
        query = {}
        if escalated_only:
            query["should_escalate"] = True
        return await self._collection.count_documents(query)
