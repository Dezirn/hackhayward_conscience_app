from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import TaskStatus
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.profile import Profile


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        CheckConstraint(
            "difficulty >= 1 AND difficulty <= 5",
            name="ck_tasks_difficulty_range",
        ),
        CheckConstraint(
            "priority >= 1 AND priority <= 5",
            name="ck_tasks_priority_range",
        ),
        CheckConstraint("duration_minutes > 0", name="ck_tasks_duration_positive"),
        CheckConstraint(
            "recommended_order IS NULL OR recommended_order > 0",
            name="ck_tasks_recommended_order_positive",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, nullable=False)
    due_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    status: Mapped[TaskStatus] = mapped_column(
        SAEnum(
            TaskStatus,
            name="task_status",
            native_enum=True,
            values_callable=lambda s: [e.value for e in s],
        ),
        nullable=False,
        default=TaskStatus.pending,
        server_default=TaskStatus.pending.value,
    )
    estimated_battery_delta: Mapped[int] = mapped_column(Integer, nullable=False)
    ai_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ai_reasoning: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recommended_order: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    user: Mapped["Profile"] = relationship(back_populates="tasks")
