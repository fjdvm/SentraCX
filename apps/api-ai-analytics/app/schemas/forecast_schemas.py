"""Pydantic schemas for forecasting analytics APIs."""

from pydantic import BaseModel, Field


class DateCountItem(BaseModel):
    date: str
    count: float


class HistoricalVolumeItem(BaseModel):
    date: str
    count: int


class TicketVolumeForecastResponse(BaseModel):
    """Response schema for ticket volume forecasting."""

    historical_series: list[HistoricalVolumeItem]
    forecast_series: list[DateCountItem]
    confidence_band_upper: list[DateCountItem]
    confidence_band_lower: list[DateCountItem]
    threshold: float
    alert_triggered: bool


class DateRevenueItem(BaseModel):
    date: str
    revenue: float


class RevenueForecastResponse(BaseModel):
    """Response schema for CLV-based revenue projections."""

    forecast_series: list[DateRevenueItem]
    by_segment: dict[str, float] = Field(default_factory=dict)
    total_projected: float
    confidence: float


class ChurnDistributionItem(BaseModel):
    date: str
    low: int
    medium: int
    high: int
    critical: int


class ChurnDistributionResponse(BaseModel):
    """Response schema for customer churn risk distribution and trend."""

    low: int
    medium: int
    high: int
    critical: int
    trend_series: list[ChurnDistributionItem]


class SentimentTrendItem(BaseModel):
    date: str
    score: float


class SentimentTrendResponse(BaseModel):
    """Response schema for sentiment analysis trend."""

    daily_scores: list[SentimentTrendItem]
    moving_average: list[SentimentTrendItem]
    forecast_next_7d: list[SentimentTrendItem]
