/**
 * Timeline layout constants – align with Figma (Fortec).
 * Plane size and margin set per design: larger images, ~150px gap between them.
 * All timeline plane positions are derived from these.
 */
/** Width of each timeline image plane in world units (larger by default per Figma). */
export const TIMELINE_PLANE_WIDTH = 2.5;
/** Gap between adjacent image planes (~150px at default camera). */
export const TIMELINE_PLANE_MARGIN = 0.6;
/** Center-to-center distance = plane width + margin. */
export const TIMELINE_PLANE_SPACING = TIMELINE_PLANE_WIDTH + TIMELINE_PLANE_MARGIN;
export const TIMELINE_FIRST_POSITION = -5.25;
export const TIMELINE_YEAR_COUNT = 10; // 2010–2019

/**
 * Get the world X position for a timeline image by index (0–9).
 * @param {number} index - Image index 0..TIMELINE_YEAR_COUNT-1
 * @returns {number}
 */
export function getTimelinePlaneX(index) {
    return TIMELINE_FIRST_POSITION + index * TIMELINE_PLANE_SPACING;
}

/**
 * Get the world X position for an additional timeline plane (indices 8–9 in TimelineScene).
 * @param {number} additionalIndex - 0 or 1 for the two extra planes
 * @returns {number}
 */
export function getTimelineAdditionalPlaneX(additionalIndex) {
    return TIMELINE_FIRST_POSITION + (additionalIndex + 8) * TIMELINE_PLANE_SPACING;
}

/**
 * All snap positions (one per year).
 * @returns {number[]}
 */
export function getTimelineSnapPositions() {
    const positions = [];
    for (let i = 0; i < TIMELINE_YEAR_COUNT; i++) {
        positions.push(getTimelinePlaneX(i));
    }
    return positions;
}

/**
 * Staggered layout slots used to create the collage-style timeline composition.
 * X remains controlled by timeline spacing; slots only affect Y/Z.
 */
const TIMELINE_LAYOUT_SLOTS = Object.freeze([
    Object.freeze({ y: -0.08, z: 0.12, scaleMultiplier: 1.0 }),
    Object.freeze({ y: 0.92, z: -0.22, scaleMultiplier: 435 / 490 }),
    Object.freeze({ y: -0.62, z: -0.08, scaleMultiplier: 348 / 490 })
]);

/**
 * Returns layered Y/Z placement for the provided timeline index.
 * @param {number} index
 * @returns {{ y: number, z: number, scaleMultiplier: number }}
 */
export function getTimelineLayoutSlot(index) {
    const safeIndex = Number.isFinite(index) ? Math.abs(index) : 0;
    return TIMELINE_LAYOUT_SLOTS[safeIndex % TIMELINE_LAYOUT_SLOTS.length];
}

export const TIMELINE_X_RANGE = (TIMELINE_YEAR_COUNT - 1) * TIMELINE_PLANE_SPACING;
export const TIMELINE_FIRST_IMAGE_LEFT_PADDING_PX = 50;
export const TIMELINE_FIRST_IMAGE_TOP_PX = 76;
export const TIMELINE_COLUMN_GAP_PX = 0;
/** Upward shift (px) for slot-1 and slot-2 images so metadata text below them does not overlap. */
export const TIMELINE_BOTTOM_SLOT_UPSHIFT_PX = 20;
// Layout follows the attached diagram columns:
// col1: left padding -> divider1, col2: divider1 -> divider2, col3: divider2 -> right edge
export const TIMELINE_IMAGE_WIDTH_PERCENTAGES = Object.freeze([0.38, 0.345, 0.235]);
export const TIMELINE_IMAGE_WIDTHS_PX = Object.freeze([490, 435, 348]);
