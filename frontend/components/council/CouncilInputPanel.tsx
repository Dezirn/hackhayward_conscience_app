"use client";

type CouncilInputPanelProps = {
  question: string;
  context: string;
  onQuestionChange: (v: string) => void;
  onContextChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
};

export function CouncilInputPanel({
  question,
  context,
  onQuestionChange,
  onContextChange,
  onSubmit,
  loading,
  error,
}: CouncilInputPanelProps) {
  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-white/[0.12] bg-zinc-950/65 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_32px_80px_-40px_rgba(0,0,0,0.85)] backdrop-blur-xl sm:p-8 md:p-10"
      aria-labelledby="council-input-heading"
    >
      <div
        className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl"
        aria-hidden
      />

      <div className="relative">
        <h2
          id="council-input-heading"
          className="text-lg font-semibold text-white sm:text-xl"
        >
          Present your decision
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          The council deliberates in parallel—each seat brings a different lens.
          Be specific; richer prompts yield sharper counsel.
        </p>

        <div className="mt-8 space-y-6">
          <div>
            <label
              htmlFor="council-question"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-500"
            >
              What decision are you facing?
            </label>
            <textarea
              id="council-question"
              value={question}
              onChange={(e) => onQuestionChange(e.target.value)}
              disabled={loading}
              rows={4}
              placeholder="e.g. Should I accept the new role, stay put, or negotiate a hybrid path first?"
              className="mt-2 w-full resize-y rounded-xl border border-white/[0.1] bg-zinc-950/80 px-4 py-3 text-sm text-zinc-100 shadow-inner outline-none ring-0 transition placeholder:text-zinc-600 focus:border-cyan-500/40 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.12)] disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
            />
          </div>

          <div>
            <label
              htmlFor="council-context"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-500"
            >
              What context matters here?{" "}
              <span className="font-normal normal-case text-zinc-600">
                (optional)
              </span>
            </label>
            <textarea
              id="council-context"
              value={context}
              onChange={(e) => onContextChange(e.target.value)}
              disabled={loading}
              rows={3}
              placeholder="Stakeholders, timeline, values, constraints, what you’ve already tried…"
              className="mt-2 w-full resize-y rounded-xl border border-white/[0.1] bg-zinc-950/80 px-4 py-3 text-sm text-zinc-100 shadow-inner outline-none transition placeholder:text-zinc-600 focus:border-violet-500/35 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.1)] disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
            />
          </div>

          {error ? (
            <p
              className="rounded-lg border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onSubmit}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 via-violet-600 to-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-[0_0_32px_-8px_rgba(34,211,238,0.45)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400/80 disabled:pointer-events-none disabled:opacity-45"
            >
              {loading ? (
                <>
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                    aria-hidden
                  />
                  Council in session…
                </>
              ) : (
                "Ask the Council"
              )}
            </button>
            {loading ? (
              <p className="text-xs text-zinc-500 sm:text-right">
                Gathering five perspectives and a synthesis—usually a moment or
                two.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
