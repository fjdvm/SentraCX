"""Watchlist and anomaly action endpoints for the analytics module."""

from fastapi import APIRouter, Query, Depends, HTTPException, status
from app.api.v1.deps import get_dashboard_service
from app.services.dashboard_service import DashboardService
from app.schemas.watchlist_schemas import AtRiskCustomerListResponse
from app.schemas.dashboard_schemas import AnomalyItem

router = APIRouter(tags=["watchlist"])


@router.get(
    "/dashboard/at-risk-customers",
    response_model=AtRiskCustomerListResponse,
    summary="Get top at-risk customers watchlist",
    description="Retrieve list of high churn risk customers enriched with contributing factors.",
)
async def get_at_risk_customers(
    limit: int = Query(default=10, ge=1, le=100, description="Max number of customers to return"),
    service: DashboardService = Depends(get_dashboard_service),
) -> AtRiskCustomerListResponse:
    data = await service.get_at_risk_customers(limit)
    return AtRiskCustomerListResponse(customers=data)


@router.post(
    "/anomalies/{id}/acknowledge",
    summary="Acknowledge detected anomaly",
    description="Mark a specific system anomaly as acknowledged.",
)
async def acknowledge_anomaly(
    id: str,
    service: DashboardService = Depends(get_dashboard_service),
):
    success = await service.acknowledge_anomaly(id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Anomaly with ID {id} not found or update failed.",
        )
    return {"anomaly_id": id, "status": "acknowledged"}
