import asyncio
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

async def seed_mock_anomalies():
    print("Connecting to MongoDB...")
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["ai_analytics"]
    anomalies_collection = db["anomalies"]
    
    mock_anomalies = [
        {
            "anomaly_id": "anom-mock-001",
            "anomaly_type": "ticket_volume_spike",
            "description": "Unusually high number of support tickets regarding the new checkout flow.",
            "severity": "high",
            "status": "open",
            "detected_at": datetime.now(timezone.utc)
        },
        {
            "anomaly_id": "anom-mock-002",
            "anomaly_type": "churn_risk_elevation",
            "description": "5 high-value enterprise customers have shown a sudden drop in engagement this week.",
            "severity": "critical",
            "status": "investigating",
            "detected_at": datetime.now(timezone.utc)
        }
    ]
    
    # Clean up existing mocks first to prevent duplicates
    await anomalies_collection.delete_many({"anomaly_id": {"$regex": "^anom-mock"}})
    
    # Insert new mocks
    result = await anomalies_collection.insert_many(mock_anomalies)
    print(f"Successfully inserted {len(result.inserted_ids)} mock anomalies.")

if __name__ == "__main__":
    asyncio.run(seed_mock_anomalies())
