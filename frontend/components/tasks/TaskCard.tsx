import type { ReactNode } from "react";

import type { Task } from "@/lib/types";

export type TaskCardProps = {
  task: Task;
  /** When true, only this card’s actions are in a loading state (parent scopes by task id). */
  mutating?: boolean;
  /** Which action is in flight — drives button labels. */
  mutatingAction?: "complete" | "skip" | null;
  variant?: "default" | "muted";
  onComplete?: () => void;
  onSkip?: () => void;
};

function str(v: unknown, fallback: string): string {
  if (typeof v === "string") {
    const t = v.trim();
    if (t.length > 0) return t;
  }
  return fallback;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function statusLabel(task: Task): string {
  const s = task.status;
  if (typeof s !== "string" || !s.trim()) return "Unknown";
  return s.replace(/_/g, " ");
}

function dueOf(task: Task): string | null {
  const raw = task.due_at ?? task.dueAt;
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? "N/A" : formatDue(d);
  }
  const s = String(raw).trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : formatDue(d);
}

function formatDue(d: Date): string {
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Human-readable signed delta, e.g. +4, -2, +1.5 */
function deltaOf(task: Task): string {
  const d =
    num(task.estimated_battery_delta) ?? num(task.estimatedBatteryDelta);
  if (d === null) return "N/A";
  if (d === 0) return "0";
  const abs = Math.abs(d);
  const rounded = Number.isInteger(d)
    ? String(abs)
    : abs.toFixed(1).replace(/\.0$/, "");
  return d > 0 ? `+${rounded}` : `-${rounded}`;
}

function deltaTone(task: Task): string {
  const d =
    num(task.estimated_battery_delta) ?? num(task.estimatedBatteryDelta);
  if (d === null)
    return "text-fg-muted border-fg-subtle/40 bg-zinc-900/50";
  if (d > 0)
    return "text-accent-mint border-accent-mint/35 bg-accent-mint/10";
  if (d < 0)
    return "text-rose-200 border-rose-500/35 bg-rose-500/10";
  return "text-fg-secondary border-fg-subtle/40 bg-zinc-900/50";
}

function isPending(task: Task): boolean {
  return (
    typeof task.status === "string" &&
    task.status.trim().toLowerCase() === "pending"
  );
}

function Chip({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-lg border px-2 py-0.5 font-sans text-[0.6875rem] font-semibold leading-tight tabular-nums ${className}`}
    >
      {children}
    </span>
  );
}

export function TaskCard({
  task,
  mutating = false,
  mutatingAction = null,
  variant = "default",
  onComplete,
  onSkip,
}: TaskCardProps) {
  if (task == null || typeof task !== "object") {
    return null;
  }

  const id = typeof task.id === "string" ? task.id.trim() : "";
  const pending = isPending(task);
  const muted = variant === "muted";

  const shell = muted
    ? "rounded-xl border border-white/[0.05] bg-zinc-950/30 p-3.5 shadow-none ring-1 ring-inset ring-white/[0.03] transition hover:border-white/[0.07]"
    : "group rounded-xl border border-cyan-500/10 bg-gradient-to-br from-zinc-900/40 to-zinc-950/80 p-4 shadow-[0_0_40px_-28px_rgba(34,211,238,0.25)] ring-1 ring-inset ring-white/[0.05] transition duration-300 hover:-translate-y-0.5 hover:border-cyan-500/20 hover:shadow-[0_12px_40px_-24px_rgba(34,211,238,0.2)]";

  const completeLabel =
    mutating && mutatingAction === "complete"
      ? "Completing…"
      : mutating && mutatingAction !== "skip"
        ? "Working…"
        : "Complete";
  const skipLabel =
    mutating && mutatingAction === "skip"
      ? "Skipping…"
      : mutating && mutatingAction !== "complete"
        ? "Working…"
        : "Skip";

  const dStr = deltaOf(task);
  const dClass = deltaTone(task);

  return (
    <article className={shell}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <h3
          className={`min-w-0 max-w-[85%] break-words font-display font-semibold leading-snug text-fg-primary ${
            muted ? "text-sm text-fg-muted" : "text-base"
          }`}
        >
          {str(task.title, "Untitled task")}
        </h3>
        <Chip
          className={
            muted
              ? "shrink-0 border-fg-subtle/50 capitalize text-fg-subtle"
              : "shrink-0 border-accent-cyan/30 bg-accent-cyan/10 capitalize text-fg-primary"
          }
        >
          {statusLabel(task)}
        </Chip>
      </div>
      <p
        className={`mt-2.5 break-words font-sans leading-relaxed text-fg-secondary ${
          muted ? "text-xs text-fg-muted" : "text-sm"
        }`}
      >
        {str(task.description, "No description")}
      </p>

      <div
        className={`mt-3 flex flex-wrap gap-2 ${muted ? "opacity-80" : ""}`}
      >
        <Chip className="border-fg-subtle/45 bg-zinc-900/50 text-fg-muted">
          D{num(task.difficulty) ?? "—"}
        </Chip>
        <Chip className="border-fg-subtle/45 bg-zinc-900/50 text-fg-muted">
          {num(task.duration_minutes) ?? num(task.durationMinutes) ?? "—"}m
        </Chip>
        <Chip className="border-fg-subtle/45 bg-zinc-900/50 text-fg-muted">
          P{num(task.priority) ?? "—"}
        </Chip>
        <Chip className={`border ${dClass}`}>Δ {dStr}</Chip>
        {dueOf(task) ? (
          <Chip className="border-accent-violet/30 bg-accent-violet/10 text-fg-primary">
            {dueOf(task)}
          </Chip>
        ) : null}
      </div>

      {pending && id.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={mutating}
            onClick={onComplete}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 font-sans text-sm font-semibold leading-snug text-emerald-950 shadow-[0_0_20px_-6px_rgba(16,185,129,0.5)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {completeLabel}
          </button>
          <button
            type="button"
            disabled={mutating}
            onClick={onSkip}
            className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 font-sans text-sm font-semibold leading-snug text-fg-secondary transition hover:border-white/25 hover:bg-white/[0.08] hover:text-fg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {skipLabel}
          </button>
        </div>
      ) : null}
    </article>
  );
}
