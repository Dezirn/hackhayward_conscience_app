from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.profile import Profile


class Battery(Base):
    __tablename__ = "batteries"
    __table_args__ = (
        CheckConstraint("max_level > min_level", name="ck_batteries_max_gt_min"),
        CheckConstraint(
            "current_level >= min_level AND current_level <= max_level",
            name="ck_batteries_current_in_range",
        ),
        CheckConstraint(
            "baseline_level >= min_level AND baseline_level <= max_level",
            name="ck_batteries_baseline_in_range",
        ),
        CheckConstraint("daily_bonus >= 0", name="ck_batteries_daily_bonus_nonneg"),
        CheckConstraint(
            "recharge_rate_per_hour >= 0",
            name="ck_batteries_recharge_rate_nonneg",
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
        unique=True,
        index=True,
    )
    current_level: Mapped[int] = mapped_column(Integer, nullable=False)
    min_level: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    max_level: Mapped[int] = mapped_column(
        Integer, nullable=False, default=100, server_default="100"
    )
    baseline_level: Mapped[int] = mapped_column(
        Integer, nullable=False, default=70, server_default="70"
    )
    daily_bonus: Mapped[int] = mapped_column(
        Integer, nullable=False, default=5, server_default="5"
    )
    recharge_rate_per_hour: Mapped[float] = mapped_column(
        Float, nullable=False, default=2.0, server_default="2.0"
    )
    last_recalculated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    last_daily_bonus_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status_label: Mapped[str] = mapped_column(String(128), nullable=False)
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

    user: Mapped["Profile"] = relationship(back_populates="battery")
