from __future__ import annotations

import uuid

import pytest
from sqlalchemy.exc import DBAPIError

from app.core.enums import BatteryEventSourceType
from tests.conftest import make_battery_event, make_profile


def test_battery_event_valid(session):
    p = make_profile()
    session.add(p)
    session.flush()
    e = make_battery_event(
        p,
        source_type=BatteryEventSourceType.daily_bonus,
        source_id=uuid.uuid4(),
        delta=5,
        battery_before=40,
        battery_after=45,
    )
    session.add(e)
    session.flush()
    assert e.source_type == BatteryEventSourceType.daily_bonus


def test_battery_event_battery_before_negative(session):
    p = make_profile()
    session.add(p)
    session.flush()
    e = make_battery_event(p, battery_before=-1, battery_after=10)
    with pytest.raises(DBAPIError):
        with session.begin_nested():
            session.add(e)
            session.flush()


def test_battery_event_battery_after_negative(session):
    p = make_profile()
    session.add(p)
    session.flush()
    e = make_battery_event(p, battery_before=10, battery_after=-1)
    with pytest.raises(DBAPIError):
        with session.begin_nested():
            session.add(e)
            session.flush()
