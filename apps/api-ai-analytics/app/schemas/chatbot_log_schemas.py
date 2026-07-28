"""Pydantic schemas for Chatbot Logs."""

from datetime import datetime
from pydantic import BaseModel, Field


class ChatbotLogDocument(BaseModel):
    """Internal MongoDB document schema for chatbot interaction logs."""

    ticket_id: str | None = Field(default=None, description="Associated ticket ID, if any")
    customer_id: str | None = Field(default=None, description="Associated customer ID, if authenticated")
    message: str = Field(description="Customer message content")
    reply: str = Field(description="Bot reply content")
    intent: str = Field(description="Detected intent")
    should_escalate: bool = Field(description="Escalation flag")
    confidence: float = Field(description="Model confidence score")
    bot_summary: str | None = Field(default=None, description="Bot interaction summary if escalated")
    created_at: datetime = Field(description="Timestamp when log entry was created")


class ChatbotLogResponse(BaseModel):
    """API response schema for a single chatbot log record."""

    id: str = Field(description="Log ID")
    ticket_id: str | None = Field(default=None, description="Associated ticket ID")
    customer_id: str | None = Field(default=None, description="Associated customer ID")
    message: str = Field(description="Customer message content")
    reply: str = Field(description="Bot reply content")
    intent: str = Field(description="Detected intent")
    should_escalate: bool = Field(description="Escalation flag")
    confidence: float = Field(description="Model confidence score")
    bot_summary: str | None = Field(default=None, description="Bot interaction summary if escalated")
    created_at: datetime = Field(description="Timestamp of log entry")


class ChatbotLogListResponse(BaseModel):
    """Paginated list response for chatbot log entries."""

    items: list[ChatbotLogResponse] = Field(default_factory=list, description="List of log records")
    total: int = Field(description="Total count of log records matching filter")
    page: int = Field(description="Current page number")
    page_size: int = Field(description="Number of items per page")
