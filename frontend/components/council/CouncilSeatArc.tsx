"use client";

import type { CSSProperties } from "react";

import { AdvisorIcon } from "@/components/council/AdvisorIcon";
import { getAdvisorAccent } from "@/components/council/advisorStyles";
import { COUNCIL_ADVISORS } from "@/lib/council/advisorCatalog";

export type CouncilSeatPhase = "idle" | "loading" | "results";

type CouncilSeatArcProps = {
  phase: CouncilSeatPhase;
};

/** Arc of council personas — dormant / alive by phase; hover awakens each seat. */
export function CouncilSeatArc({ phase }: CouncilSeatArcProps) {
  const arcLift = [12, 4, 0, 4, 12];

  return (
    <div className="relative mx-auto w-full max-w-3xl px-2">
      <div
        className="pointer-events-none absolute inset-x-[10%] top-1/2 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent"
        aria-hidden
      />
      <ul className="flex items-end justify-center gap-2 sm:gap-4 md:gap-6">
        {COUNCIL_ADVISORS.map((def, i) => {
          const a = getAdvisorAccent(def.id);
          const lift = arcLift[i] ?? 0;
          const listening =
            phase === "loading"
              ? "ring-2 ring-cyan-400/40 shadow-[0_0_32px_-6px_rgba(34,211,238,0.35)]"
              : phase === "results"
                ? "ring-2 ring-violet-400/35 shadow-[0_0_28px_-8px_rgba(139,92,246,0.3)]"
                : "";

          return (
            <li
              key={def.id}
              className="flex flex-col items-center gap-2"
              style={{ transform: `translateY(-${lift}px)` }}
            >
              <div
                className={`council-seat-hover council-seat-idle group relative flex h-[4.25rem] w-[4.25rem] cursor-default flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-zinc-950/60 backdrop-blur-md transition duration-300 hover:-translate-y-1 sm:h-[4.75rem] sm:w-[4.75rem] ${a.border} ${listening}`}
                style={
                  {
                    animationDelay: `${i * 0.22}s`,
                    "--seat-breathe-dur": `${3.4 + i * 0.12}s`,
                  } as CSSProperties
                }
                title={`${def.name} — ${def.roleLabel}`}
              >
                <div
                  className={`pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${a.shadow}`}
                  aria-hidden
                />
                <div
                  className={`relative flex h-11 w-11 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${a.iconWrap}`}
                >
                  <AdvisorIcon id={def.id} className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                {phase === "loading" ? (
                  <span className="absolute bottom-1.5 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-cyan-400/50 blur-sm motion-reduce:hidden" />
                ) : null}
              </div>
              <div className="hidden text-center sm:block">
                <p
                  className={`font-display text-xs font-semibold leading-tight ${a.labelTint}`}
                >
                  {def.name}
                </p>
                <p className="max-w-[5.5rem] truncate font-sans text-[0.6875rem] leading-snug text-fg-muted">
                  {def.roleLabel}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 text-center font-sans text-xs leading-relaxed text-fg-muted sm:text-sm">
        {phase === "loading"
          ? "Council in session — channels open"
          : phase === "results"
            ? "Voices aligned — read the synthesis below"
            : "Five seats stand ready — dormant, not disconnected"}
      </p>
    </div>
  );
}
