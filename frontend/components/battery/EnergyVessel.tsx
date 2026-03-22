"use client";

import type { CSSProperties } from "react";

import { clampBatteryPercent, meterStatusLabel } from "@/lib/batteryPercent";

type EnergyVesselProps = {
  batteryPercent: number;
};

function vesselPalette(percent: number): {
  label: string;
  badgeClass: string;
  /** Tailwind gradient classes for liquid body */
  liquidClass: string;
  glowClass: string;
  coreGlow: string;
} {
  const p = clampBatteryPercent(percent);
  const label = meterStatusLabel(p);
  if (p >= 80) {
    return {
      label,
      badgeClass:
        "border-accent-cyan/35 bg-accent-cyan/10 text-fg-primary shadow-[0_0_20px_-8px_rgba(123,231,255,0.35)]",
      liquidClass:
        "bg-gradient-to-b from-cyan-100/95 via-cyan-400 to-teal-600",
      glowClass: "bg-cyan-400/35 blur-3xl",
      coreGlow: "shadow-[0_0_60px_8px_rgba(34,211,238,0.35)]",
    };
  }
  if (p >= 50) {
    return {
      label,
      badgeClass:
        "border-accent-cyan/30 bg-accent-cyan/10 text-fg-primary",
      liquidClass:
        "bg-gradient-to-b from-cyan-200/80 via-cyan-500/90 to-teal-700",
      glowClass: "bg-cyan-500/25 blur-3xl",
      coreGlow: "shadow-[0_0_48px_4px_rgba(34,211,238,0.22)]",
    };
  }
  if (p >= 20) {
    return {
      label,
      badgeClass:
        "border-teal-500/35 bg-teal-950/55 text-fg-secondary",
      liquidClass:
        "bg-gradient-to-b from-teal-800/90 via-cyan-900 to-slate-950",
      glowClass: "bg-teal-500/15 blur-3xl",
      coreGlow: "shadow-[0_0_36px_2px_rgba(45,212,191,0.12)]",
    };
  }
  return {
    label,
    badgeClass:
      "border-rose-500/35 bg-rose-950/45 text-fg-primary",
    liquidClass:
      "bg-gradient-to-b from-slate-700 via-rose-950/80 to-slate-950",
    glowClass: "bg-rose-500/12 blur-3xl",
    coreGlow: "shadow-[0_0_28px_0px_rgba(244,63,94,0.15)]",
  };
}

/**
 * Signature “social battery core” — glass chamber with plasma fill tied to level.
 */
export function EnergyVessel({ batteryPercent }: EnergyVesselProps) {
  const pct = clampBatteryPercent(batteryPercent);
  const rounded = Math.round(pct);
  const { label, badgeClass, liquidClass, glowClass, coreGlow } =
    vesselPalette(pct);
  const e = pct / 100;
  const sloshDur = `${3.8 - e * 1.5}s`;
  const glowDur = `${3.6 - e * 1.1}s`;
  const shimmerDur = `${5 - e * 1.4}s`;
  const rimDur = `${3.2 - e * 0.8}s`;

  return (
    <div
      className="energy-vessel-float relative mx-auto w-full max-w-[min(100%,17rem)] px-2 sm:max-w-[min(100%,19rem)]"
      style={
        {
          "--liquid-slosh-dur": sloshDur,
          "--vessel-glow-dur": glowDur,
          "--liquid-shimmer-dur": shimmerDur,
          "--rim-shine-dur": rimDur,
        } as CSSProperties
      }
    >
      {/* Bloom behind chamber */}
      <div
        className={`energy-vessel-glow pointer-events-none absolute -inset-8 rounded-full opacity-70 ${glowClass}`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute -inset-3 rounded-[2.75rem] opacity-50 ${glowClass}`}
        style={{ filter: "blur(28px)" }}
        aria-hidden
      />

      {/* Outer glass shell */}
      <div
        className={`relative mx-auto aspect-[1/1.35] w-full max-w-[15.5rem] rounded-[2.5rem] border border-white/[0.22] bg-gradient-to-b from-white/[0.14] via-cyan-500/[0.06] to-transparent p-[3px] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_0_0_1px_rgba(0,0,0,0.5),0_24px_64px_-24px_rgba(0,0,0,0.9)] backdrop-blur-sm sm:max-w-[17rem] ${coreGlow}`}
      >
        <div className="energy-rim-shine pointer-events-none absolute inset-0 rounded-[2.4rem] ring-1 ring-inset ring-cyan-300/25" />
        <div className="pointer-events-none absolute inset-x-4 top-3 h-5 rounded-full bg-gradient-to-b from-white/25 to-transparent opacity-40 blur-sm" />

        <div className="relative flex h-full flex-col rounded-[2.35rem] bg-[#050814]/90 shadow-[inset_0_12px_40px_rgba(0,0,0,0.65)]">
          {/* Inner chamber */}
          <div className="relative flex flex-1 flex-col px-3 pb-3 pt-5 sm:px-4 sm:pb-4 sm:pt-6">
            <div className="relative flex flex-1 flex-col justify-end overflow-hidden rounded-2xl border border-white/[0.08] bg-[#02060f]/95 shadow-[inset_0_0_32px_rgba(0,0,0,0.85)]">
              {/* Subtle grid / depth */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(34,211,238,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.35) 1px, transparent 1px)",
                  backgroundSize: "12px 12px",
                }}
                aria-hidden
              />

              {/* Plasma fill */}
              <div className="absolute inset-x-0 bottom-0 top-[8%] overflow-hidden rounded-b-[1.35rem] rounded-t-[52%]">
                <div
                  className="energy-liquid-slosh absolute bottom-0 left-[-4%] right-[-4%] overflow-hidden rounded-t-[50%] border-t border-cyan-200/20"
                  style={{
                    height: `${Math.max(pct, 6)}%`,
                    transition: "height 0.85s cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                >
                  <div
                    className={`absolute inset-0 ${liquidClass} opacity-[0.92]`}
                  />
                  <div
                    className="energy-liquid-shimmer pointer-events-none absolute -inset-y-2 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent"
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-[42%] bg-gradient-to-b from-white/25 to-transparent opacity-50"
                    aria-hidden
                  />
                </div>
              </div>

              {/* Glass reflection stripe */}
              <div
                className="pointer-events-none absolute inset-y-4 left-2 w-1/3 rounded-full bg-gradient-to-r from-white/10 to-transparent opacity-30 blur-md"
                aria-hidden
              />

              {/* Numeric readout */}
              <div className="relative z-[1] flex flex-1 flex-col items-center justify-center px-2 pb-2 pt-4">
                <p
                  className="font-display text-center text-[clamp(2.75rem,14vw,4.5rem)] font-semibold leading-none tabular-nums tracking-tight text-fg-primary"
                  style={{
                    textShadow: "0 2px 16px rgba(0,0,0,0.75)",
                  }}
                >
                  {rounded}
                  <span className="align-top font-display text-[0.42em] font-medium text-accent-cyan">
                    %
                  </span>
                </p>
                <span
                  className={`mt-3 rounded-full border px-3 py-1.5 font-sans text-xs font-semibold leading-none ${badgeClass}`}
                >
                  {label}
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
