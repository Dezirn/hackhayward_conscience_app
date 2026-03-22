from __future__ import annotations

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import configure_mappers

from app.core.enums import TaskStatus
from app.models import Battery, Profile
from tests.conftest import make_battery, make_profile, make_task


def test_profile_mapper_and_relationships_configured():
    configure_mappers()
    assert Profile.battery.property.uselist is False
    assert Profile.tasks.property.uselist is True
    assert Profile.battery_events.property.uselist is True


def test_profile_instantiate_and_persist(session):
    p = make_profile(username="profile_smoke_user")
    session.add(p)
    session.flush()
    assert p.id is not None
    assert p.timezone == "UTC"
    assert p.onboarding_completed is False


def test_profile_tasks_relationship(session):
    p = make_profile()
    session.add(p)
    session.flush()
    t1 = make_task(p, title="a")
    t2 = make_task(p, title="b", status=TaskStatus.completed)
    session.add_all([t1, t2])
    session.flush()
    session.refresh(p)
    assert len(p.tasks) == 2
    assert {x.title for x in p.tasks} == {"a", "b"}


def test_profile_battery_one_to_one(session):
    p = make_profile()
    b = make_battery(p)
    session.add_all([p, b])
    session.flush()
    session.refresh(p)
    assert p.battery is not None
    assert p.battery.user_id == p.id
    assert isinstance(p.battery, Battery)


def test_duplicate_username_fails(session):
    u = "duplicate_username_xyz"
    p1 = make_profile(username=u)
    session.add(p1)
    session.flush()
    p2 = make_profile(username=u)
    with pytest.raises(IntegrityError):
        with session.begin_nested():
            session.add(p2)
            session.flush()
