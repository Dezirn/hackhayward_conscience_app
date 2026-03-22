from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.async_session import get_async_session
from app.deps.demo_user import DemoUserId
from app.models.battery import Battery
from app.models.battery_event import BatteryEvent
from app.models.profile import Profile
from app.schemas.battery import BatteryRead
from app.schemas.battery_event import BatteryEventRead
from app.services.battery_service import BatteryService

router = APIRouter(prefix="/battery", tags=["battery"])


@router.get("", response_model=BatteryRead)
async def get_battery(
    user_id: DemoUserId,
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> BatteryRead:
    profile = await session.get(Profile, user_id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Call POST /profile/bootstrap first.",
        )

    result = await session.execute(
        select(Battery).where(Battery.user_id == user_id)
    )
    battery = result.scalar_one_or_none()
    if battery is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Battery not found for this user.",
        )

    await BatteryService.recalculate_battery(
        session, battery, profile.timezone
    )
    await session.commit()
    await session.refresh(battery)
    return BatteryRead.model_validate(battery)


@router.get("/history", response_model=list[BatteryEventRead])
async def get_battery_history(
    user_id: DemoUserId,
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> list[BatteryEventRead]:
    profile = await session.get(Profile, user_id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Call POST /profile/bootstrap first.",
        )

    result = await session.execute(
        select(BatteryEvent)
        .where(BatteryEvent.user_id == user_id)
        .order_by(BatteryEvent.created_at.desc())
    )
    rows = result.scalars().all()
    return [BatteryEventRead.model_validate(e) for e in rows]
