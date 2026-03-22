"use client";

import type { AdvisorDefinition } from "@/lib/council/types";
import { AdvisorIcon } from "@/components/council/AdvisorIcon";
import { getAdvisorAccent } from "@/components/council/advisorStyles";

type AdvisorCardProps = {
  definition: AdvisorDefinition;
  responseText: string;
  animationDelayMs: number;
};

export function AdvisorCard({
  definition,
  responseText,
  animationDelayMs,
}: AdvisorCardProps) {
  const a = getAdvisorAccent(definition.id);

  return (
    <article
      className={`council-rise group relative overflow-hidden rounded-2xl border bg-zinc-950/55 p-5 backdrop-blur-md transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 ${a.border} ${a.shadow}`}
      style={{ animationDelay: `${animationDelayMs}ms` }}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-[0.12] blur-2xl transition-opacity duration-300 group-hover:opacity-20"
        style={{
          background:
            definition.id === "optimist"
              ? "rgb(251 191 36)"
              : definition.id === "skeptic"
                ? "rgb(244 63 94)"
                : definition.id === "pragmatist"
                  ? "rgb(34 211 238)"
                  : definition.id === "empath"
                    ? "rgb(217 70 239)"
                    : "rgb(129 140 248)",
        }}
        aria-hidden
      />
      <div className="relative flex gap-4">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${a.iconWrap}`}
        >
          <AdvisorIcon id={definition.id} className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <header className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h3 className="text-base font-semibold text-white">
              {definition.name}
            </h3>
            <span
              className={`text-xs font-medium uppercase tracking-wider ${a.labelTint}`}
            >
              {definition.roleLabel}
            </span>
          </header>
          <p className="mt-3 text-sm leading-relaxed text-zinc-300">
            {responseText}
          </p>
        </div>
      </div>
    </article>
  );
}
