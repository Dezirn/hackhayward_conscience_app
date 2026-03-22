import type { ReactNode } from "react";

type JarGlassProps = {
  children: ReactNode;
};

/** Neck + body shell: glass vessel; children = fill well + readout; highlights sit above. */
export function JarGlass({ children }: JarGlassProps) {
  return (
    <div className="relative flex w-full max-w-[13.5rem] flex-col items-center sm:max-w-[15rem]">
      <div
        className="relative z-20 h-8 w-[46%] rounded-t-2xl border border-white/30 border-b-0 bg-gradient-to-b from-white/[0.14] to-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-md"
        aria-hidden
      />
      <div
        className="relative z-10 -mt-px w-full rounded-b-[2rem] rounded-t-lg border border-white/25 bg-gradient-to-b from-white/[0.08] to-white/[0.02] shadow-[0_8px_40px_-8px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-20px_40px_-20px_rgba(34,211,238,0.06)] backdrop-blur-md"
        style={{ aspectRatio: "1 / 1.28" }}
      >
        <div
          className="pointer-events-none absolute inset-[5px] rounded-b-[1.75rem] rounded-t-md border border-white/[0.07] bg-zinc-950/25 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
          aria-hidden
        />
        {/* Content: fill + labels */}
        <div className="relative z-0 h-full w-full">{children}</div>
        {/* Specular passes (above fill, below readout z-index inside children) */}
        <div
          className="pointer-events-none absolute inset-y-8 left-2 z-10 w-[26%] rounded-full bg-gradient-to-r from-white/15 to-transparent opacity-60 blur-md"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 z-10 rounded-b-[2rem] rounded-t-lg bg-gradient-to-tr from-white/[0.1] via-transparent to-transparent"
          aria-hidden
        />
      </div>
    </div>
  );
}
