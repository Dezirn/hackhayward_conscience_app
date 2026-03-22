type JarGlowProps = {
  /** 0–1 scales ambient glow strength (from battery fill). */
  fillNorm: number;
};

/** Soft aura behind the jar; strength follows energy level slightly. */
export function JarGlow({ fillNorm }: JarGlowProps) {
  const base = 0.35 + fillNorm * 0.45;
  return (
    <div
      className="jar-glow-animate pointer-events-none absolute left-1/2 top-[55%] -z-10 h-[120%] w-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{
        background: `radial-gradient(ellipse 50% 45% at 50% 50%, rgba(34,211,238,${base * 0.22}) 0%, rgba(99,102,241,${base * 0.18}) 35%, transparent 70%)`,
        filter: "blur(28px)",
      }}
      aria-hidden
    />
  );
}
