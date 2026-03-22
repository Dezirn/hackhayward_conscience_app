from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from sqlalchemy import func, select

from app.core.enums import BatteryEventSourceType
from app.models import Battery, BatteryEvent, Profile, RechargeEntry

from tests.conftest import _test_async_engine_sessionmaker


async def _bootstrap(client):
    assert (await client.post("/profile/bootstrap")).status_code == 200


def _reflection(**kw):
    base = {
        "description": "Walked outside",
        "feeling_text": "Feeling calmer and a bit better.",
    }
    base.update(kw)
    return base


@pytest.mark.asyncio
async def test_post_recharge_analyze_returns_structured_preview(profile_api_client):
    client, _uid = profile_api_client
    await _bootstrap(client)
    r = await client.post("/recharge/analyze", json=_reflection())
    assert r.status_code == 200
    data = r.json()
    assert "ai_estimated_delta" in data
    assert "ai_confidence" in data
    assert "ai_summary" in data
    assert "mood_tags" in data
    assert isinstance(data["ai_estimated_delta"], int)
    assert data["ai_estimated_delta"] >= 1


@pytest.mark.asyncio
async def test_post_recharge_analyze_does_not_mutate_database(profile_api_client):
    client, uid = profile_api_client
    await _bootstrap(client)

    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            n_e0 = await s.scalar(
                select(func.count()).select_from(RechargeEntry).where(
                    RechargeEntry.user_id == uid
                )
            )
            n_ev0 = await s.scalar(
                select(func.count()).select_from(BatteryEvent).where(
                    BatteryEvent.user_id == uid
                )
            )
            bat = (
                await s.execute(select(Battery).where(Battery.user_id == uid))
            ).scalar_one()
            level0 = bat.current_level
    finally:
        await eng.dispose()

    r = await client.post("/recharge/analyze", json=_reflection())
    assert r.status_code == 200

    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            n_e1 = await s.scalar(
                select(func.count()).select_from(RechargeEntry).where(
                    RechargeEntry.user_id == uid
                )
            )
            n_ev1 = await s.scalar(
                select(func.count()).select_from(BatteryEvent).where(
                    BatteryEvent.user_id == uid
                )
            )
            bat = (
                await s.execute(select(Battery).where(Battery.user_id == uid))
            ).scalar_one()
            await s.refresh(bat)
            assert n_e1 == n_e0 == 0
            assert n_ev1 == n_ev0 == 0
            assert bat.current_level == level0
    finally:
        await eng.dispose()


@pytest.mark.asyncio
async def test_post_recharge_analyze_rejects_invalid_payload(profile_api_client):
    client, _uid = profile_api_client
    await _bootstrap(client)
    r = await client.post(
        "/recharge/analyze",
        json={"description": "   ", "feeling_text": "ok"},
    )
    assert r.status_code == 422
    r2 = await client.post(
        "/recharge/analyze",
        json=_reflection(duration_minutes=0),
    )
    assert r2.status_code == 422


@pytest.mark.asyncio
async def test_post_recharge_commit_creates_entry_and_updates_battery(profile_api_client):
    client, uid = profile_api_client
    await _bootstrap(client)

    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            bat = (
                await s.execute(select(Battery).where(Battery.user_id == uid))
            ).scalar_one()
            before = bat.current_level
    finally:
        await eng.dispose()

    r = await client.post("/recharge/commit", json=_reflection())
    assert r.status_code == 200
    body = r.json()
    assert "recharge_entry" in body
    assert "battery" in body
    assert body["battery"]["current_level"] > before

    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            n = await s.scalar(
                select(func.count()).select_from(RechargeEntry).where(
                    RechargeEntry.user_id == uid
                )
            )
            assert n == 1
            bat = (
                await s.execute(select(Battery).where(Battery.user_id == uid))
            ).scalar_one()
            assert bat.current_level == body["battery"]["current_level"]
            n_ev = await s.scalar(
                select(func.count())
                .select_from(BatteryEvent)
                .where(
                    BatteryEvent.user_id == uid,
                    BatteryEvent.source_type == BatteryEventSourceType.recharge,
                )
            )
            assert n_ev == 1
    finally:
        await eng.dispose()


@pytest.mark.asyncio
async def test_post_recharge_commit_returns_404_when_profile_missing(profile_api_client):
    client, _uid = profile_api_client
    r = await client.post("/recharge/commit", json=_reflection())
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_post_recharge_commit_returns_404_when_battery_missing(profile_api_client):
    client, uid = profile_api_client
    eng, AsyncLocal, sql_text = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            s.add(
                Profile(
                    id=uid,
                    username=f"nb_{uid.hex[:10]}",
                    timezone="UTC",
                    onboarding_completed=False,
                )
            )
            await s.commit()
        r = await client.post("/recharge/commit", json=_reflection())
        assert r.status_code == 404
        async with eng.begin() as conn:
            await conn.execute(sql_text("DELETE FROM profiles WHERE id = :u"), {"u": uid})
    finally:
        await eng.dispose()


@pytest.mark.asyncio
async def test_post_recharge_commit_recalculates_battery_before_apply(profile_api_client):
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

    preview = await client.post(
        "/recharge/analyze",
        json=_reflection(description="stretch", feeling_text="okay"),
    )
    assert preview.status_code == 200
    delta = preview.json()["ai_estimated_delta"]

    with patch("app.services.recharge_service.datetime") as mock_dt:
        mock_dt.now.return_value = frozen
        r = await client.post(
            "/recharge/commit",
            json=_reflection(description="stretch", feeling_text="okay"),
        )
    assert r.status_code == 200
    assert r.json()["battery"]["current_level"] == 50 + 6 + delta


@pytest.mark.asyncio
async def test_post_recharge_commit_clamps_battery_to_max(profile_api_client):
    client, uid = profile_api_client
    await _bootstrap(client)

    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            bat = (
                await s.execute(select(Battery).where(Battery.user_id == uid))
            ).scalar_one()
            bat.current_level = 98
            await s.commit()
    finally:
        await eng.dispose()

    r = await client.post(
        "/recharge/commit",
        json=_reflection(
            description="amazing nap calm peaceful rested energized refreshed grounded focused clear good better okay",
            feeling_text="less overwhelmed less anxious and very relaxed",
            duration_minutes=120,
        ),
    )
    assert r.status_code == 200
    assert r.json()["battery"]["current_level"] <= 100
    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            bat = (
                await s.execute(select(Battery).where(Battery.user_id == uid))
            ).scalar_one()
            assert bat.current_level == bat.max_level
    finally:
        await eng.dispose()


@pytest.mark.asyncio
async def test_post_recharge_commit_creates_single_recharge_event(profile_api_client):
    client, uid = profile_api_client
    await _bootstrap(client)

    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            n0 = await s.scalar(
                select(func.count())
                .select_from(BatteryEvent)
                .where(
                    BatteryEvent.user_id == uid,
                    BatteryEvent.source_type == BatteryEventSourceType.recharge,
                )
            )
    finally:
        await eng.dispose()

    assert (
        await client.post("/recharge/commit", json=_reflection(description="tea", feeling_text="calm"))
    ).status_code == 200

    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            n1 = await s.scalar(
                select(func.count())
                .select_from(BatteryEvent)
                .where(
                    BatteryEvent.user_id == uid,
                    BatteryEvent.source_type == BatteryEventSourceType.recharge,
                )
            )
            assert n1 == n0 + 1 == 1
    finally:
        await eng.dispose()


@pytest.mark.asyncio
async def test_post_recharge_commit_rejects_invalid_payload(profile_api_client):
    client, _uid = profile_api_client
    await _bootstrap(client)
    r = await client.post(
        "/recharge/commit",
        json={"description": "ok", "feeling_text": "   "},
    )
    assert r.status_code == 422
    r2 = await client.post(
        "/recharge/commit",
        json=_reflection(duration_minutes=-5),
    )
    assert r2.status_code == 422


@pytest.mark.asyncio
async def test_post_recharge_commit_returns_server_computed_delta(profile_api_client):
    client, uid = profile_api_client
    await _bootstrap(client)
    payload = _reflection(description="read a book", feeling_text="focused and clear")
    prev = await client.post("/recharge/analyze", json=payload)
    assert prev.status_code == 200
    expected_delta = prev.json()["ai_estimated_delta"]

    r = await client.post("/recharge/commit", json=payload)
    assert r.status_code == 200
    assert r.json()["recharge_entry"]["ai_estimated_delta"] == expected_delta


@pytest.mark.asyncio
async def test_post_recharge_commit_does_not_require_frontend_computed_values(
    profile_api_client,
):
    client, _uid = profile_api_client
    await _bootstrap(client)
    r = await client.post(
        "/recharge/commit",
        json={
            "description": "Sat quietly",
            "feeling_text": "A little more peaceful.",
            "duration_minutes": 20,
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["recharge_entry"]["description"] == "Sat quietly"
    assert data["recharge_entry"]["ai_estimated_delta"] >= 1
