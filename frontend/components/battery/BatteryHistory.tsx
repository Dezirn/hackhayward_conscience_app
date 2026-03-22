import type { ReactNode } from "react";

import type { BatteryEvent } from "@/lib/types";

type BatteryHistoryProps = {
  events: BatteryEvent[];
  /** When true, show a few placeholder rows (e.g. if history is loaded separately later). */
  loading?: boolean;
  /** Flat list inside parent panel — no outer card chrome. */
  embedded?: boolean;
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

function sourceTagClass(e: BatteryEvent): string {
  const raw = (
    str(e.source_type) ??
    str(e.sourceType) ??
    ""
  ).toLowerCase();
  if (raw === "recharge")
    return "border-accent-cyan/35 bg-accent-cyan/10 text-fg-primary";
  if (raw === "task")
    return "border-accent-violet/35 bg-accent-violet/10 text-fg-primary";
  if (raw === "daily_bonus")
    return "border-accent-amber/40 bg-accent-amber/12 text-fg-primary";
  return "border-fg-subtle/45 bg-zinc-900/50 text-fg-secondary";
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

export function BatteryHistory({
  events,
  loading = false,
  embedded = false,
}: BatteryHistoryProps) {
  const list = sanitizeEvents(events);

  const wrap = (inner: ReactNode) =>
    embedded ? (
      <div className="px-3 py-2 sm:px-4 sm:py-3">{inner}</div>
    ) : (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        {inner}
      </div>
    );

  if (loading) {
    return wrap(
      <>
        <h3 className="font-display text-sm font-semibold text-fg-primary">
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
      </>,
    );
  }

  if (list.length === 0) {
    return wrap(
      <>
        {!embedded ? (
          <h3 className="font-display text-sm font-semibold text-fg-primary">
            Recent Battery Activity
          </h3>
        ) : null}
        <p
          className={`font-sans text-sm leading-relaxed text-fg-secondary ${!embedded ? "mt-4" : ""}`}
        >
          <span className="font-semibold text-fg-primary">
            No recent battery activity yet.
          </span>{" "}
          Completing tasks, logging recharge, or earning daily bonuses will show
          up here.
        </p>
      </>,
    );
  }

  return wrap(
    <>
      {!embedded ? (
        <h3 className="font-display text-sm font-semibold text-fg-primary">
          Recent Battery Activity
        </h3>
      ) : null}
      <ul
        className={`divide-y divide-white/[0.06] ${!embedded ? "mt-4" : ""}`}
      >
        {list.map((e, index) => {
          const delta = num(e.delta);
          const range = rangeOf(e);
          const note = noteOf(e);
          const created = createdAtOf(e);
          const tagClass = sourceTagClass(e);
          return (
            <li
              key={rowKey(e, index)}
              className="flex flex-col gap-2 py-3.5 first:pt-2 last:pb-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-md border px-2 py-0.5 font-sans text-[0.6875rem] font-semibold leading-tight ${tagClass}`}
                  >
                    {sourceTypeOf(e)}
                  </span>
                  {range ? (
                    <span className="font-sans text-xs tabular-nums text-fg-muted">
                      {range}
                    </span>
                  ) : null}
                </div>
                {note ? (
                  <p className="mt-1.5 font-sans text-xs leading-relaxed text-fg-secondary">
                    {note}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-3 font-sans text-xs text-fg-muted">
                <span
                  className={`rounded-md border px-2 py-0.5 font-semibold tabular-nums ${
                    delta !== null && delta > 0
                      ? "border-accent-mint/40 bg-accent-mint/12 text-fg-primary"
                      : delta !== null && delta < 0
                        ? "border-rose-500/35 bg-rose-500/10 text-rose-100"
                        : "border-fg-subtle/45 text-fg-muted"
                  }`}
                >
                  Δ {deltaLabel(delta)}
                </span>
                <span className="tabular-nums text-fg-subtle">
                  {formatWhen(created)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </>,
  );
}
