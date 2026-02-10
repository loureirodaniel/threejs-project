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

export const TIMELINE_X_RANGE = (TIMELINE_YEAR_COUNT - 1) * TIMELINE_PLANE_SPACING;
