"""Domain errors for task lifecycle (complete / skip); map to HTTP in API layers."""

from __future__ import annotations

from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from app.core.enums import TaskStatus


class TaskNotFoundError(LookupError):
    """Reserved for API layers; service methods return None for missing tasks."""


class InvalidTaskStateError(ValueError):
    """Raised when complete_task or skip_task is called on a non-pending task."""

    def __init__(
        self,
        message: str,
        *,
        current_status: Optional["TaskStatus"] = None,
    ) -> None:
        super().__init__(message)
        self.current_status = current_status


class ProfileNotFoundError(LookupError):
    """Raised when completing a task but the user's profile row is missing."""


class BatteryNotFoundError(LookupError):
    """Raised when completing a task but the user has no battery row."""
