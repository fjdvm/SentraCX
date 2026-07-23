"""Heuristic customer segmentation model."""


def predict(features: dict, churn_score: float, clv: float) -> str:
    """Predict customer segment based on behavior, churn risk, and CLV.

    Segments:
    - New: account_age_days < 30 and total_orders <= 1
    - At-Risk: churn_score >= 0.7
    - Dormant: days_since_last_order > 60
    - High-Value: clv >= 1000 and churn_score < 0.4
    - Loyal: total_orders >= 5 and churn_score < 0.3
    - Standard: default
    """
    account_age_days = features.get("account_age_days", 0)
    total_orders = features.get("total_orders", 0)
    days_since_last_order = features.get("days_since_last_order", 0)

    if account_age_days < 30 and total_orders <= 1:
        return "New"
    if churn_score >= 0.7:
        return "At-Risk"
    if days_since_last_order > 60:
        return "Dormant"
    if clv >= 1000.0 and churn_score < 0.4:
        return "High-Value"
    if total_orders >= 5 and churn_score < 0.3:
        return "Loyal"

    return "Standard"
