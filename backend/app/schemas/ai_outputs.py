"""Structured outputs expected from AI for task/recharge flows (Phase 9+ wiring)."""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TaskEstimationAIOutput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    estimated_battery_delta: float
    ai_score: Optional[float] = None
    ai_reasoning: Optional[str] = None

    @field_validator("estimated_battery_delta", mode="before")
    @classmethod
    def coerce_numeric(cls, v: Any) -> float:
        if isinstance(v, bool) or v is None:
            raise TypeError("estimated_battery_delta must be a number")
        return float(v)


class RechargeAnalysisAIOutput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    ai_estimated_delta: float
    ai_confidence: Optional[float] = None
    ai_summary: Optional[str] = None
    mood_tags: list[str] = Field(default_factory=list)

    @field_validator("ai_estimated_delta", mode="before")
    @classmethod
    def coerce_delta(cls, v: Any) -> float:
        if isinstance(v, bool) or v is None:
            raise TypeError("ai_estimated_delta must be a number")
        return float(v)

    @field_validator("ai_confidence", mode="before")
    @classmethod
    def coerce_confidence(cls, v: Any) -> Optional[float]:
        if v is None:
            return None
        if isinstance(v, bool):
            raise TypeError("ai_confidence must be a number")
        return float(v)

    @field_validator("mood_tags", mode="before")
    @classmethod
    def coerce_mood_tags(cls, v: Any) -> list[str]:
        if v is None:
            return []
        if isinstance(v, list):
            return [str(x).strip() for x in v if str(x).strip()]
        return []
