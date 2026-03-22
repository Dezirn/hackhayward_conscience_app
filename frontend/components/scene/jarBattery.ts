import type { Battery } from "@/lib/types";

/** Maps server battery to a 0–100 fill for the jar (clamped to min/max span). */
export function computeBatteryFillPercent(
  battery: Pick<Battery, "current_level" | "min_level" | "max_level">,
): number {
  const rawMin = Number.isFinite(battery.min_level) ? battery.min_level : 0;
  const rawMax = Number.isFinite(battery.max_level) ? battery.max_level : 100;
  const lo = Math.min(rawMin, rawMax);
  const hi = Math.max(rawMin, rawMax);
  const cur = Number.isFinite(battery.current_level)
    ? battery.current_level
    : lo;
  const span = Math.max(hi - lo, 1);
  const t = (cur - lo) / span;
  return Math.min(100, Math.max(0, t * 100));
}
