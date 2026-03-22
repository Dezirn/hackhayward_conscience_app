from __future__ import annotations

import uuid
from datetime import datetime

import pytest
from sqlalchemy import delete, func, select

from app.models import Battery, Profile

from tests.conftest import _test_async_engine_sessionmaker


@pytest.mark.asyncio
async def test_bootstrap_creates_profile_and_battery(profile_api_client):
    client, uid = profile_api_client
    r = await client.post("/profile/bootstrap")
    assert r.status_code == 200
    data = r.json()
    assert data["profile"]["id"] == str(uid)
    assert data["profile"]["username"] == f"demo-{uid.hex[:12]}"
    bat = data["battery"]
    assert bat["user_id"] == str(uid)
    assert bat["current_level"] == 70
    assert bat["status_label"] == "okay"

    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            row_p = await s.get(Profile, uid)
            row_b = (
                await s.execute(select(Battery).where(Battery.user_id == uid))
            ).scalar_one()
        assert row_p is not None
        assert row_p.username == f"demo-{uid.hex[:12]}"
        assert row_p.timezone == "UTC"
        assert row_p.onboarding_completed is False
        assert row_b.user_id == uid
        assert row_b.baseline_level == 70
        assert row_b.recharge_rate_per_hour == 2.0
    finally:
        await eng.dispose()


@pytest.mark.asyncio
async def test_bootstrap_is_idempotent(profile_api_client):
    client, uid = profile_api_client
    assert (await client.post("/profile/bootstrap")).status_code == 200
    assert (await client.post("/profile/bootstrap")).status_code == 200
    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            np = await s.scalar(
                select(func.count()).select_from(Profile).where(Profile.id == uid)
            )
            nb = await s.scalar(
                select(func.count()).select_from(Battery).where(Battery.user_id == uid)
            )
        assert np == 1
        assert nb == 1
    finally:
        await eng.dispose()


@pytest.mark.asyncio
async def test_get_profile_returns_profile_after_bootstrap(profile_api_client):
    client, uid = profile_api_client
    boot = await client.post("/profile/bootstrap")
    assert boot.status_code == 200
    boot_username = boot.json()["profile"]["username"]
    r = await client.get("/profile")
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == str(uid)
    assert body["username"] == boot_username

    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            row = await s.get(Profile, uid)
        assert row.username == body["username"]
        assert row.timezone == body["timezone"]
    finally:
        await eng.dispose()


@pytest.mark.asyncio
async def test_get_profile_returns_404_if_missing(profile_api_client):
    client, _uid = profile_api_client
    r = await client.get("/profile")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_patch_profile_updates_allowed_fields(profile_api_client):
    client, uid = profile_api_client
    await client.post("/profile/bootstrap")
    before = await client.get("/profile")
    assert before.status_code == 200
    t0 = datetime.fromisoformat(before.json()["updated_at"].replace("Z", "+00:00"))
    r = await client.patch(
        "/profile",
        json={
            "username": f"patched-{uid.hex[:8]}",
            "display_name": "DN",
            "timezone": "America/New_York",
            "onboarding_completed": True,
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["username"] == f"patched-{uid.hex[:8]}"
    assert body["display_name"] == "DN"
    assert body["timezone"] == "America/New_York"
    assert body["onboarding_completed"] is True
    t1 = datetime.fromisoformat(body["updated_at"].replace("Z", "+00:00"))
    assert t1 >= t0

    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            row = await s.get(Profile, uid)
        assert row.username == f"patched-{uid.hex[:8]}"
        assert row.display_name == "DN"
        assert row.timezone == "America/New_York"
        assert row.onboarding_completed is True
    finally:
        await eng.dispose()


@pytest.mark.asyncio
async def test_patch_profile_returns_404_if_missing(profile_api_client):
    client, _uid = profile_api_client
    r = await client.patch("/profile", json={"display_name": "x"})
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_patch_profile_rejects_duplicate_username(profile_api_client):
    client, uid = profile_api_client
    await client.post("/profile/bootstrap")
    other_id = uuid.uuid4()
    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as session:
            session.add(
                Profile(
                    id=other_id,
                    username="taken_username_phase3",
                    timezone="UTC",
                    onboarding_completed=False,
                )
            )
            await session.commit()
        r = await client.patch("/profile", json={"username": "taken_username_phase3"})
        assert r.status_code == 409
    finally:
        async with AsyncLocal() as session:
            await session.execute(delete(Profile).where(Profile.id == other_id))
            await session.commit()
        await eng.dispose()


@pytest.mark.asyncio
async def test_patch_profile_rejects_invalid_timezone(profile_api_client):
    client, _uid = profile_api_client
    await client.post("/profile/bootstrap")
    r = await client.patch("/profile", json={"timezone": "Not/A/Real/Zone_XYZ"})
    assert r.status_code == 422
