"""API tests assert deterministic fallback battery deltas (no live Perplexity)."""

from __future__ import annotations

import pytest


@pytest.fixture(autouse=True)
def _disable_task_ai_for_deterministic_tests(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "app.services.task_service._should_try_task_ai",
        lambda: False,
    )
    monkeypatch.setattr(
        "app.services.recharge_service._should_try_recharge_ai",
        lambda: False,
    )
