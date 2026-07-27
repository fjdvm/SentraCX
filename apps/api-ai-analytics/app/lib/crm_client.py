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
        url = f"{self._base_url}/api/v1/campaigns?status=Active"
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.get(url, headers=self._headers())
                response.raise_for_status()
                data = response.json()
                if isinstance(data, list):
                    return len(data)
                return 0
        except Exception:
            return 0

