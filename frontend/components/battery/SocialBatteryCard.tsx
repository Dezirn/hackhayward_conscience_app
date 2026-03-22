"use client";

import { EnergyVessel } from "@/components/battery/EnergyVessel";
import {
  clampBatteryPercent,
  meterStatusLabel,
} from "@/lib/batteryPercent";

type SocialBatteryCardProps = {
  batteryPercent: number;
};

/**
 * Home hero: signature energy vessel + typographic hierarchy (core → state → context).
 */
export function SocialBatteryCard({ batteryPercent }: SocialBatteryCardProps) {
  const pct = clampBatteryPercent(batteryPercent);
  const rounded = Math.round(pct);
  const stateLabel = meterStatusLabel(pct);

  return (
    <section
      className="w-full max-w-[min(100%,28rem)] px-1 sm:px-2"
      aria-label={`Social battery ${rounded} percent, ${stateLabel}`}
    >
      <div className="mb-8 text-center sm:mb-10">
        <p className="font-sans text-xs font-semibold text-accent-cyan">
          Core system
        </p>
        <h2 className="font-display mt-3 text-2xl font-semibold tracking-tight text-fg-primary sm:text-3xl md:text-[2rem]">
          Social battery
        </h2>
        <p className="mx-auto mt-3 max-w-sm font-sans text-sm leading-relaxed text-fg-secondary sm:text-base">
          Your living reserve of social energy—fill it deliberately, spend it
          with intent.
        </p>
      </div>

      <EnergyVessel batteryPercent={batteryPercent} />
    </section>
  );
}
