from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone

import pytest

from app.core.enums import TaskStatus
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate
from app.services.task_service import estimate_fallback_battery_delta
from tests.conftest import _test_async_engine_sessionmaker


def _payload(**kw) -> TaskCreate:
    base = dict(
        title="T",
        description="D",
        difficulty=2,
        duration_minutes=30,
        priority=2,
    )
    base.update(kw)
    return TaskCreate(**base)


@pytest.mark.asyncio
async def test_create_task_persists_task_for_user(task_service_session):
    svc, uid_a, _uid_b = task_service_session
    t = await svc.create_task(uid_a, _payload(title="Hello", description="World"))
    assert t.user_id == uid_a
    assert t.status == TaskStatus.pending
    assert t.estimated_battery_delta < 0


@pytest.mark.asyncio
async def test_create_task_uses_fallback_estimation(task_service_session):
    svc, uid_a, _uid_b = task_service_session
    t = await svc.create_task(
        uid_a,
        TaskCreate(
            title="x",
            description="y",
            difficulty=3,
            duration_minutes=30,
            priority=2,
        ),
    )
    assert t.estimated_battery_delta == estimate_fallback_battery_delta(3, 30)
    assert t.estimated_battery_delta == -17


@pytest.mark.asyncio
async def test_list_tasks_returns_only_current_users_tasks(task_service_session):
    svc, uid_a, uid_b = task_service_session
    await svc.create_task(uid_a, _payload(title="A1"))
    await svc.create_task(uid_b, _payload(title="B1"))
    only_a = await svc.list_tasks(uid_a)
    assert len(only_a) == 1
    assert only_a[0].title == "A1"


@pytest.mark.asyncio
async def test_list_tasks_can_filter_by_status(task_service_session):
    svc, uid_a, _uid_b = task_service_session
    await svc.create_task(uid_a, _payload(title="p1"))
    await svc.create_task(uid_a, _payload(title="p2"))

    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            done = Task(
                user_id=uid_a,
                title="done",
                description="d",
                difficulty=2,
                duration_minutes=20,
                priority=2,
                status=TaskStatus.completed,
                estimated_battery_delta=-10,
            )
            s.add(done)
            await s.commit()
    finally:
        await eng.dispose()

    pending = await svc.list_tasks(uid_a, TaskStatus.pending)
    assert len(pending) == 2
    assert all(t.status == TaskStatus.pending for t in pending)


@pytest.mark.asyncio
async def test_get_task_returns_task_for_owner(task_service_session):
    svc, uid_a, _uid_b = task_service_session
    created = await svc.create_task(uid_a, _payload())
    got = await svc.get_task(uid_a, created.id)
    assert got is not None
    assert got.id == created.id


@pytest.mark.asyncio
async def test_get_task_returns_none_for_other_user(task_service_session):
    svc, uid_a, uid_b = task_service_session
    created = await svc.create_task(uid_a, _payload())
    assert await svc.get_task(uid_b, created.id) is None


@pytest.mark.asyncio
async def test_update_task_updates_selected_fields(task_service_session):
    svc, uid_a, _uid_b = task_service_session
    t = await svc.create_task(uid_a, _payload())
    due = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    out = await svc.update_task(
        uid_a,
        t.id,
        TaskUpdate(
            title="New",
            description="ND",
            difficulty=4,
            duration_minutes=45,
            priority=5,
            due_at=due,
        ),
    )
    assert out is not None
    assert out.title == "New"
    assert out.description == "ND"
    assert out.difficulty == 4
    assert out.duration_minutes == 45
    assert out.priority == 5
    assert out.due_at == due


@pytest.mark.asyncio
async def test_update_task_recomputes_estimated_delta_when_relevant_fields_change(
    task_service_session,
):
    svc, uid_a, _uid_b = task_service_session
    t = await svc.create_task(
        uid_a,
        TaskCreate(
            title="x",
            description="y",
            difficulty=3,
            duration_minutes=30,
            priority=2,
        ),
    )
    old_delta = t.estimated_battery_delta
    out = await svc.update_task(
        uid_a, t.id, TaskUpdate(duration_minutes=15)
    )
    assert out is not None
    new_delta = estimate_fallback_battery_delta(3, 15)
    assert out.estimated_battery_delta == new_delta
    assert out.estimated_battery_delta != old_delta


@pytest.mark.asyncio
async def test_update_task_returns_none_when_missing(task_service_session):
    svc, uid_a, _uid_b = task_service_session
    assert (
        await svc.update_task(
            uid_a, uuid.uuid4(), TaskUpdate(title="nope")
        )
        is None
    )


@pytest.mark.asyncio
async def test_delete_task_removes_owned_task(task_service_session):
    svc, uid_a, _uid_b = task_service_session
    t = await svc.create_task(uid_a, _payload())
    assert await svc.delete_task(uid_a, t.id) is True

    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            row = await s.get(Task, t.id)
        assert row is None
    finally:
        await eng.dispose()


@pytest.mark.asyncio
async def test_delete_task_returns_false_for_missing_task(task_service_session):
    svc, uid_a, _uid_b = task_service_session
    assert await svc.delete_task(uid_a, uuid.uuid4()) is False


@pytest.mark.asyncio
async def test_delete_task_does_not_delete_other_users_task(task_service_session):
    svc, uid_a, uid_b = task_service_session
    t = await svc.create_task(uid_a, _payload())
    assert await svc.delete_task(uid_b, t.id) is False

    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            row = await s.get(Task, t.id)
        assert row is not None
    finally:
        await eng.dispose()


@pytest.mark.asyncio
async def test_estimation_clamps_to_maximum_drain(task_service_session):
    svc, uid_a, _uid_b = task_service_session
    t = await svc.create_task(
        uid_a,
        TaskCreate(
            title="big",
            description="big",
            difficulty=5,
            duration_minutes=9999,
            priority=1,
        ),
    )
    assert abs(t.estimated_battery_delta) <= 40


@pytest.mark.asyncio
async def test_estimation_has_minimum_drain(task_service_session):
    svc, uid_a, _uid_b = task_service_session
    t = await svc.create_task(
        uid_a,
        TaskCreate(
            title="tiny",
            description="tiny",
            difficulty=1,
            duration_minutes=15,
            priority=1,
        ),
    )
    assert abs(t.estimated_battery_delta) >= 1


@pytest.mark.asyncio
async def test_list_tasks_newest_first(task_service_session):
    svc, uid_a, _uid_b = task_service_session
    t1 = await svc.create_task(uid_a, _payload(title="first"))
    await asyncio.sleep(0.02)
    t2 = await svc.create_task(uid_a, _payload(title="second"))
    rows = await svc.list_tasks(uid_a)
    assert [r.id for r in rows] == [t2.id, t1.id]
