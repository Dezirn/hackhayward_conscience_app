from __future__ import annotations

import math
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import BatteryEventSourceType
from app.models.battery import Battery
from app.models.battery_event import BatteryEvent


class BatteryService:
    """Passive recharge and daily bonus recalculation (no task/recharge deltas)."""

    @staticmethod
    def clamp_level(level: int, min_level: int, max_level: int) -> int:
        return max(min_level, min(level, max_level))

    @staticmethod
    def get_status_label(level: int, max_level: int) -> str:
        if max_level <= 0:
            return "depleted"
        pct = (level / max_level) * 100.0
        if pct <= 15:
            return "depleted"
        if pct <= 40:
            return "low"
        if pct <= 70:
            return "okay"
        return "great"

    @staticmethod
    def _ensure_aware_utc(dt: datetime) -> datetime:
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    @staticmethod
    def apply_passive_recharge(battery: Battery, now: datetime) -> int:
        """Add passive recharge since ``last_recalculated_at``; returns points actually applied."""
        now_u = BatteryService._ensure_aware_utc(now)
        start = battery.last_recalculated_at
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        else:
            start = start.astimezone(timezone.utc)

        elapsed_seconds = (now_u - start).total_seconds()
        if elapsed_seconds <= 0:
            return 0

        elapsed_hours = elapsed_seconds / 3600.0
        raw_delta = int(math.floor(elapsed_hours * battery.recharge_rate_per_hour))
        if raw_delta <= 0:
            return 0

        old = battery.current_level
        new = BatteryService.clamp_level(
            old + raw_delta, battery.min_level, battery.max_level
        )
        battery.current_level = new
        return new - old

    @staticmethod
    async def apply_daily_bonus_if_needed(
        session: AsyncSession,
        battery: Battery,
        user_timezone: str,
        now: datetime,
    ) -> int:
        """Apply stacked daily bonus for missed local days; may insert one ``BatteryEvent``."""
        now_u = BatteryService._ensure_aware_utc(now)
        tz = ZoneInfo(user_timezone)
        today_local = now_u.astimezone(tz).date()

        if battery.last_daily_bonus_date is None:
            battery.last_daily_bonus_date = today_local
            return 0

        last = battery.last_daily_bonus_date
        if last >= today_local:
            return 0

        days_missed = (today_local - last).days
        if days_missed <= 0:
            return 0

        bonus_pool = days_missed * battery.daily_bonus
        before = battery.current_level
        tentative = before + bonus_pool
        after = BatteryService.clamp_level(
            tentative, battery.min_level, battery.max_level
        )
        applied = after - before
        battery.current_level = after
        battery.last_daily_bonus_date = today_local

        if applied > 0:
            session.add(
                BatteryEvent(
                    user_id=battery.user_id,
                    source_type=BatteryEventSourceType.daily_bonus,
                    source_id=None,
                    delta=applied,
                    battery_before=before,
                    battery_after=after,
                    explanation=(
                        f"Daily bonus for {days_missed} missed local day(s)"
                        if days_missed != 1
                        else "Daily bonus for 1 missed local day"
                    ),
                )
            )
            await session.flush()

        return applied

    @staticmethod
    async def recalculate_battery(
        session: AsyncSession,
        battery: Battery,
        user_timezone: str,
        now: datetime | None = None,
    ) -> Battery:
        now_u = BatteryService._ensure_aware_utc(now or datetime.now(timezone.utc))

        BatteryService.apply_passive_recharge(battery, now_u)
        await BatteryService.apply_daily_bonus_if_needed(
            session, battery, user_timezone, now_u
        )

        battery.status_label = BatteryService.get_status_label(
            battery.current_level, battery.max_level
        )
        battery.last_recalculated_at = now_u
        battery.updated_at = now_u

        await session.flush()
        return battery
