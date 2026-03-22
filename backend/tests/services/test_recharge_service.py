from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from sqlalchemy import func, select, text

from app.core.enums import BatteryEventSourceType
from app.models import Battery, BatteryEvent, Profile, RechargeEntry
from app.schemas.ai_outputs import RechargeAnalysisAIOutput
from app.schemas.recharge import RechargeAnalyzeRequest, RechargeCommitRequest
from app.services.ai_client import AIClientError
from app.services import recharge_service as recharge_service_module
from app.services.recharge_service import RechargeService
from app.services.task_lifecycle_errors import BatteryNotFoundError, ProfileNotFoundError

from tests.conftest import _skip_if_no_async_db, _test_async_engine_sessionmaker


@pytest.mark.asyncio
async def test_analyze_recharge_returns_structured_output(recharge_service_session):
    svc, uid = recharge_service_session
    out = await svc.analyze_recharge(
        uid,
        RechargeAnalyzeRequest(
            description="Walked outside",
            feeling_text="Feeling clearer and calmer now.",
        ),
    )
    assert isinstance(out.ai_estimated_delta, int)
    assert out.ai_estimated_delta >= 1
    assert out.ai_confidence is not None
    assert 0.5 <= out.ai_confidence <= 0.85
    assert out.ai_summary
    assert isinstance(out.mood_tags, list) and len(out.mood_tags) >= 1


@pytest.mark.asyncio
async def test_analyze_recharge_uses_duration_and_keywords(recharge_service_session):
    svc, uid = recharge_service_session
    minimal = await svc.analyze_recharge(
        uid,
        RechargeAnalyzeRequest(description="x", feeling_text="y"),
    )
    strong = await svc.analyze_recharge(
        uid,
        RechargeAnalyzeRequest(
            description="I meditated and felt peaceful, relaxed, and grounded.",
            feeling_text="I am rested, energized, refreshed, focused, and calm.",
            duration_minutes=120,
        ),
    )
    assert strong.ai_estimated_delta >= minimal.ai_estimated_delta


@pytest.mark.asyncio
async def test_analyze_recharge_clamps_to_maximum(recharge_service_session):
    svc, uid = recharge_service_session
    wall = " ".join(
        [
            "calm calmer relaxed rested better focused clear peaceful energized refreshed grounded good okay",
            "less overwhelmed less anxious",
        ]
        * 5
    )
    out = await svc.analyze_recharge(
        uid,
        RechargeAnalyzeRequest(
            description=wall,
            feeling_text=wall,
            duration_minutes=240,
        ),
    )
    assert out.ai_estimated_delta <= 25


@pytest.mark.asyncio
async def test_analyze_recharge_has_minimum_positive_delta(recharge_service_session):
    svc, uid = recharge_service_session
    out = await svc.analyze_recharge(
        uid,
        RechargeAnalyzeRequest(
            description="work was awful",
            feeling_text="exhausted drained stressed overwhelmed anxious worse upset",
        ),
    )
    assert out.ai_estimated_delta >= 1


@pytest.mark.asyncio
async def test_commit_recharge_creates_entry_and_updates_battery(recharge_service_session):
    svc, uid = recharge_service_session
    n_entries = await svc.session.scalar(
        select(func.count()).select_from(RechargeEntry).where(RechargeEntry.user_id == uid)
    )
    assert n_entries == 0

    bat_before = (
        await svc.session.execute(select(Battery).where(Battery.user_id == uid))
    ).scalar_one()
    level_before = bat_before.current_level

    entry, bat_after = await svc.commit_recharge(
        uid,
        RechargeCommitRequest(
            description="Short walk",
            feeling_text="A bit better.",
        ),
    )

    n_entries_after = await svc.session.scalar(
        select(func.count()).select_from(RechargeEntry).where(RechargeEntry.user_id == uid)
    )
    assert n_entries_after == 1
    assert entry.id is not None
    assert bat_after.current_level > level_before
    n_ev = await svc.session.scalar(
        select(func.count())
        .select_from(BatteryEvent)
        .where(
            BatteryEvent.user_id == uid,
            BatteryEvent.source_type == BatteryEventSourceType.recharge,
        )
    )
    assert n_ev == 1


@pytest.mark.asyncio
async def test_commit_recharge_recalculates_battery_before_applying_delta(
    recharge_service_session,
):
    svc, uid = recharge_service_session
    t0 = datetime(2025, 6, 1, 12, 0, 0, tzinfo=timezone.utc)
    frozen = t0 + timedelta(hours=3)

    bat = (
        await svc.session.execute(select(Battery).where(Battery.user_id == uid))
    ).scalar_one()
    bat.last_recalculated_at = t0
    bat.current_level = 50
    bat.last_daily_bonus_date = date(2025, 6, 1)
    await svc.session.commit()
    await svc.session.refresh(bat)

    payload = RechargeCommitRequest(
        description="stretch",
        feeling_text="okay",
        duration_minutes=None,
    )
    preview = await svc.analyze_recharge(uid, payload)
    delta = preview.ai_estimated_delta

    with patch("app.services.recharge_service.datetime") as mock_dt:
        mock_dt.now.return_value = frozen
        await svc.commit_recharge(uid, payload)

    await svc.session.refresh(bat)
    assert bat.current_level == 50 + 6 + delta


@pytest.mark.asyncio
async def test_commit_recharge_clamps_battery_at_max(recharge_service_session):
    svc, uid = recharge_service_session
    fixed = datetime(2025, 8, 1, 12, 0, 0, tzinfo=timezone.utc)
    bat = (
        await svc.session.execute(select(Battery).where(Battery.user_id == uid))
    ).scalar_one()
    bat.last_recalculated_at = fixed
    bat.last_daily_bonus_date = fixed.date()
    bat.current_level = 98
    await svc.session.commit()
    await svc.session.refresh(bat)

    with patch("app.services.recharge_service.datetime") as mock_dt:
        mock_dt.now.return_value = fixed
        await svc.commit_recharge(
            uid,
            RechargeCommitRequest(
                description="amazing nap calm peaceful rested energized refreshed grounded focused clear good better okay",
                feeling_text="less overwhelmed less anxious and very relaxed",
                duration_minutes=120,
            ),
        )
    await svc.session.refresh(bat)
    assert bat.current_level == bat.max_level

    ev = (
        await svc.session.execute(
            select(BatteryEvent).where(
                BatteryEvent.user_id == uid,
                BatteryEvent.source_type == BatteryEventSourceType.recharge,
            )
        )
    ).scalar_one()
    assert ev.delta == bat.max_level - 98


@pytest.mark.asyncio
async def test_commit_recharge_creates_recharge_event_with_correct_before_after(
    recharge_service_session,
):
    svc, uid = recharge_service_session
    fixed = datetime(2025, 8, 1, 12, 0, 0, tzinfo=timezone.utc)
    bat = (
        await svc.session.execute(select(Battery).where(Battery.user_id == uid))
    ).scalar_one()
    bat.last_recalculated_at = fixed
    bat.last_daily_bonus_date = fixed.date()
    bat.current_level = 55
    await svc.session.commit()

    with patch("app.services.recharge_service.datetime") as mock_dt:
        mock_dt.now.return_value = fixed
        entry, _bat = await svc.commit_recharge(
            uid,
            RechargeCommitRequest(description="tea break", feeling_text="calm"),
        )

    ev = (
        await svc.session.execute(
            select(BatteryEvent).where(
                BatteryEvent.user_id == uid,
                BatteryEvent.source_type == BatteryEventSourceType.recharge,
            )
        )
    ).scalar_one()
    assert ev.source_id == entry.id
    assert ev.delta == ev.battery_after - ev.battery_before
    bat_final = (
        await svc.session.execute(select(Battery).where(Battery.user_id == uid))
    ).scalar_one()
    assert ev.battery_before == 55
    assert ev.battery_after == bat_final.current_level


@pytest.mark.asyncio
async def test_commit_recharge_does_not_mutate_db_on_analyze_only(recharge_service_session):
    svc, uid = recharge_service_session
    n0 = await svc.session.scalar(
        select(func.count()).select_from(RechargeEntry).where(RechargeEntry.user_id == uid)
    )
    e0 = await svc.session.scalar(
        select(func.count()).select_from(BatteryEvent).where(BatteryEvent.user_id == uid)
    )
    bat = (
        await svc.session.execute(select(Battery).where(Battery.user_id == uid))
    ).scalar_one()
    level0 = bat.current_level

    await svc.analyze_recharge(
        uid,
        RechargeAnalyzeRequest(description="read", feeling_text="focused"),
    )

    n1 = await svc.session.scalar(
        select(func.count()).select_from(RechargeEntry).where(RechargeEntry.user_id == uid)
    )
    e1 = await svc.session.scalar(
        select(func.count()).select_from(BatteryEvent).where(BatteryEvent.user_id == uid)
    )
    await svc.session.refresh(bat)
    assert n1 == n0 == 0
    assert e1 == e0 == 0
    assert bat.current_level == level0


@pytest.mark.asyncio
async def test_commit_recharge_fails_when_profile_missing():
    _skip_if_no_async_db()
    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    uid = uuid.uuid4()
    try:
        async with AsyncLocal() as session:
            svc = RechargeService(session)
            with pytest.raises(ProfileNotFoundError):
                await svc.commit_recharge(
                    uid,
                    RechargeCommitRequest(description="a", feeling_text="b"),
                )
    finally:
        await eng.dispose()


@pytest.mark.asyncio
async def test_commit_recharge_fails_when_battery_missing():
    _skip_if_no_async_db()
    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    uid = uuid.uuid4()
    try:
        async with AsyncLocal() as session:
            session.add(
                Profile(
                    id=uid,
                    username=f"rb_{uid.hex[:10]}",
                    timezone="UTC",
                    onboarding_completed=False,
                )
            )
            await session.commit()
            svc = RechargeService(session)
            with pytest.raises(BatteryNotFoundError):
                await svc.commit_recharge(
                    uid,
                    RechargeCommitRequest(description="a", feeling_text="b"),
                )
    finally:
        async with eng.begin() as conn:
            await conn.execute(
                text("DELETE FROM recharge_entries WHERE user_id = :u"), {"u": uid}
            )
            await conn.execute(
                text("DELETE FROM battery_events WHERE user_id = :u"), {"u": uid}
            )
            await conn.execute(text("DELETE FROM batteries WHERE user_id = :u"), {"u": uid})
            await conn.execute(text("DELETE FROM profiles WHERE id = :u"), {"u": uid})
        await eng.dispose()


@pytest.mark.asyncio
async def test_commit_recharge_uses_server_side_analysis_not_client_guess(
    recharge_service_session,
):
    svc, uid = recharge_service_session
    payload = RechargeCommitRequest(
        description="Client cannot send a fake delta in this API shape.",
        feeling_text="Feeling good and calm.",
    )
    preview = await svc.analyze_recharge(uid, payload)
    entry, _ = await svc.commit_recharge(uid, payload)
    assert entry.ai_estimated_delta == preview.ai_estimated_delta
    assert entry.ai_confidence == preview.ai_confidence
    assert entry.ai_summary == preview.ai_summary


@pytest.mark.asyncio
async def test_commit_recharge_persists_transactionally(recharge_service_session):
    svc, uid = recharge_service_session
    entry, bat = await svc.commit_recharge(
        uid,
        RechargeCommitRequest(description="jog", feeling_text="refreshed"),
    )
    eid = entry.id

    eng, AsyncLocal, _ = _test_async_engine_sessionmaker()
    try:
        async with AsyncLocal() as s:
            row_e = await s.get(RechargeEntry, eid)
            assert row_e is not None
            row_b = (
                await s.execute(select(Battery).where(Battery.user_id == uid))
            ).scalar_one()
            assert row_b.current_level == bat.current_level
            n = await s.scalar(
                select(func.count())
                .select_from(BatteryEvent)
                .where(
                    BatteryEvent.user_id == uid,
                    BatteryEvent.source_type == BatteryEventSourceType.recharge,
                )
            )
            assert n == 1
    finally:
        await eng.dispose()


@pytest.mark.asyncio
async def test_analyze_recharge_ai_positive_delta_success(
    recharge_service_session, monkeypatch: pytest.MonkeyPatch
):
    class _FakeAI:
        async def analyze_recharge(self, **kwargs):
            return RechargeAnalysisAIOutput(
                ai_estimated_delta=12.0,
                ai_confidence=0.82,
                ai_summary="Model summary",
                mood_tags=["calm"],
            )

    monkeypatch.setattr(recharge_service_module, "_should_try_recharge_ai", lambda: True)
    monkeypatch.setattr(
        recharge_service_module,
        "AIClient",
        lambda *a, **kw: _FakeAI(),
    )
    svc, uid = recharge_service_session
    out = await svc.analyze_recharge(
        uid,
        RechargeAnalyzeRequest(description="a", feeling_text="b"),
    )
    assert out.used_fallback is False
    assert out.ai_estimated_delta == 12
    assert out.ai_summary == "Model summary"


@pytest.mark.asyncio
async def test_analyze_recharge_ai_non_positive_delta_falls_back(
    recharge_service_session, monkeypatch: pytest.MonkeyPatch
):
    class _FakeAI:
        async def analyze_recharge(self, **kwargs):
            return RechargeAnalysisAIOutput(
                ai_estimated_delta=-5.0,
                ai_confidence=0.9,
                ai_summary="bad",
                mood_tags=[],
            )

    monkeypatch.setattr(recharge_service_module, "_should_try_recharge_ai", lambda: True)
    monkeypatch.setattr(
        recharge_service_module,
        "AIClient",
        lambda *a, **kw: _FakeAI(),
    )
    svc, uid = recharge_service_session
    payload = RechargeAnalyzeRequest(description="a", feeling_text="b")
    expected = recharge_service_module._compute_fallback_analysis(payload).delta
    out = await svc.analyze_recharge(uid, payload)
    assert out.used_fallback is True
    assert out.ai_estimated_delta == expected


@pytest.mark.asyncio
async def test_analyze_recharge_ai_client_error_falls_back(
    recharge_service_session, monkeypatch: pytest.MonkeyPatch
):
    class _FakeAI:
        async def analyze_recharge(self, **kwargs):
            raise AIClientError("provider down")

    monkeypatch.setattr(recharge_service_module, "_should_try_recharge_ai", lambda: True)
    monkeypatch.setattr(
        recharge_service_module,
        "AIClient",
        lambda *a, **kw: _FakeAI(),
    )
    svc, uid = recharge_service_session
    payload = RechargeAnalyzeRequest(description="x", feeling_text="y")
    expected = recharge_service_module._compute_fallback_analysis(payload).delta
    out = await svc.analyze_recharge(uid, payload)
    assert out.used_fallback is True
    assert out.ai_estimated_delta == expected


@pytest.mark.asyncio
async def test_commit_recharge_battery_event_delta_is_applied_not_proposed(
    recharge_service_session, monkeypatch: pytest.MonkeyPatch
):
    """When clamp hits max, entry keeps proposed delta; event records actual gain."""

    class _FakeAI:
        async def analyze_recharge(self, **kwargs):
            return RechargeAnalysisAIOutput(
                ai_estimated_delta=25.0,
                ai_confidence=0.7,
                ai_summary="big",
                mood_tags=[],
            )

    monkeypatch.setattr(recharge_service_module, "_should_try_recharge_ai", lambda: True)
    monkeypatch.setattr(
        recharge_service_module,
        "AIClient",
        lambda *a, **kw: _FakeAI(),
    )
    svc, uid = recharge_service_session
    fixed = datetime(2025, 9, 1, 12, 0, 0, tzinfo=timezone.utc)
    bat = (
        await svc.session.execute(select(Battery).where(Battery.user_id == uid))
    ).scalar_one()
    bat.last_recalculated_at = fixed
    bat.last_daily_bonus_date = fixed.date()
    bat.current_level = 98
    await svc.session.commit()
    await svc.session.refresh(bat)

    with patch("app.services.recharge_service.datetime") as mock_dt:
        mock_dt.now.return_value = fixed
        entry, bat_out = await svc.commit_recharge(
            uid,
            RechargeCommitRequest(description="recharge", feeling_text="great"),
        )
    assert entry.ai_estimated_delta == 25
    assert bat_out.current_level == bat_out.max_level

    ev = (
        await svc.session.execute(
            select(BatteryEvent).where(
                BatteryEvent.user_id == uid,
                BatteryEvent.source_type == BatteryEventSourceType.recharge,
            )
        )
    ).scalar_one()
    assert ev.delta == bat_out.max_level - 98
    assert ev.delta == ev.battery_after - ev.battery_before
    assert ev.delta != entry.ai_estimated_delta
