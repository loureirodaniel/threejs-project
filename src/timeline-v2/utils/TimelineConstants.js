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
  /** Accumulated wheel/trackpad delta required to move exactly one timeline step. */
  SCROLL_STEP_THRESHOLD: 0.9,
  /** Duration (seconds) for each wheel/trackpad step snap. */
  SCROLL_STEP_DURATION: 0.72,

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

/** Aspect ratio (height / width) for timeline image planes. Derived from 738×427 target. */
export const IMAGE_ASPECT_RATIO = 427 / 738;

// -----------------------------------------------------------------------------
// Scene margins (viewport-responsive top/bottom inset for the timeline scene)
// -----------------------------------------------------------------------------

/**
 * Base margin values (in px) at the reference viewport height.
 * The top margin scales with viewport height for proportional breathing room.
 * The bottom margin is fixed so it always clears the navigation component.
 *
 * Navigation layout (all fixed px, independent of viewport height):
 *   NAVIGATION_BOTTOM_OFFSET_PX  – distance from viewport bottom to nav bottom edge
 *   NAVIGATION_HEIGHT_PX         – height of the navigation component
 *   IMAGES_BOTTOM_GAP_PX         – required gap between image bottom and nav top edge
 *
 * Effective bottom reserved area = NAVIGATION_BOTTOM_OFFSET_PX
 *                                 + NAVIGATION_HEIGHT_PX
 *                                 + IMAGES_BOTTOM_GAP_PX
 *                                 = 40 + 60 + 16 = 116 px
 */
export const SCENE_MARGIN = Object.freeze({
  TOP_PX: 80,
  BOTTOM_PX: 80,
  REFERENCE_VIEWPORT_HEIGHT: 900,
  NAVIGATION_BOTTOM_OFFSET_PX: 40,
  NAVIGATION_HEIGHT_PX: 60,
  IMAGES_BOTTOM_GAP_PX: 16
});

/**
 * Compute viewport-responsive scene margins.
 * Top margin scales proportionally with viewport height.
 * Bottom margin is fixed at the navigation clearance value so that
 * bottom-aligned images are always exactly IMAGES_BOTTOM_GAP_PX above
 * the navigation component, regardless of viewport size.
 * @returns {{ top: number, bottom: number }} margins in current pixels
 */
export function getSceneMargins() {
  const vh = Math.max(1, typeof window !== 'undefined' ? window.innerHeight : SCENE_MARGIN.REFERENCE_VIEWPORT_HEIGHT);
  const scale = vh / SCENE_MARGIN.REFERENCE_VIEWPORT_HEIGHT;
  const fixedBottom = SCENE_MARGIN.NAVIGATION_BOTTOM_OFFSET_PX
    + SCENE_MARGIN.NAVIGATION_HEIGHT_PX
    + SCENE_MARGIN.IMAGES_BOTTOM_GAP_PX;
  return {
    top: SCENE_MARGIN.TOP_PX * scale,
    bottom: fixedBottom
  };
}

/** Per-slot overrides for the second timeline column (slot index 1). 0 = use percentage-based sizing. */
export const SLOT_1_WIDTH_PX = 0;
export const SLOT_1_HEIGHT_PX = 0;
export const SLOT_1_TOP_PX = 200;

/** Right padding (px) between viewport edge and first timeline image. */
export const TIMELINE_LAYOUT_CONFIG = Object.freeze({
  FIRST_IMAGE_RIGHT_PADDING_PX: 50,
  // Backward-compat fallback for older call sites.
  FIRST_IMAGE_LEFT_PADDING_PX: 50,
  FIRST_IMAGE_TOP_PX: 76,
  COLUMN_GAP_PX: 0,
  // Reserve space below timeline cards so metadata remains visible.
  META_SAFE_SPACE_PX: 100,
  // Gap between image bottom and metadata card top (kept in sync with TimelineColumn).
  META_OFFSET_PX: 10,
  // Upward shift (px) applied to slot-1 and slot-2 images so the metadata card
  // below them does not overlap with the image bottom edge.
  BOTTOM_SLOT_UPSHIFT_PX: 20,
  IMAGE_WIDTH_PERCENTAGES: Object.freeze([1, 1, 1]),
  IMAGE_WIDTHS_PX: Object.freeze([])
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

/**
 * Layered timeline layout slots to create a staggered collage rhythm.
 * X placement is still driven by timeline offset/spacing; this only affects
 * vertical/depth placement for the visual composition.
 */
const TIMELINE_LAYOUT_SLOTS = Object.freeze([
  Object.freeze({ y: -0.08, z: 0.12, scaleMultiplier: 1.0 }), // Main foreground card
  Object.freeze({ y: 0.92, z: -0.22, scaleMultiplier: 435 / 490 }), // Top secondary card
  Object.freeze({ y: -0.62, z: -0.08, scaleMultiplier: 348 / 490 }) // Lower secondary card
]);

/**
 * Get layered layout slot for a timeline index.
 * @param {number} index - Timeline image index
 * @returns {{ y: number, z: number, scaleMultiplier: number }}
 */
export function getTimelineLayoutSlot(index) {
  const slotIndex = Number.isFinite(index) ? Math.abs(index) % TIMELINE_LAYOUT_SLOTS.length : 0;
  return TIMELINE_LAYOUT_SLOTS[slotIndex];
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

  // Scroll zoom – camera pulls back during scroll and returns after the snap lands
  SCROLL_ZOOM_ENABLED: true,
  SCROLL_ZOOM_MAX_PULLBACK: 2.0,             // extra z added while scrolling (world units)
  SCROLL_ZOOM_VELOCITY_SCALE: 1.6,           // velocity to pullback mapping
  SCROLL_ZOOM_LERP_SPEED: 6.0,              // positional smoothing speed in update loop
  SCROLL_ZOOM_DELTA_FOR_MAX_INTENSITY: 0.8,  // normalized wheel delta that maps to full input intensity
  SCROLL_ZOOM_MIN_KICK_FACTOR: 0.5,          // minimum dolly factor per snap start (held during burst)
  SCROLL_ZOOM_HOLD_MS: 260,                  // fallback hold (snap lifecycle controls main return)
  SCROLL_ZOOM_DOLLY_OUT_DURATION: 0.28,      // dolly-out punch speed
  SCROLL_ZOOM_DOLLY_RETURN_DURATION: 0.65    // cinematic return-to-base after last snap
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

  // Smooth scale transitions (Lenis-style temporal lerp speed)
  SCALE_LERP_SPEED: 6.0,

  // Image scaling
  FOCUS_SCALE: 0.85, // Scale for focused (center) image
  NORMAL_SCALE: 0.75, // Scale for non-focused images
  TIMELINE_DISTANCE_MIN_SCALE: 0.75, // Minimum multiplier for far timeline images
  TIMELINE_DISTANCE_SCALE_RANGE: 6.0, // World-units distance from center to reach min scale
  TIMELINE_DEPTH_SCALE_BOOST: 1.6, // Extra perspective boost for slot z depth (higher = stronger near/far size contrast)
  TIMELINE_DEPTH_SCALE_MIN: 0.72, // Clamp to avoid tiny cards when far from camera
  TIMELINE_DEPTH_SCALE_MAX: 1.35, // Clamp to avoid oversized cards when near camera
  TIMELINE_OVERFLOW_DECAY_START_INDEX: 2, // First overflow index (0-based relative index) that starts sequence decay
  TIMELINE_SEQUENCE_DECAY_PER_STEP: 0.94, // Extra scale decay per card after the 3rd slot
  TIMELINE_SEQUENCE_MIN_SCALE: 0.65, // Lower clamp for sequence-based shrinking
  TIMELINE_OVERFLOW_FOCUS_BLEND_RANGE: 1.2, // Relative-index range where overflow penalty blends back to full scale near focus

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
