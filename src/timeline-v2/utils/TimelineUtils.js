/**
 * TimelineUtils - Pure utility functions for timeline calculations
 *
 * All functions are pure (no side effects) and well-tested.
 * These handle coordinate conversions, physics calculations, and easing.
 *
 * @module timeline-v2/utils/TimelineUtils
 */

import { TIMELINE_CONFIG, PHYSICS_CONFIG } from './TimelineConstants.js';

// -----------------------------------------------------------------------------
// Constants derived from config (for bounds)
// -----------------------------------------------------------------------------

const MIN_OFFSET = TIMELINE_CONFIG.SNAP_POSITIONS[0];
const MAX_OFFSET = TIMELINE_CONFIG.SNAP_POSITIONS[TIMELINE_CONFIG.YEAR_COUNT - 1];
const FIRST_YEAR = 2010;
const LAST_YEAR = 2019;

// -----------------------------------------------------------------------------
// 1. OFFSET / YEAR CONVERSION
// -----------------------------------------------------------------------------

/**
 * Convert timeline offset to year (2010-2019).
 * Timeline spans 2010-2019 (10 years). Offset -4.5 = 2010, offset 4.5 = 2019.
 * Each year is ~1.5 units apart. Returns clamped integer year.
 *
 * @param {number} offset - Timeline offset in world units
 * @returns {number} Year (2010-2019)
 */
export function offsetToYear(offset) {
  if (offset == null || typeof offset !== 'number' || Number.isNaN(offset)) {
    return FIRST_YEAR;
  }
  const index = (offset - MIN_OFFSET) / TIMELINE_CONFIG.IMAGE_SPACING;
  const clampedIndex = Math.max(0, Math.min(TIMELINE_CONFIG.YEAR_COUNT - 1, Math.round(index)));
  return FIRST_YEAR + clampedIndex;
}

/**
 * Convert year to timeline offset.
 *
 * @param {number} year - Year (2010-2019)
 * @returns {number} Timeline offset in world units
 */
export function yearToOffset(year) {
  if (year == null || typeof year !== 'number' || Number.isNaN(year)) {
    return MIN_OFFSET;
  }
  const index = Math.max(0, Math.min(TIMELINE_CONFIG.YEAR_COUNT - 1, Math.floor(year - FIRST_YEAR)));
  return TIMELINE_CONFIG.SNAP_POSITIONS[index];
}

/**
 * Get nearest snap index for given offset.
 *
 * @param {number} offset - Current timeline offset
 * @returns {number} Snap index (0-9)
 */
export function offsetToSnapIndex(offset) {
  if (offset == null || typeof offset !== 'number' || Number.isNaN(offset)) {
    return 0;
  }
  const positions = TIMELINE_CONFIG.SNAP_POSITIONS;
  let nearest = 0;
  let minDist = Math.abs(offset - positions[0]);
  for (let i = 1; i < positions.length; i++) {
    const dist = Math.abs(offset - positions[i]);
    if (dist < minDist) {
      minDist = dist;
      nearest = i;
    }
  }
  return nearest;
}

/**
 * Get offset for specific snap index.
 *
 * @param {number} index - Snap index (0-9)
 * @returns {number} Timeline offset
 */
export function snapIndexToOffset(index) {
  if (index == null || typeof index !== 'number' || Number.isNaN(index)) {
    return MIN_OFFSET;
  }
  const clamped = Math.max(0, Math.min(TIMELINE_CONFIG.YEAR_COUNT - 1, Math.floor(index)));
  return TIMELINE_CONFIG.SNAP_POSITIONS[clamped];
}

// -----------------------------------------------------------------------------
// 2. COORDINATE CALCULATIONS
// -----------------------------------------------------------------------------

/**
 * Calculate image world X position given index and offset.
 * Original X from IMAGE_SPACING; subtract offset to get world position.
 *
 * @param {number} imageIndex - Image index (0-N)
 * @param {number} offset - Current timeline offset
 * @returns {number} World space X coordinate
 */
export function getImageWorldX(imageIndex, offset) {
  const idx = imageIndex == null || Number.isNaN(Number(imageIndex)) ? 0 : Math.max(0, Math.floor(Number(imageIndex)));
  const off = offset == null || Number.isNaN(Number(offset)) ? 0 : Number(offset);
  const baseX = TIMELINE_CONFIG.FIRST_POSITION + idx * TIMELINE_CONFIG.IMAGE_SPACING;
  return baseX - off;
}

/**
 * Convert screen coordinates to normalized (0-1).
 * Y is flipped so that top of screen is 1.
 *
 * @param {number} clientX - Screen X
 * @param {number} clientY - Screen Y
 * @returns {{ x: number, y: number }} Normalized coords
 */
export function screenToNormalizedCoords(clientX, clientY) {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1;
  const h = typeof window !== 'undefined' ? window.innerHeight : 1;
  const x = (clientX == null || Number.isNaN(Number(clientX)) ? 0 : Number(clientX)) / w;
  const y = 1.0 - (clientY == null || Number.isNaN(Number(clientY)) ? 0 : Number(clientY)) / h;
  return { x, y };
}

// -----------------------------------------------------------------------------
// 3. PHYSICS HELPERS
// -----------------------------------------------------------------------------

/**
 * Apply frame-rate independent friction.
 * Returns multiplier to apply to velocity: newVelocity = velocity * applyFriction(...).
 *
 * @param {number} velocity - Current velocity
 * @param {number} friction - Friction coefficient (0-1)
 * @param {number} deltaTime - Time since last frame (seconds)
 * @returns {number} Friction factor to multiply velocity by
 */
export function applyFriction(velocity, friction, deltaTime) {
  const f = friction == null || Number.isNaN(Number(friction)) ? PHYSICS_CONFIG.DRAG_FRICTION : Number(friction);
  const dt = deltaTime == null || Number.isNaN(Number(deltaTime)) || Number(deltaTime) <= 0 ? 1 / 60 : Number(deltaTime);
  const clamped = Math.max(0, Math.min(1, f));
  return Math.pow(clamped, dt * 60);
}

/**
 * Calculate momentum displacement.
 *
 * @param {number} velocity - Current velocity
 * @param {number} deltaTime - Time since last frame (seconds)
 * @returns {number} Distance to move
 */
export function calculateMomentum(velocity, deltaTime) {
  const v = velocity == null || Number.isNaN(Number(velocity)) ? 0 : Number(velocity);
  const dt = deltaTime == null || Number.isNaN(Number(deltaTime)) ? 0 : Math.max(0, Number(deltaTime));
  return v * dt * 60;
}

/**
 * Check if offset is within snap threshold.
 *
 * @param {number} offset - Current offset
 * @param {number} snapOffset - Target snap offset
 * @param {number} [threshold] - Distance threshold (default from PHYSICS_CONFIG)
 * @returns {boolean} True if within threshold
 */
export function isWithinSnapThreshold(offset, snapOffset, threshold) {
  const o = offset == null || Number.isNaN(Number(offset)) ? 0 : Number(offset);
  const s = snapOffset == null || Number.isNaN(Number(snapOffset)) ? 0 : Number(snapOffset);
  const t = threshold != null && !Number.isNaN(Number(threshold)) ? Number(threshold) : PHYSICS_CONFIG.SNAP_THRESHOLD;
  return Math.abs(o - s) < t;
}

// -----------------------------------------------------------------------------
// 4. BOUNDS CHECKING
// -----------------------------------------------------------------------------

/**
 * Clamp offset to timeline bounds (first to last snap position).
 *
 * @param {number} offset - Current offset
 * @returns {number} Clamped offset
 */
export function clampOffset(offset) {
  if (offset == null || typeof offset !== 'number' || Number.isNaN(offset)) {
    return MIN_OFFSET;
  }
  return Math.max(MIN_OFFSET, Math.min(MAX_OFFSET, offset));
}

/**
 * Check if offset is within valid bounds.
 *
 * @param {number} offset - Offset to check
 * @returns {boolean} True if valid
 */
export function isOffsetInBounds(offset) {
  if (offset == null || typeof offset !== 'number' || Number.isNaN(offset)) {
    return false;
  }
  return offset >= MIN_OFFSET && offset <= MAX_OFFSET;
}

// -----------------------------------------------------------------------------
// 5. EASING FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Cubic ease in-out.
 * Standard formula: t < 0.5 ? 4*t³ : 1 - (-2*t+2)³/2
 *
 * @param {number} t - Progress (0-1)
 * @returns {number} Eased value (0-1)
 */
export function easeInOutCubic(t) {
  if (t == null || Number.isNaN(Number(t))) return 0;
  const x = Math.max(0, Math.min(1, Number(t)));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/**
 * Quadratic ease out.
 * Formula: t * (2 - t)
 *
 * @param {number} t - Progress (0-1)
 * @returns {number} Eased value (0-1)
 */
export function easeOutQuad(t) {
  if (t == null || Number.isNaN(Number(t))) return 0;
  const x = Math.max(0, Math.min(1, Number(t)));
  return x * (2 - x);
}

/**
 * Smoothstep interpolation.
 * Formula: t² * (3 - 2*t)
 *
 * @param {number} t - Progress (0-1)
 * @returns {number} Smoothed value (0-1)
 */
export function smoothstep(t) {
  if (t == null || Number.isNaN(Number(t))) return 0;
  const x = Math.max(0, Math.min(1, Number(t)));
  return x * x * (3 - 2 * x);
}
