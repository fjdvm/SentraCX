import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.services.dashboard_service import DashboardService
from app.lib.crm_client import CrmClient
import os

async def main():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["ai_analytics"]
    crm = CrmClient(base_url="http://localhost:5000") # dummy url
    svc = DashboardService(database=db, crm_client=crm)
    
    try:
        anoms = await svc.get_anomalies()
        print("Anomalies:", anoms)
    except Exception as e:
        print("Error:", repr(e))

if __name__ == "__main__":
    asyncio.run(main())
