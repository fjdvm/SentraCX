"""MongoDB repository for customer feature logs."""

from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase

_COLLECTION = "customer_feature_logs"


class CustomerFeatureRepository:
    """Repository for storing and retrieving customer feature snapshots."""

    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        self._collection = database[_COLLECTION]

    async def save_feature_log(
        self, customer_id: str, features: dict, derived_segments: list[str] | None = None, model_versions: dict | None = None
    ) -> str:
        """Save a feature snapshot for a customer.

        Returns the inserted document ID as string.
        """
        document = {
            "customer_id": customer_id,
            "features": features,
            "derived_segments": derived_segments or [],
            "recorded_at": datetime.now(timezone.utc),
            "model_versions": model_versions,
        }
        result = await self._collection.insert_one(document)
        return str(result.inserted_id)

    async def get_latest_features(
        self, customer_id: str
    ) -> dict | None:
        """Get the most recent feature snapshot for a customer.

        Returns None if no features have been recorded.
        """
        document = await self._collection.find_one(
            {"customer_id": customer_id},
            sort=[("recorded_at", -1)],
        )
        if document is None:
            return None
        return document.get("features")

    async def save_action_feedback(self, customer_id: str, feedback: str) -> str:
        """Log next-best-action feedback for model tuning."""
        document = {
            "customer_id": customer_id,
            "feedback": feedback,
            "recorded_at": datetime.now(timezone.utc),
        }
        result = await self._collection.database["nba_feedback"].insert_one(document)
        return str(result.inserted_id)

