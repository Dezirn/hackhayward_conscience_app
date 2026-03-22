from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.core.enums import BatteryEventSourceType


class BatteryEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    source_type: BatteryEventSourceType
    source_id: Optional[UUID] = None
    delta: int
    battery_before: int
    battery_after: int
    explanation: Optional[str] = None
    created_at: datetime
