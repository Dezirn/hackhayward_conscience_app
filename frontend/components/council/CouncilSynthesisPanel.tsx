"use client";

import type { CouncilSynthesis } from "@/lib/council/types";

type CouncilSynthesisPanelProps = {
  synthesis: CouncilSynthesis;
  animationDelayMs: number;
};

export function CouncilSynthesisPanel({
  synthesis,
  animationDelayMs,
}: CouncilSynthesisPanelProps) {
  return (
    <section
      className="council-rise relative overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-950/50 via-zinc-950/80 to-cyan-950/35 p-6 shadow-[0_0_60px_-20px_rgba(139,92,246,0.35)] backdrop-blur-md sm:p-8"
      style={{ animationDelay: `${animationDelayMs}ms` }}
      aria-label="Council synthesis"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(139,92,246,0.12),transparent)]"
        aria-hidden
      />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/80">
          Synthesis
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
          What the council converges on
        </h2>

        <dl className="mt-8 space-y-8">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
              Consensus
            </dt>
            <dd className="mt-2 text-sm leading-relaxed text-zinc-200 sm:text-base">
              {synthesis.consensus}
            </dd>
          </div>
          <div className="border-t border-white/[0.08] pt-8">
            <dt className="text-xs font-semibold uppercase tracking-wider text-amber-400/90">
              Main tension
            </dt>
            <dd className="mt-2 text-sm leading-relaxed text-zinc-200 sm:text-base">
              {synthesis.mainTension}
            </dd>
          </div>
          <div className="border-t border-white/[0.08] pt-8">
            <dt className="text-xs font-semibold uppercase tracking-wider text-cyan-400/90">
              Suggested next step
            </dt>
            <dd className="mt-2 text-sm leading-relaxed text-zinc-200 sm:text-base">
              {synthesis.suggestedNextStep}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
