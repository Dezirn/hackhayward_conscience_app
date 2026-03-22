from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest
from sqlalchemy import inspect, text

BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent


def test_expected_tables_exist(inspector):
    names = set(inspector.get_table_names())
    for t in (
        "profiles",
        "batteries",
        "tasks",
        "recharge_entries",
        "battery_events",
        "alembic_version",
    ):
        assert t in names, f"missing table {t}"


def test_profiles_username_unique_constraint(inspector):
    uqs = {c["name"] for c in inspector.get_unique_constraints("profiles")}
    assert "uq_profiles_username" in uqs


def test_batteries_one_per_user_constraint(inspector):
    uqs = {c["name"] for c in inspector.get_unique_constraints("batteries")}
    assert "uq_batteries_user_id" in uqs


def test_batteries_check_constraints(inspector):
    names = {c["name"] for c in inspector.get_check_constraints("batteries")}
    assert "ck_batteries_max_gt_min" in names
    assert "ck_batteries_current_in_range" in names


def test_tasks_check_constraints(inspector):
    names = {c["name"] for c in inspector.get_check_constraints("tasks")}
    assert "ck_tasks_difficulty_range" in names
    assert "ck_tasks_duration_positive" in names


def test_pg_enums_exist(engine):
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                "SELECT typname FROM pg_type "
                "WHERE typname IN ('task_status', 'battery_event_source_type')"
            )
        ).fetchall()
    typnames = {r[0] for r in rows}
    assert typnames == {"task_status", "battery_event_source_type"}


@pytest.mark.skipif(
    not os.getenv("RUN_ALEMBIC_CYCLE_TESTS"),
    reason="Set RUN_ALEMBIC_CYCLE_TESTS=1 to run destructive alembic downgrade/upgrade (uses DATABASE_URL).",
)
def test_alembic_downgrade_and_upgrade_roundtrip():
    url = (os.getenv("TEST_DATABASE_URL") or os.getenv("DATABASE_URL") or "").strip()
    assert url, "DATABASE_URL required"
    env = {**os.environ, "DATABASE_URL": url}
    for args in (
        [sys.executable, "-m", "alembic", "downgrade", "94815aa61fda"],
        [sys.executable, "-m", "alembic", "upgrade", "head"],
    ):
        r = subprocess.run(
            args,
            cwd=str(BACKEND_ROOT),
            env=env,
            capture_output=True,
            text=True,
        )
        assert r.returncode == 0, r.stderr + r.stdout
