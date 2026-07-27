"""Forecasting endpoints for the analytics module."""

from fastapi import APIRouter, Query, Depends
from app.api.v1.deps import get_forecast_service
from app.services.forecast_service import ForecastService
from app.schemas.forecast_schemas import (
    TicketVolumeForecastResponse,
    RevenueForecastResponse,
    ChurnDistributionResponse,
    SentimentTrendResponse,
)

router = APIRouter(tags=["forecasts"])


@router.get(
    "/forecasts/ticket-volume",
    response_model=TicketVolumeForecastResponse,
    summary="Forecast future ticket volumes",
    description="Calculate volume predictions and check threshold triggers.",
)
async def get_ticket_volume_forecast(
    range_val: str = Query(
        alias="range",
        default="7d",
        description="Forecast range (7d, 14d, 30d)",
        pattern="^(7d|14d|30d)$",
    ),
    service: ForecastService = Depends(get_forecast_service),
) -> TicketVolumeForecastResponse:
    data = await service.get_ticket_volume_forecast(range_val)
    return TicketVolumeForecastResponse(**data)


@router.get(
    "/forecasts/revenue",
    response_model=RevenueForecastResponse,
    summary="Forecast CLV projected revenue",
    description="Forecast revenue trajectory based on aggregated CLVs.",
)
async def get_revenue_forecast(
    range_val: str = Query(
        alias="range",
        default="30d",
        description="Forecast range (30d, 90d, 12m)",
        pattern="^(30d|90d|12m)$",
    ),
    service: ForecastService = Depends(get_forecast_service),
) -> RevenueForecastResponse:
    data = await service.get_revenue_forecast(range_val)
    return RevenueForecastResponse(**data)


@router.get(
    "/forecasts/churn-distribution",
    response_model=ChurnDistributionResponse,
    summary="Get customer churn risk distribution",
    description="Breakdown of customer base into churn risk buckets with weekly trends.",
)
async def get_churn_distribution(
    service: ForecastService = Depends(get_forecast_service),
) -> ChurnDistributionResponse:
    data = await service.get_churn_distribution()
    return ChurnDistributionResponse(**data)


@router.get(
    "/forecasts/sentiment-trend",
    response_model=SentimentTrendResponse,
    summary="Get conversation sentiment trend and forecast",
    description="Fetch sentiment daily average trend, moving average, and next 7-day forecast.",
)
async def get_sentiment_trend(
    range_val: str = Query(
        alias="range",
        default="30d",
        description="Trend history range (7d, 30d, 90d)",
        pattern="^(7d|30d|90d)$",
    ),
    service: ForecastService = Depends(get_forecast_service),
) -> SentimentTrendResponse:
    data = await service.get_sentiment_trend(range_val)
    return SentimentTrendResponse(**data)
