"""Chatbot API routes."""

from fastapi import APIRouter, Depends
from app.api.v1.deps import get_chatbot_service
from app.services.chatbot_service import ChatbotService
from app.schemas.chatbot_schemas import ChatbotReplyRequest, ChatbotReplyResponse

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


@router.post(
    "/reply",
    response_model=ChatbotReplyResponse,
    summary="Get chatbot reply",
    description="Unified chatbot reply endpoint for authenticated or unauthenticated sessions.",
)
async def chatbot_reply(
    request: ChatbotReplyRequest,
    service: ChatbotService = Depends(get_chatbot_service),
) -> ChatbotReplyResponse:
    """Generate chatbot response."""
    history = [h.model_dump() for h in request.conversation_history]
    res = await service.reply(
        message=request.message,
        customer_id=request.customer_id,
        ticket_id=request.ticket_id,
        conversation_history=history,
    )
    return ChatbotReplyResponse(**res)
