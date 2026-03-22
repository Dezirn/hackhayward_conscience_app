type StatBlockProps = {
  label: string;
  value: string;
  hint?: string;
  accent: "cyan" | "teal" | "violet";
};

function StatBlock({ label, value, hint, accent }: StatBlockProps) {
  const ring =
    accent === "cyan"
      ? "ring-cyan-500/20 shadow-[0_0_32px_-12px_rgba(34,211,238,0.2)]"
      : accent === "teal"
        ? "ring-teal-500/15 shadow-[0_0_28px_-14px_rgba(45,212,191,0.15)]"
        : "ring-violet-500/15 shadow-[0_0_28px_-14px_rgba(139,92,246,0.18)]";

  const bar =
    accent === "cyan"
      ? "from-accent-cyan/90 to-transparent"
      : accent === "teal"
        ? "from-accent-mint/80 to-transparent"
        : "from-accent-violet/85 to-transparent";

  return (
    <div
      className={`group relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-zinc-900/50 to-zinc-950/80 px-4 py-3.5 text-center ring-1 ring-inset ring-white/[0.04] backdrop-blur-md transition duration-300 hover:border-cyan-500/20 ${ring}`}
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${bar} to-transparent opacity-90`}
        aria-hidden
      />
      <p className="font-sans text-xs font-medium text-fg-subtle">{label}</p>
      <p className="font-display mt-2 truncate text-lg font-semibold tabular-nums tracking-tight text-fg-primary sm:text-xl">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 truncate font-sans text-xs text-fg-muted">{hint}</p>
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

const accents: [
  StatBlockProps["accent"],
  StatBlockProps["accent"],
  StatBlockProps["accent"],
] = ["cyan", "teal", "violet"];

/** Battery metrics under the hero — glass panels, clearer hierarchy. */
export function StatsStripPlaceholder({ metrics }: StatsStripPlaceholderProps) {
  const [a, b, c] = metrics;
  const items = [
    { ...a, accent: accents[0] },
    { ...b, accent: accents[1] },
    { ...c, accent: accents[2] },
  ] as const;

  return (
    <div
      className="flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:gap-3"
      aria-label="Battery metrics"
    >
      {items.map((m) => (
        <StatBlock key={m.label} {...m} />
      ))}
    </div>
  );
}
