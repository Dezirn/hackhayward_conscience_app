import type { Battery } from "@/lib/types";

import { computeBatteryFillPercent } from "@/components/scene/jarBattery";
import { JarFill } from "@/components/scene/JarFill";
import { JarGlass } from "@/components/scene/JarGlass";
import { JarGlow } from "@/components/scene/JarGlow";
import { JarStatusLabel } from "@/components/scene/JarStatusLabel";

type JarHeroProps = {
  battery: Pick<
    Battery,
    "current_level" | "min_level" | "max_level" | "status_label"
  >;
};

/**
 * Pseudo-3D energy jar: layered glass + fill driven by live battery (min/max span).
 */
export function JarHero({ battery }: JarHeroProps) {
  const fillPercent = computeBatteryFillPercent(battery);
  const fillNorm = fillPercent / 100;
  const current = battery.current_level;
  const maxL = battery.max_level;
  const status = battery.status_label;

  return (
    <div
      className="jar-hero-animate relative mx-auto flex w-full max-w-[min(100%,340px)] flex-col items-center justify-center py-2 sm:max-w-[380px]"
      role="img"
      aria-label={`Social battery about ${Math.round(fillPercent)} percent, ${String(status || "unknown status")}`}
    >
      <JarGlow fillNorm={fillNorm} />
      <div className="relative w-full">
        <JarGlass>
          <div className="relative h-full min-h-[11.5rem] w-full sm:min-h-[12.5rem]">
            <div className="absolute inset-x-[7px] bottom-[7px] top-[3.25rem] overflow-hidden rounded-b-[1.35rem] rounded-t-md">
              <JarFill fillPercent={fillPercent} />
            </div>
            <JarStatusLabel
              fillPercent={fillPercent}
              currentLevel={current}
              maxLevel={maxL}
              statusLabel={status}
            />
          </div>
        </JarGlass>
      </div>
    </div>
  );
}
