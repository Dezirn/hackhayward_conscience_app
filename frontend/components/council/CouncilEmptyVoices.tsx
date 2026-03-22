export function CouncilEmptyVoices() {
  return (
    <div className="rounded-2xl border border-dashed border-white/[0.1] bg-zinc-950/30 px-6 py-16 text-center backdrop-blur-sm sm:py-20">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900/60 text-zinc-500"
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
          <p className="text-sm font-medium text-zinc-300">
            The chamber is quiet
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            Pose a decision above and convene the council. Five voices will
            answer—then you&apos;ll see a single synthesis you can act on.
          </p>
        </div>
      </div>
    </div>
  );
}
