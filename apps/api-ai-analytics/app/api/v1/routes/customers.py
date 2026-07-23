"""Customer Insights API routes."""

from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends

from app.api.v1.deps import get_customer_insights_service
from app.services.customer_insights_service import CustomerInsightsService
from app.schemas.customer_schemas import (
    CustomerInsightsResponse,
    CustomerSegmentResponse,
    ChurnScoreResponse,
    ClvResponse,
    NextActionResponse,
    NextActionFeedbackRequest,
)
from app.services.customer_insights_service import (
    CustomerNotFoundError,
    CrmUnavailableError,
)

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get(
    "/{customer_id}/insights",
    response_model=CustomerInsightsResponse,
    summary="Get customer insights",
    description="Returns churn score, CLV prediction, and next-best-action for a customer.",
)
async def get_customer_insights(
    customer_id: str,
    service: CustomerInsightsService = Depends(get_customer_insights_service),
) -> CustomerInsightsResponse:
    """Get AI-powered insights for a specific customer."""
    try:
        return await service.get_insights(customer_id)
    except CustomerNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer {customer_id} not found in CRM",
        )
    except CrmUnavailableError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CRM service is currently unavailable",
        )


@router.get(
    "/{customer_id}/segment",
    response_model=CustomerSegmentResponse,
    summary="Get customer segment",
    description="Returns the AI-predicted customer segment.",
)
async def get_customer_segment(
    customer_id: str,
    service: CustomerInsightsService = Depends(get_customer_insights_service),
) -> CustomerSegmentResponse:
    """Get the customer segment category and model confidence."""
    try:
        data = await service.get_segment(customer_id)
        return CustomerSegmentResponse(**data)
    except CustomerNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer {customer_id} not found in CRM",
        )
    except CrmUnavailableError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CRM service is currently unavailable",
        )


@router.get(
    "/{customer_id}/churn-score",
    response_model=ChurnScoreResponse,
    summary="Get customer churn score",
    description="Returns the churn risk score, risk level, and contributing factors.",
)
async def get_customer_churn_score(
    customer_id: str,
    service: CustomerInsightsService = Depends(get_customer_insights_service),
) -> ChurnScoreResponse:
    """Get customer churn score details."""
    try:
        data = await service.get_churn_score(customer_id)
        return ChurnScoreResponse(**data)
    except CustomerNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer {customer_id} not found in CRM",
        )
    except CrmUnavailableError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CRM service is currently unavailable",
        )


@router.get(
    "/{customer_id}/clv",
    response_model=ClvResponse,
    summary="Get customer lifetime value",
    description="Returns the predicted customer lifetime value (CLV).",
)
async def get_customer_clv(
    customer_id: str,
    service: CustomerInsightsService = Depends(get_customer_insights_service),
) -> ClvResponse:
    """Get customer predicted lifetime value."""
    try:
        data = await service.get_clv(customer_id)
        return ClvResponse(**data)
    except CustomerNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer {customer_id} not found in CRM",
        )
    except CrmUnavailableError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CRM service is currently unavailable",
        )


@router.get(
    "/{customer_id}/next-action",
    response_model=NextActionResponse,
    summary="Get customer next action",
    description="Returns the recommended next-best-action for the customer.",
)
async def get_customer_next_action(
    customer_id: str,
    service: CustomerInsightsService = Depends(get_customer_insights_service),
) -> NextActionResponse:
    """Get customer next action recommendation."""
    try:
        data = await service.get_next_action(customer_id)
        return NextActionResponse(**data)
    except CustomerNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer {customer_id} not found in CRM",
        )
    except CrmUnavailableError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CRM service is currently unavailable",
        )


@router.post(
    "/{customer_id}/next-action/feedback",
    status_code=status.HTTP_200_OK,
    summary="Submit next action feedback",
    description="Logs user accept/dismiss/complete feedback for the recommended next-best-action.",
)
async def submit_next_action_feedback(
    customer_id: str,
    request: NextActionFeedbackRequest,
    service: CustomerInsightsService = Depends(get_customer_insights_service),
) -> dict[str, str]:
    """Submit next-best-action feedback for model tuning."""
    try:
        await service.submit_next_action_feedback(customer_id, request.feedback)
        return {
            "status": "success",
            "message": f"Feedback '{request.feedback}' logged for customer {customer_id}",
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

