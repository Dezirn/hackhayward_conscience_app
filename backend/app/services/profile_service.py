from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Battery, Profile
from app.schemas.profile import ProfileUpdate


class ProfileUsernameConflictError(Exception):
    """Another profile already uses this username."""


def default_demo_username(user_id: UUID) -> str:
    return f"demo-{user_id.hex[:12]}"


class ProfileService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_profile(self, user_id: UUID) -> Profile | None:
        return await self.session.get(Profile, user_id)

    async def bootstrap_profile(self, user_id: UUID) -> tuple[Profile, Battery]:
        profile = await self.session.get(Profile, user_id)
        result = await self.session.execute(
            select(Battery).where(Battery.user_id == user_id)
        )
        battery = result.scalar_one_or_none()

        if profile is not None and battery is not None:
            return profile, battery

        if profile is None:
            profile = Profile(
                id=user_id,
                username=default_demo_username(user_id),
                display_name=None,
                timezone="UTC",
                onboarding_completed=False,
            )
            self.session.add(profile)
            await self.session.flush()

        if battery is None:
            now = datetime.now(timezone.utc)
            battery = Battery(
                user_id=user_id,
                current_level=70,
                min_level=0,
                max_level=100,
                baseline_level=70,
                daily_bonus=5,
                recharge_rate_per_hour=2.0,
                last_recalculated_at=now,
                last_daily_bonus_date=None,
                status_label="okay",
            )
            self.session.add(battery)
            await self.session.flush()

        await self.session.commit()
        await self.session.refresh(profile)
        await self.session.refresh(battery)
        return profile, battery

    async def update_profile(
        self, user_id: UUID, payload: ProfileUpdate
    ) -> Profile | None:
        profile = await self.session.get(Profile, user_id)
        if profile is None:
            return None

        data = payload.model_dump(exclude_unset=True)
        if not data:
            return profile

        try:
            if "username" in data:
                profile.username = data["username"]
            if "display_name" in data:
                profile.display_name = data["display_name"]
            if "timezone" in data:
                profile.timezone = data["timezone"]
            if "onboarding_completed" in data:
                profile.onboarding_completed = data["onboarding_completed"]

            profile.updated_at = datetime.now(timezone.utc)
            await self.session.flush()
            await self.session.commit()
            await self.session.refresh(profile)
        except IntegrityError as exc:
            await self.session.rollback()
            if self._is_username_unique_violation(exc):
                raise ProfileUsernameConflictError from exc
            raise

        return profile

    @staticmethod
    def _is_username_unique_violation(exc: IntegrityError) -> bool:
        err = str(exc.orig) if exc.orig else str(exc)
        err_l = err.lower()
        return "uq_profiles_username" in err_l or "profiles_username_key" in err_l or (
            "unique" in err_l and "username" in err_l
        )
