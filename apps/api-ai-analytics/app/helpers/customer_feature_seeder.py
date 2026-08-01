"""Helper utility for seeding customer features from CRM."""

from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.lib.crm_client import CrmClient
from app.schemas.customer_schemas import CustomerFeatures


def build_customer_features(customer_id: str, customer: dict, orders: list[dict]) -> CustomerFeatures:
    """Manually construct CustomerFeatures model from CRM customer and order data."""
    now = datetime.now(timezone.utc)
    created_at = customer.get("createdAt") or customer.get("created_at")
    account_age_days = 0
    if created_at:
        try:
            created = datetime.fromisoformat(str(created_at).replace("Z", "+00:00"))
            account_age_days = (now - created).days
        except (ValueError, TypeError):
            pass

    total_orders = len(orders)
    total_order_value = 0.0
    last_order_date = None

    for order in orders:
        total_value = order.get("totalAmount") or order.get("total") or 0.0
        total_order_value += float(total_value)
        order_date_str = order.get("orderDate") or order.get("createdAt")
        if order_date_str:
            try:
                order_date = datetime.fromisoformat(str(order_date_str).replace("Z", "+00:00"))
                if last_order_date is None or order_date > last_order_date:
                    last_order_date = order_date
            except (ValueError, TypeError):
                pass

    days_since_last_order = (now - last_order_date).days if last_order_date else 0
    average_order_value = total_order_value / total_orders if total_orders > 0 else 0.0
    
    order_frequency_per_month = 0.0
    if account_age_days > 0:
        months = max(account_age_days / 30.0, 1.0)
        order_frequency_per_month = total_orders / months

    order_frequency_trend = 0.0
    if total_orders >= 3 and days_since_last_order > 60:
        order_frequency_trend = -0.3
    elif total_orders >= 3 and days_since_last_order < 30:
        order_frequency_trend = 0.2

    ticket_count = customer.get("ticketCount") or customer.get("ticket_count_last_90d", 0)

    return CustomerFeatures(
        customer_id=customer_id,
        days_since_last_order=days_since_last_order,
        order_frequency_trend=order_frequency_trend,
        ticket_count_last_90d=int(ticket_count),
        account_age_days=account_age_days,
        total_orders=total_orders,
        total_order_value=total_order_value,
        average_order_value=average_order_value,
        order_frequency_per_month=round(order_frequency_per_month, 2),
    )


async def ensure_customer_features_seeded(
    db: AsyncIOMotorDatabase, crm: CrmClient | None, min_count: int = 10
) -> None:
    """Check count of customer_feature_logs, and seed if below minimum threshold."""
    if not crm:
        return

    try:
        count = await db["customer_feature_logs"].count_documents({})
        if count >= min_count:
            return
    except Exception:
        return

    # Seed features from CRM
    customers = await crm.get_customers(page_size=100)
    for customer in customers:
        customer_id = customer.get("id")
        if not customer_id:
            continue
        try:
            orders = await crm.get_customer_orders(customer_id)
            features = build_customer_features(customer_id, customer, orders)
            doc = {
                "customer_id": customer_id,
                "features": features.model_dump(),
                "recorded_at": datetime.now(timezone.utc),
            }
            await db["customer_feature_logs"].update_one(
                {"customer_id": customer_id}, {"$set": doc}, upsert=True
            )
        except Exception:
            pass
