"use client";

import { useGLTF } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { HERO_CUP_MODEL_PATH } from "@/components/scene/heroCupAsset";
import { snapshotBox3, type CupBoundsSnapshot } from "@/components/scene/cupBounds";
import { HERO_CUP_TARGET_SIZE } from "@/components/scene/heroCupTune";

useGLTF.preload(HERO_CUP_MODEL_PATH);

type CupModelProps = {
  /** Fired once after scale/center; drives liquid placement in the same rig. */
  onBoundsReady?: (bounds: CupBoundsSnapshot) => void;
};

export function CupModel({ onBoundsReady }: CupModelProps) {
  const { scene } = useGLTF(HERO_CUP_MODEL_PATH);
  const onBoundsRef = useRef(onBoundsReady);
  onBoundsRef.current = onBoundsReady;

  const root = useMemo(() => {
    const g = scene.clone(true);
    g.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = false;
        mesh.receiveShadow = false;
      }
    });
    return g;
  }, [scene]);

  useLayoutEffect(() => {
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxD = Math.max(size.x, size.y, size.z, 1e-3);
    const s = HERO_CUP_TARGET_SIZE / maxD;
    root.scale.setScalar(s);
    box.setFromObject(root);
    const center = new THREE.Vector3();
    box.getCenter(center);
    root.position.sub(center);
    box.setFromObject(root);

    const snap = snapshotBox3(box);
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console -- intentional debug for cup alignment
      console.log("[CupModel] normalized bounds", snap);
    }
    onBoundsRef.current?.(snap);
  }, [root]);

  return <primitive object={root} />;
}
