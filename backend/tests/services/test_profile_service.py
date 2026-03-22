from __future__ import annotations

import uuid

import pytest
from sqlalchemy import func, select

from app.models import Battery, Profile


@pytest.mark.asyncio
async def test_bootstrap_profile_creates_missing_profile_and_battery(
    profile_service_context,
):
    from tests.conftest import _test_async_engine_sessionmaker

    svc, uid = profile_service_context
    p, b = await svc.bootstrap_profile(uid)
    assert p.id == uid
    assert b.user_id == uid
    assert p.username == f"demo-{uid.hex[:12]}"
    assert b.current_level == 70

    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            db_p = await s.get(Profile, uid)
            db_b = (
                await s.execute(select(Battery).where(Battery.user_id == uid))
            ).scalar_one()
        assert db_p.username == p.username
        assert db_b.max_level == 100
        assert db_b.daily_bonus == 5
        assert db_b.status_label == "okay"
    finally:
        await eng.dispose()


@pytest.mark.asyncio
async def test_bootstrap_profile_creates_missing_battery_only_if_profile_exists():
    from app.models import Profile
    from app.services.profile_service import ProfileService

    from tests.conftest import _test_async_engine_sessionmaker, database_url

    if not database_url():
        pytest.skip("DATABASE_URL or TEST_DATABASE_URL required")

    eng, AsyncLocal, text = _test_async_engine_sessionmaker()
    uid = uuid.uuid4()
    try:
        async with AsyncLocal() as s:
            s.add(
                Profile(
                    id=uid,
                    username=f"pre-{uid.hex[:8]}",
                    timezone="UTC",
                    onboarding_completed=False,
                )
            )
            await s.commit()
        async with AsyncLocal() as s2:
            svc = ProfileService(s2)
            p, b = await svc.bootstrap_profile(uid)
        assert p.id == uid
        assert b is not None
        assert b.status_label == "okay"
        async with AsyncLocal() as s3:
            nbat = await s3.scalar(
                select(func.count()).select_from(Battery).where(Battery.user_id == uid)
            )
        assert nbat == 1
    finally:
        async with eng.begin() as conn:
            await conn.execute(
                text("DELETE FROM batteries WHERE user_id = :u"), {"u": uid}
            )
            await conn.execute(text("DELETE FROM profiles WHERE id = :u"), {"u": uid})
        await eng.dispose()


@pytest.mark.asyncio
async def test_bootstrap_profile_is_idempotent(profile_service_context):
    from tests.conftest import _test_async_engine_sessionmaker

    svc, uid = profile_service_context
    p1, b1 = await svc.bootstrap_profile(uid)
    p2, b2 = await svc.bootstrap_profile(uid)
    assert p1.id == p2.id
    assert b1.id == b2.id
    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            c = await s.scalar(
                select(func.count()).select_from(Profile).where(Profile.id == uid)
            )
            cb = await s.scalar(
                select(func.count()).select_from(Battery).where(Battery.user_id == uid)
            )
        assert c == 1
        assert cb == 1
    finally:
        await eng.dispose()


@pytest.mark.asyncio
async def test_get_profile_returns_none_when_missing(profile_service_context):
    svc, uid = profile_service_context
    assert await svc.get_profile(uid) is None


@pytest.mark.asyncio
async def test_update_profile_updates_selected_fields_only(profile_service_context):
    from app.models import Profile
    from app.schemas.profile import ProfileUpdate

    from tests.conftest import _test_async_engine_sessionmaker

    svc, uid = profile_service_context
    await svc.bootstrap_profile(uid)
    u = ProfileUpdate(display_name="Only DN")
    out = await svc.update_profile(uid, u)
    assert out is not None
    assert out.display_name == "Only DN"
    assert out.username == f"demo-{uid.hex[:12]}"
    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            row = await s.get(Profile, uid)
        assert row.display_name == "Only DN"
    finally:
        await eng.dispose()
