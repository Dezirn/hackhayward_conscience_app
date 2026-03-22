import type { BatteryEvent } from "@/lib/types";

type BatteryHistoryProps = {
  events: BatteryEvent[];
  /** When true, show a few placeholder rows (e.g. if history is loaded separately later). */
  loading?: boolean;
};

function str(v: unknown): string | null {
  if (typeof v === "string" && v.length > 0) return v;
  return null;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function sourceTypeOf(e: BatteryEvent): string {
  const raw =
    str(e.source_type) ??
    str(e.sourceType) ??
    (typeof e.source_type === "string" ? e.source_type : null);
  if (!raw) return "Unknown";
  const labels: Record<string, string> = {
    task: "Task",
    recharge: "Recharge",
    daily_bonus: "Daily bonus",
  };
  return labels[raw] ?? raw.replace(/_/g, " ");
}

function createdAtOf(e: BatteryEvent): string | null {
  return str(e.created_at) ?? str(e.createdAt);
}

function formatWhen(iso: string | null): string {
  if (!iso || iso.trim() === "") return "N/A";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "N/A" : d.toLocaleString();
}

function noteOf(e: BatteryEvent): string | null {
  return str(e.explanation) ?? str(e.summary) ?? str(e.note) ?? null;
}

function rangeOf(e: BatteryEvent): string | null {
  const before = num(e.battery_before) ?? num(e.batteryBefore);
  const after = num(e.battery_after) ?? num(e.batteryAfter);
  if (before === null || after === null) return null;
  return `${before} → ${after}`;
}

function deltaLabel(d: number | null): string {
  if (d === null) return "N/A";
  if (d > 0) return `+${d}`;
  if (d < 0) return String(d);
  return "0";
}

function rowKey(e: BatteryEvent, index: number): string {
  const id = str(e.id);
  return id ?? `evt-${index}`;
}

function sanitizeEvents(events: BatteryEvent[]): BatteryEvent[] {
  return events.filter(
    (e): e is BatteryEvent => e != null && typeof e === "object",
  );
}

export function BatteryHistory({ events, loading = false }: BatteryHistoryProps) {
  const list = sanitizeEvents(events);

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h3 className="text-sm font-semibold text-zinc-300">
          Recent Battery Activity
        </h3>
        <ul className="mt-4 space-y-3" aria-hidden>
          {[1, 2, 3].map((i) => (
            <li
              key={i}
              className="h-10 animate-pulse rounded-lg bg-zinc-800/80"
            />
          ))}
        </ul>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h3 className="text-sm font-semibold text-zinc-300">
          Recent Battery Activity
        </h3>
        <p className="mt-4 text-sm text-zinc-500">
          <span className="font-medium text-zinc-400">
            No recent battery activity yet.
          </span>{" "}
          Completing tasks, logging recharge, or earning daily bonuses will show
          up here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h3 className="text-sm font-semibold text-zinc-300">
        Recent Battery Activity
      </h3>
      <ul className="mt-4 divide-y divide-zinc-800/90">
        {list.map((e, index) => {
          const delta = num(e.delta);
          const range = rangeOf(e);
          const note = noteOf(e);
          const created = createdAtOf(e);
          return (
            <li
              key={rowKey(e, index)}
              className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-4"
            >
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-zinc-200">
                  {sourceTypeOf(e)}
                </span>
                {range ? (
                  <span className="ml-2 text-xs tabular-nums text-zinc-500">
                    ({range})
                  </span>
                ) : null}
                {note ? (
                  <p className="mt-1 text-xs leading-snug text-zinc-400">
                    {note}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs text-zinc-500">
                <span
                  className={
                    delta !== null && delta > 0
                      ? "font-medium tabular-nums text-emerald-400"
                      : delta !== null && delta < 0
                        ? "font-medium tabular-nums text-rose-400"
                        : "tabular-nums text-zinc-400"
                  }
                >
                  Δ {deltaLabel(delta)}
                </span>
                <span className="tabular-nums text-zinc-500">
                  {formatWhen(created)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
