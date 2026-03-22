"use client";

import Link from "next/link";

type SceneActionButtonsProps = {
  onRecharge: () => void;
  onAddTask: () => void;
};

const heroBtn =
  "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl px-5 py-2.5 font-sans text-sm font-semibold leading-snug transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] sm:px-6 sm:py-3";

const heroGlow =
  "bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-400 text-[#041018] shadow-[0_0_32px_-4px_rgba(34,211,238,0.55),inset_0_1px_0_rgba(255,255,255,0.35)] hover:shadow-[0_0_44px_-2px_rgba(34,211,238,0.65)] hover:brightness-110 focus-visible:outline-cyan-300/90";

const councilGlow =
  "border border-violet-400/35 bg-gradient-to-r from-violet-600/90 via-indigo-600/85 to-violet-700/90 text-white shadow-[0_0_36px_-6px_rgba(139,92,246,0.5),inset_0_1px_0_rgba(255,255,255,0.12)] hover:border-violet-300/50 hover:shadow-[0_0_48px_-4px_rgba(139,92,246,0.55)] focus-visible:outline-violet-400/80";

const secondaryBtn =
  "rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 font-sans text-sm font-semibold leading-snug text-fg-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-white/20 hover:bg-white/[0.08] hover:text-fg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400/50 active:scale-[0.98]";

export function SceneActionButtons({
  onRecharge,
  onAddTask,
}: SceneActionButtonsProps) {
  return (
    <div className="flex flex-col items-stretch gap-2.5 sm:items-end">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-end">
        <button
          type="button"
          onClick={onRecharge}
          className={`${heroBtn} ${heroGlow}`}
        >
          <span
            className="pointer-events-none absolute inset-0 opacity-40 blur-xl"
            style={{
              background:
                "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.5), transparent 55%)",
            }}
            aria-hidden
          />
          <span className="relative">Recharge</span>
        </button>
        <Link
          href="/council"
          className={`${heroBtn} ${councilGlow} text-center`}
        >
          <span
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"
            aria-hidden
          />
          <span className="relative">Ask the Council</span>
        </Link>
      </div>
      <button
        type="button"
        onClick={onAddTask}
        className={`${secondaryBtn} w-full sm:ml-auto sm:w-auto`}
      >
        Add task
      </button>
    </div>
  );
}
