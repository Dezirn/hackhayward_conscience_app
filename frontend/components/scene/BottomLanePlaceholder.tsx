import type { ReactNode } from "react";

type BottomLanePlaceholderProps = {
  children: ReactNode;
  title?: string;
};

/** Bottom-anchored panel for tasks, recharge, and activity — visually separated from the sky. */
export function BottomLanePlaceholder({
  children,
  title = "Tasks & activity",
}: BottomLanePlaceholderProps) {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <div
        className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/70 shadow-[0_-24px_48px_-32px_rgba(0,0,0,0.85)] ring-1 ring-inset ring-white/[0.04] backdrop-blur-sm"
        style={{ maxHeight: "min(52vh, 520px)" }}
      >
        <div
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/25 to-transparent"
          aria-hidden
        />
        <div className="max-h-[inherit] overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {title}
          </h2>
          <div className="mt-4 flex flex-col gap-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
