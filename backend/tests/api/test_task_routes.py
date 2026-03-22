from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import select

from app.core.enums import TaskStatus
from app.models import Profile, Task
from app.services.task_service import estimate_fallback_battery_delta

from tests.conftest import _test_async_engine_sessionmaker


async def _bootstrap(client):
    r = await client.post("/profile/bootstrap")
    assert r.status_code == 200


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
async def test_post_tasks_creates_task(profile_api_client):
    client, uid = profile_api_client
    await _bootstrap(client)
    r = await client.post("/tasks", json=_valid_create_payload())
    assert r.status_code == 201
    data = r.json()
    assert data["user_id"] == str(uid)
    assert data["title"] == "Do the thing"
    assert data["description"] == "A clear description"
    assert data["difficulty"] == 2
    assert data["duration_minutes"] == 30
    assert data["priority"] == 3
    assert data["status"] == "pending"
    assert data["estimated_battery_delta"] < 0
    assert data["estimated_battery_delta"] == estimate_fallback_battery_delta(2, 30)


@pytest.mark.asyncio
async def test_post_tasks_rejects_invalid_payload(profile_api_client):
    client, _uid = profile_api_client
    await _bootstrap(client)
    r = await client.post(
        "/tasks",
        json=_valid_create_payload(difficulty=6),
    )
    assert r.status_code == 422
    r2 = await client.post(
        "/tasks",
        json=_valid_create_payload(title="   "),
    )
    assert r2.status_code == 422


@pytest.mark.asyncio
async def test_get_tasks_returns_only_current_users_tasks(profile_api_client):
    client, uid = profile_api_client
    await _bootstrap(client)
    uid_b = uuid.uuid4()
    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            s.add(
                Profile(
                    id=uid_b,
                    username=f"other_{uid_b.hex[:12]}",
                    timezone="UTC",
                    onboarding_completed=False,
                )
            )
            await s.commit()
        assert (await client.post("/tasks", json=_valid_create_payload(title="Mine A"))).status_code == 201
        assert (await client.post("/tasks", json=_valid_create_payload(title="Mine B"))).status_code == 201
        async with AsyncLocal() as s:
            s.add(
                Task(
                    user_id=uid_b,
                    title="Theirs",
                    description="X",
                    difficulty=1,
                    duration_minutes=15,
                    priority=1,
                    status=TaskStatus.pending,
                    estimated_battery_delta=-5,
                )
            )
            await s.commit()
        r = await client.get("/tasks")
        assert r.status_code == 200
        titles = {row["title"] for row in r.json()}
        assert titles == {"Mine A", "Mine B"}
    finally:
        await eng.dispose()
        await _cleanup_user_tree(uid_b)


@pytest.mark.asyncio
async def test_get_tasks_supports_status_filter(profile_api_client):
    client, uid = profile_api_client
    await _bootstrap(client)
    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            s.add(
                Task(
                    user_id=uid,
                    title="Done one",
                    description="d",
                    difficulty=2,
                    duration_minutes=20,
                    priority=2,
                    status=TaskStatus.completed,
                    estimated_battery_delta=-10,
                )
            )
            await s.commit()
        assert (
            await client.post("/tasks", json=_valid_create_payload(title="Still open"))
        ).status_code == 201
        r = await client.get("/tasks", params={"status": "pending"})
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) == 1
        assert rows[0]["title"] == "Still open"
        assert rows[0]["status"] == "pending"
    finally:
        await eng.dispose()


@pytest.mark.asyncio
async def test_get_task_by_id_returns_owned_task(profile_api_client):
    client, uid = profile_api_client
    await _bootstrap(client)
    created = await client.post("/tasks", json=_valid_create_payload(title="Single"))
    assert created.status_code == 201
    tid = created.json()["id"]
    r = await client.get(f"/tasks/{tid}")
    assert r.status_code == 200
    assert r.json()["id"] == tid
    assert r.json()["user_id"] == str(uid)


@pytest.mark.asyncio
async def test_get_task_by_id_returns_404_for_missing_task(profile_api_client):
    client, _uid = profile_api_client
    await _bootstrap(client)
    r = await client.get(f"/tasks/{uuid.uuid4()}")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_get_task_by_id_returns_404_for_other_users_task(profile_api_client):
    client, _uid = profile_api_client
    await _bootstrap(client)
    uid_b = uuid.uuid4()
    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            s.add(
                Profile(
                    id=uid_b,
                    username=f"other_{uid_b.hex[:12]}",
                    timezone="UTC",
                    onboarding_completed=False,
                )
            )
            t = Task(
                user_id=uid_b,
                title="Secret",
                description="S",
                difficulty=2,
                duration_minutes=20,
                priority=2,
                status=TaskStatus.pending,
                estimated_battery_delta=-8,
            )
            s.add(t)
            await s.commit()
            other_id = str(t.id)
        r = await client.get(f"/tasks/{other_id}")
        assert r.status_code == 404
    finally:
        await eng.dispose()
        await _cleanup_user_tree(uid_b)


@pytest.mark.asyncio
async def test_patch_task_updates_allowed_fields(profile_api_client):
    client, uid = profile_api_client
    await _bootstrap(client)
    created = await client.post("/tasks", json=_valid_create_payload())
    assert created.status_code == 201
    tid = created.json()["id"]
    due = datetime(2026, 4, 1, 12, 0, 0, tzinfo=timezone.utc)
    body = {
        "title": "Updated title",
        "description": "Updated body",
        "difficulty": 4,
        "duration_minutes": 45,
        "priority": 5,
        "due_at": due.isoformat(),
    }
    r = await client.patch(f"/tasks/{tid}", json=body)
    assert r.status_code == 200
    data = r.json()
    assert data["title"] == "Updated title"
    assert data["description"] == "Updated body"
    assert data["difficulty"] == 4
    assert data["duration_minutes"] == 45
    assert data["priority"] == 5
    assert data["user_id"] == str(uid)
    assert data["due_at"] is not None


@pytest.mark.asyncio
async def test_patch_task_recomputes_estimated_delta(profile_api_client):
    client, _uid = profile_api_client
    await _bootstrap(client)
    created = await client.post(
        "/tasks",
        json=_valid_create_payload(difficulty=2, duration_minutes=30),
    )
    assert created.status_code == 201
    before = created.json()["estimated_battery_delta"]
    tid = created.json()["id"]
    r = await client.patch(
        f"/tasks/{tid}",
        json={"difficulty": 3, "duration_minutes": 15},
    )
    assert r.status_code == 200
    after = r.json()["estimated_battery_delta"]
    assert after == estimate_fallback_battery_delta(3, 15)
    assert after != before


@pytest.mark.asyncio
async def test_patch_task_returns_404_for_missing_task(profile_api_client):
    client, _uid = profile_api_client
    await _bootstrap(client)
    r = await client.patch(
        f"/tasks/{uuid.uuid4()}",
        json={"title": "Nope"},
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_delete_task_returns_204_and_removes_task(profile_api_client):
    client, _uid = profile_api_client
    await _bootstrap(client)
    created = await client.post("/tasks", json=_valid_create_payload())
    tid = created.json()["id"]
    r = await client.delete(f"/tasks/{tid}")
    assert r.status_code == 204
    assert r.content == b""

    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            row = await s.get(Task, uuid.UUID(tid))
            assert row is None
    finally:
        await eng.dispose()

    assert (await client.get(f"/tasks/{tid}")).status_code == 404


@pytest.mark.asyncio
async def test_delete_task_returns_404_for_missing_task(profile_api_client):
    client, _uid = profile_api_client
    await _bootstrap(client)
    r = await client.delete(f"/tasks/{uuid.uuid4()}")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_delete_task_returns_404_for_other_users_task(profile_api_client):
    client, _uid = profile_api_client
    await _bootstrap(client)
    uid_b = uuid.uuid4()
    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            s.add(
                Profile(
                    id=uid_b,
                    username=f"other_{uid_b.hex[:12]}",
                    timezone="UTC",
                    onboarding_completed=False,
                )
            )
            t = Task(
                user_id=uid_b,
                title="Not yours",
                description="N",
                difficulty=1,
                duration_minutes=10,
                priority=1,
                status=TaskStatus.pending,
                estimated_battery_delta=-3,
            )
            s.add(t)
            await s.commit()
            other_id = str(t.id)
        r = await client.delete(f"/tasks/{other_id}")
        assert r.status_code == 404
        async with AsyncLocal() as s:
            row = await s.execute(select(Task).where(Task.id == t.id))
            assert row.scalar_one_or_none() is not None
    finally:
        await eng.dispose()
        await _cleanup_user_tree(uid_b)


@pytest.mark.asyncio
async def test_get_tasks_returns_empty_list_when_no_tasks(profile_api_client):
    client, _uid = profile_api_client
    await _bootstrap(client)
    r = await client.get("/tasks")
    assert r.status_code == 200
    assert r.json() == []
