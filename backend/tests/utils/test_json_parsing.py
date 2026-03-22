"""Tests for app.utils.json_parsing."""

from __future__ import annotations

import pytest

from app.schemas.ai_outputs import TaskEstimationAIOutput
from app.utils.json_parsing import (
    JsonObjectExtractError,
    extract_first_json_object,
    parse_json_object,
    strip_markdown_code_fences,
)


def test_strip_markdown_code_fences_removes_wrapper() -> None:
    raw = '```json\n{"x": 1}\n```'
    assert strip_markdown_code_fences(raw) == '{"x": 1}'


def test_parse_json_object_plain_object() -> None:
    assert parse_json_object('  {"a": 1, "b": "two"}  ') == {"a": 1, "b": "two"}


def test_parse_json_object_markdown_fenced() -> None:
    text = 'Here you go:\n```json\n{"ok": true, "n": 42}\n```\n'
    assert parse_json_object(text) == {"ok": True, "n": 42}


def test_parse_json_object_embedded_in_prose() -> None:
    text = 'Sure. {"estimated_battery_delta": -3, "ai_reasoning": "hard task"} Thanks.'
    assert parse_json_object(text)["estimated_battery_delta"] == -3


def test_parse_json_object_extra_after_object() -> None:
    text = '{"k": "v"} trailing noise'
    assert parse_json_object(text) == {"k": "v"}


def test_parse_json_object_empty_raises() -> None:
    with pytest.raises(JsonObjectExtractError, match="Empty"):
        parse_json_object("   ")


def test_parse_json_object_no_object_raises() -> None:
    with pytest.raises(JsonObjectExtractError):
        parse_json_object("just words [1,2,3] no braces object")


def test_extract_first_json_object_not_found() -> None:
    with pytest.raises(JsonObjectExtractError, match="No JSON object"):
        extract_first_json_object("[]")


def test_task_estimation_schema_accepts_valid_ai_shape() -> None:
    out = TaskEstimationAIOutput.model_validate(
        {"estimated_battery_delta": -4.5, "ai_score": 0.7, "ai_reasoning": "x"},
    )
    assert out.estimated_battery_delta == -4.5
    assert out.ai_score == 0.7


def test_task_estimation_schema_rejects_missing_delta() -> None:
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        TaskEstimationAIOutput.model_validate({"ai_reasoning": "only this"})
