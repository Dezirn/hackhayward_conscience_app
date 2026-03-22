"""
Deterministic council when Perplexity is unavailable or provider JSON cannot be normalized.
Also: lenient parsing + normalization of model output into CouncilRespondResponse.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from app.schemas.council import (
    CouncilAdvisorItem,
    CouncilRespondResponse,
    CouncilSynthesisBody,
)

log = logging.getLogger(__name__)

COUNCIL_ORDER = (
    "optimist",
    "skeptic",
    "pragmatist",
    "empath",
    "strategist",
)

ADVISOR_META: dict[str, tuple[str, str]] = {
    "optimist": ("Optimist", "Opportunity Seeker"),
    "skeptic": ("Skeptic", "Risk Spotter"),
    "pragmatist": ("Pragmatist", "Execution Realist"),
    "empath": ("Empath", "Emotional Guide"),
    "strategist": ("Strategist", "Long-Term Planner"),
}

_ID_ALIASES: dict[str, str] = {
    "optimistic": "optimist",
    "optimists": "optimist",
    "skeptical": "skeptic",
    "skeptics": "skeptic",
    "practical": "pragmatist",
    "pragmatic": "pragmatist",
    "empathy": "empath",
    "empathetic": "empath",
    "strategy": "strategist",
    "strategic": "strategist",
}


def _clip(s: str, max_len: int) -> str:
    t = s.strip()
    if not t:
        return "this choice"
    return t if len(t) <= max_len else f"{t[: max_len - 1]}…"


def _detect_themes(combined: str) -> dict[str, bool]:
    s = combined.lower()
    return {
        "career": bool(
            re.search(
                r"job|career|role|offer|promotion|resign|quit|interview|company|manager",
                s,
            )
        ),
        "money": bool(re.search(r"money|salary|budget|debt|invest|save|afford|cost|price", s)),
        "relocate": bool(re.search(r"move|relocat|city|country|away|distance|commute", s)),
        "relationship": bool(
            re.search(
                r"partner|marriage|family|friend|team|trust|boundary|conversation",
                s,
            )
        ),
    }


def build_fallback_council_response(question: str, context: str) -> CouncilRespondResponse:
    q = question.strip()
    ctx = context.strip()
    themes = _detect_themes(f"{q} {ctx}")
    q_short = _clip(q, 160)
    ctx_sentence = (
        f" With the context you shared—{_clip(ctx, 140)}—that lens matters."
        if ctx
        else ""
    )

    responses: dict[str, str] = {
        "optimist": (
            f'Framed around “{q_short}”, there is more room to win than it might feel at first glance.'
            f"{ctx_sentence} Map one credible upside and the smallest bet that validates it without "
            "locking you in."
            + (
                " Consider who benefits from your growth versus who feels threatened by change."
                if themes["career"]
                else ""
            )
        ),
        "skeptic": (
            f'On “{q_short}”, pressure-test failure modes before you commit.{ctx_sentence} '
            "What breaks if timing slips, stakeholders resist, or upside was overstated? "
            "Name two risks and an early signal for each."
            + (
                " Put numbers on cash-flow and runway—not only narrative."
                if themes["money"]
                else ""
            )
        ),
        "pragmatist": (
            f'For “{q_short}”, translate the decision into the next 48 hours.{ctx_sentence} '
            "Who must align, what’s the cheapest reversible step, and when does ambiguity get expensive?"
            + (
                " Treat place as energy and relationships, not only logistics."
                if themes["relocate"]
                else ""
            )
        ),
        "empath": (
            f'“{q_short}” isn’t only analytical—notice who carries the emotional load.{ctx_sentence} '
            "Whose trust is on the line, and what would feel fair if the outcome is imperfect?"
            + (
                " Name the conversation you may be avoiding—that often clarifies the fork."
                if themes["relationship"]
                else ""
            )
        ),
        "strategist": (
            f'Zoom out from “{q_short}”: where should you be in a year if this goes well—or poorly?'
            f"{ctx_sentence} Prefer options that preserve optionality and compound learning."
        ),
    }

    advisors = [
        CouncilAdvisorItem(
            id=aid,
            name=ADVISOR_META[aid][0],
            role=ADVISOR_META[aid][1],
            response=responses[aid],
        )
        for aid in COUNCIL_ORDER
    ]

    q_syn = _clip(q, 100)
    consensus = (
        f'Across perspectives, “{q_syn}” warrants a deliberate pause: define success, surface the '
        "largest risk, and choose a small reversible next step over a dramatic leap."
    )
    if themes["career"]:
        consensus = (
            f'On “{q_syn}”, align on what this career chapter should optimize—skills, compensation, '
            "autonomy—before you negotiate or exit."
        )
    elif themes["money"]:
        consensus = (
            f'For “{q_syn}”, ground the call in defendable numbers: runway, trade-offs, and what '
            "“enough” means for the next year."
        )
    elif themes["relocate"]:
        consensus = (
            f'Regarding “{q_syn}”, place multiplies people and pace—pick geography that matches what '
            "you’re actually optimizing for."
        )

    tension = (
        "Practical constraints versus human stakes: rushing harmony or speed alone usually leaves a "
        "regret-shaped blind spot."
        if ctx
        else "Upside optimism versus downside control: acting before you’re ready versus analyzing "
        "past the point of motion."
    )
    if themes["money"] and themes["relationship"]:
        tension = (
            "Stability and commitments can conflict with financial pressure—neither lens should win "
            "without stress-testing the other."
        )
    elif themes["career"] and themes["relocate"]:
        tension = (
            "Role trajectory and where daily life should live may pull apart—clarify which is primary "
            "for this season."
        )

    next_step = (
        "Draft a one-page memo: options A/B, decision date, top risk, one experiment this week. "
        "Share with one sharp counterweight, then move."
    )
    if themes["career"]:
        next_step = (
            "Block two 25-minute sessions: non-negotiables for your next role, then your decision "
            "story out loud. Schedule one conversation that tests the leading hypothesis."
        )
    elif themes["money"]:
        next_step = (
            f'Sketch best/base/stress cases for “{q_syn}”, set a calendar decision date, and review '
            "the stress case with someone who will challenge you."
        )

    synthesis = CouncilSynthesisBody(
        consensus=consensus,
        tension=tension,
        suggested_next_step=next_step,
    )

    return CouncilRespondResponse(
        question=q,
        advisors=advisors,
        synthesis=synthesis,
        used_fallback=True,
    )


def _normalize_advisor_id(raw: Any) -> str | None:
    if not isinstance(raw, str):
        return None
    s = raw.strip().lower().replace(" ", "_")
    if s in COUNCIL_ORDER:
        return s
    return _ID_ALIASES.get(s)


def _advisor_row_id(row: Any) -> str | None:
    if not isinstance(row, dict):
        return None
    for key in ("id", "advisor_id", "advisorId", "persona", "voice"):
        if key in row:
            nid = _normalize_advisor_id(row.get(key))
            if nid:
                return nid
    for key in ("name", "title", "role"):
        v = row.get(key)
        if isinstance(v, str):
            nid = _normalize_advisor_id(v)
            if nid:
                return nid
    return None


def _advisor_row_text(row: Any) -> str:
    if not isinstance(row, dict):
        return ""
    for key in (
        "response",
        "text",
        "message",
        "advice",
        "content",
        "body",
        "opinion",
    ):
        v = row.get(key)
        if isinstance(v, str) and v.strip():
            return v.strip()
    return ""


def _coerce_advisors_list(raw: dict[str, Any]) -> list[Any] | None:
    v = raw.get("advisors")
    if isinstance(v, list):
        return v
    for key in ("council", "voices", "perspectives", "advisor_responses"):
        x = raw.get(key)
        if isinstance(x, list):
            return x
    return None


def _extract_synthesis(raw: dict[str, Any]) -> tuple[str, str, str] | None:
    s = raw.get("synthesis")
    if isinstance(s, dict):
        con = str(s.get("consensus") or "").strip()
        ten = str(
            s.get("tension")
            or s.get("main_tension")
            or s.get("mainTension")
            or "",
        ).strip()
        nxt = str(
            s.get("suggested_next_step")
            or s.get("suggestedNextStep")
            or s.get("next_step")
            or "",
        ).strip()
        if con and ten and nxt:
            return con, ten, nxt
    # flat keys
    con = str(raw.get("consensus") or "").strip()
    ten = str(
        raw.get("tension") or raw.get("main_tension") or raw.get("mainTension") or "",
    ).strip()
    nxt = str(
        raw.get("suggested_next_step")
        or raw.get("suggestedNextStep")
        or raw.get("next_step")
        or "",
    ).strip()
    if con and ten and nxt:
        return con, ten, nxt
    return None


def parse_and_normalize_council_response(
    question: str,
    raw: dict[str, Any],
) -> CouncilRespondResponse:
    """
    Turn Perplexity JSON (possibly messy keys/order) into the stable API shape.
    Raises ValueError if required content cannot be recovered.
    """
    q = question.strip()
    advisors_list = _coerce_advisors_list(raw)
    if not advisors_list:
        log.warning("Council parse: missing advisors list in provider JSON")
        raise ValueError("invalid advisors array")

    by_id: dict[str, str] = {}
    for row in advisors_list:
        aid = _advisor_row_id(row)
        text = _advisor_row_text(row)
        if aid and text:
            by_id[aid] = text

    for aid in COUNCIL_ORDER:
        if aid not in by_id or not by_id[aid]:
            log.warning("Council parse: missing or empty advisor %s", aid)
            raise ValueError(f"missing advisor {aid}")

    syn_t = _extract_synthesis(raw)
    if syn_t is None:
        log.warning("Council parse: missing or incomplete synthesis")
        raise ValueError("invalid synthesis")
    con, ten, nxt = syn_t

    advisors = [
        CouncilAdvisorItem(
            id=aid,
            name=ADVISOR_META[aid][0],
            role=ADVISOR_META[aid][1],
            response=by_id[aid],
        )
        for aid in COUNCIL_ORDER
    ]

    return CouncilRespondResponse(
        question=q,
        advisors=advisors,
        synthesis=CouncilSynthesisBody(
            consensus=con,
            tension=ten,
            suggested_next_step=nxt,
        ),
        used_fallback=False,
    )
