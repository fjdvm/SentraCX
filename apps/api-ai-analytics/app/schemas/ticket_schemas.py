"""Pydantic schemas for ticket analysis."""

from datetime import datetime
from pydantic import BaseModel, Field


class TicketAnalysisRequest(BaseModel):
    """Request schema for ticket analysis."""
    ticket_id: str | None = None
    text: str | None = None
    include_messages: bool = True


class TicketAnalysisResponse(BaseModel):
    """Response schema for ticket analysis."""
    ticket_id: str
    sentiment: str = Field(pattern="^(positive|neutral|negative)$")
    sentiment_score: float = Field(ge=-1.0, le=1.0)
    predicted_category: str
    urgency_score: float = Field(ge=0.0, le=1.0)
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str
    computed_at: datetime
    cached: bool


class TicketResolutionEstimateResponse(BaseModel):
    """Response schema for ticket resolution estimate."""
    estimated_hours: float = Field(ge=0.0, description="Estimated hours to resolve the ticket")
    confidence: float = Field(ge=0.0, le=1.0, description="Model confidence score")


class ForecastPoint(BaseModel):
    """Single point in a forecast series."""
    timestamp: datetime
    value: float


class TicketVolumeForecastResponse(BaseModel):
    """Response schema for ticket volume forecast."""
    forecast_series: list[ForecastPoint] = Field(default_factory=list, description="Volume forecast series over time")
    threshold: float = Field(description="Alert threshold for high volume")
    alert_triggered: bool = Field(description="Whether the threshold was exceeded in the forecast")


class TicketAnalyzeRequest(BaseModel):
    """Request schema for the specific POST /analyze endpoint."""
    ticket_id: str | None = Field(default=None, description="CRM ticket identifier")
    text: str | None = Field(default=None, description="The content of the ticket text to analyze")


class TicketAnalyzeResponse(BaseModel):
    """Response schema for the specific POST /analyze endpoint."""
    sentiment: str = Field(pattern="^(positive|neutral|negative)$", description="Sentiment classification")
    category: str = Field(description="Predicted ticket category")
    priority_score: float = Field(ge=0.0, le=1.0, description="Priority urgency score")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence of predictions")


class TicketSmartReplyRequest(BaseModel):
    """Request schema for generating a smart reply."""
    ticket_id: str = Field(description="CRM ticket identifier")
    messages: list[str] = Field(default_factory=list, description="Latest messages in the conversation")


class TicketSmartReplyResponse(BaseModel):
    """Response schema for generating a smart reply."""
    smart_reply: str = Field(description="Generated smart reply text")
