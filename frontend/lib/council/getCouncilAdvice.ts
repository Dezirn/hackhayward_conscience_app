import { ApiError, apiRequest, mutationErrorMessage } from "@/lib/api";
import type { CouncilRespondResponse } from "@/lib/types";
import { buildLocalFallbackCouncil } from "@/lib/council/localFallback";
import type { AdvisorId, CouncilResult } from "@/lib/council/types";

const COUNCIL_TIMEOUT_MS = 90_000;

const ORDER: AdvisorId[] = [
  "optimist",
  "skeptic",
  "pragmatist",
  "empath",
  "strategist",
];

function isAdvisorId(s: string): s is AdvisorId {
  return (ORDER as string[]).includes(s);
}

function mapApiToResult(raw: CouncilRespondResponse): CouncilResult {
  const byId = new Map<string, string>();
  for (const row of raw.advisors) {
    const id = String(row.id || "").trim().toLowerCase();
    const text = String(row.response || "").trim();
    if (id && text) byId.set(id, text);
  }

  const advisors = ORDER.map((id) => {
    const text = byId.get(id);
    return { advisorId: id, text: text ?? "" };
  });

  const syn = raw.synthesis;
  return {
    advisors,
    synthesis: {
      consensus: String(syn.consensus ?? "").trim(),
      mainTension: String(syn.tension ?? "").trim(),
      suggestedNextStep: String(syn.suggested_next_step ?? "").trim(),
    },
    serverUsedFallback: Boolean(raw.used_fallback),
  };
}

function isWellFormedCouncilPayload(x: unknown): x is CouncilRespondResponse {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.question !== "string") return false;
  if (!Array.isArray(o.advisors) || o.advisors.length !== 5) return false;
  for (const row of o.advisors) {
    if (!row || typeof row !== "object") return false;
    const r = row as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.response !== "string") return false;
    if (!isAdvisorId(r.id.trim().toLowerCase())) return false;
  }
  const s = o.synthesis;
  if (!s || typeof s !== "object") return false;
  const syn = s as Record<string, unknown>;
  if (
    typeof syn.consensus !== "string" ||
    typeof syn.tension !== "string" ||
    typeof syn.suggested_next_step !== "string"
  ) {
    return false;
  }
  return true;
}

/**
 * POST /council/respond. On non-validation failures, returns a local template
 * so the Council page stays demo-ready.
 */
export async function getCouncilAdvice(
  question: string,
  context: string,
): Promise<CouncilResult> {
  const q = question.trim();
  if (!q) {
    throw new Error("Please describe the decision you’re facing.");
  }

  const jsonBody: Record<string, unknown> = { question: q };
  const ctx = context.trim();
  if (ctx) jsonBody.context = ctx;

  try {
    const raw = await apiRequest<CouncilRespondResponse>("/council/respond", {
      method: "POST",
      jsonBody,
      signal: AbortSignal.timeout(COUNCIL_TIMEOUT_MS),
    });

    if (!isWellFormedCouncilPayload(raw)) {
      return buildLocalFallbackCouncil(q, context);
    }

    const mapped = mapApiToResult(raw);
    const missingText = mapped.advisors.some((a) => !a.text.trim());
    const synOk =
      mapped.synthesis.consensus &&
      mapped.synthesis.mainTension &&
      mapped.synthesis.suggestedNextStep;
    if (missingText || !synOk) {
      return buildLocalFallbackCouncil(q, context);
    }
    return mapped;
  } catch (e) {
    if (e instanceof ApiError && e.status === 422) {
      throw new Error(mutationErrorMessage(e));
    }
    return buildLocalFallbackCouncil(q, context);
  }
}
