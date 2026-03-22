type JarFillProps = {
  fillPercent: number;
};

/** Liquid column; height is fill % from the bottom of the inner vessel. */
export function JarFill({ fillPercent }: JarFillProps) {
  const h = Math.min(100, Math.max(0, fillPercent));

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden rounded-b-[1.35rem]"
      aria-hidden
    >
      <div
        className="absolute bottom-0 left-[6%] right-[6%] transition-[height] duration-700 ease-out motion-reduce:transition-none"
        style={{ height: `${h}%` }}
      >
        <div
          className="h-full w-full rounded-t-[1.15rem] border border-cyan-400/25 shadow-[inset_0_0_24px_rgba(34,211,238,0.12)]"
          style={{
            background: `linear-gradient(
              180deg,
              rgba(125,211,252,0.55) 0%,
              rgba(34,211,238,0.35) 28%,
              rgba(59,130,246,0.45) 55%,
              rgba(49,46,129,0.75) 100%
            )`,
          }}
        />
        {/* Soft meniscus */}
        <div
          className="absolute -top-px left-0 right-0 h-3 rounded-[100%_100%_0_0] bg-gradient-to-b from-white/25 to-transparent opacity-70"
          style={{ transform: "translateY(-35%)" }}
        />
      </div>
    </div>
  );
}
