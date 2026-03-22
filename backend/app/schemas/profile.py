from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator

from app.schemas.battery import BatteryRead


def validate_iana_timezone(value: str) -> str:
    from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

    try:
        ZoneInfo(value)
    except ZoneInfoNotFoundError as e:
        raise ValueError("timezone must be a valid IANA name") from e
    return value


class ProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    username: str
    display_name: Optional[str] = None
    timezone: str
    onboarding_completed: bool
    created_at: datetime
    updated_at: datetime


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: Optional[str] = None
    display_name: Optional[str] = None
    timezone: Optional[str] = None
    onboarding_completed: Optional[bool] = None

    @field_validator("username")
    @classmethod
    def username_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            s = v.strip()
            if not s:
                raise ValueError("username cannot be blank")
            return s
        return v

    @field_validator("timezone")
    @classmethod
    def timezone_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return validate_iana_timezone(v.strip())


class ProfileBootstrapResponse(BaseModel):
    profile: ProfileRead
    battery: BatteryRead
