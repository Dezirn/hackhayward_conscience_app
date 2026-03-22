from __future__ import annotations

from enum import Enum


class TaskStatus(str, Enum):
    pending = "pending"
    completed = "completed"
    skipped = "skipped"


class BatteryEventSourceType(str, Enum):
    task = "task"
    recharge = "recharge"
    daily_bonus = "daily_bonus"
