from __future__ import annotations

from fastapi import APIRouter

from app.schemas.council import CouncilRequest, CouncilRespondResponse
from app.services.council_service import run_council

router = APIRouter(prefix="/council", tags=["council"])


@router.post("/respond", response_model=CouncilRespondResponse)
async def council_respond(body: CouncilRequest) -> CouncilRespondResponse:
    """
    One Perplexity call → five advisor stances + synthesis (JSON), or deterministic fallback.
    """
    return await run_council(body)
