export function AdvisorCardSkeleton({ index }: { index: number }) {
  return (
    <div
      className="council-rise rounded-2xl border border-white/[0.08] bg-zinc-950/40 p-5 backdrop-blur-sm"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex gap-4">
        <div className="h-14 w-14 shrink-0 animate-pulse rounded-xl bg-zinc-800/80" />
        <div className="flex-1 space-y-3 pt-1">
          <div className="h-4 w-40 animate-pulse rounded bg-zinc-800/80" />
          <div className="h-3 w-full animate-pulse rounded bg-zinc-800/60" />
          <div className="h-3 w-[92%] animate-pulse rounded bg-zinc-800/60" />
          <div className="h-3 w-[80%] animate-pulse rounded bg-zinc-800/50" />
        </div>
      </div>
    </div>
  );
}
