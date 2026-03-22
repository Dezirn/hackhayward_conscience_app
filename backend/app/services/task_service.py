from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.enums import BatteryEventSourceType, TaskStatus
from app.models.battery import Battery
from app.models.battery_event import BatteryEvent
from app.models.profile import Profile
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate
from app.services.ai_client import AIClient, AIClientError
from app.services.battery_service import BatteryService
from app.services.task_lifecycle_errors import (
    BatteryNotFoundError,
    InvalidTaskStateError,
    ProfileNotFoundError,
)

logger = logging.getLogger(__name__)

# Matches fallback magnitude domain: drain in [-40, -1]
_TASK_DELTA_MIN = -40
_TASK_DELTA_MAX = -1

_AI_REASONING_MAX_LEN = 8000

# Fields that trigger recomputation of estimated_battery_delta on update
_ESTIMATION_FIELD_NAMES = frozenset(
    {
        "title",
        "description",
        "difficulty",
        "duration_minutes",
        "priority",
        "due_at",
    }
)


def estimate_fallback_battery_delta(difficulty: int, duration_minutes: int) -> int:
    """
    Deterministic drain estimate (no AI).

    base = difficulty * 5
    duration_factor = min(duration_minutes / 15, 8)
    magnitude = base + round(duration_factor), clamped to [1, 40]
    return -magnitude
    """
    base = difficulty * 5
    duration_factor = min(duration_minutes / 15.0, 8.0)
    magnitude = base + round(duration_factor)
    magnitude = max(1, min(int(magnitude), 40))
    return -magnitude


def _should_try_task_ai() -> bool:
    s = get_settings()
    if not (s.perplexity_api_key or "").strip():
        return False
    return s.ai_provider.strip().lower() == "perplexity"


def _sanitize_task_battery_delta(raw: float | int) -> int:
    """Normalize AI delta to a negative integer in [_TASK_DELTA_MIN, _TASK_DELTA_MAX]."""
    v = int(round(float(raw)))
    if v > 0:
        v = -v
    if v == 0:
        v = -1
    if v < _TASK_DELTA_MIN:
        v = _TASK_DELTA_MIN
    if v > _TASK_DELTA_MAX:
        v = _TASK_DELTA_MAX
    return v


def _sanitize_ai_score(raw: float | None) -> float | None:
    if raw is None:
        return None
    x = float(raw)
    if x < 0.0:
        return 0.0
    if x > 1.0:
        return 1.0
    return x


def _sanitize_ai_reasoning(raw: str | None) -> str | None:
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None
    return s[:_AI_REASONING_MAX_LEN]


async def _resolve_task_estimation(
    *,
    title: str,
    description: str,
    difficulty: int,
    duration_minutes: int,
    priority: int,
    due_at: datetime | None,
) -> tuple[int, float | None, str | None]:
    """
    AI-first task drain estimate; deterministic fallback on missing config or any AI failure.
    Returns (estimated_battery_delta, ai_score, ai_reasoning).
    """
    fb = estimate_fallback_battery_delta(difficulty, duration_minutes)
    if not _should_try_task_ai():
        return fb, None, None

    try:
        client = AIClient()
        out = await client.estimate_task(
            title=title,
            description=description,
            difficulty=difficulty,
            duration_minutes=duration_minutes,
            priority=priority,
            due_at=due_at,
        )
        delta = _sanitize_task_battery_delta(out.estimated_battery_delta)
        score = _sanitize_ai_score(out.ai_score)
        reasoning = _sanitize_ai_reasoning(out.ai_reasoning)
        return delta, score, reasoning
    except AIClientError as e:
        logger.info("Task estimation: AI failed, using fallback (%s)", e)
        return fb, None, None
    except Exception as e:
        logger.warning(
            "Task estimation: unexpected error, using fallback (%s)",
            e,
            exc_info=True,
        )
        return fb, None, None


class TaskService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_task(self, user_id: UUID, payload: TaskCreate) -> Task:
        delta, ai_score, ai_reasoning = await _resolve_task_estimation(
            title=payload.title,
            description=payload.description,
            difficulty=payload.difficulty,
            duration_minutes=payload.duration_minutes,
            priority=payload.priority,
            due_at=payload.due_at,
        )
        task = Task(
            user_id=user_id,
            title=payload.title,
            description=payload.description,
            difficulty=payload.difficulty,
            duration_minutes=payload.duration_minutes,
            priority=payload.priority,
            due_at=payload.due_at,
            status=TaskStatus.pending,
            estimated_battery_delta=delta,
            ai_score=ai_score,
            ai_reasoning=ai_reasoning,
            recommended_order=None,
        )
        self.session.add(task)
        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(task)
        return task

    async def list_tasks(
        self, user_id: UUID, status: TaskStatus | None = None
    ) -> list[Task]:
        q = select(Task).where(Task.user_id == user_id)
        if status is not None:
            q = q.where(Task.status == status)
        q = q.order_by(Task.created_at.desc())
        result = await self.session.execute(q)
        return list(result.scalars().all())

    async def get_task(self, user_id: UUID, task_id: UUID) -> Task | None:
        task = await self.session.get(Task, task_id)
        if task is None or task.user_id != user_id:
            return None
        return task

    async def update_task(
        self, user_id: UUID, task_id: UUID, payload: TaskUpdate
    ) -> Task | None:
        task = await self.get_task(user_id, task_id)
        if task is None:
            return None

        data = payload.model_dump(exclude_unset=True)
        recompute = bool(data.keys() & _ESTIMATION_FIELD_NAMES)

        if "title" in data:
            task.title = data["title"]
        if "description" in data:
            task.description = data["description"]
        if "difficulty" in data:
            task.difficulty = data["difficulty"]
        if "duration_minutes" in data:
            task.duration_minutes = data["duration_minutes"]
        if "priority" in data:
            task.priority = data["priority"]
        if "due_at" in data:
            task.due_at = data["due_at"]

        if recompute:
            delta, ai_score, ai_reasoning = await _resolve_task_estimation(
                title=task.title,
                description=task.description,
                difficulty=task.difficulty,
                duration_minutes=task.duration_minutes,
                priority=task.priority,
                due_at=task.due_at,
            )
            task.estimated_battery_delta = delta
            task.ai_score = ai_score
            task.ai_reasoning = ai_reasoning

        task.updated_at = datetime.now(timezone.utc)
        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(task)
        return task

    async def delete_task(self, user_id: UUID, task_id: UUID) -> bool:
        task = await self.get_task(user_id, task_id)
        if task is None:
            return False
        await self.session.delete(task)
        await self.session.commit()
        return True

    async def complete_task(self, user_id: UUID, task_id: UUID) -> Task | None:
        task = await self.get_task(user_id, task_id)
        if task is None:
            return None
        if task.status != TaskStatus.pending:
            raise InvalidTaskStateError(
                f"Cannot complete task with status {task.status.value!r}; expected pending.",
                current_status=task.status,
            )

        profile = await self.session.get(Profile, user_id)
        if profile is None:
            raise ProfileNotFoundError(
                "Profile not found for this user; cannot complete task."
            )

        result = await self.session.execute(
            select(Battery).where(Battery.user_id == user_id)
        )
        battery = result.scalar_one_or_none()
        if battery is None:
            raise BatteryNotFoundError(
                "Battery not found for this user; cannot complete task."
            )

        now = datetime.now(timezone.utc)
        await BatteryService.recalculate_battery(
            self.session, battery, profile.timezone, now
        )

        battery_before = battery.current_level
        tentative = battery_before + task.estimated_battery_delta
        battery_after = BatteryService.clamp_level(
            tentative, battery.min_level, battery.max_level
        )
        battery.current_level = battery_after
        battery.status_label = BatteryService.get_status_label(
            battery_after, battery.max_level
        )
        battery.updated_at = now

        self.session.add(
            BatteryEvent(
                user_id=user_id,
                source_type=BatteryEventSourceType.task,
                source_id=task.id,
                delta=task.estimated_battery_delta,
                battery_before=battery_before,
                battery_after=battery_after,
                explanation="Task completed",
            )
        )

        task.status = TaskStatus.completed
        task.updated_at = now

        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(task)
        return task

    async def skip_task(self, user_id: UUID, task_id: UUID) -> Task | None:
        task = await self.get_task(user_id, task_id)
        if task is None:
            return None
        if task.status != TaskStatus.pending:
            raise InvalidTaskStateError(
                f"Cannot skip task with status {task.status.value!r}; expected pending.",
                current_status=task.status,
            )

        now = datetime.now(timezone.utc)
        task.status = TaskStatus.skipped
        task.updated_at = now

        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(task)
        return task
