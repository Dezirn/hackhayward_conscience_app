"use client";

import { useCallback, useState } from "react";

import { AdvisorCard } from "@/components/council/AdvisorCard";
import { AdvisorCardSkeleton } from "@/components/council/AdvisorCardSkeleton";
import { CouncilEmptyVoices } from "@/components/council/CouncilEmptyVoices";
import { CouncilInputPanel } from "@/components/council/CouncilInputPanel";
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

  return (
    <div className="relative min-h-dvh w-full">
      <div
        className="pointer-events-none absolute left-[8%] top-28 hidden h-40 w-px bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent md:block"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[12%] top-48 hidden h-52 w-px bg-gradient-to-b from-transparent via-violet-500/15 to-transparent md:block"
        aria-hidden
      />

      <div className="relative mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-8 sm:pt-8">
        <header className="text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500/70">
            Conscience
          </p>
          <h1 className="mt-3 bg-gradient-to-br from-white via-zinc-100 to-zinc-400 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl md:text-5xl">
            Decision Council
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-zinc-400 sm:mx-0 sm:text-lg">
            Get multiple perspectives before making a choice.
          </p>
        </header>

        <div className="mt-12 space-y-16">
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
              className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/90"
              role="status"
            >
              Couldn’t reach the council service—showing saved perspectives so you can still walk
              through the flow. Check the API URL or try again shortly.
            </p>
          ) : null}
          {showResults && result?.serverUsedFallback && !result.clientSideFallback ? (
            <p
              className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-100/85"
              role="status"
            >
              Live AI was unavailable or returned an unexpected shape—the council below uses a
              grounded template tied to your question.
            </p>
          ) : null}

          <section aria-labelledby="council-voices-heading">
            <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2
                  id="council-voices-heading"
                  className="text-lg font-semibold text-white sm:text-xl"
                >
                  Council voices
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Five advisors—each tuned to a different decision-making muscle.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-8">
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
              <div className="space-y-8 transition-opacity duration-500">
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
