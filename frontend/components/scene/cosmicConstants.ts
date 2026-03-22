/** Tune cosmic background without hunting through shaders. */

export const STAR_FAR_COUNT = 1000;
export const STAR_NEAR_COUNT = 320;
/** Horizontal spread of star volume (world units). */
export const STAR_FIELD_SPAN = 26;
/** Far layer Z range (behind camera look direction). */
export const STAR_Z_FAR_MIN = -20;
export const STAR_Z_FAR_MAX = -9;
export const STAR_Z_NEAR_MIN = -11;
export const STAR_Z_NEAR_MAX = -4;

export const DRIFT_FAR = 0.018;
export const DRIFT_NEAR = 0.032;

/** Max group offset from mouse (world units, scaled in useFrame). */
export const PARALLAX_STRENGTH = 0.28;
/** Lower = smoother follow. */
export const PARALLAX_LERP = 0.055;

/** Global time multiplier when `prefers-reduced-motion` is set. */
export const REDUCED_MOTION_TIME_SCALE = 0.08;

export const NEBULA_PLANE_SIZE = 48;
export const NEBULA_Z = -24;
