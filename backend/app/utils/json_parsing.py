"""Extract JSON objects from messy LLM text (fences, prose, etc.)."""

from __future__ import annotations

import json
from typing import Any


class JsonObjectExtractError(ValueError):
    """No valid JSON object could be read from the input string."""


def strip_markdown_code_fences(text: str) -> str:
    """Remove a single leading/trailing ``` fence block if present."""
    t = text.strip()
    if not t.startswith("```"):
        return t
    lines = t.split("\n")
    if not lines:
        return t
    # Drop opening ``` or ```json
    lines = lines[1:]
    while lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    return "\n".join(lines).strip()


def extract_first_json_object(text: str) -> dict[str, Any]:
    """
    Scan for the first `{` and decode one JSON object via JSONDecoder.raw_decode.
    """
    decoder = json.JSONDecoder()
    n = len(text)
    i = 0
    while i < n:
        c = text[i]
        if c in " \t\n\r":
            i += 1
            continue
        if c == "{":
            try:
                obj, _end = decoder.raw_decode(text, i)
            except json.JSONDecodeError:
                i += 1
                continue
            if isinstance(obj, dict):
                return obj
        i += 1
    raise JsonObjectExtractError("No JSON object found in text")


def parse_json_object(text: str) -> dict[str, Any]:
    """
    Prefer a clean parse of the whole string; otherwise strip fences and/or
    scan for the first embedded object.
    """
    raw = text.strip()
    if not raw:
        raise JsonObjectExtractError("Empty text")

    cleaned = strip_markdown_code_fences(raw)

    try:
        val = json.loads(cleaned)
        if isinstance(val, dict):
            return val
    except json.JSONDecodeError:
        pass

    try:
        return extract_first_json_object(cleaned)
    except JsonObjectExtractError:
        return extract_first_json_object(raw)
