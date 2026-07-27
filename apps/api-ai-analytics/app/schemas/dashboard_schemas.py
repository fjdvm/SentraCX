"""Pydantic schemas for Dashboard and aggregate analysis API."""

from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field


class MetricWithDelta(BaseModel):
    """Metric value along with comparisons to previous period."""

    value: float = Field(description="Current value of the metric")
    delta_vs_previous_period: float = Field(description="Absolute difference compared to previous period")
    delta_pct: float = Field(description="Percentage difference compared to previous period")


class DashboardSummaryResponse(BaseModel):
    """Response schema for dashboard summary metrics."""

    active_tickets: MetricWithDelta
    avg_resolution_hours: MetricWithDelta
    churn_rate: MetricWithDelta
    avg_clv: MetricWithDelta
    avg_sentiment: MetricWithDelta
    active_campaigns: MetricWithDelta
    computed_at: datetime



class AnomalyItem(BaseModel):
    """Details of a single detected anomaly."""

    anomaly_id: str
    anomaly_type: str = Field(description="Type of anomaly (e.g. ticket_volume_spike, high_churn_cluster)")
    description: str
    severity: str = Field(pattern="^(critical|high|medium|low)$")
    status: str = Field(pattern="^(open|investigating|resolved|acknowledged)$")
    detected_at: datetime


class AnomalyListResponse(BaseModel):
    """Response schema for anomalies listing."""

    anomalies: list[AnomalyItem] = Field(default_factory=list, description="List of detected anomalies")


class NaturalLanguageQueryRequest(BaseModel):
    """Request schema for natural-language query."""

    query: str = Field(description="Natural language question to execute against analytics data")


class NaturalLanguageQueryResponse(BaseModel):
    """Response schema for natural-language query."""

    query: str
    interpreted_query: str = Field(description="Structured translation or interpretation of the query")
    result: dict[str, Any] = Field(description="Structured data results mapping to the query findings")
    computed_at: datetime


class AskRequest(BaseModel):
    """Request schema for Ask SentraCX query."""

    query: str = Field(description="Plain-English question about dashboard metrics or predictions")


class AskResponse(BaseModel):
    """Response schema for Ask SentraCX query."""

    type: str = Field(description="Type of response content: text, chart, table, or value")
    content: Any = Field(description="The response content matching the type")

