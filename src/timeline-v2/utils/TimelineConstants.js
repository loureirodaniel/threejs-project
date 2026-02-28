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
    position: Object.freeze({ x: 0, y: 0, z: 8 }),
    target: Object.freeze({ x: 0, y: 0, z: 0 }),
    fov: 75
  }),
  /** Timeline scene (index 1): camera closer (z=5) to match AnimationChoreographer; narrow FOV for timeline view. */
  timeline: Object.freeze({
    position: Object.freeze({ x: 0, y: 0, z: 2.5 }),
    target: Object.freeze({ x: 0, y: 0, z: 0 }),
    fov: 30
  })
});

// -----------------------------------------------------------------------------
// Physics (drag, scroll, snap, velocity)
// -----------------------------------------------------------------------------

/** Precomputed snap positions (world X) – declared early for PHYSICS_CONFIG bounds. */
const SNAP_POSITIONS_FOR_BOUNDS = Object.freeze([
  -4.5, -3.0, -1.5, 0.0, 1.5, 3.0, 4.5, 6.0, 7.5, 9.0
]);

/**
 * Physics parameters for drag, scroll, snap, and velocity clamping.
 * Values from TimelineController and TimelineScrollController.
 * @type {Readonly<Object>}
 */
export const PHYSICS_CONFIG = Object.freeze({
  // Drag physics
  /** Base drag speed multiplier (offset units per pixel). */
  DRAG_SPEED: 0.008,
  /** Drag momentum friction per frame (0–1; higher = more damping). */
  DRAG_FRICTION: 0.96,
  /** Multiplier applied to drag release velocity for momentum. */
  DRAG_TO_SCROLL_MULTIPLIER: 0.12,

  // Scroll physics
  /** Scroll-to-offset sensitivity (multiplier on scroll delta). */
  SCROLL_SENSITIVITY: 0.28,
  /** Scroll momentum friction (0–1). */
  SCROLL_FRICTION: 0.72,
  /** Maximum scroll/drag velocity magnitude in offset units per frame. */
  MAX_SCROLL_VELOCITY: 0.45,

  // Snapping
  /** Distance threshold for snapping. */
  SNAP_THRESHOLD: 0.5,
  /** Velocity must be below this to trigger snap-to-nearest. */
  SNAP_VELOCITY_THRESHOLD: 0.05,

  // Bounds
  /** Velocity reduction on bounce at timeline edges. */
  BOUNCE_DAMPING: 0.3,
  /** Allow this fraction of range as overscroll during drag (e.g. 0.2 = 20%). */
  OVERSCROLL_MULTIPLIER: 0.2,

  // Offsets (derived from timeline snap positions)
  /** First snap position (world X). */
  MIN_OFFSET: SNAP_POSITIONS_FOR_BOUNDS[0],
  /** Last snap position (world X). */
  MAX_OFFSET: SNAP_POSITIONS_FOR_BOUNDS[SNAP_POSITIONS_FOR_BOUNDS.length - 1]
});

// -----------------------------------------------------------------------------
// Timeline layout (positions, spacing, snap positions)
// -----------------------------------------------------------------------------

/** Number of timeline years (e.g. 2010–2019). */
const TIMELINE_YEAR_COUNT = 10;

/** Center-to-center spacing between timeline image planes in world units. */
const IMAGE_SPACING = 1.5;

/** Precomputed snap positions (world X) for each year index 0..TIMELINE_YEAR_COUNT-1. */
const SNAP_POSITIONS_ARRAY = Object.freeze([
  -4.5, -3.0, -1.5, 0.0, 1.5, 3.0, 4.5, 6.0, 7.5, 9.0
]);

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
  /** Center-to-center distance between adjacent timeline images. World units. */
  IMAGE_SPACING: 1.5,
  /** Snap positions (world X) for each year index. World units. */
  SNAP_POSITIONS: SNAP_POSITIONS_ARRAY,
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
 * Durations in seconds; delays in milliseconds unless noted.
 * @type {Readonly<Object>}
 */
export const TIMING_CONFIG = Object.freeze({
  /** Scene transition duration (seconds). */
  TRANSITION_DURATION: 1.5,
  /** Snap animation duration (seconds). */
  SNAP_DURATION: 0.4,
  /** Time to wait before detecting scroll stop (ms). */
  SCROLL_STOP_DELAY: 400,
  /** Time to wait before checking if should snap (ms). */
  SNAP_CHECK_DELAY: 300,
  /** Hold-to-pullback delay (ms). */
  PULLBACK_DELAY: 500
});

// -----------------------------------------------------------------------------
// Camera behavior (look-at smoothing, optional pullback)
// -----------------------------------------------------------------------------

/**
 * Camera behavior tuning values for CameraSystem.
 * @type {Readonly<Object>}
 */
export const CAMERA_CONFIG = Object.freeze({
  /** Higher values track timeline offset faster (frame-rate independent smoothing). */
  LOOK_AT_LERP_SPEED: 5.0,

  /** Optional hold-to-pullback behavior during drag. */
  ENABLE_PULLBACK: false,

  /** Pull camera backward by this world-unit distance when pullback is active. */
  PULLBACK_DISTANCE: 2.0,

  /** Pullback tween duration in seconds. */
  PULLBACK_DURATION: 0.3,

  /** Return tween duration in seconds. */
  PULLBACK_RETURN_DURATION: 0.3,

  /** Scene transition duration in seconds. */
  TRANSITION_DURATION: 1.5,

  // Scroll zoom
  SCROLL_ZOOM_ENABLED: true,
  SCROLL_ZOOM_MAX_PULLBACK: 0.6,   // max extra z added while scrolling (world units)
  SCROLL_ZOOM_VELOCITY_SCALE: 0.7, // how much velocity maps to zoom (tune this)
  SCROLL_ZOOM_LERP_SPEED: 8.0      // how fast camera returns to base z
});

// -----------------------------------------------------------------------------
// Effects (vignette, liquid distortion)
// -----------------------------------------------------------------------------

/**
 * Effect parameters for vignette and liquid distortion.
 * @type {Readonly<Object>}
 */
export const EFFECTS_CONFIG = Object.freeze({
  // Vignette effect
  VIGNETTE_FOCUS_WIDTH: 2.0, // Distance for full brightness (world units)
  VIGNETTE_FALLOFF_WIDTH: 4.0, // Distance over which opacity fades
  VIGNETTE_MIN_OPACITY: 0.3, // Minimum opacity for far images
  VIGNETTE_STRENGTH: 0.7, // Overall vignette strength (0-1)

  // Image scaling
  FOCUS_SCALE: 0.85, // Scale for focused (center) image
  NORMAL_SCALE: 0.75, // Scale for non-focused images

  // Liquid distortion
  LIQUID_DISTORTION_STRENGTH: 0.02,
  LIQUID_FADE_IN_DURATION: 0.6,
  LIQUID_FADE_OUT_DURATION: 0.12,

  // Background blur
  BLUR_STRENGTH: 5.0,

  // Image enlargement
  ENLARGE_SCALE: 2.0,
  ENLARGE_Z_OFFSET: 2.0,
  ENLARGE_DURATION: 0.4,
  CLOSE_DURATION: 0.3
});
