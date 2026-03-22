from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import TaskStatus
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate

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


class TaskService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_task(self, user_id: UUID, payload: TaskCreate) -> Task:
        delta = estimate_fallback_battery_delta(
            payload.difficulty, payload.duration_minutes
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
            ai_score=None,
            ai_reasoning=None,
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
            task.estimated_battery_delta = estimate_fallback_battery_delta(
                task.difficulty, task.duration_minutes
            )

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
