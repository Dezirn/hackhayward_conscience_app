"""AI client tests with mocked HTTP — no real Perplexity calls."""

from __future__ import annotations

import json
from typing import Any

import httpx
import pytest

from app.core.config import Settings
from app.services.ai_client import (
    AIClient,
    AIClientError,
    AIProviderTimeoutError,
    AIResponseParseError,
    AIResponseValidationError,
)


def _ai_settings(**overrides: Any) -> Settings:
    base: dict[str, Any] = {
        "perplexity_api_key": "test-perplexity-key",
        "ai_provider": "perplexity",
        "perplexity_base_url": "https://api.perplexity.ai",
        "perplexity_model": "sonar",
        "perplexity_timeout_seconds": 30.0,
    }
    base.update(overrides)
    return Settings(**base)


class _MockResponse:
    def __init__(
        self,
        status_code: int = 200,
        payload: Any | None = None,
        text_body: str | None = None,
        json_error: bool = False,
    ) -> None:
        self.status_code = status_code
        self._payload = payload
        self._text_body = text_body or ""
        self._json_error = json_error

    @property
    def text(self) -> str:
        if self._text_body:
            return self._text_body
        if self._payload is not None:
            return json.dumps(self._payload)
        return ""

    def json(self) -> Any:
        if self._json_error:
            raise json.JSONDecodeError("mock", "", 0)
        if self._payload is not None:
            return self._payload
        return json.loads(self._text_body or "{}")


def _install_async_client(monkeypatch: pytest.MonkeyPatch, response: _MockResponse) -> None:
    """Replace httpx.AsyncClient with one that always returns ``response`` from post()."""

    class _MockAsyncClient:
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            pass

        async def __aenter__(self) -> _MockAsyncClient:
            return self

        async def __aexit__(self, *args: Any) -> None:
            return None

        async def post(self, *args: Any, **kwargs: Any) -> _MockResponse:
            return response

    monkeypatch.setattr(httpx, "AsyncClient", _MockAsyncClient)


def _choices_content(content: Any) -> dict[str, Any]:
    return {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": content,
                },
            },
        ],
    }


@pytest.mark.asyncio
async def test_estimate_task_success_plain_json(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    body = _choices_content(
        '{"estimated_battery_delta": -5, "ai_score": 0.8, "ai_reasoning": "heavy"}',
    )
    _install_async_client(monkeypatch, _MockResponse(payload=body))
    client = AIClient(settings=_ai_settings())

    out = await client.estimate_task(
        title="t",
        description="d",
        difficulty=3,
        duration_minutes=45,
        priority=2,
    )
    assert out.estimated_battery_delta == -5.0
    assert out.ai_score == 0.8
    assert out.ai_reasoning == "heavy"


@pytest.mark.asyncio
async def test_estimate_task_success_fenced_json(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    messy = '```json\n{"estimated_battery_delta": -1}\n```'
    _install_async_client(
        monkeypatch,
        _MockResponse(payload=_choices_content(messy)),
    )
    client = AIClient(settings=_ai_settings())
    out = await client.estimate_task(
        title="x",
        description="y",
        difficulty=1,
        duration_minutes=10,
        priority=1,
    )
    assert out.estimated_battery_delta == -1.0


@pytest.mark.asyncio
async def test_analyze_recharge_success_list_content_chunks(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    inner = '{"ai_estimated_delta": 7, "mood_tags": ["calm", "rested"]}'
    body = _choices_content([{"text": inner}])
    _install_async_client(monkeypatch, _MockResponse(payload=body))
    client = AIClient(settings=_ai_settings())

    out = await client.analyze_recharge(
        description="walk",
        feeling_text="better",
        duration_minutes=20,
    )
    assert out.ai_estimated_delta == 7.0
    assert out.mood_tags == ["calm", "rested"]


@pytest.mark.asyncio
async def test_post_raises_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    class _TimeoutClient:
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            pass

        async def __aenter__(self) -> _TimeoutClient:
            return self

        async def __aexit__(self, *args: Any) -> None:
            return None

        async def post(self, *args: Any, **kwargs: Any) -> None:
            raise httpx.TimeoutException("connect timeout")

    monkeypatch.setattr(httpx, "AsyncClient", _TimeoutClient)
    client = AIClient(settings=_ai_settings())

    with pytest.raises(AIProviderTimeoutError, match="timeout"):
        await client.estimate_task(
            title="t",
            description="d",
            difficulty=1,
            duration_minutes=5,
            priority=1,
        )


@pytest.mark.asyncio
async def test_response_body_invalid_json(monkeypatch: pytest.MonkeyPatch) -> None:
    _install_async_client(monkeypatch, _MockResponse(json_error=True))
    client = AIClient(settings=_ai_settings())

    with pytest.raises(AIResponseParseError, match="not JSON"):
        await client.estimate_task(
            title="t",
            description="d",
            difficulty=1,
            duration_minutes=5,
            priority=1,
        )


@pytest.mark.asyncio
async def test_response_http_error(monkeypatch: pytest.MonkeyPatch) -> None:
    _install_async_client(
        monkeypatch,
        _MockResponse(status_code=401, text_body='{"error":"nope"}'),
    )
    client = AIClient(settings=_ai_settings())

    with pytest.raises(AIClientError, match="HTTP 401"):
        await client.analyze_recharge(description="a", feeling_text="b")


@pytest.mark.asyncio
async def test_response_missing_choices(monkeypatch: pytest.MonkeyPatch) -> None:
    _install_async_client(monkeypatch, _MockResponse(payload={}))
    client = AIClient(settings=_ai_settings())

    with pytest.raises(AIResponseParseError, match="choices"):
        await client.estimate_task(
            title="t",
            description="d",
            difficulty=1,
            duration_minutes=5,
            priority=1,
        )


@pytest.mark.asyncio
async def test_response_empty_assistant_content(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _install_async_client(
        monkeypatch,
        _MockResponse(payload=_choices_content("   ")),
    )
    client = AIClient(settings=_ai_settings())

    with pytest.raises(AIResponseParseError, match="Empty assistant"):
        await client.estimate_task(
            title="t",
            description="d",
            difficulty=1,
            duration_minutes=5,
            priority=1,
        )


@pytest.mark.asyncio
async def test_estimate_task_validation_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    _install_async_client(
        monkeypatch,
        _MockResponse(
            payload=_choices_content('{"wrong_field": 1}'),
        ),
    )
    client = AIClient(settings=_ai_settings())

    with pytest.raises(AIResponseValidationError):
        await client.estimate_task(
            title="t",
            description="d",
            difficulty=1,
            duration_minutes=5,
            priority=1,
        )


@pytest.mark.asyncio
async def test_missing_api_key_raises_only_on_use(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = AIClient(settings=_ai_settings(perplexity_api_key=""))
    # Construction is fine
    _install_async_client(
        monkeypatch,
        _MockResponse(payload=_choices_content('{"estimated_battery_delta": -1}')),
    )
    with pytest.raises(AIClientError, match="PERPLEXITY_API_KEY"):
        await client.estimate_task(
            title="t",
            description="d",
            difficulty=1,
            duration_minutes=5,
            priority=1,
        )


@pytest.mark.asyncio
async def test_unsupported_provider_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    client = AIClient(settings=_ai_settings(ai_provider="other"))
    _install_async_client(
        monkeypatch,
        _MockResponse(payload=_choices_content('{"estimated_battery_delta": -1}')),
    )
    with pytest.raises(AIClientError, match="Unsupported AI_PROVIDER"):
        await client.estimate_task(
            title="t",
            description="d",
            difficulty=1,
            duration_minutes=5,
            priority=1,
        )
