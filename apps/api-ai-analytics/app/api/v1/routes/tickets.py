"""Ticket API endpoints."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.api.v1.deps import get_ticket_analysis_service
from app.schemas.ticket_schemas import (
    TicketAnalysisRequest,
    TicketAnalysisResponse,
    TicketAnalyzeRequest,
    TicketAnalyzeResponse,
    TicketResolutionEstimateResponse,
    TicketVolumeForecastResponse,
    ForecastPoint,
)
from app.services.ticket_analysis_service import (
    TicketAnalysisService,
    TicketNotFoundError,
    CrmUnavailableError,
)

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.post("/analyze-intent", response_model=TicketAnalysisResponse)
async def analyze_intent(
    request: TicketAnalysisRequest,
    service: TicketAnalysisService = Depends(get_ticket_analysis_service)
) -> TicketAnalysisResponse:
    """Analyze a ticket for sentiment, category, and urgency."""
    try:
        return await service.analyze_ticket(request)
    except TicketNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except CrmUnavailableError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))


@router.post(
    "/analyze",
    response_model=TicketAnalyzeResponse,
    summary="Analyze CRM ticket",
    description="Synchronously analyze a ticket on creation for sentiment, category, and priority.",
)
async def analyze_ticket(
    request: TicketAnalyzeRequest,
    service: TicketAnalysisService = Depends(get_ticket_analysis_service)
) -> TicketAnalyzeResponse:
    """Analyze a ticket synchronously for priority and classification."""
    try:
        res = await service.analyze_ticket(TicketAnalysisRequest(ticket_id=request.ticket_id, text=request.text))
        return TicketAnalyzeResponse(
            sentiment=res.sentiment,
            category=res.predicted_category,
            priority_score=res.urgency_score,
            confidence=res.confidence
        )
    except TicketNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except CrmUnavailableError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))


@router.get(
    "/{ticket_id}/resolution-estimate",
    response_model=TicketResolutionEstimateResponse,
    summary="Get ticket resolution estimate",
    description="Get the estimated hours to resolve a CRM ticket.",
)
async def get_ticket_resolution_estimate(
    ticket_id: str,
    service: TicketAnalysisService = Depends(get_ticket_analysis_service)
) -> TicketResolutionEstimateResponse:
    """Get the estimated resolution time for a specific ticket."""
    try:
        data = await service.get_resolution_estimate(ticket_id)
        return TicketResolutionEstimateResponse(**data)
    except TicketNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get(
    "/volume-forecast",
    response_model=TicketVolumeForecastResponse,
    summary="Get ticket volume forecast",
    description="Get predicted ticket volumes over the specified range.",
)
async def get_ticket_volume_forecast(
    range_val: str = Query(alias="range", default="7d", description="Forecast range (e.g. 7d, 30d)"),
    service: TicketAnalysisService = Depends(get_ticket_analysis_service)
) -> TicketVolumeForecastResponse:
    """Get a forecast of ticket volume spikes and alerts."""
    try:
        data = await service.get_volume_forecast(range_val)
        return TicketVolumeForecastResponse(
            forecast_series=[ForecastPoint(**pt) for pt in data["forecast_series"]],
            threshold=data["threshold"],
            alert_triggered=data["alert_triggered"]
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

