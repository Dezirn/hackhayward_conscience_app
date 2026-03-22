import type { ReactNode } from "react";

type SceneLayoutProps = {
  topLeft: ReactNode;
  topRight: ReactNode;
  hero: ReactNode;
  statsStrip: ReactNode;
  bottomLane: ReactNode;
};

/**
 * Full-viewport scene: header row, centered hero + metrics, bottom lane with breathing room.
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
        <header className="flex shrink-0 flex-col gap-4 px-4 pb-2 pt-7 sm:flex-row sm:items-start sm:justify-between sm:px-8 sm:pb-4 sm:pt-10">
          <div className="min-w-0 max-w-xl">{topLeft}</div>
          <div className="shrink-0 sm:max-w-md sm:pt-1">{topRight}</div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col px-4 sm:px-8">
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-4 sm:py-8 md:py-10">
            <div className="flex w-full max-w-3xl flex-col items-center gap-10 sm:gap-12 md:gap-14">
              {hero}
              <div className="w-full max-w-xl">{statsStrip}</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-auto shrink-0 px-4 pb-7 pt-4 sm:px-8 sm:pb-10 sm:pt-6">
          {bottomLane}
        </div>
      </div>
    </div>
  );
}
