from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
_ENV_PATH = _BACKEND_ROOT / ".env"


def _prime_backend_dotenv_into_environ() -> None:
    """Expose backend/.env keys to os.environ so asyncpg and Settings agree (pydantic does not export .env to os)."""
    if not _ENV_PATH.is_file():
        return
    for raw in _ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        if not key or key in os.environ:
            continue
        val = val.strip()
        if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
            val = val[1:-1]
        os.environ[key] = val


_prime_backend_dotenv_into_environ()

import pytest
import pytest_asyncio
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import get_settings
from app.core.enums import BatteryEventSourceType, TaskStatus
from app.db.utils import postgres_connect_args
from app.models import (
    Battery,
    BatteryEvent,
    Profile,
    RechargeEntry,
    Task,
)


def database_url() -> str | None:
    test = (os.getenv("TEST_DATABASE_URL") or "").strip()
    if test:
        return test
    app_url = get_settings().database_url.strip()
    if app_url:
        return app_url
    return (os.getenv("DATABASE_URL") or "").strip() or None


@pytest.fixture(scope="session")
def engine():
    url = database_url()
    if not url:
        pytest.skip("Set DATABASE_URL or TEST_DATABASE_URL for PostgreSQL tests")
    eng = create_engine(
        url,
        poolclass=NullPool,
        connect_args=postgres_connect_args(url),
    )
    yield eng
    eng.dispose()


@pytest.fixture
def session(engine) -> Session:
    conn = engine.connect()
    trans = conn.begin()
    SessionLocal = sessionmaker(bind=conn)
    sess = SessionLocal()
    try:
        yield sess
    finally:
        sess.close()
        trans.rollback()
        conn.close()


def make_profile(**kwargs) -> Profile:
    uid = kwargs.pop("id", None) or uuid.uuid4()
    return Profile(
        id=uid,
        username=kwargs.get("username", f"user_{uuid.uuid4().hex[:12]}"),
        display_name=kwargs.get("display_name"),
        timezone=kwargs.get("timezone", "UTC"),
        onboarding_completed=kwargs.get("onboarding_completed", False),
    )


def make_battery(profile: Profile, **kwargs) -> Battery:
    now = datetime.now(timezone.utc)
    return Battery(
        user_id=profile.id,
        current_level=kwargs.get("current_level", 50),
        min_level=kwargs.get("min_level", 0),
        max_level=kwargs.get("max_level", 100),
        baseline_level=kwargs.get("baseline_level", 70),
        daily_bonus=kwargs.get("daily_bonus", 5),
        recharge_rate_per_hour=kwargs.get("recharge_rate_per_hour", 2.0),
        last_recalculated_at=kwargs.get("last_recalculated_at", now),
        last_daily_bonus_date=kwargs.get("last_daily_bonus_date"),
        status_label=kwargs.get("status_label", "ok"),
    )


def make_task(profile: Profile, **kwargs) -> Task:
    return Task(
        user_id=profile.id,
        title=kwargs.get("title", "T"),
        description=kwargs.get("description", "D"),
        difficulty=kwargs.get("difficulty", 3),
        duration_minutes=kwargs.get("duration_minutes", 30),
        priority=kwargs.get("priority", 2),
        due_at=kwargs.get("due_at"),
        status=kwargs.get("status", TaskStatus.pending),
        estimated_battery_delta=kwargs.get("estimated_battery_delta", -5),
        ai_score=kwargs.get("ai_score"),
        ai_reasoning=kwargs.get("ai_reasoning"),
        recommended_order=kwargs.get("recommended_order"),
    )


def make_recharge_entry(profile: Profile, **kwargs) -> RechargeEntry:
    return RechargeEntry(
        user_id=profile.id,
        description=kwargs.get("description", "Walk"),
        feeling_text=kwargs.get("feeling_text", "Better"),
        duration_minutes=kwargs.get("duration_minutes", 20),
        ai_estimated_delta=kwargs.get("ai_estimated_delta", 10),
        ai_confidence=kwargs.get("ai_confidence"),
        ai_summary=kwargs.get("ai_summary"),
        mood_tags=kwargs.get("mood_tags"),
    )


def make_battery_event(profile: Profile, **kwargs) -> BatteryEvent:
    return BatteryEvent(
        user_id=profile.id,
        source_type=kwargs.get("source_type", BatteryEventSourceType.task),
        source_id=kwargs.get("source_id"),
        delta=kwargs.get("delta", -3),
        battery_before=kwargs.get("battery_before", 50),
        battery_after=kwargs.get("battery_after", 47),
        explanation=kwargs.get("explanation"),
    )


@pytest.fixture
def inspector(engine):
    return inspect(engine)


def _skip_if_no_async_db():
    if not database_url():
        pytest.skip("Set DATABASE_URL or TEST_DATABASE_URL for async API tests")


def _test_async_engine_sessionmaker():
    """Per-fixture async engine (avoids global engine bound to a different event loop)."""
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
    from sqlalchemy.pool import NullPool

    from app.db.utils import asyncpg_connect_kwargs, to_async_database_url

    url = database_url()
    assert url
    async_url = to_async_database_url(url)
    settings = get_settings()
    eng = create_async_engine(
        async_url,
        poolclass=NullPool,
        connect_args=asyncpg_connect_kwargs(
            url, ssl_relaxed=settings.database_ssl_relaxed
        ),
    )
    factory = async_sessionmaker(
        eng,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    return eng, factory, text


@pytest_asyncio.fixture
async def profile_api_client():
    _skip_if_no_async_db()
    import httpx
    from httpx import ASGITransport

    from app.deps.demo_user import demo_user_id_dep
    from app.main import app as fastapi_app

    eng, AsyncLocal, text = _test_async_engine_sessionmaker()
    uid = uuid.uuid4()

    async def over_demo() -> uuid.UUID:
        return uid

    async def over_session():
        async with AsyncLocal() as session:
            yield session

    from app.db.async_session import get_async_session

    fastapi_app.dependency_overrides[demo_user_id_dep] = over_demo
    fastapi_app.dependency_overrides[get_async_session] = over_session
    transport = ASGITransport(app=fastapi_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac, uid
    fastapi_app.dependency_overrides.clear()
    async with eng.begin() as conn:
        await conn.execute(
            text("DELETE FROM battery_events WHERE user_id = :u"), {"u": uid}
        )
        await conn.execute(text("DELETE FROM batteries WHERE user_id = :u"), {"u": uid})
        await conn.execute(text("DELETE FROM profiles WHERE id = :u"), {"u": uid})
    await eng.dispose()


@pytest_asyncio.fixture
async def profile_service_context():
    _skip_if_no_async_db()
    from app.services.profile_service import ProfileService

    eng, AsyncLocal, text = _test_async_engine_sessionmaker()
    uid = uuid.uuid4()
    async with AsyncLocal() as session:
        yield ProfileService(session), uid
    async with eng.begin() as conn:
        await conn.execute(
            text("DELETE FROM battery_events WHERE user_id = :u"), {"u": uid}
        )
        await conn.execute(text("DELETE FROM batteries WHERE user_id = :u"), {"u": uid})
        await conn.execute(text("DELETE FROM profiles WHERE id = :u"), {"u": uid})
    await eng.dispose()


@pytest_asyncio.fixture
async def battery_recalc_session():
    """Isolated async session + user id for battery recalc tests; cleans events then battery then profile."""
    _skip_if_no_async_db()
    eng, AsyncLocal, text = _test_async_engine_sessionmaker()
    uid = uuid.uuid4()
    async with AsyncLocal() as session:
        yield session, uid
    async with eng.begin() as conn:
        await conn.execute(
            text("DELETE FROM battery_events WHERE user_id = :u"), {"u": uid}
        )
        await conn.execute(text("DELETE FROM batteries WHERE user_id = :u"), {"u": uid})
        await conn.execute(text("DELETE FROM profiles WHERE id = :u"), {"u": uid})
    await eng.dispose()
