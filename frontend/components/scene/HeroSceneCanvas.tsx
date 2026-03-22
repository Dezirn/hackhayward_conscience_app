"use client";

import { Canvas } from "@react-three/fiber";
import type { ReactNode } from "react";
import * as THREE from "three";

import {
  HERO_CAMERA_FOV,
  HERO_CAMERA_POSITION,
  HERO_EXPOSURE,
} from "@/components/scene/heroCupTune";

type HeroSceneCanvasProps = {
  children: ReactNode;
};

/** Local WebGL layer for the hero cup; transparent so the cosmic backdrop shows through. */
export function HeroSceneCanvas({ children }: HeroSceneCanvasProps) {
  return (
    <Canvas
      className="block h-full w-full touch-none outline-none"
      camera={{
        position: [...HERO_CAMERA_POSITION],
        fov: HERO_CAMERA_FOV,
        near: 0.08,
        far: 48,
      }}
      dpr={[1, 2]}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = HERO_EXPOSURE;
      }}
    >
      {children}
    </Canvas>
  );
}
