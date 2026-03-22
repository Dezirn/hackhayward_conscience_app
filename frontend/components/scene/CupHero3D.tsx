"use client";

import { Html, useProgress } from "@react-three/drei";

import type { Battery } from "@/lib/types";

import { CupScene } from "@/components/scene/CupScene";
import { HeroSceneCanvas } from "@/components/scene/HeroSceneCanvas";
import { computeBatteryFillPercent } from "@/components/scene/jarBattery";

function CanvasLoader() {
  const { active } = useProgress();
  if (!active) return null;
  return (
    <Html center prepend>
      <span className="rounded-md border border-white/10 bg-zinc-950/80 px-3 py-1.5 text-xs text-zinc-400 backdrop-blur-sm">
        Loading cup…
      </span>
    </Html>
  );
}

function HeroCupReadout({
  battery,
}: {
  battery: Pick<
    Battery,
    "current_level" | "min_level" | "max_level" | "status_label"
  >;
}) {
  const pct = Math.round(computeBatteryFillPercent(battery));
  const status =
    typeof battery.status_label === "string" && battery.status_label.trim()
      ? battery.status_label.trim()
      : "—";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center pb-1 text-center">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-cyan-200/75">
        Energy
      </p>
      <p className="text-2xl font-semibold tabular-nums text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] sm:text-3xl">
        {pct}
        <span className="text-sm font-medium text-white/45">%</span>
      </p>
      <p className="mt-1 text-[0.65rem] tabular-nums text-zinc-400/90">
        Drag to orbit · scroll to zoom
      </p>
      <p className="text-[0.7rem] tabular-nums text-zinc-300/90">
        {battery.current_level} / {battery.max_level} ·{" "}
        <span className="capitalize">{status}</span>
      </p>
    </div>
  );
}

type CupHero3DProps = {
  battery: Pick<
    Battery,
    "current_level" | "min_level" | "max_level" | "status_label"
  >;
};

/**
 * Center hero: interactive GLB cup + procedural liquid fill (0–1 from battery %).
 */
export function CupHero3D({ battery }: CupHero3DProps) {
  const liquidFillLevel = computeBatteryFillPercent(battery) / 100;

  return (
    <div
      className="relative mx-auto w-full max-w-[min(100%,380px)] py-2 sm:max-w-[420px]"
      role="img"
      aria-label={`Glass cup hero, battery about ${Math.round(computeBatteryFillPercent(battery))} percent, drag to orbit`}
    >
      <div className="relative h-[min(48vh,340px)] w-full sm:h-[380px]">
        <HeroSceneCanvas>
          <CanvasLoader />
          <CupScene liquidFillLevel={liquidFillLevel} />
        </HeroSceneCanvas>
      </div>
      <HeroCupReadout battery={battery} />
    </div>
  );
}
