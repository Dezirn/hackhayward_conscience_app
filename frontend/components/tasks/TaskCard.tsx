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

function isPending(task: Task): boolean {
  return (
    typeof task.status === "string" &&
    task.status.trim().toLowerCase() === "pending"
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

  const shell =
    muted
      ? "rounded-lg border border-zinc-800/50 bg-zinc-950/25 p-3 ring-1 ring-white/[0.03]"
      : "rounded-lg border border-zinc-800/90 bg-zinc-950/50 p-4 ring-1 ring-white/5";

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

  return (
    <article className={shell}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <h3
          className={`min-w-0 max-w-full break-words font-medium text-zinc-100 ${
            muted ? "text-sm" : "text-base"
          }`}
        >
          {str(task.title, "Untitled task")}
        </h3>
        <span className="shrink-0 rounded bg-zinc-800/80 px-2 py-0.5 text-xs font-medium capitalize text-zinc-300">
          {statusLabel(task)}
        </span>
      </div>
      <p
        className={`mt-2 break-words leading-relaxed text-zinc-400 ${
          muted ? "text-xs" : "text-sm"
        }`}
      >
        {str(task.description, "No description")}
      </p>
      <dl
        className={`mt-3 grid gap-x-3 gap-y-2 text-zinc-500 sm:grid-cols-2 ${
          muted ? "text-[11px]" : "text-xs"
        }`}
      >
        <div>
          <dt className="text-zinc-600">Difficulty</dt>
          <dd className="tabular-nums text-zinc-300">
            {num(task.difficulty) ?? "N/A"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-600">Duration (min)</dt>
          <dd className="tabular-nums text-zinc-300">
            {num(task.duration_minutes) ?? num(task.durationMinutes) ?? "N/A"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-600">Priority</dt>
          <dd className="tabular-nums text-zinc-300">
            {num(task.priority) ?? "N/A"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-600">Est. battery Δ</dt>
          <dd className="tabular-nums text-zinc-300">{deltaOf(task)}</dd>
        </div>
        {dueOf(task) ? (
          <div className="sm:col-span-2">
            <dt className="text-zinc-600">Due</dt>
            <dd className="break-words text-zinc-300">{dueOf(task)}</dd>
          </div>
        ) : null}
      </dl>
      {pending && id.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={mutating}
            onClick={onComplete}
            className="rounded-lg bg-emerald-600/90 px-3 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {completeLabel}
          </button>
          <button
            type="button"
            disabled={mutating}
            onClick={onSkip}
            className="rounded-lg border border-zinc-600 bg-zinc-900/60 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {skipLabel}
          </button>
        </div>
      ) : null}
    </article>
  );
}
