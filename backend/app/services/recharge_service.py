from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.enums import BatteryEventSourceType
from app.models.battery import Battery
from app.models.battery_event import BatteryEvent
from app.models.profile import Profile
from app.models.recharge_entry import RechargeEntry
from app.schemas.recharge import (
    RechargeAnalyzeRequest,
    RechargeAnalyzeResponse,
    RechargeCommitRequest,
)
from app.services.ai_client import AIClient, AIClientError
from app.services.battery_service import BatteryService
from app.services.task_lifecycle_errors import BatteryNotFoundError, ProfileNotFoundError

logger = logging.getLogger(__name__)

# Align with fallback estimator: gain points in [1, 25]
_RECHARGE_DELTA_MIN = 1
_RECHARGE_DELTA_MAX = 25
_RECHARGE_SUMMARY_MAX_LEN = 8000
_RECHARGE_TAG_MAX_LEN = 64
_RECHARGE_TAGS_MAX_COUNT = 24

# Longest first to reduce double-counting when shorter tokens appear inside longer phrases.
_POSITIVE_PHRASES: tuple[str, ...] = tuple(
    sorted(
        (
            "less overwhelmed",
            "less anxious",
            "energized",
            "refreshed",
            "peaceful",
            "relaxed",
            "grounded",
            "focused",
            "rested",
            "calmer",
            "better",
            "clear",
            "calm",
            "good",
            "okay",
        ),
        key=len,
        reverse=True,
    )
)

_NEGATIVE_PHRASES: tuple[str, ...] = (
    "exhausted",
    "drained",
    "stressed",
    "overwhelmed",
    "anxious",
    "worse",
    "upset",
)


@dataclass(frozen=True)
class _FallbackAnalysis:
    delta: int
    confidence: float
    summary: str
    mood_tags: list[str]


@dataclass(frozen=True)
class _ResolvedRechargeAnalysis:
    """Sanitized analysis used for analyze response and commit (server recomputed)."""

    delta: int
    confidence: float | None
    summary: str | None
    mood_tags: list[str]
    used_fallback: bool


def _should_try_recharge_ai() -> bool:
    s = get_settings()
    if not (s.perplexity_api_key or "").strip():
        return False
    return s.ai_provider.strip().lower() == "perplexity"


def _normalize_positive_ai_recharge_delta(raw: object) -> int | None:
    """
    If the model returns a finite positive number, round to int and clamp to the
    recharge band. Missing, NaN/inf, non-numeric, zero, or negative → None (caller
    should use full fallback analysis, not abs() coercion).
    """
    try:
        x = float(raw)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(x) or x <= 0:
        return None
    v = int(round(x))
    if v < _RECHARGE_DELTA_MIN:
        return None
    if v > _RECHARGE_DELTA_MAX:
        v = _RECHARGE_DELTA_MAX
    return v


def _sanitize_recharge_confidence(raw: float | None) -> float | None:
    if raw is None:
        return None
    x = float(raw)
    if x < 0.0:
        return 0.0
    if x > 1.0:
        return 1.0
    return x


def _sanitize_recharge_summary(raw: str | None) -> str | None:
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None
    return s[:_RECHARGE_SUMMARY_MAX_LEN]


def _sanitize_recharge_mood_tags(tags: list[str]) -> list[str]:
    out: list[str] = []
    for t in tags[:_RECHARGE_TAGS_MAX_COUNT]:
        u = str(t).strip().lower()[:_RECHARGE_TAG_MAX_LEN]
        if u and u not in out:
            out.append(u)
    return out


def _extract_positive_tags(text_lower: str) -> list[str]:
    tags: list[str] = []
    work = text_lower
    for phrase in _POSITIVE_PHRASES:
        if phrase in work:
            tags.append(phrase)
            work = work.replace(phrase, " " * len(phrase))
    return tags


def _negative_penalty(text_lower: str) -> int:
    n = 0
    if "exhausted" in text_lower:
        n += 1
    if "drained" in text_lower:
        n += 1
    if "stressed" in text_lower:
        n += 1
    if "worse" in text_lower:
        n += 1
    if "upset" in text_lower:
        n += 1
    if "overwhelmed" in text_lower and "less overwhelmed" not in text_lower:
        n += 1
    if "anxious" in text_lower and "less anxious" not in text_lower:
        n += 1
    return min(n, 4)


def _compute_fallback_analysis(payload: RechargeAnalyzeRequest) -> _FallbackAnalysis:
    text_lower = f"{payload.description} {payload.feeling_text}".lower()

    base = 5
    duration_part = 0
    if payload.duration_minutes is not None:
        duration_part = min(round(payload.duration_minutes / 15), 8)

    mood_tags = _extract_positive_tags(text_lower)
    pos_boost = min(len(mood_tags), 6)
    neg = _negative_penalty(text_lower)

    raw_delta = base + duration_part + pos_boost - neg
    delta = max(1, min(int(raw_delta), 25))

    conf = 0.6
    if payload.duration_minutes is not None:
        conf += 0.05
    if len(payload.description) + len(payload.feeling_text) > 60:
        conf += 0.05
    if mood_tags:
        conf += 0.05
    confidence = max(0.5, min(0.85, conf))

    strong = (
        delta >= 15
        or (payload.duration_minutes is not None and payload.duration_minutes >= 60)
        or pos_boost >= 4
    )
    if strong:
        summary = (
            "The reflection suggests a stronger recharge due to positive recovery "
            "signals and time spent."
        )
    else:
        summary = (
            "The reflection suggests a modest mental recharge from a restorative activity."
        )

    return _FallbackAnalysis(
        delta=delta,
        confidence=confidence,
        summary=summary,
        mood_tags=mood_tags or [],
    )


def _fallback_resolved(fb: _FallbackAnalysis) -> _ResolvedRechargeAnalysis:
    return _ResolvedRechargeAnalysis(
        delta=fb.delta,
        confidence=fb.confidence,
        summary=fb.summary,
        mood_tags=list(fb.mood_tags),
        used_fallback=True,
    )


async def _resolve_recharge_analysis(
    payload: RechargeAnalyzeRequest,
) -> _ResolvedRechargeAnalysis:
    """
    AI-first recharge estimate; deterministic fallback if AI is off or fails.
    Commit must call this again — never trust a prior client preview for delta.
    """
    fb = _compute_fallback_analysis(payload)
    if not _should_try_recharge_ai():
        return _fallback_resolved(fb)

    try:
        client = AIClient()
        out = await client.analyze_recharge(
            description=payload.description,
            feeling_text=payload.feeling_text,
            duration_minutes=payload.duration_minutes,
        )
        norm = _normalize_positive_ai_recharge_delta(out.ai_estimated_delta)
        if norm is None:
            logger.info(
                "Recharge analysis: AI delta invalid or non-positive, using fallback",
            )
            return _fallback_resolved(fb)
        delta = norm
        conf = _sanitize_recharge_confidence(out.ai_confidence)
        if conf is None:
            conf = fb.confidence
        summary = _sanitize_recharge_summary(out.ai_summary)
        if summary is None:
            summary = fb.summary
        mood = _sanitize_recharge_mood_tags(out.mood_tags)
        return _ResolvedRechargeAnalysis(
            delta=delta,
            confidence=conf,
            summary=summary,
            mood_tags=mood,
            used_fallback=False,
        )
    except AIClientError as e:
        logger.info("Recharge analysis: AI failed, using fallback (%s)", e)
        return _fallback_resolved(fb)
    except Exception as e:
        logger.warning(
            "Recharge analysis: unexpected error, using fallback (%s)",
            e,
            exc_info=True,
        )
        return _fallback_resolved(fb)


class RechargeService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def analyze_recharge(
        self, user_id: UUID, payload: RechargeAnalyzeRequest
    ) -> RechargeAnalyzeResponse:
        _ = user_id
        r = await _resolve_recharge_analysis(payload)
        return RechargeAnalyzeResponse(
            ai_estimated_delta=r.delta,
            ai_confidence=r.confidence,
            ai_summary=r.summary,
            mood_tags=r.mood_tags if r.mood_tags else None,
            used_fallback=r.used_fallback,
        )

    async def commit_recharge(
        self, user_id: UUID, payload: RechargeCommitRequest
    ) -> tuple[RechargeEntry, Battery]:
        # Server-authoritative: recompute analysis from payload (AI-first + fallback).
        analysis = await _resolve_recharge_analysis(payload)

        profile = await self.session.get(Profile, user_id)
        if profile is None:
            raise ProfileNotFoundError(
                "Profile not found for this user; cannot commit recharge."
            )

        result = await self.session.execute(
            select(Battery).where(Battery.user_id == user_id)
        )
        battery = result.scalar_one_or_none()
        if battery is None:
            raise BatteryNotFoundError(
                "Battery not found for this user; cannot commit recharge."
            )

        entry = RechargeEntry(
            user_id=user_id,
            description=payload.description,
            feeling_text=payload.feeling_text,
            duration_minutes=payload.duration_minutes,
            ai_estimated_delta=analysis.delta,
            ai_confidence=analysis.confidence,
            ai_summary=analysis.summary,
            mood_tags=analysis.mood_tags if analysis.mood_tags else None,
        )
        self.session.add(entry)
        await self.session.flush()

        now = datetime.now(timezone.utc)
        await BatteryService.recalculate_battery(
            self.session, battery, profile.timezone, now
        )

        battery_before = battery.current_level
        tentative = battery_before + analysis.delta
        battery_after = BatteryService.clamp_level(
            tentative, battery.min_level, battery.max_level
        )
        battery.current_level = battery_after
        battery.status_label = BatteryService.get_status_label(
            battery_after, battery.max_level
        )
        battery.updated_at = now

        applied_delta = battery_after - battery_before
        self.session.add(
            BatteryEvent(
                user_id=user_id,
                source_type=BatteryEventSourceType.recharge,
                source_id=entry.id,
                delta=applied_delta,
                battery_before=battery_before,
                battery_after=battery_after,
                explanation="Recharge logged from reflection",
            )
        )

        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(entry)
        await self.session.refresh(battery)
        return entry, battery
