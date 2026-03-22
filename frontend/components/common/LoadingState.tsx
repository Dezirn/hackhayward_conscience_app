type LoadingStateProps = {
  message?: string;
};

export function LoadingState({ message = "Loading…" }: LoadingStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 py-16 text-zinc-400"
      role="status"
      aria-live="polite"
    >
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-500"
        aria-hidden
      />
      <p className="text-sm">{message}</p>
    </div>
  );
}
