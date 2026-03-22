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
        <p className="font-sans text-xs font-semibold text-accent-violet">
          Synthesis
        </p>
        <h2 className="font-display mt-2 text-xl font-semibold tracking-tight text-fg-primary sm:text-2xl">
          What the council converges on
        </h2>

        <dl className="mt-8 space-y-8">
          <div>
            <dt className="font-sans text-sm font-semibold text-accent-mint">
              Consensus
            </dt>
            <dd className="mt-2 font-sans text-sm leading-relaxed text-fg-secondary sm:text-base">
              {synthesis.consensus}
            </dd>
          </div>
          <div className="border-t border-white/[0.08] pt-8">
            <dt className="font-sans text-sm font-semibold text-accent-amber">
              Main tension
            </dt>
            <dd className="mt-2 font-sans text-sm leading-relaxed text-fg-secondary sm:text-base">
              {synthesis.mainTension}
            </dd>
          </div>
          <div className="border-t border-white/[0.08] pt-8">
            <dt className="font-sans text-sm font-semibold text-accent-cyan">
              Suggested next step
            </dt>
            <dd className="mt-2 font-sans text-sm leading-relaxed text-fg-secondary sm:text-base">
              {synthesis.suggestedNextStep}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
