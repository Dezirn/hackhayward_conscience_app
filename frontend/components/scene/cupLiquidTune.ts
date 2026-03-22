/**
 * Liquid volume vs cup bbox (after CupModel normalize + center).
 * Radii/heights are derived from measured bounds — only tune fractions here.
 */

/** Liquid radius = min(cup width, cup depth) * this. */
export const LIQUID_RADIUS_FRAC = 0.34;

/** Max liquid column height = cup height * this (fill scales Y down from floor). */
export const LIQUID_HEIGHT_FRAC = 0.4;

/** Floor = cup bbox min.y + cupHeight * this (sit above inner bottom). */
export const LIQUID_FLOOR_FRAC = 0.04;

export const LIQUID_RADIAL_SEGMENTS = 24;
export const LIQUID_MIN_LEVEL = 0.08;

/** Simple transparent material — no transmission (avoids SSR refraction “fullscreen” bugs). */
export const LIQUID_OPACITY = 0.38;
export const LIQUID_COLOR = "#22d3ee";
export const LIQUID_ROUGHNESS = 0.42;
export const LIQUID_EMISSIVE = "#0891b2";
export const LIQUID_EMISSIVE_INTENSITY = 0.12;
