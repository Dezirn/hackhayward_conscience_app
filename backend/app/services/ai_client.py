"""
Provider-agnostic AI client (Perplexity-backed). Not wired into task/recharge yet.

Callers can catch AIClientError and fall back to deterministic logic in later phases.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Optional

import httpx
from pydantic import ValidationError

from app.core.config import Settings, get_settings
from app.schemas.ai_outputs import RechargeAnalysisAIOutput, TaskEstimationAIOutput
from app.utils.json_parsing import JsonObjectExtractError, parse_json_object

CHAT_COMPLETIONS_PATH = "/chat/completions"


class AIClientError(Exception):
    """Base error for AI client failures (config, transport, parse, validation)."""


class AIProviderTimeoutError(AIClientError):
    """HTTP timeout talking to the provider."""


class AIResponseParseError(AIClientError):
    """Could not extract JSON or expected fields from the provider response."""


class AIResponseValidationError(AIClientError):
    """JSON parsed but did not match the target Pydantic schema."""


class AIClient:
    """Structured JSON calls against the configured provider (default: Perplexity)."""

    def __init__(self, settings: Optional[Settings] = None) -> None:
        self._settings = settings or get_settings()

    def _ensure_perplexity_ready(self) -> None:
        s = self._settings
        if not (s.perplexity_api_key or "").strip():
            raise AIClientError(
                "PERPLEXITY_API_KEY is not set; AI calls are disabled",
            )
        if s.ai_provider.strip().lower() != "perplexity":
            raise AIClientError(
                f"Unsupported AI_PROVIDER {s.ai_provider!r}; only 'perplexity' is implemented",
            )

    def _chat_url(self) -> str:
        return self._settings.perplexity_base_url.rstrip("/") + CHAT_COMPLETIONS_PATH

    def _timeout(self) -> httpx.Timeout:
        sec = self._settings.perplexity_timeout_seconds
        return httpx.Timeout(sec, connect=min(10.0, float(sec)))

    async def _post_chat_completion(self, user_prompt: str) -> str:
        self._ensure_perplexity_ready()
        s = self._settings
        headers = {
            "Authorization": f"Bearer {s.perplexity_api_key.strip()}",
            "Content-Type": "application/json",
        }
        body: dict[str, Any] = {
            "model": s.perplexity_model,
            "messages": [{"role": "user", "content": user_prompt}],
        }
        async with httpx.AsyncClient(timeout=self._timeout()) as client:
            try:
                resp = await client.post(
                    self._chat_url(),
                    headers=headers,
                    json=body,
                )
            except httpx.TimeoutException as e:
                raise AIProviderTimeoutError(str(e)) from e
            except httpx.RequestError as e:
                raise AIClientError(f"Perplexity request failed: {e}") from e

        if resp.status_code >= 400:
            snippet = (resp.text or "")[:500]
            raise AIClientError(f"Perplexity HTTP {resp.status_code}: {snippet}")

        try:
            payload = resp.json()
        except json.JSONDecodeError as e:
            raise AIResponseParseError("Perplexity response body is not JSON") from e

        content = _assistant_text_from_payload(payload)
        if not content.strip():
            raise AIResponseParseError("Empty assistant content from Perplexity")
        return content.strip()

    async def _complete_json_object(
        self,
        user_prompt: str,
    ) -> dict[str, Any]:
        raw = await self._post_chat_completion(user_prompt)
        try:
            return parse_json_object(raw)
        except JsonObjectExtractError as e:
            raise AIResponseParseError(str(e)) from e

    async def estimate_task(
        self,
        *,
        title: str,
        description: str,
        difficulty: int,
        duration_minutes: int,
        priority: int,
        due_at: Optional[datetime] = None,
    ) -> TaskEstimationAIOutput:
        due_s = due_at.isoformat() if due_at is not None else "null"
        prompt = _TASK_ESTIMATION_PROMPT.format(
            title=title,
            description=description,
            difficulty=difficulty,
            duration_minutes=duration_minutes,
            priority=priority,
            due_at=due_s,
        )
        data = await self._complete_json_object(prompt)
        try:
            return TaskEstimationAIOutput.model_validate(data)
        except ValidationError as e:
            raise AIResponseValidationError(str(e)) from e

    async def analyze_recharge(
        self,
        *,
        description: str,
        feeling_text: str,
        duration_minutes: Optional[int] = None,
    ) -> RechargeAnalysisAIOutput:
        dur = "null" if duration_minutes is None else str(int(duration_minutes))
        prompt = _RECHARGE_ANALYSIS_PROMPT.format(
            description=description,
            feeling_text=feeling_text,
            duration_minutes=dur,
        )
        data = await self._complete_json_object(prompt)
        try:
            return RechargeAnalysisAIOutput.model_validate(data)
        except ValidationError as e:
            raise AIResponseValidationError(str(e)) from e


def _assistant_text_from_payload(payload: Any) -> str:
    if not isinstance(payload, dict):
        raise AIResponseParseError("Top-level Perplexity response is not an object")
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        raise AIResponseParseError("Missing or empty 'choices' in Perplexity response")
    first = choices[0]
    if not isinstance(first, dict):
        raise AIResponseParseError("Invalid first element in 'choices'")
    msg = first.get("message")
    if not isinstance(msg, dict):
        raise AIResponseParseError("Missing 'message' in first choice")
    content = msg.get("content")
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for chunk in content:
            if isinstance(chunk, dict) and "text" in chunk:
                parts.append(str(chunk.get("text") or ""))
            elif isinstance(chunk, str):
                parts.append(chunk)
        return "".join(parts)
    return str(content)


_TASK_ESTIMATION_PROMPT = """You estimate how completing a task would affect a user's "social battery" (energy).
Return ONLY a single JSON object, with no markdown, no code fences, and no text before or after the JSON.

Required JSON shape:
{{
  "estimated_battery_delta": <number, negative for drain, positive for gain>,
  "ai_score": <optional number 0-1 confidence in the estimate, or omit>,
  "ai_reasoning": <optional short string, or omit>
}}

Task:
- title: {title!r}
- description: {description!r}
- difficulty (1-5): {difficulty}
- duration_minutes: {duration_minutes}
- priority (1-5): {priority}
- due_at (ISO8601 or null): {due_at}
"""


_RECHARGE_ANALYSIS_PROMPT = """You analyze a short "recharge" reflection (rest or recovery activity) and estimate battery recovery.
Return ONLY a single JSON object, with no markdown, no code fences, and no text before or after the JSON.

Required JSON shape:
{{
  "ai_estimated_delta": <positive number, estimated battery points gained>,
  "ai_confidence": <optional number 0-1, or omit>,
  "ai_summary": <optional short string, or omit>,
  "mood_tags": <optional array of short lowercase strings, or omit or use []>
}}

Reflection:
- description: {description!r}
- feeling_text: {feeling_text!r}
- duration_minutes: {duration_minutes} (null if unknown)
"""
