"""Council API — no database; ASGI client + mocked Perplexity path."""

from __future__ import annotations

from typing import Any

import httpx
import pytest
import pytest_asyncio
from httpx import ASGITransport

from app.main import app as fastapi_app
from app.services.ai_client import AIClientError


@pytest_asyncio.fixture
async def council_http_client():
    transport = ASGITransport(app=fastapi_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_council_respond_422_empty_question(council_http_client: httpx.AsyncClient):
    r = await council_http_client.post("/council/respond", json={"question": "   "})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_council_respond_200_shape_five_advisors(council_http_client: httpx.AsyncClient):
    r = await council_http_client.post(
        "/council/respond",
        json={"question": "Should I take the new role?", "context": "Remote vs hybrid."},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["question"] == "Should I take the new role?"
    assert isinstance(body["advisors"], list)
    assert len(body["advisors"]) == 5
    ids = [a["id"] for a in body["advisors"]]
    assert ids == ["optimist", "skeptic", "pragmatist", "empath", "strategist"]
    for a in body["advisors"]:
        assert set(a.keys()) >= {"id", "name", "role", "response"}
        assert isinstance(a["response"], str) and a["response"].strip()
    syn = body["synthesis"]
    assert set(syn.keys()) >= {"consensus", "tension", "suggested_next_step"}
    for k in ("consensus", "tension", "suggested_next_step"):
        assert isinstance(syn[k], str) and syn[k].strip()
    assert "used_fallback" in body


@pytest.mark.asyncio
async def test_council_respond_fallback_when_ai_fails(
    council_http_client: httpx.AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
):
    async def _boom(
        self: Any,
        question: str,
        context: str,
    ) -> dict[str, Any]:
        raise AIClientError("forced failure for test")

    monkeypatch.setattr(
        "app.services.council_service.AIClient.generate_council_decision_raw",
        _boom,
    )

    r = await council_http_client.post(
        "/council/respond",
        json={"question": "Buy or rent?"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["used_fallback"] is True
    assert len(body["advisors"]) == 5


@pytest.mark.asyncio
async def test_council_respond_live_ai_path_sets_used_fallback_false(
    council_http_client: httpx.AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
):
    async def _good(
        self: Any,
        question: str,
        context: str,
    ) -> dict[str, Any]:
        return {
            "question": question,
            "advisors": [
                {"id": "optimist", "response": "A1"},
                {"id": "skeptic", "response": "A2"},
                {"id": "pragmatist", "response": "A3"},
                {"id": "empath", "response": "A4"},
                {"id": "strategist", "response": "A5"},
            ],
            "synthesis": {
                "consensus": "C",
                "tension": "T",
                "suggested_next_step": "N",
            },
        }

    monkeypatch.setattr(
        "app.services.council_service.AIClient.generate_council_decision_raw",
        _good,
    )

    r = await council_http_client.post(
        "/council/respond",
        json={"question": "Test Q", "context": ""},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["used_fallback"] is False
    assert body["advisors"][0]["response"] == "A1"
    assert body["synthesis"]["consensus"] == "C"
