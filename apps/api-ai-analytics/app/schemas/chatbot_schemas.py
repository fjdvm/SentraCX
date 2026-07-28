"""Pydantic schemas for Chatbot API."""

from pydantic import BaseModel, Field


class ChatHistoryEntry(BaseModel):
    """Single history entry of the chat conversation."""

    role: str = Field(description="Role of the sender (customer or bot)")
    content: str = Field(description="Message content")


class ChatbotReplyRequest(BaseModel):
    """Request schema for chatbot reply."""

    message: str = Field(description="The latest customer message")
    customer_id: str | None = Field(default=None, description="The customer ID, if authenticated")
    ticket_id: str | None = Field(default=None, description="The ticket ID, if an active session exists")
    conversation_history: list[ChatHistoryEntry] = Field(default_factory=list, description="Recent conversation history")


class ChatbotReplyResponse(BaseModel):
    """Response schema for chatbot reply."""

    reply: str = Field(description="The chatbot response text")
    intent: str = Field(description="Detected customer intent")
    should_escalate: bool = Field(description="True if escalation to live agent is recommended")
    confidence: float = Field(description="Model confidence score")
    bot_summary: str | None = Field(default=None, description="Summary of the bot interaction (populated on escalation)")
