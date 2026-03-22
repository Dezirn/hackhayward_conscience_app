"use client";

import {
  clampBatteryPercent,
  meterStatusLabel,
} from "@/lib/batteryPercent";

type SocialBatteryCardProps = {
  batteryPercent: number;
};

function statusStyles(percent: number): {
  label: string;
  badgeClass: string;
  fillClass: string;
} {
  const p = clampBatteryPercent(percent);
  const label = meterStatusLabel(p);
  if (p >= 80) {
    return {
      label,
      badgeClass:
        "border-emerald-500/35 bg-emerald-500/15 text-emerald-200",
      fillClass:
        "bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-400",
    };
  }
  if (p >= 50) {
    return {
      label,
      badgeClass: "border-cyan-500/35 bg-cyan-500/12 text-cyan-100",
      fillClass: "bg-gradient-to-r from-cyan-400 to-sky-500",
    };
  }
  if (p >= 20) {
    return {
      label,
      badgeClass: "border-amber-500/40 bg-amber-500/12 text-amber-100",
      fillClass: "bg-gradient-to-r from-amber-400 to-orange-500",
    };
  }
  return {
    label,
    badgeClass: "border-rose-500/45 bg-rose-500/15 text-rose-100",
    fillClass: "bg-gradient-to-r from-rose-500 to-red-600",
  };
}

/**
 * Center hero: wide, fat 2D battery meter; percentage reads inside the cell.
 */
export function SocialBatteryCard({ batteryPercent }: SocialBatteryCardProps) {
  const pct = clampBatteryPercent(batteryPercent);
  const rounded = Math.round(pct);
  const { label, badgeClass, fillClass } = statusStyles(pct);

  return (
    <section
      className="w-full max-w-[min(100%,34rem)] px-1 sm:px-2"
      aria-label={`Social battery ${rounded} percent, ${label}`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 sm:text-sm">
          Social Battery
        </h2>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${badgeClass}`}
        >
          {label}
        </span>
      </div>

      <div className="flex min-h-[min(26vh,180px)] items-stretch gap-2.5 sm:min-h-[min(30vh,220px)] sm:gap-3">
        <div
          className="relative min-h-[118px] flex-1 overflow-hidden rounded-[1.1rem] border border-white/[0.18] bg-zinc-900/50 p-2 shadow-[inset_0_2px_24px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.06)] sm:min-h-[142px] sm:rounded-2xl sm:p-2.5 md:min-h-[168px]"
        >
          <div className="relative h-full min-h-[100px] w-full overflow-hidden rounded-lg bg-zinc-950/95 sm:min-h-[124px] sm:rounded-xl md:min-h-[148px]">
            <div
              className={`absolute inset-y-0 left-0 ${fillClass} shadow-[0_0_40px_rgba(34,211,238,0.2)] transition-[width] duration-500 ease-out motion-reduce:transition-none`}
              style={{ width: `${pct}%` }}
              aria-hidden
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
              <p
                className="text-center text-[clamp(2.25rem,11vw,4.25rem)] font-semibold leading-none tabular-nums tracking-tight text-white"
                style={{
                  textShadow:
                    "0 0 32px rgba(0,0,0,0.95), 0 2px 12px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,1)",
                }}
              >
                {rounded}
                <span className="align-top text-[0.45em] font-medium text-white/80">
                  %
                </span>
              </p>
            </div>
          </div>
        </div>

        <div
          className="w-2.5 shrink-0 self-center rounded-md border border-white/25 bg-gradient-to-b from-zinc-700 to-zinc-900 shadow-inner sm:w-3 md:w-3.5"
          style={{
            height: "min(72%, 9rem)",
            minHeight: "4.75rem",
          }}
          aria-hidden
        />
      </div>
    </section>
  );
}
