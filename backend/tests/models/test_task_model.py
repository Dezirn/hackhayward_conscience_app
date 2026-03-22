from __future__ import annotations

import pytest
from sqlalchemy.exc import DBAPIError

from app.core.enums import TaskStatus
from tests.conftest import make_profile, make_task


def test_task_valid_and_enum(session):
    p = make_profile()
    session.add(p)
    session.flush()
    t = make_task(
        p,
        status=TaskStatus.skipped,
        recommended_order=3,
    )
    session.add(t)
    session.flush()
    assert t.status == TaskStatus.skipped
    assert t.recommended_order == 3


def test_task_difficulty_too_low(session):
    p = make_profile()
    session.add(p)
    session.flush()
    t = make_task(p, difficulty=0)
    with pytest.raises(DBAPIError):
        with session.begin_nested():
            session.add(t)
            session.flush()


def test_task_difficulty_too_high(session):
    p = make_profile()
    session.add(p)
    session.flush()
    t = make_task(p, difficulty=6)
    with pytest.raises(DBAPIError):
        with session.begin_nested():
            session.add(t)
            session.flush()


def test_task_priority_out_of_range(session):
    p = make_profile()
    session.add(p)
    session.flush()
    t = make_task(p, priority=0)
    with pytest.raises(DBAPIError):
        with session.begin_nested():
            session.add(t)
            session.flush()


def test_task_duration_non_positive(session):
    p = make_profile()
    session.add(p)
    session.flush()
    t = make_task(p, duration_minutes=0)
    with pytest.raises(DBAPIError):
        with session.begin_nested():
            session.add(t)
            session.flush()


def test_task_recommended_order_zero(session):
    p = make_profile()
    session.add(p)
    session.flush()
    t = make_task(p, recommended_order=0)
    with pytest.raises(DBAPIError):
        with session.begin_nested():
            session.add(t)
            session.flush()
