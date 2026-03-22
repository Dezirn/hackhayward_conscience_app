"use client";

import { useCallback, useEffect, useState } from "react";

import type { RechargeAnalyzeInput } from "@/lib/types";

export type RechargeFormProps = {
  onAnalyze: (payload: RechargeAnalyzeInput) => Promise<void>;
  analyzeLoading: boolean;
  analyzeError: string | null;
  onDismissAnalyzeError?: () => void;
  resetKey: number;
};

export function RechargeForm({
  onAnalyze,
  analyzeLoading,
  analyzeError,
  onDismissAnalyzeError,
  resetKey,
}: RechargeFormProps) {
  const [description, setDescription] = useState("");
  const [feelingText, setFeelingText] = useState("");
  const [durationStr, setDurationStr] = useState("");
  const [localError, setLocalError] = useState("");

  const resetFields = useCallback(() => {
    setDescription("");
    setFeelingText("");
    setDurationStr("");
    setLocalError("");
  }, []);

  useEffect(() => {
    resetFields();
  }, [resetKey, resetFields]);

  const buildPayload = useCallback((): RechargeAnalyzeInput | null => {
    const d = description.trim();
    const f = feelingText.trim();
    if (!d) {
      setLocalError("Description is required.");
      return null;
    }
    if (!f) {
      setLocalError("How you felt is required.");
      return null;
    }

    const payload: RechargeAnalyzeInput = {
      description: d,
      feeling_text: f,
    };

    const raw = durationStr.trim();
    if (raw !== "") {
      const mins = Number(raw);
      if (!Number.isInteger(mins) || mins < 1) {
        setLocalError("Duration must be a whole number of minutes, at least 1, or leave blank.");
        return null;
      }
      payload.duration_minutes = mins;
    }

    return payload;
  }, [description, feelingText, durationStr]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    const payload = buildPayload();
    if (!payload) return;
    try {
      await onAnalyze(payload);
    } catch {
      /* Parent sets analyzeError */
    }
  };

  const displayError = localError || analyzeError;

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h3 className="text-sm font-semibold text-zinc-300">Recharge</h3>
      <p className="mt-1 text-xs text-zinc-500">
        Log a reflection — analyze to preview the boost, then commit to apply it.
      </p>

      {displayError ? (
        <div
          className="mt-3 flex flex-wrap items-start gap-2 rounded-md border border-red-900/50 bg-red-950/35 px-3 py-2"
          role="alert"
        >
          <p className="min-w-0 flex-1 text-sm text-red-100/95">{displayError}</p>
          {analyzeError && onDismissAnalyzeError ? (
            <button
              type="button"
              onClick={onDismissAnalyzeError}
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
            htmlFor="recharge-description"
            className="block text-xs font-medium text-zinc-500"
          >
            What did you do? <span className="text-amber-600/90">*</span>
          </label>
          <textarea
            id="recharge-description"
            value={description}
            onChange={(e) => {
              setLocalError("");
              setDescription(e.target.value);
            }}
            disabled={analyzeLoading}
            rows={2}
            className="mt-1 w-full resize-y rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 focus:ring-1 disabled:opacity-50"
            placeholder="Short description of the break or activity"
          />
        </div>
        <div>
          <label
            htmlFor="recharge-feeling"
            className="block text-xs font-medium text-zinc-500"
          >
            How did it feel? <span className="text-amber-600/90">*</span>
          </label>
          <textarea
            id="recharge-feeling"
            value={feelingText}
            onChange={(e) => {
              setLocalError("");
              setFeelingText(e.target.value);
            }}
            disabled={analyzeLoading}
            rows={2}
            className="mt-1 w-full resize-y rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 focus:ring-1 disabled:opacity-50"
            placeholder="Mood or energy in a few words"
          />
        </div>
        <div>
          <label
            htmlFor="recharge-duration"
            className="block text-xs font-medium text-zinc-500"
          >
            Duration (minutes)
          </label>
          <input
            id="recharge-duration"
            type="number"
            min={1}
            step={1}
            value={durationStr}
            onChange={(e) => {
              setLocalError("");
              setDurationStr(e.target.value);
            }}
            disabled={analyzeLoading}
            className="mt-1 w-full max-w-xs rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 tabular-nums outline-none focus:border-zinc-500 focus:ring-1 disabled:opacity-50"
            placeholder="Optional"
          />
        </div>
        <button
          type="submit"
          disabled={analyzeLoading}
          className="rounded-lg bg-violet-600/90 px-4 py-2 text-sm font-medium text-violet-50 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {analyzeLoading ? "Analyzing…" : "Analyze recharge"}
        </button>
      </form>
    </section>
  );
}
