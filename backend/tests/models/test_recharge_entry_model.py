from __future__ import annotations

import pytest
from sqlalchemy.exc import DBAPIError

from tests.conftest import make_profile, make_recharge_entry


def test_recharge_entry_valid_jsonb(session):
    p = make_profile()
    session.add(p)
    session.flush()
    r = make_recharge_entry(
        p,
        mood_tags={"calm": True, "tags": ["a", "b"]},
        ai_confidence=0.75,
    )
    session.add(r)
    session.flush()
    assert r.mood_tags["calm"] is True


def test_recharge_ai_delta_negative(session):
    p = make_profile()
    session.add(p)
    session.flush()
    r = make_recharge_entry(p, ai_estimated_delta=-1)
    with pytest.raises(DBAPIError):
        with session.begin_nested():
            session.add(r)
            session.flush()


def test_recharge_duration_zero(session):
    p = make_profile()
    session.add(p)
    session.flush()
    r = make_recharge_entry(p, duration_minutes=0)
    with pytest.raises(DBAPIError):
        with session.begin_nested():
            session.add(r)
            session.flush()


def test_recharge_ai_confidence_above_one(session):
    p = make_profile()
    session.add(p)
    session.flush()
    r = make_recharge_entry(p, ai_confidence=1.01)
    with pytest.raises(DBAPIError):
        with session.begin_nested():
            session.add(r)
            session.flush()


def test_recharge_ai_confidence_negative(session):
    p = make_profile()
    session.add(p)
    session.flush()
    r = make_recharge_entry(p, ai_confidence=-0.1)
    with pytest.raises(DBAPIError):
        with session.begin_nested():
            session.add(r)
            session.flush()
