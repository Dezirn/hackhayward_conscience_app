"""phase2 social battery schema (profiles, batteries, tasks, recharge_entries, battery_events)

Revision ID: 2c4f8a1e9b0d
Revises: 94815aa61fda
Create Date: 2026-03-21

Destructive: drops prior minimal profiles/battery_events from 94815aa61fda and recreates full schema.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "2c4f8a1e9b0d"
down_revision: Union[str, Sequence[str], None] = "94815aa61fda"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    op.drop_table("battery_events")
    op.drop_table("profiles")

    task_status = postgresql.ENUM(
        "pending", "completed", "skipped", name="task_status", create_type=False
    )
    task_status.create(bind, checkfirst=True)

    bes = postgresql.ENUM(
        "task", "recharge", "daily_bonus", name="battery_event_source_type", create_type=False
    )
    bes.create(bind, checkfirst=True)

    op.create_table(
        "profiles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("username", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=True),
        sa.Column("timezone", sa.String(length=64), server_default="UTC", nullable=False),
        sa.Column(
            "onboarding_completed",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username", name="uq_profiles_username"),
    )

    op.create_table(
        "batteries",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("current_level", sa.Integer(), nullable=False),
        sa.Column("min_level", sa.Integer(), server_default="0", nullable=False),
        sa.Column("max_level", sa.Integer(), server_default="100", nullable=False),
        sa.Column("baseline_level", sa.Integer(), server_default="70", nullable=False),
        sa.Column("daily_bonus", sa.Integer(), server_default="5", nullable=False),
        sa.Column(
            "recharge_rate_per_hour",
            sa.Float(),
            server_default="2.0",
            nullable=False,
        ),
        sa.Column(
            "last_recalculated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("last_daily_bonus_date", sa.Date(), nullable=True),
        sa.Column("status_label", sa.String(length=128), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("max_level > min_level", name="ck_batteries_max_gt_min"),
        sa.CheckConstraint(
            "current_level >= min_level AND current_level <= max_level",
            name="ck_batteries_current_in_range",
        ),
        sa.CheckConstraint(
            "baseline_level >= min_level AND baseline_level <= max_level",
            name="ck_batteries_baseline_in_range",
        ),
        sa.CheckConstraint("daily_bonus >= 0", name="ck_batteries_daily_bonus_nonneg"),
        sa.CheckConstraint(
            "recharge_rate_per_hour >= 0",
            name="ck_batteries_recharge_rate_nonneg",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_batteries_user_id"),
    )

    op.create_table(
        "tasks",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=512), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("difficulty", sa.Integer(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("priority", sa.Integer(), nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM(
                "pending",
                "completed",
                "skipped",
                name="task_status",
                create_type=False,
            ),
            server_default=sa.text("'pending'::task_status"),
            nullable=False,
        ),
        sa.Column("estimated_battery_delta", sa.Integer(), nullable=False),
        sa.Column("ai_score", sa.Float(), nullable=True),
        sa.Column("ai_reasoning", sa.Text(), nullable=True),
        sa.Column("recommended_order", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "difficulty >= 1 AND difficulty <= 5",
            name="ck_tasks_difficulty_range",
        ),
        sa.CheckConstraint(
            "priority >= 1 AND priority <= 5",
            name="ck_tasks_priority_range",
        ),
        sa.CheckConstraint("duration_minutes > 0", name="ck_tasks_duration_positive"),
        sa.CheckConstraint(
            "recommended_order IS NULL OR recommended_order > 0",
            name="ck_tasks_recommended_order_positive",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_tasks_user_id"), "tasks", ["user_id"], unique=False)

    op.create_table(
        "recharge_entries",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("feeling_text", sa.Text(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("ai_estimated_delta", sa.Integer(), nullable=False),
        sa.Column("ai_confidence", sa.Float(), nullable=True),
        sa.Column("ai_summary", sa.Text(), nullable=True),
        sa.Column("mood_tags", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "ai_estimated_delta >= 0",
            name="ck_recharge_entries_ai_delta_nonneg",
        ),
        sa.CheckConstraint(
            "duration_minutes IS NULL OR duration_minutes > 0",
            name="ck_recharge_entries_duration_positive_if_set",
        ),
        sa.CheckConstraint(
            "ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1)",
            name="ck_recharge_entries_ai_confidence_range",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_recharge_entries_user_id"), "recharge_entries", ["user_id"], unique=False
    )

    op.create_table(
        "battery_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column(
            "source_type",
            postgresql.ENUM(
                "task",
                "recharge",
                "daily_bonus",
                name="battery_event_source_type",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("source_id", sa.Uuid(), nullable=True),
        sa.Column("delta", sa.Integer(), nullable=False),
        sa.Column("battery_before", sa.Integer(), nullable=False),
        sa.Column("battery_after", sa.Integer(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "battery_before >= 0", name="ck_battery_events_before_nonneg"
        ),
        sa.CheckConstraint("battery_after >= 0", name="ck_battery_events_after_nonneg"),
        sa.ForeignKeyConstraint(["user_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_battery_events_user_id"), "battery_events", ["user_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_battery_events_user_id"), table_name="battery_events")
    op.drop_table("battery_events")
    op.drop_index(op.f("ix_recharge_entries_user_id"), table_name="recharge_entries")
    op.drop_table("recharge_entries")
    op.drop_index(op.f("ix_tasks_user_id"), table_name="tasks")
    op.drop_table("tasks")
    op.drop_table("batteries")
    op.drop_table("profiles")

    op.execute(sa.text("DROP TYPE IF EXISTS battery_event_source_type"))
    op.execute(sa.text("DROP TYPE IF EXISTS task_status"))

    op.create_table(
        "profiles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "battery_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("source_type", sa.String(length=32), nullable=False),
        sa.Column("source_id", sa.Uuid(), nullable=True),
        sa.Column("delta", sa.Integer(), nullable=False),
        sa.Column("battery_before", sa.Integer(), nullable=False),
        sa.Column("battery_after", sa.Integer(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "source_type IN ('task', 'recharge', 'daily_bonus')",
            name="ck_battery_events_source_type",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_battery_events_user_id"), "battery_events", ["user_id"], unique=False
    )
