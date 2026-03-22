from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone

import pytest
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
