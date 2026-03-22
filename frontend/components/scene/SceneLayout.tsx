import type { ReactNode } from "react";

type SceneLayoutProps = {
  topLeft: ReactNode;
  topRight: ReactNode;
  hero: ReactNode;
  statsStrip: ReactNode;
  bottomLane: ReactNode;
};

/**
 * Full-viewport scene frame: overlay header, centered hero + stats, bottom-anchored lane.
 * Background layers can be added on this container later.
 */
export function SceneLayout({
  topLeft,
  topRight,
  hero,
  statsStrip,
  bottomLane,
}: SceneLayoutProps) {
  return (
    <div className="relative flex min-h-dvh w-full flex-col">
      <div className="relative z-10 flex min-h-dvh flex-1 flex-col">
        <header className="flex shrink-0 items-start justify-between gap-4 px-4 pt-6 pb-2 sm:px-8 sm:pt-8">
          <div className="min-w-0">{topLeft}</div>
          <div className="shrink-0">{topRight}</div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col px-4 sm:px-8">
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-6 sm:py-10">
            <div className="flex w-full max-w-3xl flex-col items-center gap-8">
              {hero}
              {statsStrip}
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-auto shrink-0 px-4 pb-6 pt-2 sm:px-8 sm:pb-8">
          {bottomLane}
        </div>
      </div>
    </div>
  );
}
