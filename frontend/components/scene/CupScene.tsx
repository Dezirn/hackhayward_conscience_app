"use client";

import { Environment, OrbitControls } from "@react-three/drei";
import { Suspense, useCallback, useState } from "react";

import type { CupBoundsSnapshot } from "@/components/scene/cupBounds";
import { CupLiquid } from "@/components/scene/CupLiquid";
import { CupModel } from "@/components/scene/CupModel";
import {
  HERO_AMBIENT_INTENSITY,
  HERO_BACK_WASH_INTENSITY,
  HERO_BACK_WASH_POSITION,
  HERO_CUP_NUDGE_Z,
  HERO_ENV_INTENSITY,
  HERO_FILL_INTENSITY,
  HERO_FILL_POSITION,
  HERO_KEY_INTENSITY,
  HERO_KEY_POSITION,
  HERO_ORBIT_DAMPING,
  HERO_ORBIT_MAX_AZIMUTH,
  HERO_ORBIT_MAX_DISTANCE,
  HERO_ORBIT_MAX_POLAR,
  HERO_ORBIT_MIN_AZIMUTH,
  HERO_ORBIT_MIN_DISTANCE,
  HERO_ORBIT_MIN_POLAR,
  HERO_ORBIT_ROTATE_SPEED,
  HERO_ORBIT_TARGET,
  HERO_RIM_INTENSITY,
  HERO_RIM_POSITION,
  HERO_TOP_KICK_INTENSITY,
  HERO_TOP_KICK_POSITION,
  HERO_UNDER_INTENSITY,
  HERO_UNDER_POSITION,
} from "@/components/scene/heroCupTune";

export type CupSceneProps = {
  liquidFillLevel: number;
};

function CupContents({ liquidFillLevel }: { liquidFillLevel: number }) {
  const [bounds, setBounds] = useState<CupBoundsSnapshot | null>(null);
  const onBoundsReady = useCallback((b: CupBoundsSnapshot) => {
    setBounds(b);
  }, []);

  return (
    <group position={[0, 0, HERO_CUP_NUDGE_Z]}>
      {bounds ? (
        <CupLiquid bounds={bounds} fillLevel={liquidFillLevel} />
      ) : null}
      <CupModel onBoundsReady={onBoundsReady} />
    </group>
  );
}

export function CupScene({ liquidFillLevel }: CupSceneProps) {
  return (
    <>
      <ambientLight intensity={HERO_AMBIENT_INTENSITY} />
      <directionalLight
        position={HERO_KEY_POSITION}
        intensity={HERO_KEY_INTENSITY}
      />
      <directionalLight
        position={HERO_RIM_POSITION}
        intensity={HERO_RIM_INTENSITY}
        color="#c8ddff"
      />
      <pointLight
        position={HERO_FILL_POSITION}
        intensity={HERO_FILL_INTENSITY}
        color="#f0f9ff"
        distance={14}
        decay={2}
      />
      <pointLight
        position={HERO_BACK_WASH_POSITION}
        intensity={HERO_BACK_WASH_INTENSITY}
        color="#9ecfff"
        distance={9}
        decay={2}
      />
      <pointLight
        position={HERO_TOP_KICK_POSITION}
        intensity={HERO_TOP_KICK_INTENSITY}
        color="#e8f4ff"
        distance={16}
        decay={2}
      />
      <pointLight
        position={HERO_UNDER_POSITION}
        intensity={HERO_UNDER_INTENSITY}
        color="#b6cfff"
        distance={6}
        decay={2}
      />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom
        minDistance={HERO_ORBIT_MIN_DISTANCE}
        maxDistance={HERO_ORBIT_MAX_DISTANCE}
        minPolarAngle={HERO_ORBIT_MIN_POLAR}
        maxPolarAngle={HERO_ORBIT_MAX_POLAR}
        minAzimuthAngle={HERO_ORBIT_MIN_AZIMUTH}
        maxAzimuthAngle={HERO_ORBIT_MAX_AZIMUTH}
        enableDamping
        dampingFactor={HERO_ORBIT_DAMPING}
        rotateSpeed={HERO_ORBIT_ROTATE_SPEED}
        target={HERO_ORBIT_TARGET}
      />

      <Suspense fallback={null}>
        <Environment
          preset="city"
          environmentIntensity={HERO_ENV_INTENSITY}
        />
        <CupContents liquidFillLevel={liquidFillLevel} />
      </Suspense>
    </>
  );
}
