from __future__ import annotations

import pytest
from sqlalchemy.exc import DBAPIError, IntegrityError

from tests.conftest import make_battery, make_profile


def test_battery_valid(session):
    p = make_profile()
    session.add(p)
    session.flush()
    b = make_battery(p, current_level=55, status_label="steady")
    session.add(b)
    session.flush()
    assert b.user_id == p.id
    assert b.min_level == 0
    assert b.max_level == 100


def test_battery_max_must_exceed_min(session):
    p = make_profile()
    session.add(p)
    session.flush()
    b = make_battery(p, min_level=10, max_level=5, current_level=7)
    with pytest.raises(DBAPIError):
        with session.begin_nested():
            session.add(b)
            session.flush()


def test_battery_current_below_min(session):
    p = make_profile()
    session.add(p)
    session.flush()
    b = make_battery(p, min_level=10, max_level=100, current_level=5, baseline_level=50)
    with pytest.raises(DBAPIError):
        with session.begin_nested():
            session.add(b)
            session.flush()


def test_battery_current_above_max(session):
    p = make_profile()
    session.add(p)
    session.flush()
    b = make_battery(p, current_level=150)
    with pytest.raises(DBAPIError):
        with session.begin_nested():
            session.add(b)
            session.flush()


def test_battery_baseline_outside_range(session):
    p = make_profile()
    session.add(p)
    session.flush()
    b = make_battery(p, baseline_level=101)
    with pytest.raises(DBAPIError):
        with session.begin_nested():
            session.add(b)
            session.flush()


def test_battery_baseline_below_min(session):
    p = make_profile()
    session.add(p)
    session.flush()
    b = make_battery(p, min_level=20, max_level=100, current_level=50, baseline_level=10)
    with pytest.raises(DBAPIError):
        with session.begin_nested():
            session.add(b)
            session.flush()


def test_battery_daily_bonus_negative(session):
    p = make_profile()
    session.add(p)
    session.flush()
    b = make_battery(p, daily_bonus=-1)
    with pytest.raises(DBAPIError):
        with session.begin_nested():
            session.add(b)
            session.flush()


def test_battery_recharge_rate_negative(session):
    p = make_profile()
    session.add(p)
    session.flush()
    b = make_battery(p, recharge_rate_per_hour=-0.5)
    with pytest.raises(DBAPIError):
        with session.begin_nested():
            session.add(b)
            session.flush()


def test_second_battery_for_same_user_fails(session):
    p = make_profile()
    session.add(p)
    session.flush()
    b1 = make_battery(p)
    b2 = make_battery(p, current_level=40, status_label="other")
    session.add(b1)
    session.flush()
    with pytest.raises(IntegrityError):
        with session.begin_nested():
            session.add(b2)
            session.flush()
