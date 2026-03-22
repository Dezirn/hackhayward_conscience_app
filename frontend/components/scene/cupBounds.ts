import * as THREE from "three";

/** Axis-aligned bounds of the cup after scale + centering (rig space). */
export type CupBoundsSnapshot = {
  size: { x: number; y: number; z: number };
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
  center: { x: number; y: number; z: number };
};

export function snapshotBox3(box: THREE.Box3): CupBoundsSnapshot {
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  return {
    size: { x: size.x, y: size.y, z: size.z },
    min: { x: box.min.x, y: box.min.y, z: box.min.z },
    max: { x: box.max.x, y: box.max.y, z: box.max.z },
    center: { x: center.x, y: center.y, z: center.z },
  };
}
