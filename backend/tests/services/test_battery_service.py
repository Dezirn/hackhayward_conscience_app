from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone

import pytest
from sqlalchemy import func, select

from app.core.enums import BatteryEventSourceType
from app.models import Battery, BatteryEvent, Profile
from app.services.battery_service import BatteryService


def test_clamp_level_respects_min_and_max():
    assert BatteryService.clamp_level(-5, 0, 100) == 0
    assert BatteryService.clamp_level(150, 0, 100) == 100
    assert BatteryService.clamp_level(42, 0, 100) == 42
    assert BatteryService.clamp_level(3, 10, 20) == 10


@pytest.mark.parametrize(
    "level,expected",
    [
        (0, "depleted"),
        (15, "depleted"),
        (16, "low"),
        (40, "low"),
        (41, "okay"),
        (70, "okay"),
        (71, "great"),
        (100, "great"),
    ],
)
def test_get_status_label_thresholds(level, expected):
    assert BatteryService.get_status_label(level, 100) == expected


def test_apply_passive_recharge_increases_level_by_elapsed_time():
    uid = uuid.uuid4()
    t0 = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    t1 = t0 + timedelta(hours=3)
    b = Battery(
        user_id=uid,
        current_level=50,
        min_level=0,
        max_level=100,
        baseline_level=70,
        daily_bonus=5,
        recharge_rate_per_hour=2.0,
        last_recalculated_at=t0,
        last_daily_bonus_date=None,
        status_label="okay",
    )
    delta = BatteryService.apply_passive_recharge(b, t1)
    assert delta == 6
    assert b.current_level == 56


def test_apply_passive_recharge_clamps_at_max():
    uid = uuid.uuid4()
    t0 = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    t1 = t0 + timedelta(hours=2)
    b = Battery(
        user_id=uid,
        current_level=98,
        min_level=0,
        max_level=100,
        baseline_level=70,
        daily_bonus=5,
        recharge_rate_per_hour=5.0,
        last_recalculated_at=t0,
        last_daily_bonus_date=None,
        status_label="okay",
    )
    BatteryService.apply_passive_recharge(b, t1)
    assert b.current_level == 100


async def _seed_profile_battery(
    session,
    uid: uuid.UUID,
    *,
    profile_tz: str = "UTC",
    **battery_kw,
) -> Battery:
    p = Profile(
        id=uid,
        username=f"bt_{uid.hex[:10]}",
        timezone=profile_tz,
        onboarding_completed=False,
    )
    session.add(p)
    defaults = dict(
        user_id=uid,
        current_level=50,
        min_level=0,
        max_level=100,
        baseline_level=70,
        daily_bonus=5,
        recharge_rate_per_hour=2.0,
        status_label="okay",
    )
    defaults.update(battery_kw)
    b = Battery(**defaults)
    session.add(b)
    await session.commit()
    await session.refresh(b)
    return b


async def _count_daily_bonus_events(session, uid: uuid.UUID) -> int:
    return await session.scalar(
        select(func.count())
        .select_from(BatteryEvent)
        .where(
            BatteryEvent.user_id == uid,
            BatteryEvent.source_type == BatteryEventSourceType.daily_bonus,
        )
    )


async def _count_all_events(session, uid: uuid.UUID) -> int:
    return await session.scalar(
        select(func.count())
        .select_from(BatteryEvent)
        .where(BatteryEvent.user_id == uid)
    )


@pytest.mark.asyncio
async def test_recalculate_initializes_null_last_daily_bonus_date_without_bonus(
    battery_recalc_session,
):
    session, uid = battery_recalc_session
    now = datetime(2025, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
    b = await _seed_profile_battery(
        session,
        uid,
        last_recalculated_at=now,
        last_daily_bonus_date=None,
        current_level=50,
    )
    await BatteryService.recalculate_battery(session, b, "UTC", now)
    await session.commit()
    await session.refresh(b)
    assert b.last_daily_bonus_date == date(2025, 1, 15)
    assert b.current_level == 50
    assert await _count_daily_bonus_events(session, uid) == 0


@pytest.mark.asyncio
async def test_recalculate_applies_daily_bonus_once_when_day_changes(
    battery_recalc_session,
):
    session, uid = battery_recalc_session
    now = datetime(2025, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
    b = await _seed_profile_battery(
        session,
        uid,
        last_recalculated_at=now,
        last_daily_bonus_date=date(2025, 1, 14),
        current_level=50,
        daily_bonus=5,
    )
    await BatteryService.recalculate_battery(session, b, "UTC", now)
    await session.commit()
    await session.refresh(b)
    assert b.current_level == 55
    assert b.last_daily_bonus_date == date(2025, 1, 15)
    assert await _count_daily_bonus_events(session, uid) == 1


@pytest.mark.asyncio
async def test_recalculate_applies_daily_bonus_for_multiple_missed_days(
    battery_recalc_session,
):
    session, uid = battery_recalc_session
    now = datetime(2025, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
    b = await _seed_profile_battery(
        session,
        uid,
        last_recalculated_at=now,
        last_daily_bonus_date=date(2025, 1, 12),
        current_level=50,
        daily_bonus=5,
    )
    await BatteryService.recalculate_battery(session, b, "UTC", now)
    await session.commit()
    await session.refresh(b)
    assert b.current_level == 65
    assert await _count_daily_bonus_events(session, uid) == 1


@pytest.mark.asyncio
async def test_recalculate_does_not_create_passive_recharge_events(
    battery_recalc_session,
):
    session, uid = battery_recalc_session
    now = datetime(2025, 1, 15, 14, 0, 0, tzinfo=timezone.utc)
    b = await _seed_profile_battery(
        session,
        uid,
        last_recalculated_at=now - timedelta(hours=2),
        last_daily_bonus_date=date(2025, 1, 15),
        current_level=40,
        recharge_rate_per_hour=2.0,
        daily_bonus=5,
    )
    await BatteryService.recalculate_battery(session, b, "UTC", now)
    await session.commit()
    assert await _count_all_events(session, uid) == 0
    await session.refresh(b)
    assert b.current_level == 44


@pytest.mark.asyncio
async def test_recalculate_updates_status_label_and_last_recalculated_at(
    battery_recalc_session,
):
    session, uid = battery_recalc_session
    now = datetime(2025, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
    b = await _seed_profile_battery(
        session,
        uid,
        last_recalculated_at=now,
        last_daily_bonus_date=date(2025, 1, 15),
        current_level=10,
        max_level=100,
    )
    await BatteryService.recalculate_battery(session, b, "UTC", now)
    await session.commit()
    await session.refresh(b)
    assert b.status_label == "depleted"
    assert b.last_recalculated_at == now


@pytest.mark.asyncio
async def test_recalculate_uses_profile_timezone_for_day_boundary(
    battery_recalc_session,
):
    session, uid = battery_recalc_session
    # 07:00 UTC on Jan 11 == Jan 10 23:00 in Los Angeles (PST, UTC-8)
    now_utc = datetime(2025, 1, 11, 7, 0, 0, tzinfo=timezone.utc)
    local_date = date(2025, 1, 10)
    b = await _seed_profile_battery(
        session,
        uid,
        profile_tz="America/Los_Angeles",
        last_recalculated_at=now_utc,
        last_daily_bonus_date=date(2025, 1, 9),
        current_level=50,
        daily_bonus=5,
    )
    await BatteryService.recalculate_battery(
        session, b, "America/Los_Angeles", now_utc
    )
    await session.commit()
    await session.refresh(b)
    # Local "today" is Jan 10; one day after Jan 9 → +5, not two UTC-based days
    assert b.current_level == 55
    assert b.last_daily_bonus_date == local_date
    assert await _count_daily_bonus_events(session, uid) == 1
