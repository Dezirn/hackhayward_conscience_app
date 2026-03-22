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
      className="relative overflow-hidden rounded-[1.75rem] border border-violet-500/15 bg-gradient-to-b from-zinc-950/80 via-[#0a0618]/90 to-zinc-950/85 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_40px_100px_-48px_rgba(139,92,246,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl sm:p-8 md:p-10"
      aria-labelledby="council-input-heading"
    >
      {/* Chamber pillars */}
      <div
        className="pointer-events-none absolute bottom-0 left-[8%] top-12 w-px bg-gradient-to-b from-violet-500/30 via-cyan-500/10 to-transparent sm:left-[6%]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 right-[8%] top-12 w-px bg-gradient-to-b from-cyan-500/20 via-violet-500/10 to-transparent sm:right-[6%]"
        aria-hidden
      />

      <div
        className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-cyan-500/[0.09] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-violet-500/[0.1] blur-3xl"
        aria-hidden
      />

      <div className="relative">
        <p className="font-sans text-xs font-semibold text-accent-violet">
          Council session
        </p>
        <h2
          id="council-input-heading"
          className="font-display mt-2 text-2xl font-semibold tracking-tight text-fg-primary sm:text-3xl md:text-[2rem]"
        >
          Present your decision
        </h2>
        <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-fg-secondary sm:text-base">
          Precision earns sharper counsel. Name the fork, the stakes, and what
          you already know.
        </p>

        <div className="mt-10 space-y-7">
          <div>
            <label
              htmlFor="council-question"
              className="block font-sans text-sm font-semibold text-fg-primary"
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
              className="mt-2 w-full resize-y rounded-xl border border-white/[0.1] bg-black/35 px-4 py-3 font-sans text-sm leading-relaxed text-fg-primary shadow-[inset_0_2px_12px_rgba(0,0,0,0.45)] outline-none transition placeholder:text-fg-muted focus:border-accent-cyan/50 focus:shadow-[0_0_0_3px_rgba(123,231,255,0.12),inset_0_2px_12px_rgba(0,0,0,0.45)] disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
            />
          </div>

          <div>
            <label
              htmlFor="council-context"
              className="block font-sans text-sm font-semibold text-fg-primary"
            >
              Context that matters{" "}
              <span className="font-medium text-fg-muted">(optional)</span>
            </label>
            <textarea
              id="council-context"
              value={context}
              onChange={(e) => onContextChange(e.target.value)}
              disabled={loading}
              rows={3}
              placeholder="Stakeholders, timeline, values, constraints, what you’ve already tried…"
              className="mt-2 w-full resize-y rounded-xl border border-white/[0.1] bg-black/35 px-4 py-3 font-sans text-sm leading-relaxed text-fg-primary shadow-[inset_0_2px_12px_rgba(0,0,0,0.45)] outline-none transition placeholder:text-fg-muted focus:border-accent-violet/45 focus:shadow-[0_0_0_3px_rgba(174,140,255,0.12),inset_0_2px_12px_rgba(0,0,0,0.45)] disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
            />
          </div>

          {error ? (
            <p
              className="rounded-xl border border-rose-500/35 bg-rose-950/35 px-4 py-3 font-sans text-sm leading-relaxed text-rose-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onSubmit}
              disabled={loading}
              className="group relative inline-flex min-h-[3.25rem] w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-500 via-violet-500 to-indigo-600 px-10 py-3.5 font-display text-sm font-semibold leading-snug tracking-tight text-fg-primary shadow-[0_0_48px_-8px_rgba(139,92,246,0.55),0_0_36px_-10px_rgba(34,211,238,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] transition hover:brightness-110 hover:shadow-[0_0_56px_-4px_rgba(139,92,246,0.6)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300/90 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45 sm:w-auto sm:min-w-[16rem]"
            >
              <span
                className="pointer-events-none absolute inset-0 opacity-30 transition duration-500 group-hover:opacity-50"
                style={{
                  background:
                    "radial-gradient(circle at 30% 0%, rgba(255,255,255,0.5), transparent 45%)",
                }}
                aria-hidden
              />
              <span
                className="pointer-events-none absolute inset-0 translate-y-full bg-gradient-to-t from-black/25 to-transparent opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100"
                aria-hidden
              />
              {loading ? (
                <>
                  <span
                    className="relative h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white"
                    aria-hidden
                  />
                  <span className="relative font-sans">Council in session…</span>
                </>
              ) : (
                <span className="relative">Ask the Council</span>
              )}
            </button>
            {loading ? (
              <p className="text-center font-sans text-xs leading-relaxed text-fg-muted sm:max-w-xs sm:text-right">
                Gathering five perspectives and a synthesis—usually a few
                seconds.
              </p>
            ) : (
              <p className="text-center font-sans text-xs leading-relaxed text-fg-subtle sm:max-w-xs sm:text-right">
                This invocation sends one structured request—your question stays
                in the chamber until you convene again.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
