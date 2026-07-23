from datetime import datetime, timezone
from fastapi import APIRouter, Query, status, Depends

from app.api.v1.deps import get_dashboard_service
from app.services.dashboard_service import DashboardService
from app.schemas.dashboard_schemas import (
    DashboardSummaryResponse,
    AnomalyListResponse,
    AnomalyItem,
    NaturalLanguageQueryRequest,
    NaturalLanguageQueryResponse,
)

router = APIRouter(tags=["dashboard"])


@router.get(
    "/dashboard/summary",
    response_model=DashboardSummaryResponse,
    summary="Get dashboard aggregate summary",
    description="Retrieve combined metrics including churn, sentiment, and tickets.",
)
async def get_dashboard_summary(
    from_date: datetime = Query(alias="from", default=None, description="Start datetime filter"),
    to_date: datetime = Query(alias="to", default=None, description="End datetime filter"),
    service: DashboardService = Depends(get_dashboard_service),
) -> DashboardSummaryResponse:
    """Get aggregate metrics over a timeframe for the analytics dashboard."""
    data = await service.get_summary(from_date, to_date)
    return DashboardSummaryResponse(**data)


@router.get(
    "/anomalies",
    response_model=AnomalyListResponse,
    summary="Get detected anomalies",
    description="Retrieve listing of system anomalies and customer trends.",
)
async def get_anomalies(
    from_date: datetime = Query(alias="from", default=None, description="Start datetime filter"),
    to_date: datetime = Query(alias="to", default=None, description="End datetime filter"),
    status_val: str = Query(alias="status", default=None, description="Status filter (open/investigating/resolved)"),
    service: DashboardService = Depends(get_dashboard_service),
) -> AnomalyListResponse:
    """Get list of identified anomalous trends or behaviors."""
    anomalies = await service.get_anomalies(from_date, to_date, status_val)
    return AnomalyListResponse(anomalies=[AnomalyItem(**anom) for anom in anomalies])


@router.post(
    "/query",
    response_model=NaturalLanguageQueryResponse,
    summary="Natural language query",
    description="Execute a natural language query against analytics data.",
)
async def execute_natural_language_query(
    request: NaturalLanguageQueryRequest,
    service: DashboardService = Depends(get_dashboard_service),
) -> NaturalLanguageQueryResponse:
    """Process natural language request and return structured data results."""
    data = await service.execute_nl_query(request.query)
    return NaturalLanguageQueryResponse(**data)
