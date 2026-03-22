from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator

from app.core.enums import TaskStatus


class TaskCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    description: str
    difficulty: int
    duration_minutes: int
    priority: int
    due_at: Optional[datetime] = None

    @field_validator("title", "description")
    @classmethod
    def strip_not_blank(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("cannot be blank")
        return s

    @field_validator("difficulty", "priority")
    @classmethod
    def one_to_five(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError("must be between 1 and 5")
        return v

    @field_validator("duration_minutes")
    @classmethod
    def duration_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("duration_minutes must be greater than 0")
        return v

    @field_validator("due_at")
    @classmethod
    def due_at_timezone_aware(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is not None and v.tzinfo is None:
            raise ValueError("due_at must be timezone-aware")
        return v


class TaskUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[int] = None
    duration_minutes: Optional[int] = None
    priority: Optional[int] = None
    due_at: Optional[datetime] = None

    @field_validator("title", "description")
    @classmethod
    def strip_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            s = v.strip()
            if not s:
                raise ValueError("cannot be blank")
            return s
        return v

    @field_validator("difficulty", "priority")
    @classmethod
    def one_to_five(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (v < 1 or v > 5):
            raise ValueError("must be between 1 and 5")
        return v

    @field_validator("duration_minutes")
    @classmethod
    def duration_positive(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v <= 0:
            raise ValueError("duration_minutes must be greater than 0")
        return v

    @field_validator("due_at")
    @classmethod
    def due_at_timezone_aware(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is not None and v.tzinfo is None:
            raise ValueError("due_at must be timezone-aware")
        return v


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    title: str
    description: str
    difficulty: int
    duration_minutes: int
    priority: int
    due_at: Optional[datetime] = None
    status: TaskStatus
    estimated_battery_delta: int
    ai_score: Optional[float] = None
    ai_reasoning: Optional[str] = None
    recommended_order: Optional[int] = None
    created_at: datetime
    updated_at: datetime
