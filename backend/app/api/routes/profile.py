from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.async_session import get_async_session
from app.deps.demo_user import DemoUserId
from app.schemas.battery import BatteryRead
from app.schemas.profile import (
    ProfileBootstrapResponse,
    ProfileRead,
    ProfileUpdate,
)
from app.services.profile_service import (
    ProfileService,
    ProfileUsernameConflictError,
)


router = APIRouter(prefix="/profile", tags=["profile"])


def get_profile_service(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> ProfileService:
    return ProfileService(session)


@router.post("/bootstrap", response_model=ProfileBootstrapResponse)
async def bootstrap_profile(
    user_id: DemoUserId,
    service: Annotated[ProfileService, Depends(get_profile_service)],
) -> ProfileBootstrapResponse:
    profile, battery = await service.bootstrap_profile(user_id)
    return ProfileBootstrapResponse(
        profile=ProfileRead.model_validate(profile),
        battery=BatteryRead.model_validate(battery),
    )


@router.get("", response_model=ProfileRead)
async def get_profile(
    user_id: DemoUserId,
    service: Annotated[ProfileService, Depends(get_profile_service)],
) -> ProfileRead:
    profile = await service.get_profile(user_id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Call POST /profile/bootstrap first.",
        )
    return ProfileRead.model_validate(profile)


@router.patch("", response_model=ProfileRead)
async def patch_profile(
    body: ProfileUpdate,
    user_id: DemoUserId,
    service: Annotated[ProfileService, Depends(get_profile_service)],
) -> ProfileRead:
    try:
        profile = await service.update_profile(user_id, body)
    except ProfileUsernameConflictError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken.",
        ) from None

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Call POST /profile/bootstrap first.",
        )
    return ProfileRead.model_validate(profile)
