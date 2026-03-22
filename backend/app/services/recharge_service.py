from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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
from app.services.battery_service import BatteryService
from app.services.task_lifecycle_errors import BatteryNotFoundError, ProfileNotFoundError

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


class RechargeService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def analyze_recharge(
        self, user_id: UUID, payload: RechargeAnalyzeRequest
    ) -> RechargeAnalyzeResponse:
        _ = user_id
        a = _compute_fallback_analysis(payload)
        return RechargeAnalyzeResponse(
            ai_estimated_delta=a.delta,
            ai_confidence=a.confidence,
            ai_summary=a.summary,
            mood_tags=a.mood_tags,
        )

    async def commit_recharge(
        self, user_id: UUID, payload: RechargeCommitRequest
    ) -> tuple[RechargeEntry, Battery]:
        analysis = _compute_fallback_analysis(payload)

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

        self.session.add(
            BatteryEvent(
                user_id=user_id,
                source_type=BatteryEventSourceType.recharge,
                source_id=entry.id,
                delta=analysis.delta,
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
