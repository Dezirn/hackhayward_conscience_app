"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import {
  PARALLAX_LERP,
  PARALLAX_STRENGTH,
  REDUCED_MOTION_TIME_SCALE,
} from "@/components/scene/cosmicConstants";
import { NebulaPlane } from "@/components/scene/NebulaPlane";
import { StarfieldLayers } from "@/components/scene/StarfieldLayers";

function useReducedMotionTimeScale() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () =>
      setScale(mq.matches ? REDUCED_MOTION_TIME_SCALE : 1);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return scale;
}

/** Runs before child `useFrame` hooks so parallax is current for the same tick. */
function CosmicInner() {
  const targetParallax = useRef({ x: 0, y: 0 });
  const smoothParallax = useRef({ x: 0, y: 0 });
  const timeScale = useReducedMotionTimeScale();

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      targetParallax.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      targetParallax.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useFrame(() => {
    const t = targetParallax.current;
    const s = smoothParallax.current;
    const tx = t.x * PARALLAX_STRENGTH;
    const ty = t.y * PARALLAX_STRENGTH;
    s.x += (tx - s.x) * PARALLAX_LERP;
    s.y += (ty - s.y) * PARALLAX_LERP;
  }, -1);

  return (
    <>
      <NebulaPlane timeScale={timeScale} parallaxRef={smoothParallax} />
      <StarfieldLayers timeScale={timeScale} parallaxRef={smoothParallax} />
    </>
  );
}

export function CosmicCanvas() {
  return (
    <Canvas
      className="h-full w-full"
      style={{ display: "block" }}
      camera={{ position: [0, 0, 6.5], fov: 52 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      }}
      dpr={[1, 1.5]}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color("#04040f"), 1);
      }}
    >
      <CosmicInner />
    </Canvas>
  );
}
