"""HTTP client for the OOS (Online Order Shop) API."""

from datetime import datetime
import httpx


class OosClientError(Exception):
    """Raised when OOS API communication fails."""


class OosClient:
    """Async HTTP client for OOS API endpoints (Epic A.3)."""

    def __init__(self, base_url: str, service_token: str) -> None:
        self._base_url = base_url.rstrip("/")
        self._service_token = service_token
        self._timeout = httpx.Timeout(10.0)

    def _headers(self) -> dict[str, str]:
        headers: dict[str, str] = {"Content-Type": "application/json"}
        if self._service_token:
            headers["Authorization"] = f"Bearer {self._service_token}"
        return headers

    async def get_orders(self, since: datetime | None = None) -> list[dict]:
        """Fetch all orders from OOS API, optionally filtered by since date."""
        url = f"{self._base_url}/api/v1/orders"
        params = {}
        if since:
            params["since"] = since.isoformat()

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.get(url, headers=self._headers(), params=params)
                if response.status_code == 404:
                    return []
                response.raise_for_status()
                data = response.json()
                if isinstance(data, list):
                    return data
                return data.get("items", data.get("orders", []))
        except httpx.HTTPStatusError as e:
            raise OosClientError(f"HTTP error from OOS: {e}") from e
        except httpx.RequestError as e:
            raise OosClientError(f"Network error contacting OOS: {e}") from e

    async def get_order(self, order_id: str) -> dict | None:
        """Fetch a single order by ID from OOS API."""
        url = f"{self._base_url}/api/v1/orders/{order_id}"
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.get(url, headers=self._headers())
                if response.status_code == 404:
                    return None
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return None
            raise OosClientError(f"HTTP error fetching order {order_id} from OOS: {e}") from e
        except httpx.RequestError as e:
            raise OosClientError(f"Network error contacting OOS: {e}") from e
