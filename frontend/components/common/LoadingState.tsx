type LoadingStateProps = {
  message?: string;
};

export function LoadingState({ message = "Loading…" }: LoadingStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 py-16 font-sans text-fg-muted"
      role="status"
      aria-live="polite"
    >
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-fg-subtle border-t-accent-cyan"
        aria-hidden
      />
      <p className="text-sm font-medium leading-relaxed text-fg-secondary">
        {message}
      </p>
    </div>
  );
}
