"""Chatbot Logs API routes."""

from fastapi import APIRouter, Depends, Query
from app.api.v1.deps import get_chatbot_log_repository
from app.repositories.mongo.chatbot_log_repository import ChatbotLogRepository
from app.schemas.chatbot_log_schemas import ChatbotLogListResponse, ChatbotLogResponse

router = APIRouter(prefix="/chatbot/logs", tags=["chatbot"])


@router.get(
    "",
    response_model=ChatbotLogListResponse,
    summary="Get chatbot logs",
    description="Fetch paginated list of chatbot conversation logs for quality review.",
)
async def list_chatbot_logs(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    escalated_only: bool = Query(default=False, description="Filter for escalated conversations only"),
    repo: ChatbotLogRepository = Depends(get_chatbot_log_repository),
) -> ChatbotLogListResponse:
    """Fetch paginated chatbot interaction logs."""
    skip = (page - 1) * page_size
    items_raw = await repo.list(skip=skip, limit=page_size, escalated_only=escalated_only)
    total = await repo.count(escalated_only=escalated_only)

    items = [ChatbotLogResponse(**doc) for doc in items_raw]
    return ChatbotLogListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )
