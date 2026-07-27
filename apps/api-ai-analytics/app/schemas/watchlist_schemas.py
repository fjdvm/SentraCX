"""Pydantic schemas for the at-risk customer watchlist."""

from pydantic import BaseModel, Field


class AtRiskCustomerItem(BaseModel):
    """Details of a customer at high risk of churning."""

    customer_id: str
    name: str
    churn_score: float = Field(ge=0.0, le=1.0)
    risk_level: str
    contributing_factors: list[str] = Field(default_factory=list)
    recommended_action: str


class AtRiskCustomerListResponse(BaseModel):
    """Response containing list of at-risk customers."""

    customers: list[AtRiskCustomerItem] = Field(default_factory=list)
