type ErrorStateProps = {
  title?: string;
  message: string;
  detail?: string | null;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Something went wrong",
  message,
  detail,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-5 py-6 text-center">
      <h2 className="text-sm font-semibold text-red-200">{title}</h2>
      <p className="mt-2 text-sm text-red-100/90">{message}</p>
      {detail ? (
        <p className="mt-2 break-words font-mono text-xs text-red-300/80">
          {detail}
        </p>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 rounded-lg bg-red-900/60 px-4 py-2 text-sm font-medium text-red-50 transition hover:bg-red-800/70"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
