export function CouncilEmptyVoices() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-violet-500/20 bg-gradient-to-b from-zinc-950/40 to-violet-950/10 px-6 py-16 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm sm:py-20">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(139,92,246,0.08),transparent)]"
        aria-hidden
      />
      <div className="relative mx-auto flex max-w-md flex-col items-center gap-5">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl border border-accent-violet/35 bg-accent-violet/10 text-accent-violet shadow-[0_0_40px_-12px_rgba(174,140,255,0.35)]"
          aria-hidden
        >
          <svg
            className="h-8 w-8"
            viewBox="0 0 32 32"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
          >
            <circle cx="10" cy="12" r="3" />
            <circle cx="22" cy="10" r="2.5" />
            <circle cx="18" cy="22" r="2.5" />
            <path
              strokeLinecap="round"
              d="M12.5 14.5c2 2 5 1 7-1M14 20c2.5 1.5 5 .5 6.5-2"
              opacity={0.5}
            />
          </svg>
        </div>
        <div>
          <p className="font-display text-base font-semibold tracking-tight text-fg-primary">
            The chamber awaits your motion
          </p>
          <p className="mt-3 font-sans text-sm leading-relaxed text-fg-secondary">
            Pose a decision above and convene the council. Five voices will
            answer—then you&apos;ll see a single synthesis you can act on.
          </p>
        </div>
      </div>
    </div>
  );
}
