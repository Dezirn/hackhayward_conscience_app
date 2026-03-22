import type { ReactNode } from "react";

type BottomLanePlaceholderProps = {
  children: ReactNode;
  title?: string;
};

/** Bottom lane: single glass deck — tasks & activity feel part of the same cosmos. */
export function BottomLanePlaceholder({
  children,
  title = "Tasks & activity",
}: BottomLanePlaceholderProps) {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <div
        className="relative overflow-hidden rounded-[1.75rem] border border-cyan-500/[0.09] bg-gradient-to-b from-zinc-950/75 via-[#070a14]/88 to-zinc-950/90 shadow-[0_-32px_80px_-40px_rgba(34,211,238,0.08),0_0_0_1px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-inset ring-white/[0.04] backdrop-blur-xl"
        style={{ maxHeight: "min(52vh, 540px)" }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-cyan-500/5 blur-3xl"
          aria-hidden
        />
        <div className="max-h-[inherit] overflow-y-auto overscroll-contain px-4 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <h2 className="font-display text-lg font-semibold tracking-tight text-fg-primary sm:text-xl">
              {title}
            </h2>
            <p className="font-sans text-sm leading-relaxed text-fg-secondary">
              Commit energy deliberately—every action ripples through your battery.
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
