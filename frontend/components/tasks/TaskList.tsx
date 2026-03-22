import { TaskCard } from "@/components/tasks/TaskCard";
import type { Task } from "@/lib/types";

export type TaskListProps = {
  tasks: Task[];
  loading?: boolean;
  mutatingTaskId: string | null;
  /** Which action is running for `mutatingTaskId`, for per-button labels. */
  mutatingTaskAction?: "complete" | "skip" | null;
  actionError?: string | null;
  onDismissActionError?: () => void;
  onCompleteTask: (taskId: string) => void;
  onSkipTask: (taskId: string) => void;
};

function normalizeStatus(status: unknown): string {
  if (typeof status !== "string") return "";
  return status.trim().toLowerCase();
}

function taskKey(task: Task, index: number): string {
  const raw = typeof task.id === "string" ? task.id.trim() : "";
  return raw || `task-${index}`;
}

function apiTaskId(task: Task): string | null {
  const raw = typeof task.id === "string" ? task.id.trim() : "";
  return raw.length > 0 ? raw : null;
}

export function TaskList({
  tasks,
  loading = false,
  mutatingTaskId,
  mutatingTaskAction = null,
  actionError,
  onDismissActionError,
  onCompleteTask,
  onSkipTask,
}: TaskListProps) {
  const safe = tasks.filter((t) => t != null && typeof t === "object");
  const pending = safe.filter((t) => normalizeStatus(t.status) === "pending");
  const other = safe.filter((t) => normalizeStatus(t.status) !== "pending");

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h3 className="text-sm font-semibold text-zinc-300">Tasks</h3>
        <p className="mt-4 text-sm text-zinc-500">Loading tasks…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div>
        <h3 className="text-sm font-semibold text-zinc-300">Tasks</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Pending work — complete or skip to update your battery.
        </p>
        {actionError ? (
          <div
            className="mt-2 flex flex-wrap items-start gap-2 rounded-md border border-red-900/50 bg-red-950/35 px-3 py-2"
            role="alert"
          >
            <p className="min-w-0 flex-1 text-sm text-red-100/95">
              {actionError}
            </p>
            {onDismissActionError ? (
              <button
                type="button"
                onClick={onDismissActionError}
                className="shrink-0 rounded border border-red-800/80 bg-red-950/50 px-2 py-1 text-xs font-medium text-red-200 hover:bg-red-900/40"
              >
                Dismiss
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div>
        <h4 className="text-xs font-medium uppercase tracking-wide text-amber-500/90">
          Pending
        </h4>
        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            No pending tasks right now.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {pending.map((task, i) => {
              const key = taskKey(task, i);
              const id = apiTaskId(task);
              const busy = id != null && mutatingTaskId === id;
              return (
                <li key={key}>
                  <TaskCard
                    task={task}
                    mutating={busy}
                    mutatingAction={busy ? mutatingTaskAction : null}
                    onComplete={id ? () => onCompleteTask(id) : undefined}
                    onSkip={id ? () => onSkipTask(id) : undefined}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {other.length > 0 ? (
        <div className="border-t border-zinc-800/70 pt-5">
          <h4 className="text-[11px] font-medium uppercase tracking-wide text-zinc-600">
            Completed / skipped
          </h4>
          <p className="mt-1 text-[11px] text-zinc-600">
            Done items stay visible for reference.
          </p>
          <ul className="mt-3 space-y-2">
            {other.map((task, i) => (
              <li key={taskKey(task, i)}>
                <TaskCard task={task} variant="muted" />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
