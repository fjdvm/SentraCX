"""Tests for Chatbot Logs API routes."""

import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock
from app.main import app
from app.api.v1.deps import get_chatbot_log_repository


@pytest.fixture(autouse=True)
def mock_chatbot_log_repo():
    repo_mock = AsyncMock()
    repo_mock.list.return_value = [
        {
            "id": "log-1",
            "_id": "log-1",
            "ticket_id": "t-1",
            "customer_id": "c-1",
            "message": "hello",
            "reply": "hi",
            "intent": "faq",
            "should_escalate": False,
            "confidence": 0.95,
            "bot_summary": None,
            "created_at": "2026-07-28T10:00:00Z",
        }
    ]
    repo_mock.count.return_value = 1
    app.dependency_overrides[get_chatbot_log_repository] = lambda: repo_mock
    yield repo_mock
    app.dependency_overrides.clear()


async def test_list_chatbot_logs(mock_chatbot_log_repo: AsyncMock) -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/chatbot/logs?page=1&page_size=10")

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["id"] == "log-1"
    assert data["items"][0]["message"] == "hello"
    mock_chatbot_log_repo.list.assert_called_once_with(skip=0, limit=10, escalated_only=False)


async def test_list_chatbot_logs_escalated_only(mock_chatbot_log_repo: AsyncMock) -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/chatbot/logs?escalated_only=true")

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    mock_chatbot_log_repo.list.assert_called_once_with(skip=0, limit=20, escalated_only=True)
