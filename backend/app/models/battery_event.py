from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import BatteryEventSourceType
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.profile import Profile


class BatteryEvent(Base):
    __tablename__ = "battery_events"
    __table_args__ = (
        CheckConstraint("battery_before >= 0", name="ck_battery_events_before_nonneg"),
        CheckConstraint("battery_after >= 0", name="ck_battery_events_after_nonneg"),
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
    source_type: Mapped[BatteryEventSourceType] = mapped_column(
        SAEnum(
            BatteryEventSourceType,
            name="battery_event_source_type",
            native_enum=True,
            values_callable=lambda s: [e.value for e in s],
        ),
        nullable=False,
    )
    source_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        nullable=True,
    )
    delta: Mapped[int] = mapped_column(Integer, nullable=False)
    battery_before: Mapped[int] = mapped_column(Integer, nullable=False)
    battery_after: Mapped[int] = mapped_column(Integer, nullable=False)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    user: Mapped["Profile"] = relationship(
        back_populates="battery_events",
        foreign_keys=[user_id],
    )
