from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class BatteryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    current_level: int
    min_level: int
    max_level: int
    baseline_level: int
    daily_bonus: int
    recharge_rate_per_hour: float
    last_recalculated_at: datetime
    last_daily_bonus_date: Optional[date] = None
    status_label: str
    created_at: datetime
    updated_at: datetime
