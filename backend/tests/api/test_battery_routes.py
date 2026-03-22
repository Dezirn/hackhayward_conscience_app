from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from sqlalchemy import func, select

from app.core.enums import BatteryEventSourceType
from app.models import Battery, BatteryEvent, Profile

from tests.conftest import _test_async_engine_sessionmaker


@pytest.mark.asyncio
async def test_get_battery_returns_404_when_profile_missing(profile_api_client):
    client, _uid = profile_api_client
    r = await client.get("/battery")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_get_battery_returns_404_when_battery_missing(profile_api_client):
    client, uid = profile_api_client
    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            s.add(
                Profile(
                    id=uid,
                    username=f"nopow_{uid.hex[:8]}",
                    timezone="UTC",
                    onboarding_completed=False,
                )
            )
            await s.commit()
    finally:
        await eng.dispose()

    r = await client.get("/battery")
    assert r.status_code == 404
    assert "battery" in r.json()["detail"].lower()


@pytest.mark.asyncio
async def test_get_battery_returns_current_battery_after_bootstrap(profile_api_client):
    client, uid = profile_api_client
    assert (await client.post("/profile/bootstrap")).status_code == 200
    r = await client.get("/battery")
    assert r.status_code == 200
    body = r.json()
    assert body["user_id"] == str(uid)
    assert body["current_level"] == 70
    assert "id" in body
    assert body["min_level"] == 0
    assert body["max_level"] == 100
    assert body["daily_bonus"] == 5
    assert body["recharge_rate_per_hour"] == 2.0
    assert "last_recalculated_at" in body
    assert "status_label" in body
    assert "created_at" in body
    assert "updated_at" in body


@pytest.mark.asyncio
async def test_get_battery_recalculates_passive_recharge(profile_api_client):
    client, uid = profile_api_client
    assert (await client.post("/profile/bootstrap")).status_code == 200
    frozen_end = datetime(2025, 6, 1, 15, 0, 0, tzinfo=timezone.utc)
    frozen_start = frozen_end - timedelta(hours=3)

    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            b = (
                await s.execute(select(Battery).where(Battery.user_id == uid))
            ).scalar_one()
            b.last_recalculated_at = frozen_start
            b.current_level = 50
            await s.commit()
    finally:
        await eng.dispose()

    with patch("app.services.battery_service.datetime") as mock_dt:
        mock_dt.now.return_value = frozen_end
        r = await client.get("/battery")
    assert r.status_code == 200
    assert r.json()["current_level"] == 56


@pytest.mark.asyncio
async def test_get_battery_applies_daily_bonus_when_due(profile_api_client):
    client, uid = profile_api_client
    assert (await client.post("/profile/bootstrap")).status_code == 200
    frozen_end = datetime(2025, 1, 15, 12, 0, 0, tzinfo=timezone.utc)

    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            b = (
                await s.execute(select(Battery).where(Battery.user_id == uid))
            ).scalar_one()
            b.last_recalculated_at = frozen_end
            b.current_level = 50
            b.last_daily_bonus_date = date(2025, 1, 14)
            await s.commit()
    finally:
        await eng.dispose()

    with patch("app.services.battery_service.datetime") as mock_dt:
        mock_dt.now.return_value = frozen_end
        r = await client.get("/battery")
    assert r.status_code == 200
    assert r.json()["current_level"] == 55

    eng2, AsyncLocal2, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal2() as s:
            n = await s.scalar(
                select(func.count())
                .select_from(BatteryEvent)
                .where(
                    BatteryEvent.user_id == uid,
                    BatteryEvent.source_type == BatteryEventSourceType.daily_bonus,
                )
            )
        assert n == 1
    finally:
        await eng2.dispose()


@pytest.mark.asyncio
async def test_get_battery_does_not_create_passive_recharge_event(profile_api_client):
    client, uid = profile_api_client
    assert (await client.post("/profile/bootstrap")).status_code == 200
    frozen_end = datetime(2025, 3, 10, 18, 0, 0, tzinfo=timezone.utc)

    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            b = (
                await s.execute(select(Battery).where(Battery.user_id == uid))
            ).scalar_one()
            b.last_recalculated_at = frozen_end - timedelta(hours=2)
            b.current_level = 40
            b.recharge_rate_per_hour = 2.0
            b.last_daily_bonus_date = frozen_end.date()
            await s.commit()
    finally:
        await eng.dispose()

    with patch("app.services.battery_service.datetime") as mock_dt:
        mock_dt.now.return_value = frozen_end
        r = await client.get("/battery")
    assert r.status_code == 200
    assert r.json()["current_level"] == 44

    h = await client.get("/battery/history")
    assert h.status_code == 200
    assert h.json() == []


@pytest.mark.asyncio
async def test_get_battery_history_returns_newest_first(profile_api_client):
    client, uid = profile_api_client
    assert (await client.post("/profile/bootstrap")).status_code == 200

    t_old = datetime(2024, 6, 1, 12, 0, 0, tzinfo=timezone.utc)
    t_new = datetime(2024, 6, 2, 12, 0, 0, tzinfo=timezone.utc)

    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            s.add(
                BatteryEvent(
                    user_id=uid,
                    source_type=BatteryEventSourceType.task,
                    source_id=None,
                    delta=-1,
                    battery_before=70,
                    battery_after=69,
                    explanation="older",
                    created_at=t_old,
                )
            )
            s.add(
                BatteryEvent(
                    user_id=uid,
                    source_type=BatteryEventSourceType.task,
                    source_id=None,
                    delta=-2,
                    battery_before=69,
                    battery_after=67,
                    explanation="newer",
                    created_at=t_new,
                )
            )
            await s.commit()
    finally:
        await eng.dispose()

    r = await client.get("/battery/history")
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 2
    assert rows[0]["explanation"] == "newer"
    assert rows[1]["explanation"] == "older"
    assert rows[0]["created_at"] >= rows[1]["created_at"]


@pytest.mark.asyncio
async def test_get_battery_history_returns_empty_list_when_no_events(profile_api_client):
    client, uid = profile_api_client
    assert (await client.post("/profile/bootstrap")).status_code == 200
    r = await client.get("/battery/history")
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_get_battery_history_contains_daily_bonus_event_after_bonus_applied(
    profile_api_client,
):
    client, uid = profile_api_client
    assert (await client.post("/profile/bootstrap")).status_code == 200
    frozen_end = datetime(2025, 2, 20, 10, 0, 0, tzinfo=timezone.utc)

    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            b = (
                await s.execute(select(Battery).where(Battery.user_id == uid))
            ).scalar_one()
            b.last_recalculated_at = frozen_end
            b.current_level = 60
            b.last_daily_bonus_date = date(2025, 2, 19)
            await s.commit()
    finally:
        await eng.dispose()

    with patch("app.services.battery_service.datetime") as mock_dt:
        mock_dt.now.return_value = frozen_end
        assert (await client.get("/battery")).status_code == 200

    h = await client.get("/battery/history")
    assert h.status_code == 200
    rows = h.json()
    assert len(rows) == 1
    assert rows[0]["source_type"] == "daily_bonus"
    assert rows[0]["delta"] == 5
