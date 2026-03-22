"use client";

import { useCallback, useMemo, useState } from "react";

import { AdvisorCard } from "@/components/council/AdvisorCard";
import { AdvisorCardSkeleton } from "@/components/council/AdvisorCardSkeleton";
import { CouncilEmptyVoices } from "@/components/council/CouncilEmptyVoices";
import { CouncilInputPanel } from "@/components/council/CouncilInputPanel";
import {
  CouncilSeatArc,
  type CouncilSeatPhase,
} from "@/components/council/CouncilSeatArc";
import { CouncilSynthesisPanel } from "@/components/council/CouncilSynthesisPanel";
import { CouncilSynthesisSkeleton } from "@/components/council/CouncilSynthesisSkeleton";
import { COUNCIL_ADVISORS } from "@/lib/council/advisorCatalog";
import { getCouncilAdvice } from "@/lib/council/getCouncilAdvice";
import type { CouncilResult } from "@/lib/council/types";
import { mutationErrorMessage } from "@/lib/api";

export function CouncilPage() {
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CouncilResult | null>(null);

  const handleSubmit = useCallback(async () => {
    const q = question.trim();
    if (!q) {
      setError("Please describe the decision you’re facing.");
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const data = await getCouncilAdvice(question, context);
      setResult(data);
    } catch (e) {
      setError(mutationErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [question, context]);

  const showEmpty = !loading && !result;
  const showResults = !loading && result;

  const seatPhase: CouncilSeatPhase = useMemo(() => {
    if (loading) return "loading";
    if (result) return "results";
    return "idle";
  }, [loading, result]);

  return (
    <div className="relative min-h-dvh w-full overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(139,92,246,0.14),transparent_55%),radial-gradient(ellipse_70%_50%_at_100%_30%,rgba(34,211,238,0.08),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-[6%] top-32 hidden h-48 w-px bg-gradient-to-b from-transparent via-cyan-400/25 to-transparent md:block"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[8%] top-40 hidden h-56 w-px bg-gradient-to-b from-transparent via-violet-400/20 to-transparent md:block"
        aria-hidden
      />

      <div className="relative mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-8 sm:pt-10">
        <header className="text-center sm:text-left">
          <p className="font-sans text-xs font-semibold text-accent-violet">
            Deliberation chamber
          </p>
          <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-fg-primary sm:text-4xl md:text-5xl">
            Decision Council
          </h1>
          <p className="mx-auto mt-4 max-w-2xl font-sans text-base leading-relaxed text-fg-secondary sm:mx-0 sm:text-lg">
            Five calibrated voices—then one synthesis you can carry into the
            world.
          </p>
        </header>

        <div className="mt-14 space-y-14 sm:mt-16 sm:space-y-16">
          <CouncilSeatArc phase={seatPhase} />

          <CouncilInputPanel
            question={question}
            context={context}
            onQuestionChange={setQuestion}
            onContextChange={setContext}
            onSubmit={() => void handleSubmit()}
            loading={loading}
            error={error}
          />

          {showResults && result?.clientSideFallback ? (
            <p
              className="rounded-xl border border-accent-amber/35 bg-accent-amber/10 px-4 py-3 font-sans text-sm leading-relaxed text-fg-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              role="status"
            >
              Couldn’t reach the council service—showing saved perspectives so
              you can still walk through the flow. Check the API URL or try
              again shortly.
            </p>
          ) : null}
          {showResults && result?.serverUsedFallback && !result.clientSideFallback ? (
            <p
              className="rounded-xl border border-accent-cyan/30 bg-accent-cyan/10 px-4 py-3 font-sans text-sm leading-relaxed text-fg-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
              role="status"
            >
              Live AI was unavailable or returned an unexpected shape—the council
              below uses a grounded template tied to your question.
            </p>
          ) : null}

          <section aria-labelledby="council-voices-heading">
            <div className="mb-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2
                  id="council-voices-heading"
                  className="font-display text-xl font-semibold tracking-tight text-fg-primary sm:text-2xl"
                >
                  Voice transcripts
                </h2>
                <p className="mt-2 max-w-xl font-sans text-sm leading-relaxed text-fg-secondary sm:text-base">
                  Each seat speaks from a different decision-making muscle—read
                  for tension, not agreement.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-10">
                <div className="grid gap-5 sm:grid-cols-2">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <AdvisorCardSkeleton key={i} index={i} />
                  ))}
                </div>
                <CouncilSynthesisSkeleton />
              </div>
            ) : null}

            {showEmpty ? <CouncilEmptyVoices /> : null}

            {showResults && result ? (
              <div className="space-y-10 transition-opacity duration-500">
                <div className="grid gap-5 sm:grid-cols-2">
                  {COUNCIL_ADVISORS.map((def, i) => {
                    const r = result.advisors.find((a) => a.advisorId === def.id);
                    if (!r) return null;
                    return (
                      <AdvisorCard
                        key={def.id}
                        definition={def}
                        responseText={r.text}
                        animationDelayMs={i * 75}
                      />
                    );
                  })}
                </div>
                <CouncilSynthesisPanel
                  synthesis={result.synthesis}
                  animationDelayMs={5 * 75 + 120}
                />
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
