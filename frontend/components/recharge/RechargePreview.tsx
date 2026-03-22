import type {
  RechargeAnalyzeInput,
  RechargeAnalyzeResponse,
} from "@/lib/types";

export type RechargePreviewProps = {
  commitPayload: RechargeAnalyzeInput;
  preview: RechargeAnalyzeResponse;
  onCommit: () => Promise<void>;
  commitLoading: boolean;
  commitError: string | null;
  onDismissCommitError?: () => void;
  onReset: () => void;
  embedded?: boolean;
};

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function estimatedDeltaLabel(r: RechargeAnalyzeResponse): string {
  const n =
    num(r.ai_estimated_delta) ??
    num(r.estimated_delta) ??
    num(r.estimatedDelta);
  if (n === null) return "—";
  if (n === 0) return "0";
  return n > 0 ? `+${n}` : String(n);
}

function moodTags(r: RechargeAnalyzeResponse): string[] {
  const raw = r.mood_tags ?? r.moodTags;
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.trim() !== "");
}

function summaryText(r: RechargeAnalyzeResponse): string | null {
  const s =
    r.ai_summary ??
    r.explanation ??
    r.ai_reasoning ??
    null;
  if (typeof s !== "string") return null;
  const t = s.trim();
  return t.length > 0 ? t : null;
}

export function RechargePreview({
  commitPayload,
  preview,
  onCommit,
  commitLoading,
  commitError,
  onDismissCommitError,
  onReset,
  embedded = false,
}: RechargePreviewProps) {
  const tags = moodTags(preview);
  const conf = num(preview.ai_confidence);
  const summary = summaryText(preview);

  const handleCommit = () => void onCommit();

  const intro = embedded ? (
    <p className="text-xs text-zinc-500">
      Server estimate — commit applies this reflection (re-analyze if you edit
      fields above).
    </p>
  ) : (
    <>
      <h3 className="text-sm font-semibold text-violet-200">Recharge Preview</h3>
      <p className="mt-1 text-xs text-zinc-500">
        Estimates from the server. Commit applies this reflection using the same
        text you analyzed (edits above won&apos;t apply until you analyze again).
      </p>
    </>
  );

  const inner = (
    <>
      {intro}

      <div className="mt-4 rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-3 text-sm text-zinc-300">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Your reflection
        </p>
        <p className="mt-1 break-words text-zinc-300">{commitPayload.description}</p>
        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Feeling
        </p>
        <p className="mt-1 break-words text-zinc-300">{commitPayload.feeling_text}</p>
        {commitPayload.duration_minutes != null && commitPayload.duration_minutes > 0 ? (
          <p className="mt-2 text-xs text-zinc-500">
            Duration:{" "}
            <span className="tabular-nums text-zinc-400">
              {commitPayload.duration_minutes} min
            </span>
          </p>
        ) : null}
      </div>

      <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-zinc-600">Est. battery Δ</dt>
          <dd className="text-base font-medium tabular-nums text-violet-200">
            {estimatedDeltaLabel(preview)}
          </dd>
        </div>
        {conf !== null ? (
          <div>
            <dt className="text-zinc-600">Confidence</dt>
            <dd className="tabular-nums text-zinc-300">
              {(conf * 100).toFixed(0)}%
            </dd>
          </div>
        ) : null}
      </dl>

      {summary ? (
        <div className="mt-3">
          <p className="text-xs font-medium text-zinc-500">Summary</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-300">{summary}</p>
        </div>
      ) : null}

      {tags.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-medium text-zinc-500">Mood tags</p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {tags.map((t, i) => (
              <li
                key={`${i}-${t}`}
                className="rounded bg-zinc-800/90 px-2 py-0.5 text-xs text-zinc-300"
              >
                {t}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {commitError ? (
        <div
          className="mt-3 flex flex-wrap items-start gap-2 rounded-md border border-red-900/50 bg-red-950/35 px-3 py-2"
          role="alert"
        >
          <p className="min-w-0 flex-1 text-sm text-red-100/95">{commitError}</p>
          {onDismissCommitError ? (
            <button
              type="button"
              onClick={onDismissCommitError}
              className="shrink-0 rounded border border-red-800/80 bg-red-950/50 px-2 py-1 text-xs font-medium text-red-200 hover:bg-red-900/40"
            >
              Dismiss
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={commitLoading}
          onClick={handleCommit}
          className="rounded-lg bg-emerald-600/90 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {commitLoading ? "Committing…" : "Commit recharge"}
        </button>
        <button
          type="button"
          disabled={commitLoading}
          onClick={onReset}
          className="rounded-lg border border-zinc-600 bg-zinc-900/60 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start over
        </button>
      </div>
    </>
  );

  if (embedded) {
    return (
      <div className="mt-4 space-y-3 border-t border-violet-500/20 pt-4">
        {inner}
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-violet-900/40 bg-violet-950/20 p-5 ring-1 ring-violet-500/10">
      {inner}
    </section>
  );
}
