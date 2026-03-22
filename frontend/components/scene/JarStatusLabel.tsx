type JarStatusLabelProps = {
  fillPercent: number;
  currentLevel: number;
  maxLevel: number;
  statusLabel: string;
};

/** Minimal readout over the glass. */
export function JarStatusLabel({
  fillPercent,
  currentLevel,
  maxLevel,
  statusLabel,
}: JarStatusLabelProps) {
  const pct = Math.round(fillPercent);
  const status =
    typeof statusLabel === "string" && statusLabel.trim()
      ? statusLabel.trim()
      : "—";

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center px-4 text-center">
      <p
        className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-cyan-200/80"
        aria-hidden
      >
        Energy
      </p>
      <p
        className="mt-1 text-4xl font-semibold tabular-nums tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] sm:text-5xl"
        aria-live="polite"
      >
        {pct}
        <span className="text-lg font-medium text-white/50 sm:text-xl">%</span>
      </p>
      <p className="mt-1 text-xs tabular-nums text-zinc-200/95 drop-shadow-md">
        {currentLevel} / {maxLevel}
      </p>
      <p className="mt-2 max-w-[9rem] text-[0.7rem] font-medium capitalize leading-tight text-indigo-200/95 drop-shadow-md">
        {status}
      </p>
    </div>
  );
}
