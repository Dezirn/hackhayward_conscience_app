"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

import type { CupBoundsSnapshot } from "@/components/scene/cupBounds";
import {
  LIQUID_COLOR,
  LIQUID_EMISSIVE,
  LIQUID_EMISSIVE_INTENSITY,
  LIQUID_FLOOR_FRAC,
  LIQUID_HEIGHT_FRAC,
  LIQUID_MIN_LEVEL,
  LIQUID_OPACITY,
  LIQUID_RADIAL_SEGMENTS,
  LIQUID_RADIUS_FRAC,
  LIQUID_ROUGHNESS,
} from "@/components/scene/cupLiquidTune";

type CupLiquidProps = {
  bounds: CupBoundsSnapshot;
  fillLevel: number;
};

export function CupLiquid({ bounds, fillLevel }: CupLiquidProps) {
  const level = Math.min(
    1,
    Math.max(LIQUID_MIN_LEVEL, Number.isFinite(fillLevel) ? fillLevel : 0),
  );

  const liquidRadius =
    Math.min(bounds.size.x, bounds.size.z) * LIQUID_RADIUS_FRAC;
  const liquidMaxHeight = bounds.size.y * LIQUID_HEIGHT_FRAC;
  const floorY = bounds.min.y + bounds.size.y * LIQUID_FLOOR_FRAC;

  const geom = useMemo(() => {
    const g = new THREE.CylinderGeometry(
      liquidRadius,
      liquidRadius * 0.94,
      liquidMaxHeight,
      LIQUID_RADIAL_SEGMENTS,
      1,
      false,
    );
    g.translate(0, liquidMaxHeight / 2, 0);
    return g;
  }, [liquidMaxHeight, liquidRadius]);

  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: LIQUID_COLOR,
        emissive: LIQUID_EMISSIVE,
        emissiveIntensity: LIQUID_EMISSIVE_INTENSITY,
        metalness: 0,
        roughness: LIQUID_ROUGHNESS,
        transparent: true,
        opacity: LIQUID_OPACITY,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
      }),
    [],
  );

  useEffect(
    () => () => {
      geom.dispose();
      mat.dispose();
    },
    [geom, mat],
  );

  return (
    <mesh
      geometry={geom}
      material={mat}
      position={[bounds.center.x, floorY, bounds.center.z]}
      scale={[1, level, 1]}
      renderOrder={-1}
    />
  );
}
