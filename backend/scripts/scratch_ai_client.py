#!/usr/bin/env python3
"""
One-off scratch: call Perplexity via AIClient and print structured output.

Usage (from repo backend/):
  python scripts/scratch_ai_client.py
  python scripts/scratch_ai_client.py recharge

Requires PERPLEXITY_API_KEY (and normal AI_* settings) in backend/.env.
"""
from __future__ import annotations

import asyncio
import sys

# Allow `python scripts/scratch_ai_client.py` from backend/
if __name__ == "__main__":
    from pathlib import Path

    _root = Path(__file__).resolve().parent.parent
    if str(_root) not in sys.path:
        sys.path.insert(0, str(_root))

from app.services.ai_client import (
    AIClient,
    AIClientError,
    AIProviderTimeoutError,
    AIResponseParseError,
    AIResponseValidationError,
)


async def run_task_demo() -> None:
    client = AIClient()
    out = await client.estimate_task(
        title="Prep slides for demo",
        description="Polish deck and rehearse once",
        difficulty=3,
        duration_minutes=45,
        priority=4,
    )
    print("=== estimate_task ===")
    print(out.model_dump())


async def run_recharge_demo() -> None:
    client = AIClient()
    out = await client.analyze_recharge(
        description="20-minute walk outside",
        feeling_text="Clearer head, less tense",
        duration_minutes=20,
    )
    print("=== analyze_recharge ===")
    print(out.model_dump())


async def main() -> None:
    mode = (sys.argv[1] if len(sys.argv) > 1 else "task").lower()
    try:
        if mode in ("recharge", "r"):
            await run_recharge_demo()
        else:
            await run_task_demo()
    except AIProviderTimeoutError as e:
        print("Timeout:", e, file=sys.stderr)
        sys.exit(1)
    except AIResponseParseError as e:
        print("Parse error:", e, file=sys.stderr)
        sys.exit(1)
    except AIResponseValidationError as e:
        print("Validation error:", e, file=sys.stderr)
        sys.exit(1)
    except AIClientError as e:
        print("AI client error:", e, file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
