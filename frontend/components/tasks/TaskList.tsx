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
      <div className="py-2">
        <h3 className="font-display text-base font-semibold tracking-tight text-fg-primary">
          Tasks
        </h3>
        <p className="mt-3 font-sans text-sm text-fg-muted">Loading tasks…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold tracking-tight text-fg-primary sm:text-xl">
              Task queue
            </h3>
            <p className="mt-1 max-w-lg font-sans text-sm leading-relaxed text-fg-secondary">
              Each item carries an energy cost—complete or skip to move your
              battery.
            </p>
          </div>
        </div>
        {actionError ? (
          <div
            className="mt-4 flex flex-wrap items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            role="alert"
          >
            <p className="min-w-0 flex-1 font-sans text-sm leading-relaxed text-rose-100">
              {actionError}
            </p>
            {onDismissActionError ? (
              <button
                type="button"
                onClick={onDismissActionError}
                className="shrink-0 rounded-lg border border-rose-400/40 bg-rose-950/50 px-3 py-1.5 text-xs font-medium text-rose-100 transition hover:bg-rose-900/40"
              >
                Dismiss
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-500/80">
          Active
        </h4>
        {pending.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            Clear deck—no pending tasks right now.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
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
        <div className="border-t border-white/[0.06] pt-8">
          <h4 className="font-sans text-sm font-semibold text-fg-subtle">
            Archive
          </h4>
          <p className="mt-1 font-sans text-sm leading-relaxed text-fg-muted">
            Completed or skipped—quieter, for reference.
          </p>
          <ul className="mt-4 space-y-3">
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
