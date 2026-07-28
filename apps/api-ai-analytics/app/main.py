"""SentraCX AI Analytics API — application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from scalar_fastapi import get_scalar_api_reference

from app.api.v1.routes.customers import router as customers_router
from app.api.v1.routes.tickets import router as tickets_router
from app.api.v1.routes.conversations import router as conversations_router
from app.api.v1.routes.chatbot import router as chatbot_router
from app.api.v1.routes.chatbot_logs import router as chatbot_logs_router
from app.api.v1.routes.dashboard import router as dashboard_router
from app.api.v1.routes.config import router as config_router
from app.api.v1.routes.forecasts import router as forecasts_router
from app.api.v1.routes.watchlist import router as watchlist_router
from app.api.v1.routes.health import router as health_router
from app.core.config import get_settings
from app.db.mongo import close_mongo, connect_mongo, get_database, setup_indexes
from app.db.redis import close_redis, connect_redis, get_redis_client
from app.core.scheduler import start_scheduler, stop_scheduler
from app.repositories.mongo.ticket_repository import TicketRepository
from app.repositories.mongo.conversation_transcript_repository import ConversationTranscriptRepository
from app.services.ticket_ingestion_service import TicketIngestionService

logger = logging.getLogger(__name__)

_ticket_ingestion_service: TicketIngestionService | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown lifecycle."""
    global _ticket_ingestion_service
    settings = get_settings()

    # Startup
    logger.info("Connecting to MongoDB at %s", settings.mongo_uri)
    await connect_mongo(settings.mongo_uri, settings.mongo_database)
    logger.info("MongoDB connected")
    
    # Initialize TTL Indexes
    logger.info("Setting up MongoDB TTL indexes")
    await setup_indexes()
    logger.info("MongoDB TTL indexes setup complete")

    logger.info("Connecting to Redis at %s", settings.redis_url)
    await connect_redis(settings.redis_url)
    logger.info("Redis connected")

    # Start APScheduler
    start_scheduler()

    # Start Real-Time Ticket/Message Ingestion
    redis_client = get_redis_client()
    db = get_database()
    ticket_repo = TicketRepository(db)
    transcript_repo = ConversationTranscriptRepository(db)

    _ticket_ingestion_service = TicketIngestionService(
        redis_client=redis_client,
        ticket_repo=ticket_repo,
        transcript_repo=transcript_repo
    )
    _ticket_ingestion_service.start()

    yield

    # Shutdown
    if _ticket_ingestion_service:
        await _ticket_ingestion_service.stop()
        _ticket_ingestion_service = None

    stop_scheduler()

    logger.info("Closing Redis connection")
    await close_redis()
    logger.info("Closing MongoDB connection")
    await close_mongo()
    logger.info("Shutdown complete")



from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="SentraCX - AI Analytics API",
    description="AI-powered analytics and insights service for SentraCX platform.",
    version="0.1.0",
    docs_url=None,  # Disable default Swagger UI
    lifespan=lifespan,
)

# Enable CORS for frontend cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register routers
app.include_router(customers_router, prefix="/api/v1")
app.include_router(tickets_router, prefix="/api/v1")
app.include_router(conversations_router, prefix="/api/v1")
app.include_router(chatbot_router, prefix="/api/v1")
app.include_router(chatbot_logs_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(forecasts_router, prefix="/api/v1")
app.include_router(watchlist_router, prefix="/api/v1")
app.include_router(config_router, prefix="/api/v1")
app.include_router(health_router, prefix="/api/v1")


@app.get("/docs", include_in_schema=False)
async def scalar_docs():
    return get_scalar_api_reference(
        openapi_url=app.openapi_url,
        title=app.title,
    )


@app.get("/health")
async def health_check():
    """Check the health status of the API."""
    return {"status": "healthy"}
