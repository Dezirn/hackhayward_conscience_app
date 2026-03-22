"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";

import { NEBULA_PLANE_SIZE, NEBULA_Z } from "@/components/scene/cosmicConstants";

const vertexShader = /* glsl */ `
uniform float uTime;
uniform vec2 uParallax;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 pos = position;
  float w = sin(uv.y * 5.5 + uTime * 0.11) * 0.45;
  float w2 = cos(uv.x * 4.2 + uTime * 0.09) * 0.4;
  pos.x += w + uParallax.x * 1.8;
  pos.y += w2 + uParallax.y * 1.8;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform float uTime;
varying vec2 vUv;

void main() {
  vec2 c = vUv - 0.5;
  float r = length(c);
  float falloff = smoothstep(0.92, 0.18, r);
  float a = falloff * 0.22;

  vec3 deep = vec3(0.02, 0.03, 0.09);
  vec3 band = vec3(0.10, 0.12, 0.38);
  vec3 mist = vec3(0.06, 0.14, 0.28);

  float wave = sin(uTime * 0.07 + c.x * 2.8 + c.y * 2.2) * 0.5 + 0.5;
  vec3 col = mix(deep, band, wave * falloff);
  col = mix(col, mist, sin(uTime * 0.05 + r * 5.0) * 0.5 + 0.5 * 0.35 * falloff);

  float pulse = sin(uTime * 0.15 + r * 3.5) * 0.06 + 0.94;
  gl_FragColor = vec4(col * pulse, a * pulse);
}
`;

type NebulaPlaneProps = {
  timeScale: number;
  parallaxRef: MutableRefObject<{ x: number; y: number }>;
};

export function NebulaPlane({ timeScale, parallaxRef }: NebulaPlaneProps) {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uParallax: { value: new THREE.Vector2(0, 0) },
    }),
    [],
  );

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [uniforms],
  );

  useEffect(
    () => () => {
      material.dispose();
    },
    [material],
  );

  /* ShaderMaterial uniforms: standard per-frame GPU uploads. */
  /* eslint-disable react-hooks/immutability */
  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime * timeScale;
    uniforms.uParallax.value.set(
      parallaxRef.current.x,
      parallaxRef.current.y,
    );
  });
  /* eslint-enable react-hooks/immutability */

  return (
    <mesh material={material} position={[0, 0, NEBULA_Z]} rotation={[0.15, 0.2, 0]}>
      <planeGeometry args={[NEBULA_PLANE_SIZE, NEBULA_PLANE_SIZE, 1, 1]} />
    </mesh>
  );
}
