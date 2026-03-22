/**
 * Hero cup presentation — tweak here for framing and glass readability.
 */

/** Max bounding dimension after normalization (larger = bigger on screen). */
export const HERO_CUP_TARGET_SIZE = 5;

/** Push the centered model slightly toward the camera (+Z). */
export const HERO_CUP_NUDGE_Z = 0.28;//0.28

export const HERO_CAMERA_POSITION: [number, number, number] = [0, 0.05, 2.68];
export const HERO_CAMERA_FOV = 41;

/** Renderer exposure; slightly higher helps dark transmission glass. */
export const HERO_EXPOSURE = 1.05;

export const HERO_ENV_INTENSITY = 0.78;

export const HERO_AMBIENT_INTENSITY = 0.52;
export const HERO_KEY_INTENSITY = 1.35;
export const HERO_KEY_POSITION: [number, number, number] = [4.2, 8.5, 5.5];
export const HERO_RIM_INTENSITY = 0.72;
export const HERO_RIM_POSITION: [number, number, number] = [-6.5, 3.5, -5];
export const HERO_FILL_POSITION: [number, number, number] = [0, 2.2, 4.2];
export const HERO_FILL_INTENSITY = 0.48;
/** Behind the cup — separates silhouette from the cosmic backdrop. */
export const HERO_BACK_WASH_POSITION: [number, number, number] = [0, 0.4, -2.4];
export const HERO_BACK_WASH_INTENSITY = 0.95;
export const HERO_TOP_KICK_POSITION: [number, number, number] = [0, 5, 2.8];
export const HERO_TOP_KICK_INTENSITY = 0.42;
/** Soft uplight under the cup. */
export const HERO_UNDER_POSITION: [number, number, number] = [0, -1.35, 1.6];
export const HERO_UNDER_INTENSITY = 0.55;

/** Constrained orbit (radians / scene units). */
export const HERO_ORBIT_MIN_POLAR = Math.PI / 3.25;
export const HERO_ORBIT_MAX_POLAR = Math.PI / 2.02;
export const HERO_ORBIT_MIN_AZIMUTH = -0.72;
export const HERO_ORBIT_MAX_AZIMUTH = 0.72;
export const HERO_ORBIT_MIN_DISTANCE = 2.05;
export const HERO_ORBIT_MAX_DISTANCE = 5.4;
export const HERO_ORBIT_DAMPING = 0.085;
export const HERO_ORBIT_ROTATE_SPEED = 0.62;
/** Orbit focus — slightly below geometric center; Z matches cup nudge. */
export const HERO_ORBIT_TARGET: [number, number, number] = [
  0,
  -0.32,
  HERO_CUP_NUDGE_Z,
];
