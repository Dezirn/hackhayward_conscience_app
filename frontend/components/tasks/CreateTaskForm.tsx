"use client";

import { useCallback, useEffect, useState } from "react";

import type { TaskCreateInput } from "@/lib/types";

const DEFAULT_DIFFICULTY = 2;
const DEFAULT_DURATION = 30;
const DEFAULT_PRIORITY = 3;
/** Backend requires non-blank description; use this when the user leaves the field empty. */
const EMPTY_DESCRIPTION_FALLBACK = "No description";

export type CreateTaskFormProps = {
  onSubmit: (payload: TaskCreateInput) => Promise<void>;
  loading: boolean;
  error: string | null;
  onDismissError?: () => void;
  /** Increment after a successful create to reset field values. */
  resetKey: number;
};

function rangeOptions(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = from; i <= to; i += 1) out.push(i);
  return out;
}

export function CreateTaskForm({
  onSubmit,
  loading,
  error,
  onDismissError,
  resetKey,
}: CreateTaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState(DEFAULT_DIFFICULTY);
  const [durationStr, setDurationStr] = useState(String(DEFAULT_DURATION));
  const [priority, setPriority] = useState(DEFAULT_PRIORITY);
  const [dueLocal, setDueLocal] = useState("");
  const [localError, setLocalError] = useState("");

  const resetFields = useCallback(() => {
    setTitle("");
    setDescription("");
    setDifficulty(DEFAULT_DIFFICULTY);
    setDurationStr(String(DEFAULT_DURATION));
    setPriority(DEFAULT_PRIORITY);
    setDueLocal("");
    setLocalError("");
  }, []);

  useEffect(() => {
    resetFields();
  }, [resetKey, resetFields]);

  const buildPayload = useCallback((): TaskCreateInput | null => {
    const t = title.trim();
    if (!t) {
      setLocalError("Title is required.");
      return null;
    }

    const dur = Number(durationStr.trim());
    if (!Number.isInteger(dur) || dur < 1) {
      setLocalError("Duration must be a whole number of minutes, at least 1.");
      return null;
    }

    if (difficulty < 1 || difficulty > 5 || priority < 1 || priority > 5) {
      setLocalError("Difficulty and priority must be between 1 and 5.");
      return null;
    }

    let due_at: string | undefined;
    if (dueLocal.trim() !== "") {
      const d = new Date(dueLocal);
      if (Number.isNaN(d.getTime())) {
        setLocalError("Due date/time is not valid.");
        return null;
      }
      due_at = d.toISOString();
    }

    const desc = description.trim();
    const payload: TaskCreateInput = {
      title: t,
      description: desc.length > 0 ? desc : EMPTY_DESCRIPTION_FALLBACK,
      difficulty,
      duration_minutes: dur,
      priority,
    };
    if (due_at !== undefined) payload.due_at = due_at;
    return payload;
  }, [title, description, difficulty, durationStr, priority, dueLocal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    const payload = buildPayload();
    if (!payload) return;
    try {
      await onSubmit(payload);
      /* Parent bumps `resetKey` to clear fields via effect */
    } catch {
      /* Parent sets `error`; keep form values for retry */
    }
  };

  const displayError = localError || error;

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h3 className="text-sm font-semibold text-zinc-300">New task</h3>
      <p className="mt-1 text-xs text-zinc-500">
        Quick add — title required; other fields have sensible defaults.
      </p>

      {displayError ? (
        <div
          className="mt-3 flex flex-wrap items-start gap-2 rounded-md border border-red-900/50 bg-red-950/35 px-3 py-2"
          role="alert"
        >
          <p className="min-w-0 flex-1 text-sm text-red-100/95">
            {displayError}
          </p>
          {error && onDismissError ? (
            <button
              type="button"
              onClick={onDismissError}
              className="shrink-0 rounded border border-red-800/80 bg-red-950/50 px-2 py-1 text-xs font-medium text-red-200 hover:bg-red-900/40"
            >
              Dismiss
            </button>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-3">
        <div>
          <label
            htmlFor="task-title"
            className="block text-xs font-medium text-zinc-500"
          >
            Title <span className="text-amber-600/90">*</span>
          </label>
          <input
            id="task-title"
            type="text"
            value={title}
            onChange={(e) => {
              setLocalError("");
              setTitle(e.target.value);
            }}
            disabled={loading}
            autoComplete="off"
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none ring-zinc-600 focus:border-zinc-500 focus:ring-1 disabled:opacity-50"
            placeholder="What needs doing?"
          />
        </div>

        <div>
          <label
            htmlFor="task-description"
            className="block text-xs font-medium text-zinc-500"
          >
            Description
          </label>
          <textarea
            id="task-description"
            value={description}
            onChange={(e) => {
              setLocalError("");
              setDescription(e.target.value);
            }}
            disabled={loading}
            rows={2}
            className="mt-1 w-full resize-y rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none ring-zinc-600 focus:border-zinc-500 focus:ring-1 disabled:opacity-50"
            placeholder="Optional — a short note"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label
              htmlFor="task-difficulty"
              className="block text-xs font-medium text-zinc-500"
            >
              Difficulty
            </label>
            <select
              id="task-difficulty"
              value={difficulty}
              onChange={(e) => {
                setLocalError("");
                setDifficulty(Number(e.target.value));
              }}
              disabled={loading}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 focus:ring-1 disabled:opacity-50"
            >
              {rangeOptions(1, 5).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="task-duration"
              className="block text-xs font-medium text-zinc-500"
            >
              Duration (min)
            </label>
            <input
              id="task-duration"
              type="number"
              min={1}
              step={1}
              value={durationStr}
              onChange={(e) => {
                setLocalError("");
                setDurationStr(e.target.value);
              }}
              disabled={loading}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 tabular-nums outline-none focus:border-zinc-500 focus:ring-1 disabled:opacity-50"
            />
          </div>
          <div>
            <label
              htmlFor="task-priority"
              className="block text-xs font-medium text-zinc-500"
            >
              Priority
            </label>
            <select
              id="task-priority"
              value={priority}
              onChange={(e) => {
                setLocalError("");
                setPriority(Number(e.target.value));
              }}
              disabled={loading}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 focus:ring-1 disabled:opacity-50"
            >
              {rangeOptions(1, 5).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="task-due"
            className="block text-xs font-medium text-zinc-500"
          >
            Due (local)
          </label>
          <input
            id="task-due"
            type="datetime-local"
            value={dueLocal}
            onChange={(e) => {
              setLocalError("");
              setDueLocal(e.target.value);
            }}
            disabled={loading}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 focus:ring-1 disabled:opacity-50"
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-sky-600/90 px-4 py-2 text-sm font-medium text-sky-950 transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create task"}
          </button>
        </div>
      </form>
    </section>
  );
}
