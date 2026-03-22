from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from sqlalchemy import func, select

from app.core.enums import BatteryEventSourceType, TaskStatus
from app.models.battery import Battery
from app.models.battery_event import BatteryEvent
from app.models.task import Task
from app.schemas.task import TaskCreate
from app.services.task_lifecycle_errors import InvalidTaskStateError
from app.services.task_service import estimate_fallback_battery_delta

from tests.conftest import _test_async_engine_sessionmaker

# Matches seeded `last_recalculated_at` in `task_lifecycle_session` (passive = 0 at this instant).
SEED = datetime(2025, 6, 1, 12, 0, 0, tzinfo=timezone.utc)


def _create_payload(**kw) -> TaskCreate:
    base = dict(
        title="T",
        description="D",
        difficulty=2,
        duration_minutes=30,
        priority=2,
    )
    base.update(kw)
    return TaskCreate(**base)


async def _count_task_events(session, uid: uuid.UUID) -> int:
    return await session.scalar(
        select(func.count())
        .select_from(BatteryEvent)
        .where(
            BatteryEvent.user_id == uid,
            BatteryEvent.source_type == BatteryEventSourceType.task,
        )
    )


async def _count_all_events(session, uid: uuid.UUID) -> int:
    return await session.scalar(
        select(func.count())
        .select_from(BatteryEvent)
        .where(BatteryEvent.user_id == uid)
    )


@pytest.mark.asyncio
async def test_complete_task_marks_task_completed(task_lifecycle_session):
    svc, uid_a, _uid_b = task_lifecycle_session
    t = await svc.create_task(uid_a, _create_payload())
    with patch("app.services.task_service.datetime") as mock_dt:
        mock_dt.now.return_value = SEED
        out = await svc.complete_task(uid_a, t.id)
    assert out is not None
    assert out.status == TaskStatus.completed


@pytest.mark.asyncio
async def test_complete_task_recalculates_battery_before_applying_delta(
    task_lifecycle_session,
):
    svc, uid_a, _uid_b = task_lifecycle_session
    frozen = SEED + timedelta(hours=3)
    task_delta = estimate_fallback_battery_delta(1, 15)
    assert task_delta == -6

    t = await svc.create_task(
        uid_a,
        TaskCreate(
            title="small",
            description="small",
            difficulty=1,
            duration_minutes=15,
            priority=1,
        ),
    )

    with patch("app.services.task_service.datetime") as mock_dt:
        mock_dt.now.return_value = frozen
        await svc.complete_task(uid_a, t.id)

    res = await svc.session.execute(select(Battery).where(Battery.user_id == uid_a))
    battery = res.scalar_one()
    assert battery.current_level == 50 + 6 + task_delta


@pytest.mark.asyncio
async def test_complete_task_creates_battery_event(task_lifecycle_session):
    svc, uid_a, _uid_b = task_lifecycle_session
    assert await _count_task_events(svc.session, uid_a) == 0
    t = await svc.create_task(uid_a, _create_payload())
    with patch("app.services.task_service.datetime") as mock_dt:
        mock_dt.now.return_value = SEED
        await svc.complete_task(uid_a, t.id)
    assert await _count_task_events(svc.session, uid_a) == 1
    ev = (
        await svc.session.execute(
            select(BatteryEvent).where(
                BatteryEvent.user_id == uid_a,
                BatteryEvent.source_type == BatteryEventSourceType.task,
            )
        )
    ).scalar_one()
    assert ev.source_id == t.id
    assert ev.delta == t.estimated_battery_delta


@pytest.mark.asyncio
async def test_complete_task_records_battery_before_and_after_correctly(
    task_lifecycle_session,
):
    svc, uid_a, _uid_b = task_lifecycle_session
    frozen = SEED + timedelta(hours=2)
    t = await svc.create_task(uid_a, _create_payload())
    delta = t.estimated_battery_delta

    with patch("app.services.task_service.datetime") as mock_dt:
        mock_dt.now.return_value = frozen
        await svc.complete_task(uid_a, t.id)

    ev = (
        await svc.session.execute(
            select(BatteryEvent).where(
                BatteryEvent.user_id == uid_a,
                BatteryEvent.source_type == BatteryEventSourceType.task,
            )
        )
    ).scalar_one()
    bat = (
        await svc.session.execute(select(Battery).where(Battery.user_id == uid_a))
    ).scalar_one()

    assert ev.battery_before == 54
    assert ev.battery_after == 54 + delta
    assert bat.current_level == ev.battery_after


@pytest.mark.asyncio
async def test_complete_task_clamps_battery_at_min_if_delta_too_large(
    task_lifecycle_session,
):
    svc, uid_a, _uid_b = task_lifecycle_session
    bat = (
        await svc.session.execute(select(Battery).where(Battery.user_id == uid_a))
    ).scalar_one()
    bat.current_level = 3
    bat.min_level = 0
    await svc.session.commit()
    await svc.session.refresh(bat)

    # Estimation caps magnitude at 40 but valid difficulty/duration never reaches -40; use a direct row to stress clamp.
    t = Task(
        user_id=uid_a,
        title="drain",
        description="drain",
        difficulty=5,
        duration_minutes=60,
        priority=1,
        status=TaskStatus.pending,
        estimated_battery_delta=-40,
    )
    svc.session.add(t)
    await svc.session.commit()
    await svc.session.refresh(t)

    with patch("app.services.task_service.datetime") as mock_dt:
        mock_dt.now.return_value = SEED
        await svc.complete_task(uid_a, t.id)
    await svc.session.refresh(bat)
    assert bat.current_level == bat.min_level


@pytest.mark.asyncio
async def test_complete_task_returns_none_when_task_missing(task_lifecycle_session):
    svc, uid_a, _uid_b = task_lifecycle_session
    assert await svc.complete_task(uid_a, uuid.uuid4()) is None


@pytest.mark.asyncio
async def test_complete_task_rejects_non_pending_task(task_lifecycle_session):
    svc, uid_a, _uid_b = task_lifecycle_session
    for bad_status in (TaskStatus.completed, TaskStatus.skipped):
        task = Task(
            user_id=uid_a,
            title="x",
            description="y",
            difficulty=2,
            duration_minutes=20,
            priority=2,
            status=bad_status,
            estimated_battery_delta=-5,
        )
        svc.session.add(task)
        await svc.session.commit()
        await svc.session.refresh(task)

        with pytest.raises(InvalidTaskStateError) as ei:
            await svc.complete_task(uid_a, task.id)
        assert ei.value.current_status == bad_status


@pytest.mark.asyncio
async def test_complete_task_does_not_touch_other_users_task(task_lifecycle_session):
    svc, uid_a, uid_b = task_lifecycle_session
    t = await svc.create_task(uid_a, _create_payload())
    assert await svc.complete_task(uid_b, t.id) is None

    await svc.session.refresh(t)
    assert t.status == TaskStatus.pending


@pytest.mark.asyncio
async def test_skip_task_marks_task_skipped(task_lifecycle_session):
    svc, uid_a, _uid_b = task_lifecycle_session
    t = await svc.create_task(uid_a, _create_payload())
    out = await svc.skip_task(uid_a, t.id)
    assert out is not None
    assert out.status == TaskStatus.skipped


@pytest.mark.asyncio
async def test_skip_task_does_not_change_battery(task_lifecycle_session):
    svc, uid_a, _uid_b = task_lifecycle_session
    bat = (
        await svc.session.execute(select(Battery).where(Battery.user_id == uid_a))
    ).scalar_one()
    before_level = bat.current_level
    before_status = bat.status_label
    before_last = bat.last_recalculated_at

    t = await svc.create_task(uid_a, _create_payload())
    await svc.skip_task(uid_a, t.id)

    await svc.session.refresh(bat)
    assert bat.current_level == before_level
    assert bat.status_label == before_status
    assert bat.last_recalculated_at == before_last


@pytest.mark.asyncio
async def test_skip_task_creates_no_battery_event(task_lifecycle_session):
    svc, uid_a, _uid_b = task_lifecycle_session
    assert await _count_all_events(svc.session, uid_a) == 0
    t = await svc.create_task(uid_a, _create_payload())
    await svc.skip_task(uid_a, t.id)
    assert await _count_all_events(svc.session, uid_a) == 0


@pytest.mark.asyncio
async def test_skip_task_returns_none_when_task_missing(task_lifecycle_session):
    svc, uid_a, _uid_b = task_lifecycle_session
    assert await svc.skip_task(uid_a, uuid.uuid4()) is None


@pytest.mark.asyncio
async def test_skip_task_rejects_non_pending_task(task_lifecycle_session):
    svc, uid_a, _uid_b = task_lifecycle_session
    for bad_status in (TaskStatus.completed, TaskStatus.skipped):
        task = Task(
            user_id=uid_a,
            title="x",
            description="y",
            difficulty=2,
            duration_minutes=20,
            priority=2,
            status=bad_status,
            estimated_battery_delta=-5,
        )
        svc.session.add(task)
        await svc.session.commit()
        await svc.session.refresh(task)

        with pytest.raises(InvalidTaskStateError) as ei:
            await svc.skip_task(uid_a, task.id)
        assert ei.value.current_status == bad_status


@pytest.mark.asyncio
async def test_skip_task_does_not_touch_other_users_task(task_lifecycle_session):
    svc, uid_a, uid_b = task_lifecycle_session
    t = await svc.create_task(uid_a, _create_payload())
    assert await svc.skip_task(uid_b, t.id) is None
    await svc.session.refresh(t)
    assert t.status == TaskStatus.pending


@pytest.mark.asyncio
async def test_complete_task_and_event_persist_transactionally(task_lifecycle_session):
    svc, uid_a, _uid_b = task_lifecycle_session
    t = await svc.create_task(uid_a, _create_payload())
    tid = t.id
    delta = t.estimated_battery_delta
    with patch("app.services.task_service.datetime") as mock_dt:
        mock_dt.now.return_value = SEED
        await svc.complete_task(uid_a, tid)

    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            row_t = await s.get(Task, tid)
            assert row_t is not None
            assert row_t.status == TaskStatus.completed
            bat = (
                await s.execute(select(Battery).where(Battery.user_id == uid_a))
            ).scalar_one()
            assert bat.current_level == 50 + delta
            n = await s.scalar(
                select(func.count())
                .select_from(BatteryEvent)
                .where(
                    BatteryEvent.user_id == uid_a,
                    BatteryEvent.source_type == BatteryEventSourceType.task,
                )
            )
            assert n == 1
    finally:
        await eng.dispose()
