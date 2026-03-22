type StatBlockProps = {
  label: string;
  value: string;
  hint?: string;
};

function StatBlock({ label, value, hint }: StatBlockProps) {
  return (
    <div className="min-w-0 flex-1 rounded-xl border border-white/[0.06] bg-zinc-950/50 px-4 py-3 text-center ring-1 ring-inset ring-white/[0.04]">
      <p className="text-[0.65rem] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-semibold tabular-nums text-white sm:text-xl">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-xs text-zinc-600">{hint}</p>
      ) : null}
    </div>
  );
}

export type StatsStripMetric = {
  label: string;
  value: string;
  hint?: string;
};

type StatsStripPlaceholderProps = {
  metrics: [StatsStripMetric, StatsStripMetric, StatsStripMetric];
};

/** Three-up strip under the hero; wired to real data while keeping placeholder framing. */
export function StatsStripPlaceholder({ metrics }: StatsStripPlaceholderProps) {
  const [a, b, c] = metrics;
  return (
    <div
      className="flex w-full max-w-xl gap-2 sm:gap-3"
      aria-label="Battery metrics"
    >
      <StatBlock {...a} />
      <StatBlock {...b} />
      <StatBlock {...c} />
    </div>
  );
}
