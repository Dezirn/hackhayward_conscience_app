"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";

import {
  DRIFT_FAR,
  DRIFT_NEAR,
  STAR_FAR_COUNT,
  STAR_FIELD_SPAN,
  STAR_NEAR_COUNT,
  STAR_Z_FAR_MAX,
  STAR_Z_FAR_MIN,
  STAR_Z_NEAR_MAX,
  STAR_Z_NEAR_MIN,
} from "@/components/scene/cosmicConstants";

function buildStarGeometry(
  count: number,
  zMin: number,
  zMax: number,
  span: number,
  brightness: number,
): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    pos[i3] = (Math.random() - 0.5) * span;
    pos[i3 + 1] = (Math.random() - 0.5) * span;
    pos[i3 + 2] = zMin + Math.random() * (zMax - zMin);
    const flicker = 0.55 + Math.random() * 0.45;
    const b = brightness * flicker;
    col[i3] = 0.65 * b;
    col[i3 + 1] = 0.72 * b;
    col[i3 + 2] = 1.0 * b;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return geo;
}

type StarfieldLayersProps = {
  timeScale: number;
  parallaxRef: MutableRefObject<{ x: number; y: number }>;
};

export function StarfieldLayers({ timeScale, parallaxRef }: StarfieldLayersProps) {
  const groupFar = useRef<THREE.Group>(null);
  const groupNear = useRef<THREE.Group>(null);

  const geoFar = useMemo(
    () =>
      buildStarGeometry(
        STAR_FAR_COUNT,
        STAR_Z_FAR_MIN,
        STAR_Z_FAR_MAX,
        STAR_FIELD_SPAN,
        0.35,
      ),
    [],
  );
  const geoNear = useMemo(
    () =>
      buildStarGeometry(
        STAR_NEAR_COUNT,
        STAR_Z_NEAR_MIN,
        STAR_Z_NEAR_MAX,
        STAR_FIELD_SPAN * 0.92,
        0.55,
      ),
    [],
  );

  const matFar = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.035,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    [],
  );

  const matNear = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.055,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    [],
  );

  useEffect(
    () => () => {
      geoFar.dispose();
      geoNear.dispose();
      matFar.dispose();
      matNear.dispose();
    },
    [geoFar, geoNear, matFar, matNear],
  );

  useFrame((_, delta) => {
    const d = delta * timeScale;
    const px = parallaxRef.current.x;
    const py = parallaxRef.current.y;
    if (groupFar.current) {
      groupFar.current.rotation.z += d * DRIFT_FAR;
      groupFar.current.position.x = px * 0.42;
      groupFar.current.position.y = py * 0.28;
    }
    if (groupNear.current) {
      groupNear.current.rotation.z -= d * DRIFT_NEAR;
      groupNear.current.position.x = px * 0.62;
      groupNear.current.position.y = py * 0.38;
    }
  });

  return (
    <>
      <group ref={groupFar}>
        <points geometry={geoFar} material={matFar} />
      </group>
      <group ref={groupNear}>
        <points geometry={geoNear} material={matNear} />
      </group>
    </>
  );
}
