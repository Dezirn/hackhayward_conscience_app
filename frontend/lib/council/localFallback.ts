import type {
  AdvisorId,
  AdvisorResponse,
  CouncilResult,
  CouncilSynthesis,
} from "@/lib/council/types";

function clip(s: string, max: number): string {
  const t = s.trim();
  if (!t) return "this choice";
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function buildResponses(question: string, context: string): AdvisorResponse[] {
  const q = clip(question, 160);
  const ctx = context.trim();
  const ctxSentence = ctx
    ? ` With the context you shared—${clip(ctx, 140)}—that lens matters.`
    : "";

  const byId = (id: AdvisorId, text: string): AdvisorResponse => ({
    advisorId: id,
    text,
  });

  return [
    byId(
      "optimist",
      `Framed around “${q}”, there is more room to win than it might feel at first glance.${ctxSentence} I would map one credible upside scenario and ask what smallest bet would validate it without locking you in.`,
    ),
    byId(
      "skeptic",
      `On “${q}”, pressure-test the failure modes before you commit.${ctxSentence} What breaks if timing slips, stakeholders push back, or the upside was overstated? Name the top two risks and what early signal would confirm each.`,
    ),
    byId(
      "pragmatist",
      `For “${q}”, translate the decision into the next 48 hours.${ctxSentence} Who must be aligned, what’s the cheapest reversible step, and what’s the hard deadline where ambiguity becomes expensive? Ship a crisp default if debate stalls.`,
    ),
    byId(
      "empath",
      `“${q}” isn’t only analytical—check who carries the emotional load.${ctxSentence} Whose trust is on the line, and what would feel fair to them even if the outcome is imperfect? Naming that often clarifies the dignified path.`,
    ),
    byId(
      "strategist",
      `Zoom out from “${q}”: where should you be in a year if this goes well—or poorly?${ctxSentence} Pick the option that preserves optionality and compounds learning; avoid choices that look good this week but narrow tomorrow’s moves.`,
    ),
  ];
}

function buildSynthesis(question: string, context: string): CouncilSynthesis {
  const q = clip(question, 100);
  const ctx = context.trim();

  return {
    consensus: `Across the council, everyone agrees “${q}” deserves a deliberate pause: align on what success means, surface the biggest risk, and pick a small, reversible next step rather than a dramatic leap.`,
    mainTension: ctx
      ? `The pull between your practical constraints and the human stakes you described is the real fork—optimize only for speed or only for harmony and you’ll likely regret the blind spot.`
      : `The tension sits between upside optimism and downside control: move before you’re ready versus analyze until momentum dies.`,
    suggestedNextStep: `Write a one-page decision memo: option A/B, decision deadline, top risk, and the single experiment you’ll run this week. Share it with one trusted counterweight, then act.`,
  };
}

/** Offline / network-failure template — same UX as the old mock. */
export function buildLocalFallbackCouncil(
  question: string,
  context: string,
): CouncilResult {
  const q = question.trim();
  return {
    advisors: buildResponses(q, context),
    synthesis: buildSynthesis(q, context),
    clientSideFallback: true,
  };
}
