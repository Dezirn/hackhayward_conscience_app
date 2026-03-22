from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator

from app.schemas.battery import BatteryRead


class RechargeAnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    description: str
    feeling_text: str
    duration_minutes: Optional[int] = None

    @field_validator("description", "feeling_text")
    @classmethod
    def strip_not_blank(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("cannot be blank")
        return s

    @field_validator("duration_minutes")
    @classmethod
    def duration_positive_if_set(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v <= 0:
            raise ValueError("duration_minutes must be greater than 0 when provided")
        return v


class RechargeCommitRequest(RechargeAnalyzeRequest):
    """Same shape as analyze; server always recomputes deltas from raw reflection."""


class RechargeAnalyzeResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ai_estimated_delta: int
    ai_confidence: Optional[float] = None
    ai_summary: Optional[str] = None
    mood_tags: Optional[list[str]] = None
    used_fallback: bool = False


class RechargeEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    description: str
    feeling_text: str
    duration_minutes: Optional[int] = None
    ai_estimated_delta: int
    ai_confidence: Optional[float] = None
    ai_summary: Optional[str] = None
    mood_tags: Optional[list[str]] = None
    created_at: datetime

    @field_validator("mood_tags", mode="before")
    @classmethod
    def coerce_mood_tags(cls, v):
        if v is None:
            return None
        if isinstance(v, list):
            return [str(x) for x in v]
        if isinstance(v, dict):
            return list(v.keys()) if v else []
        return v


class RechargeCommitResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    recharge_entry: RechargeEntryRead
    battery: BatteryRead
