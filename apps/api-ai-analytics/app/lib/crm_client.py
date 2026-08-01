"""HTTP client for the CRM API."""

import httpx


class CrmClientError(Exception):
    """Raised when CRM API communication fails."""


class CrmClient:
    """Async HTTP client for CRM API endpoints."""

    def __init__(self, base_url: str, service_token: str) -> None:
        self._base_url = base_url.rstrip("/")
        self._service_token = service_token
        self._timeout = httpx.Timeout(10.0)

    def _headers(self) -> dict[str, str]:
        headers: dict[str, str] = {"Content-Type": "application/json"}
        if self._service_token:
            headers["Authorization"] = f"Bearer {self._service_token}"
        return headers

    async def get_customer(self, customer_id: str) -> dict | None:
        """Fetch customer profile from CRM API.

        Returns None if customer not found or CRM is unavailable.
        """
        url = f"{self._base_url}/api/v1/customers/{customer_id}"
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.get(url, headers=self._headers())
                if response.status_code == 404:
                    return None
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError:
            return None
        except httpx.RequestError:
            return None

    async def get_customers(self, page_size: int = 50) -> list[dict]:
        """Fetch list of customers from CRM API.

        Returns empty list if CRM is unavailable.
        """
        url = f"{self._base_url}/api/v1/customers?pageSize={page_size}"
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.get(url, headers=self._headers())
                response.raise_for_status()
                data = response.json()
                if isinstance(data, list):
                    return data
                return data.get("items", data.get("customers", []))
        except Exception:
            return []

    async def get_customer_orders(self, customer_id: str) -> list[dict]:
        """Fetch customer order history from CRM API.

        Returns empty list if unavailable.
        """
        url = f"{self._base_url}/api/v1/customers/{customer_id}/orders"
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.get(url, headers=self._headers())
                if response.status_code == 404:
                    return []
                response.raise_for_status()
                data = response.json()
                if isinstance(data, list):
                    return data
                return data.get("items", data.get("orders", []))
        except httpx.HTTPStatusError:
            return []
        except httpx.RequestError:
            return []

    async def get_ticket(self, ticket_id: str) -> dict | None:
        """Fetch ticket from CRM API.

        Returns None if ticket not found or CRM is unavailable.
        """
        url = f"{self._base_url}/api/v1/tickets/{ticket_id}"
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.get(url, headers=self._headers())
                if response.status_code == 404:
                    return None
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError:
            return None
        except httpx.RequestError:
            return None

    async def get_ticket_messages(self, ticket_id: str) -> list[dict]:
        """Fetch messages for a ticket from CRM API.

        Returns empty list if unavailable.
        """
        url = f"{self._base_url}/api/v1/tickets/{ticket_id}/messages"
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.get(url, headers=self._headers())
                if response.status_code == 404:
                    return []
                response.raise_for_status()
                data = response.json()
                if isinstance(data, list):
                    return data
                return data.get("items", data.get("messages", []))
        except httpx.HTTPStatusError:
            return []
        except httpx.RequestError:
            return []

    async def get_tickets_count(self, status: str | None = None) -> int:
        """Fetch count of tickets with optional status filter."""
        url = f"{self._base_url}/api/v1/tickets?pageSize=1"
        if status:
            url += f"&status={status}"
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.get(url, headers=self._headers())
                response.raise_for_status()
                data = response.json()
                return data.get("totalCount", 0)
        except Exception:
            return 0

    async def get_active_campaigns_count(self) -> int:
        """Fetch count of active campaigns."""
        url = f"{self._base_url}/api/v1/campaigns?status=Active&pageSize=1"
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.get(url, headers=self._headers())
                response.raise_for_status()
                data = response.json()
                if isinstance(data, list):
                    return len(data)
                return data.get("totalCount", 0)
        except Exception:
            return 0

    async def get_tickets_count_by_customer(self, customer_id: str) -> int:
        """Fetch count of support tickets by customer ID."""
        url = f"{self._base_url}/api/v1/tickets?customerId={customer_id}&pageSize=1"
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.get(url, headers=self._headers())
                response.raise_for_status()
                data = response.json()
                return data.get("totalCount", 0)
        except Exception:
            return 0

    async def get_daily_ticket_counts(self, from_date: str, to_date: str) -> list[dict]:
        """Fetch daily ticket counts from CRM API."""
        url = f"{self._base_url}/api/v1/analytics/tickets/daily-counts?from={from_date}&to={to_date}"
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.get(url, headers=self._headers())
                response.raise_for_status()
                return response.json()
        except Exception:
            return []

    async def get_revenue_by_customer_type(self, from_date: str, to_date: str) -> list[dict]:
        """Fetch revenue by customer type from CRM API."""
        url = f"{self._base_url}/api/v1/analytics/orders/revenue-by-customer-type?from={from_date}&to={to_date}"
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.get(url, headers=self._headers())
                response.raise_for_status()
                return response.json()
        except Exception:
            return []

    async def get_tickets(self, page_size: int = 100, status: str | None = None) -> list[dict]:
        """Fetch list of tickets from CRM API."""
        url = f"{self._base_url}/api/v1/tickets?pageSize={page_size}"
        if status:
            url += f"&status={status}"
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.get(url, headers=self._headers())
                response.raise_for_status()
                data = response.json()
                if isinstance(data, list):
                    return data
                return data.get("items", data.get("tickets", []))
        except Exception:
            return []

    async def get_tickets_count(self, status: str) -> int:
        """Fetch count of tickets by status."""
        url = f"{self._base_url}/api/v1/tickets?status={status}&pageSize=1"
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.get(url, headers=self._headers())
                response.raise_for_status()
                data = response.json()
                return data.get("totalCount", 0)
        except Exception:
            return 0

    async def get_resolution_stats(self, from_date: str, to_date: str) -> dict:
        """Fetch resolution stats from CRM API."""
        url = f"{self._base_url}/api/v1/analytics/tickets/resolution-stats?from={from_date}&to={to_date}"
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.get(url, headers=self._headers())
                response.raise_for_status()
                return response.json()
        except Exception:
            return {}

    async def get_claimed_tickets_by_agent(self, agent_id: str, page_size: int = 50) -> list[dict]:
        """Fetch list of claimed tickets for a specific agent from CRM API."""
        url = f"{self._base_url}/api/v1/tickets?status=Claimed&assignedToId={agent_id}&pageSize={page_size}"
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.get(url, headers=self._headers())
                response.raise_for_status()
                data = response.json()
                if isinstance(data, list):
                    return data
                return data.get("items", data.get("tickets", []))
        except Exception:
            return []



