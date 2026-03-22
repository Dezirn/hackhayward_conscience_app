from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.async_session import get_async_session
from app.deps.demo_user import DemoUserId
from app.schemas.battery import BatteryRead
from app.schemas.recharge import (
    RechargeAnalyzeRequest,
    RechargeAnalyzeResponse,
    RechargeCommitRequest,
    RechargeCommitResponse,
    RechargeEntryRead,
)
from app.services.recharge_service import RechargeService
from app.services.task_lifecycle_errors import BatteryNotFoundError, ProfileNotFoundError

router = APIRouter(prefix="/recharge", tags=["recharge"])


def get_recharge_service(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> RechargeService:
    return RechargeService(session)


@router.post("/analyze", response_model=RechargeAnalyzeResponse)
async def analyze_recharge_route(
    body: RechargeAnalyzeRequest,
    user_id: DemoUserId,
    service: Annotated[RechargeService, Depends(get_recharge_service)],
) -> RechargeAnalyzeResponse:
    return await service.analyze_recharge(user_id, body)


@router.post("/commit", response_model=RechargeCommitResponse)
async def commit_recharge_route(
    body: RechargeCommitRequest,
    user_id: DemoUserId,
    service: Annotated[RechargeService, Depends(get_recharge_service)],
) -> RechargeCommitResponse:
    try:
        entry, battery = await service.commit_recharge(user_id, body)
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

    return RechargeCommitResponse(
        recharge_entry=RechargeEntryRead.model_validate(entry),
        battery=BatteryRead.model_validate(battery),
    )
