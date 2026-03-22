"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";

const SceneBackground = dynamic(
  () =>
    import("@/components/scene/SceneBackground").then((mod) => mod.SceneBackground),
  { ssr: false, loading: () => null },
);

type AppShellProps = {
  children: ReactNode;
};

/** Full-viewport shell: cosmic canvas under scene UI. */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-[#04040f] text-fg-primary">
      <SceneBackground />
      {/* Soft vignette for legibility over bright nebula pockets */}
      <div
        className="pointer-events-none fixed inset-0 z-[1] bg-[radial-gradient(ellipse_85%_70%_at_50%_45%,transparent_0%,rgba(0,0,0,0.42)_100%)]"
        aria-hidden
      />
      <div className="relative z-[2] flex min-h-dvh flex-1 flex-col">{children}</div>
    </div>
  );
}
