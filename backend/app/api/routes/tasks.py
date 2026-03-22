from __future__ import annotations

from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import TaskStatus
from app.db.async_session import get_async_session
from app.deps.demo_user import DemoUserId
from app.models.profile import Profile
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate
from app.services.task_lifecycle_errors import (
    BatteryNotFoundError,
    InvalidTaskStateError,
    ProfileNotFoundError,
)
from app.services.task_service import TaskService

router = APIRouter(prefix="/tasks", tags=["tasks"])


def get_task_service(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> TaskService:
    return TaskService(session)


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(
    body: TaskCreate,
    user_id: DemoUserId,
    service: Annotated[TaskService, Depends(get_task_service)],
) -> TaskRead:
    profile = await service.session.get(Profile, user_id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Call POST /profile/bootstrap first.",
        )
    task = await service.create_task(user_id, body)
    return TaskRead.model_validate(task)


@router.get("", response_model=list[TaskRead])
async def list_tasks(
    user_id: DemoUserId,
    service: Annotated[TaskService, Depends(get_task_service)],
    task_status: Annotated[
        Optional[TaskStatus], Query(alias="status")
    ] = None,
) -> list[TaskRead]:
    tasks = await service.list_tasks(user_id, status=task_status)
    return [TaskRead.model_validate(t) for t in tasks]


@router.get("/{task_id}", response_model=TaskRead)
async def get_task(
    task_id: UUID,
    user_id: DemoUserId,
    service: Annotated[TaskService, Depends(get_task_service)],
) -> TaskRead:
    task = await service.get_task(user_id, task_id)
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )
    return TaskRead.model_validate(task)


@router.patch("/{task_id}", response_model=TaskRead)
async def patch_task(
    task_id: UUID,
    body: TaskUpdate,
    user_id: DemoUserId,
    service: Annotated[TaskService, Depends(get_task_service)],
) -> TaskRead:
    task = await service.update_task(user_id, task_id, body)
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )
    return TaskRead.model_validate(task)


@router.post("/{task_id}/complete", response_model=TaskRead)
async def complete_task_route(
    task_id: UUID,
    user_id: DemoUserId,
    service: Annotated[TaskService, Depends(get_task_service)],
) -> TaskRead:
    try:
        task = await service.complete_task(user_id, task_id)
    except InvalidTaskStateError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except ProfileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Call POST /profile/bootstrap first.",
        ) from None
    except BatteryNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Battery not found for this user.",
        ) from None

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )
    return TaskRead.model_validate(task)


@router.post("/{task_id}/skip", response_model=TaskRead)
async def skip_task_route(
    task_id: UUID,
    user_id: DemoUserId,
    service: Annotated[TaskService, Depends(get_task_service)],
) -> TaskRead:
    try:
        task = await service.skip_task(user_id, task_id)
    except InvalidTaskStateError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )
    return TaskRead.model_validate(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: UUID,
    user_id: DemoUserId,
    service: Annotated[TaskService, Depends(get_task_service)],
) -> None:
    deleted = await service.delete_task(user_id, task_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )
