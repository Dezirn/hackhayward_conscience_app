import type { Battery } from "@/lib/types";

type BatteryCardProps = {
  /** Partial payloads are OK — missing fields get safe fallbacks. */
  battery: Partial<Battery>;
};

/** Accept number or numeric string from loose JSON. */
function coalesceNumber(...vals: unknown[]): number | null {
  for (const v of vals) {
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

function displayNum(n: number | null, fallback = "N/A"): string {
  return n !== null ? String(n) : fallback;
}

function str(v: unknown, fallback = "N/A"): string {
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  return fallback;
}

function formatWhen(iso: string | undefined | null): string {
  if (iso == null || String(iso).trim() === "") return "N/A";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "N/A" : d.toLocaleString();
}

export function BatteryCard({ battery }: BatteryCardProps) {
  const current = coalesceNumber(battery.current_level);
  const minL = coalesceNumber(battery.min_level) ?? 0;
  const maxL = coalesceNumber(battery.max_level) ?? 100;
  const span = Math.max(maxL - minL, 1);
  const pct =
    current !== null
      ? Math.min(100, Math.max(0, ((current - minL) / span) * 100))
      : 0;

  const baseline = coalesceNumber(battery.baseline_level);
  const daily = coalesceNumber(battery.daily_bonus);
  const rate = coalesceNumber(battery.recharge_rate_per_hour);

  const statusRaw = battery.status_label;
  const statusLabel =
    typeof statusRaw === "string" && statusRaw.trim().length > 0
      ? statusRaw.trim()
      : "Unknown";

  return (
    <section className="overflow-hidden rounded-xl border border-emerald-900/25 bg-gradient-to-b from-zinc-900/80 to-zinc-950/90 p-5 shadow-sm ring-1 ring-white/5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-500/90">
            Current battery
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">Energy level</h2>
        </div>
        <div className="rounded-md bg-zinc-950/60 px-2.5 py-1 text-xs font-medium capitalize text-zinc-300 ring-1 ring-zinc-700/80">
          {statusLabel}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-2">
        {current !== null ? (
          <span className="text-4xl font-semibold tabular-nums tracking-tight text-white">
            {current}
          </span>
        ) : (
          <span className="text-2xl font-semibold text-zinc-500">N/A</span>
        )}
        <span className="pb-1.5 text-sm text-zinc-500">
          / {maxL}
          {minL !== 0 ? ` · min ${minL}` : ""}
        </span>
      </div>

      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-zinc-800/90">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${current !== null ? pct : 0}%` }}
        />
      </div>

      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
        <div className="rounded-lg bg-zinc-950/40 px-3 py-2 ring-1 ring-zinc-800/80">
          <dt className="text-xs text-zinc-500">Baseline</dt>
          <dd className="mt-0.5 tabular-nums font-medium text-zinc-100">
            {displayNum(baseline)}
          </dd>
        </div>
        <div className="rounded-lg bg-zinc-950/40 px-3 py-2 ring-1 ring-zinc-800/80">
          <dt className="text-xs text-zinc-500">Daily bonus</dt>
          <dd className="mt-0.5 tabular-nums font-medium text-zinc-100">
            {displayNum(daily)}
          </dd>
        </div>
        <div className="rounded-lg bg-zinc-950/40 px-3 py-2 ring-1 ring-zinc-800/80">
          <dt className="text-xs text-zinc-500">Passive recharge / hr</dt>
          <dd className="mt-0.5 tabular-nums font-medium text-zinc-100">
            {displayNum(rate)}
          </dd>
        </div>
        <div className="rounded-lg bg-zinc-950/40 px-3 py-2 ring-1 ring-zinc-800/80 sm:col-span-2">
          <dt className="text-xs text-zinc-500">Last recalculated</dt>
          <dd className="mt-0.5 text-zinc-200">
            {formatWhen(battery.last_recalculated_at)}
          </dd>
        </div>
        {battery.last_daily_bonus_date ? (
          <div className="rounded-lg bg-zinc-950/40 px-3 py-2 ring-1 ring-zinc-800/80 sm:col-span-2">
            <dt className="text-xs text-zinc-500">Last daily bonus date</dt>
            <dd className="mt-0.5 text-zinc-200">
              {str(battery.last_daily_bonus_date, "N/A")}
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
