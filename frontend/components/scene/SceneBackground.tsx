"use client";

import { CosmicCanvas } from "@/components/scene/CosmicCanvas";

/** Full-viewport WebGL layer; sits under UI (`pointer-events: none`). */
export function SceneBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 h-dvh w-full overflow-hidden bg-[#04040f]"
      aria-hidden
    >
      <CosmicCanvas />
    </div>
  );
}
