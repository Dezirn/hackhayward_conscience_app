from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from sqlalchemy import func, select

from app.core.enums import BatteryEventSourceType, TaskStatus
from app.models import Battery, BatteryEvent, Profile, Task
from app.services.task_service import estimate_fallback_battery_delta

from tests.conftest import _test_async_engine_sessionmaker


async def _bootstrap(client):
    assert (await client.post("/profile/bootstrap")).status_code == 200


async def _cleanup_user_tree(user_id: uuid.UUID) -> None:
    eng, AsyncLocal, text = _test_async_engine_sessionmaker()
    try:
        async with eng.begin() as conn:
            await conn.execute(text("DELETE FROM tasks WHERE user_id = :u"), {"u": user_id})
            await conn.execute(
                text("DELETE FROM battery_events WHERE user_id = :u"), {"u": user_id}
            )
            await conn.execute(text("DELETE FROM batteries WHERE user_id = :u"), {"u": user_id})
            await conn.execute(text("DELETE FROM profiles WHERE id = :u"), {"u": user_id})
    finally:
        await eng.dispose()


def _valid_create_payload(**overrides):
    base = {
        "title": "Do the thing",
        "description": "A clear description",
        "difficulty": 2,
        "duration_minutes": 30,
        "priority": 3,
    }
    base.update(overrides)
    return base


@pytest.mark.asyncio
async def test_post_complete_marks_task_completed(profile_api_client):
    client, uid = profile_api_client
    await _bootstrap(client)
    created = await client.post("/tasks", json=_valid_create_payload())
    assert created.status_code == 201
    tid = created.json()["id"]
    r = await client.post(f"/tasks/{tid}/complete")
    assert r.status_code == 200
    assert r.json()["status"] == "completed"


@pytest.mark.asyncio
async def test_post_complete_updates_battery_and_creates_event(profile_api_client):
    client, uid = profile_api_client
    await _bootstrap(client)
    fixed = datetime(2025, 8, 10, 14, 0, 0, tzinfo=timezone.utc)
    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            bat = (
                await s.execute(select(Battery).where(Battery.user_id == uid))
            ).scalar_one()
            bat.last_recalculated_at = fixed
            bat.last_daily_bonus_date = fixed.date()
            bat.current_level = 70
            await s.commit()
    finally:
        await eng.dispose()

    created = await client.post("/tasks", json=_valid_create_payload())
    assert created.status_code == 201
    tid = created.json()["id"]
    delta = created.json()["estimated_battery_delta"]

    with patch("app.services.task_service.datetime") as mock_dt:
        mock_dt.now.return_value = fixed
        r = await client.post(f"/tasks/{tid}/complete")
    assert r.status_code == 200

    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            after = (
                await s.execute(select(Battery).where(Battery.user_id == uid))
            ).scalar_one()
            assert after.current_level == 70 + delta
            n_task_ev = await s.scalar(
                select(func.count())
                .select_from(BatteryEvent)
                .where(
                    BatteryEvent.user_id == uid,
                    BatteryEvent.source_type == BatteryEventSourceType.task,
                )
            )
            assert n_task_ev == 1
    finally:
        await eng.dispose()


@pytest.mark.asyncio
async def test_post_complete_returns_404_for_missing_task(profile_api_client):
    client, _uid = profile_api_client
    await _bootstrap(client)
    r = await client.post(f"/tasks/{uuid.uuid4()}/complete")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_post_complete_returns_404_for_other_users_task(profile_api_client):
    client, uid = profile_api_client
    await _bootstrap(client)
    uid_b = uuid.uuid4()
    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            s.add(
                Profile(
                    id=uid_b,
                    username=f"oth_{uid_b.hex[:12]}",
                    timezone="UTC",
                    onboarding_completed=False,
                )
            )
            t = Task(
                user_id=uid_b,
                title="Theirs",
                description="x",
                difficulty=2,
                duration_minutes=20,
                priority=2,
                status=TaskStatus.pending,
                estimated_battery_delta=-8,
            )
            s.add(t)
            await s.commit()
            await s.refresh(t)
            other_tid = str(t.id)
        r = await client.post(f"/tasks/{other_tid}/complete")
        assert r.status_code == 404
    finally:
        await eng.dispose()
        await _cleanup_user_tree(uid_b)


@pytest.mark.asyncio
async def test_post_complete_returns_409_for_already_completed_task(profile_api_client):
    client, uid = profile_api_client
    await _bootstrap(client)
    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            t = Task(
                user_id=uid,
                title="done",
                description="d",
                difficulty=2,
                duration_minutes=20,
                priority=2,
                status=TaskStatus.completed,
                estimated_battery_delta=-5,
            )
            s.add(t)
            await s.commit()
            await s.refresh(t)
            tid = str(t.id)
    finally:
        await eng.dispose()

    r = await client.post(f"/tasks/{tid}/complete")
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_post_complete_returns_409_for_skipped_task(profile_api_client):
    client, uid = profile_api_client
    await _bootstrap(client)
    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            t = Task(
                user_id=uid,
                title="skip",
                description="d",
                difficulty=2,
                duration_minutes=20,
                priority=2,
                status=TaskStatus.skipped,
                estimated_battery_delta=-5,
            )
            s.add(t)
            await s.commit()
            await s.refresh(t)
            tid = str(t.id)
    finally:
        await eng.dispose()

    r = await client.post(f"/tasks/{tid}/complete")
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_post_skip_marks_task_skipped(profile_api_client):
    client, uid = profile_api_client
    await _bootstrap(client)
    created = await client.post("/tasks", json=_valid_create_payload())
    tid = created.json()["id"]
    r = await client.post(f"/tasks/{tid}/skip")
    assert r.status_code == 200
    assert r.json()["status"] == "skipped"


@pytest.mark.asyncio
async def test_post_skip_does_not_change_battery_or_create_event(profile_api_client):
    client, uid = profile_api_client
    await _bootstrap(client)

    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            bat = (
                await s.execute(select(Battery).where(Battery.user_id == uid))
            ).scalar_one()
            snap = (
                bat.current_level,
                bat.status_label,
                bat.last_recalculated_at,
            )
            n0 = await s.scalar(
                select(func.count()).select_from(BatteryEvent).where(
                    BatteryEvent.user_id == uid
                )
            )
    finally:
        await eng.dispose()

    created = await client.post("/tasks", json=_valid_create_payload())
    tid = created.json()["id"]
    r = await client.post(f"/tasks/{tid}/skip")
    assert r.status_code == 200

    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            bat = (
                await s.execute(select(Battery).where(Battery.user_id == uid))
            ).scalar_one()
            assert (bat.current_level, bat.status_label, bat.last_recalculated_at) == snap
            n1 = await s.scalar(
                select(func.count()).select_from(BatteryEvent).where(
                    BatteryEvent.user_id == uid
                )
            )
            assert n1 == n0
    finally:
        await eng.dispose()


@pytest.mark.asyncio
async def test_post_skip_returns_404_for_missing_task(profile_api_client):
    client, _uid = profile_api_client
    await _bootstrap(client)
    r = await client.post(f"/tasks/{uuid.uuid4()}/skip")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_post_skip_returns_404_for_other_users_task(profile_api_client):
    client, uid = profile_api_client
    await _bootstrap(client)
    uid_b = uuid.uuid4()
    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            s.add(
                Profile(
                    id=uid_b,
                    username=f"oth_{uid_b.hex[:12]}",
                    timezone="UTC",
                    onboarding_completed=False,
                )
            )
            t = Task(
                user_id=uid_b,
                title="Theirs",
                description="x",
                difficulty=2,
                duration_minutes=20,
                priority=2,
                status=TaskStatus.pending,
                estimated_battery_delta=-8,
            )
            s.add(t)
            await s.commit()
            await s.refresh(t)
            other_tid = str(t.id)
        r = await client.post(f"/tasks/{other_tid}/skip")
        assert r.status_code == 404
    finally:
        await eng.dispose()
        await _cleanup_user_tree(uid_b)


@pytest.mark.asyncio
async def test_post_skip_returns_409_for_already_completed_task(profile_api_client):
    client, uid = profile_api_client
    await _bootstrap(client)
    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            t = Task(
                user_id=uid,
                title="done",
                description="d",
                difficulty=2,
                duration_minutes=20,
                priority=2,
                status=TaskStatus.completed,
                estimated_battery_delta=-5,
            )
            s.add(t)
            await s.commit()
            await s.refresh(t)
            tid = str(t.id)
    finally:
        await eng.dispose()

    r = await client.post(f"/tasks/{tid}/skip")
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_post_skip_returns_409_for_already_skipped_task(profile_api_client):
    client, uid = profile_api_client
    await _bootstrap(client)
    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            t = Task(
                user_id=uid,
                title="already",
                description="d",
                difficulty=2,
                duration_minutes=20,
                priority=2,
                status=TaskStatus.skipped,
                estimated_battery_delta=-5,
            )
            s.add(t)
            await s.commit()
            await s.refresh(t)
            tid = str(t.id)
    finally:
        await eng.dispose()

    r = await client.post(f"/tasks/{tid}/skip")
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_post_complete_recalculates_battery_before_applying_delta(profile_api_client):
    client, uid = profile_api_client
    await _bootstrap(client)

    t0 = datetime(2025, 6, 1, 12, 0, 0, tzinfo=timezone.utc)
    frozen = t0 + timedelta(hours=3)

    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            bat = (
                await s.execute(select(Battery).where(Battery.user_id == uid))
            ).scalar_one()
            bat.last_recalculated_at = t0
            bat.current_level = 50
            bat.last_daily_bonus_date = date(2025, 6, 1)
            await s.commit()
    finally:
        await eng.dispose()

    created = await client.post("/tasks", json=_valid_create_payload())
    assert created.status_code == 201
    tid = created.json()["id"]
    delta = created.json()["estimated_battery_delta"]
    assert delta == estimate_fallback_battery_delta(2, 30)

    with patch("app.services.task_service.datetime") as mock_dt:
        mock_dt.now.return_value = frozen
        r = await client.post(f"/tasks/{tid}/complete")
    assert r.status_code == 200

    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            bat = (
                await s.execute(select(Battery).where(Battery.user_id == uid))
            ).scalar_one()
            assert bat.current_level == 50 + 6 + delta
    finally:
        await eng.dispose()


@pytest.mark.asyncio
async def test_post_skip_keeps_task_owned_state_isolated(profile_api_client):
    client, uid = profile_api_client
    await _bootstrap(client)
    uid_b = uuid.uuid4()
    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            s.add(
                Profile(
                    id=uid_b,
                    username=f"oth_{uid_b.hex[:12]}",
                    timezone="UTC",
                    onboarding_completed=False,
                )
            )
            t = Task(
                user_id=uid_b,
                title="Isolated",
                description="x",
                difficulty=2,
                duration_minutes=20,
                priority=2,
                status=TaskStatus.pending,
                estimated_battery_delta=-8,
            )
            s.add(t)
            await s.commit()
            await s.refresh(t)
            other_tid = str(t.id)
        assert (await client.post(f"/tasks/{other_tid}/skip")).status_code == 404
        async with AsyncLocal() as s:
            row = await s.get(Task, uuid.UUID(other_tid))
            assert row is not None
            assert row.status == TaskStatus.pending
    finally:
        await eng.dispose()
        await _cleanup_user_tree(uid_b)
