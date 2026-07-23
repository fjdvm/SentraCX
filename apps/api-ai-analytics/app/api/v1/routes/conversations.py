from datetime import datetime, timezone
from fastapi import APIRouter, status, Depends

from app.api.v1.deps import get_conversation_analysis_service
from app.services.conversation_analysis_service import ConversationAnalysisService
from app.schemas.conversation_schemas import (
    MessageAnalysisRequest,
    MessageAnalysisResponse,
    ConversationSummaryResponse,
    SuggestedRepliesResponse,
    SuggestedReply,
    IntentDetectionRequest,
    IntentDetectionResponse,
    ConversationEntitiesResponse,
    EntityReference,
)

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post(
    "/{id}/analyze-message",
    response_model=MessageAnalysisResponse,
    summary="Analyze real-time message",
    description="Analyze a single conversation message for sentiment and escalation flag.",
)
async def analyze_message(
    id: str,
    request: MessageAnalysisRequest,
    service: ConversationAnalysisService = Depends(get_conversation_analysis_service)
) -> MessageAnalysisResponse:
    """Analyze real-time conversation message sentiment and escalation risk."""
    res = await service.analyze_message(id, request.text, request.sender_role)
    return MessageAnalysisResponse(**res)


@router.get(
    "/{id}/summary",
    response_model=ConversationSummaryResponse,
    summary="Get conversation summary",
    description="Retrieve an on-demand, potentially cached summary of the conversation.",
)
async def get_conversation_summary(
    id: str,
    service: ConversationAnalysisService = Depends(get_conversation_analysis_service)
) -> ConversationSummaryResponse:
    """Generate or retrieve a summary of a conversation."""
    res = await service.get_summary(id)
    return ConversationSummaryResponse(**res)


@router.post(
    "/{id}/suggest-replies",
    response_model=SuggestedRepliesResponse,
    summary="Suggest agent replies",
    description="Generate smart replies for the agent based on conversation context.",
)
async def suggest_replies(
    id: str,
    service: ConversationAnalysisService = Depends(get_conversation_analysis_service)
) -> SuggestedRepliesResponse:
    """Get AI suggestions for conversation replies."""
    replies = await service.suggest_replies(id)
    return SuggestedRepliesResponse(
        suggestions=[SuggestedReply(**r) for r in replies]
    )


@router.post(
    "/{id}/detect-intent",
    response_model=IntentDetectionResponse,
    summary="Detect conversation intent",
    description="Detect customer intent from conversation history.",
)
async def detect_intent(
    id: str,
    request: IntentDetectionRequest,
    service: ConversationAnalysisService = Depends(get_conversation_analysis_service)
) -> IntentDetectionResponse:
    """Detect intent from text or conversation segment."""
    res = await service.detect_intent(request.text)
    return IntentDetectionResponse(**res)


@router.get(
    "/{id}/entities",
    response_model=ConversationEntitiesResponse,
    summary="Extract conversation entities",
    description="Extract key entities like order numbers, cross-referencing OOS details.",
)
async def get_conversation_entities(
    id: str,
    service: ConversationAnalysisService = Depends(get_conversation_analysis_service)
) -> ConversationEntitiesResponse:
    """Get entities extracted from the conversation history."""
    entities = await service.get_entities(id)
    return ConversationEntitiesResponse(
        entities=[EntityReference(**ent) for ent in entities]
    )
