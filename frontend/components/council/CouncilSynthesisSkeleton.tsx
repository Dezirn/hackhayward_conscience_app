export function CouncilSynthesisSkeleton() {
  return (
    <div className="council-rise rounded-2xl border border-white/[0.08] bg-zinc-950/40 p-6 backdrop-blur-sm sm:p-8">
      <div className="h-3 w-24 animate-pulse rounded bg-zinc-800/80" />
      <div className="mt-3 h-7 w-2/3 max-w-md animate-pulse rounded bg-zinc-800/70" />
      <div className="mt-8 space-y-4">
        <div className="h-3 w-20 animate-pulse rounded bg-zinc-800/60" />
        <div className="h-4 w-full animate-pulse rounded bg-zinc-800/50" />
        <div className="h-4 w-full animate-pulse rounded bg-zinc-800/50" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-zinc-800/40" />
      </div>
    </div>
  );
}
