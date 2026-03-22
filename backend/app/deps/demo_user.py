from typing import Annotated
from uuid import UUID

from fastapi import Depends

from app.core.config import get_settings


def get_demo_user_id() -> UUID:
    """
    Stable predefined user id for Phase 1 (no auth).
    Override with env `DEMO_USER_ID` (must be a valid UUID string).
    """
    return UUID(get_settings().demo_user_id)


def demo_user_id_dep() -> UUID:
    return get_demo_user_id()


DemoUserId = Annotated[UUID, Depends(demo_user_id_dep)]
