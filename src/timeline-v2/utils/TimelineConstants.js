/**
 * TimelineConstants - Centralized configuration for timeline behavior
 *
 * Extract all hardcoded values from existing codebase into organized constants.
 * All values are in frozen objects to prevent accidental mutation.
 *
 * @module timeline-v2/utils/TimelineConstants
 */

// -----------------------------------------------------------------------------
// Scene configuration (camera position, target, FOV per scene)
// -----------------------------------------------------------------------------

/**
 * Scene camera configurations for initial (0) and timeline (1) scenes.
 * Used by TimelineController / TimelineSceneController for transitions.
 * @type {Readonly<{ initial: Readonly<{ position: { x: number, y: number, z: number }, target: { x: number, y: number, z: number }, fov: number }>, timeline: Readonly<{ position: { x: number, y: number, z: number }, target: { x: number, y: number, z: number }, fov: number }> }>}
 */
export const SCENE_CONFIG = Object.freeze({
  /** Initial scene (index 0): camera close, wide FOV. Position and target in world units; fov in degrees. */
  initial: Object.freeze({
    position: Object.freeze({ x: 0, y: 0, z: 5 }),
    target: Object.freeze({ x: 0, y: 0, z: 0 }),
    fov: 75
  }),
  /** Timeline scene (index 1): camera farther, narrow FOV for timeline view. Position and target in world units; fov in degrees. */
  timeline: Object.freeze({
    position: Object.freeze({ x: 0, y: 0, z: 8 }),
    target: Object.freeze({ x: 0, y: 0, z: 0 }),
    fov: 30
  })
});

// -----------------------------------------------------------------------------
// Physics (drag, scroll, snap, velocity)
// -----------------------------------------------------------------------------

/**
 * Physics parameters for drag, scroll, snap, and velocity clamping.
 * Values from TimelineController and TimelineScrollController.
 * @type {Readonly<Object>}
 */
export const PHYSICS_CONFIG = Object.freeze({
  /** Base drag speed multiplier (offset units per pixel). */
  DRAG_SPEED: 0.008,
  /** Drag momentum friction per frame (0–1; higher = more damping). */
  DRAG_FRICTION: 0.96,
  /** Scroll-to-offset sensitivity (multiplier on scroll delta). */
  SCROLL_SENSITIVITY: 0.5,
  /** Scroll momentum friction (0–1). */
  SCROLL_FRICTION: 0.92,
  /** Distance in world units past which release advances to next/prev snap. */
  SNAP_THRESHOLD: 0.5,
  /** Maximum scroll/drag velocity magnitude in offset units per frame. */
  MAX_VELOCITY: 0.9,
  /** Bounce damping factor (0–1) for boundary/overscroll behavior. */
  BOUNCE_DAMPING: 0.3
});

// -----------------------------------------------------------------------------
// Timeline layout (positions, spacing, snap positions)
// -----------------------------------------------------------------------------

/** Number of timeline years (e.g. 2010–2019). */
const TIMELINE_YEAR_COUNT = 10;

/** Center-to-center spacing between timeline image planes in world units. */
const IMAGE_SPACING = 1.5;

/** Precomputed snap positions (world X) for each year index 0..TIMELINE_YEAR_COUNT-1. */
const SNAP_POSITIONS_ARRAY = Object.freeze(
  Array.from({ length: TIMELINE_YEAR_COUNT }, (_, i) => -4.5 + i * IMAGE_SPACING)
);

/**
 * Timeline layout and snap configuration.
 * Extracted from config/timelineLayout.js; FIRST_POSITION and X_RANGE as specified.
 * @type {Readonly<Object>}
 */
export const TIMELINE_CONFIG = Object.freeze({
  /** World X of the first timeline image (index 0). World units. */
  FIRST_POSITION: -4.5,
  /** Total horizontal range of the timeline (first to last image). World units. */
  X_RANGE: 13.5,
  /** Snap positions (world X) for each year index. World units. */
  SNAP_POSITIONS: SNAP_POSITIONS_ARRAY,
  /** Center-to-center distance between adjacent timeline images. World units. */
  IMAGE_SPACING,
  /** Number of timeline years/positions. */
  YEAR_COUNT: TIMELINE_YEAR_COUNT
});

/**
 * Get the world X position for a timeline image by index (0..YEAR_COUNT-1).
 * @param {number} index - Image index 0..TIMELINE_CONFIG.YEAR_COUNT-1
 * @returns {number} World X position in world units
 */
export function getTimelinePlaneX(index) {
  return TIMELINE_CONFIG.FIRST_POSITION + index * TIMELINE_CONFIG.IMAGE_SPACING;
}

/**
 * Get the world X position for an additional timeline plane (indices 8–9 in TimelineScene).
 * @param {number} additionalIndex - 0 or 1 for the two extra planes
 * @returns {number} World X position in world units
 */
export function getTimelineAdditionalPlaneX(additionalIndex) {
  return TIMELINE_CONFIG.FIRST_POSITION + (additionalIndex + 8) * TIMELINE_CONFIG.IMAGE_SPACING;
}

/**
 * All snap positions (one per year).
 * @returns {number[]} Array of world X positions in world units
 */
export function getTimelineSnapPositions() {
  return [...TIMELINE_CONFIG.SNAP_POSITIONS];
}

// -----------------------------------------------------------------------------
// Timing (durations and delays)
// -----------------------------------------------------------------------------

/**
 * Durations and delays for transitions, snap, scroll, and pullback.
 * All time values in seconds unless noted.
 * @type {Readonly<Object>}
 */
export const TIMING_CONFIG = Object.freeze({
  /** Camera transition from initial to timeline scene. Seconds. */
  TRANSITION_DURATION: 1.5,
  /** Duration of snap-to-nearest-image animation. Seconds. */
  SNAP_DURATION: 0.4,
  /** Delay after scroll stops before triggering snap. Milliseconds. */
  SCROLL_STOP_DELAY_MS: 400,
  /** Delay before snap check (e.g. after wheel cooldown). Milliseconds. */
  SNAP_CHECK_DELAY_MS: 300,
  /** Delay to ignore scroll after closing enlarged image (pullback/ignore window). Milliseconds. */
  PULLBACK_DELAY_MS: 500
});

// -----------------------------------------------------------------------------
// Effects (vignette, liquid distortion)
// -----------------------------------------------------------------------------

/**
 * Effect parameters for vignette and liquid distortion.
 * @type {Readonly<Object>}
 */
export const EFFECTS_CONFIG = Object.freeze({
  /** Vignette dimming amount at edges (0–1). */
  VIGNETTE_STRENGTH: 0.6,
  /** Vignette full-brightness radius in world units. */
  VIGNETTE_WIDTH: 4.0,
  /** Liquid distortion effect strength (displacement scale). */
  LIQUID_DISTORTION_STRENGTH: 0.02
});
