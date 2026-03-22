"""Decision Council: Perplexity via AIClient, with deterministic fallback."""

from __future__ import annotations

import logging

from app.schemas.council import CouncilRequest, CouncilRespondResponse
from app.services.ai_client import AIClient, AIClientError
from app.services.council_fallback import (
    build_fallback_council_response,
    parse_and_normalize_council_response,
)

log = logging.getLogger(__name__)


async def run_council(body: CouncilRequest) -> CouncilRespondResponse:
    q = body.question
    c = body.context or ""
    client = AIClient()
    try:
        raw = await client.generate_council_decision_raw(q, c)
        if not isinstance(raw, dict):
            raise ValueError("provider returned non-object JSON")
        return parse_and_normalize_council_response(q, raw)
    except (AIClientError, ValueError, TypeError, KeyError) as e:
        log.warning(
            "Council: Perplexity unavailable or output not normalized; using fallback: %s",
            e,
        )
        return build_fallback_council_response(q, c)
    except Exception as e:
        log.exception(
            "Council: unexpected error during AI or normalization; using fallback: %s",
            e,
        )
        return build_fallback_council_response(q, c)
