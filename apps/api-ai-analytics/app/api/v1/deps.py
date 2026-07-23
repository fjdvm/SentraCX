"""Dependency injection for API v1 routes."""

from app.core.config import get_settings
from app.db.mongo import get_database
from app.db.redis import get_redis_client
from app.lib.crm_client import CrmClient
from app.repositories.mongo.customer_feature_repository import (
    CustomerFeatureRepository,
)
from app.repositories.redis.customer_cache_repository import (
    CustomerCacheRepository,
)
from app.services.customer_insights_service import CustomerInsightsService
from app.lib.groq_client import GroqClient
from app.ml.ticket_analyzer import TicketAnalyzer
from app.repositories.mongo.conversation_transcript_repository import ConversationTranscriptRepository
from app.repositories.redis.ticket_sentiment_repository import TicketSentimentRepository
from app.services.ticket_analysis_service import TicketAnalysisService
from app.repositories.mongo.config_repository import ConfigRepository
from app.repositories.redis.config_cache_repository import ConfigCacheRepository
from app.services.config_service import ConfigService
from app.ml.conversation_analyzer import ConversationAnalyzer
from app.repositories.redis.conversation_cache_repository import ConversationCacheRepository
from app.services.conversation_analysis_service import ConversationAnalysisService
from app.services.dashboard_service import DashboardService



def get_customer_insights_service() -> CustomerInsightsService:
    """Build and return CustomerInsightsService with all dependencies."""
    settings = get_settings()

    crm_client = CrmClient(
        base_url=settings.crm_api_base_url,
        service_token=settings.crm_service_token,
    )

    redis_client = get_redis_client()
    cache_repo = CustomerCacheRepository(redis_client)

    database = get_database()
    feature_repo = CustomerFeatureRepository(database)
    config_service = get_config_service()

    return CustomerInsightsService(
        crm_client=crm_client,
        cache_repo=cache_repo,
        feature_repo=feature_repo,
        config_service=config_service,
    )

def get_ticket_analysis_service() -> TicketAnalysisService:
    """Build and return TicketAnalysisService with all dependencies."""
    settings = get_settings()

    crm_client = CrmClient(
        base_url=settings.crm_api_base_url,
        service_token=settings.crm_service_token,
    )
    
    groq_client = GroqClient(
        api_key=settings.groq_api_key,
        model_id=settings.groq_model_id,
    )
    analyzer = TicketAnalyzer(groq_client=groq_client)

    redis_client = get_redis_client()
    redis_repo = TicketSentimentRepository(redis_client)

    database = get_database()
    mongo_repo = ConversationTranscriptRepository(database)

    return TicketAnalysisService(
        crm_client=crm_client,
        analyzer=analyzer,
        redis_repo=redis_repo,
        mongo_repo=mongo_repo,
    )


def get_config_service() -> ConfigService:
    """Build and return ConfigService with all dependencies."""
    redis_client = get_redis_client()
    cache_repo = ConfigCacheRepository(redis_client)

    database = get_database()
    config_repo = ConfigRepository(database)

    return ConfigService(
        config_repo=config_repo,
        cache_repo=cache_repo,
    )


def get_conversation_analysis_service() -> ConversationAnalysisService:
    """Build and return ConversationAnalysisService with all dependencies."""
    settings = get_settings()

    crm_client = CrmClient(
        base_url=settings.crm_api_base_url,
        service_token=settings.crm_service_token,
    )

    groq_client = GroqClient(
        api_key=settings.groq_api_key,
        model_id=settings.groq_model_id,
    )
    analyzer = ConversationAnalyzer(groq_client=groq_client)

    redis_client = get_redis_client()
    cache_repo = ConversationCacheRepository(redis_client)

    database = get_database()
    mongo_repo = ConversationTranscriptRepository(database)

    return ConversationAnalysisService(
        crm_client=crm_client,
        analyzer=analyzer,
        cache_repo=cache_repo,
        mongo_repo=mongo_repo,
    )


def get_dashboard_service() -> DashboardService:
    """Build and return DashboardService with all dependencies."""
    settings = get_settings()
    database = get_database()
    groq_client = GroqClient(
        api_key=settings.groq_api_key,
        model_id=settings.groq_model_id,
    )
    return DashboardService(database=database, groq_client=groq_client)

