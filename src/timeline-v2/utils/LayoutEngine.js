/**
 * LayoutEngine - Pure layout math for the Three.js timeline.
 *
 * Extracted from RenderSystem so camera/viewport calculations are isolated
 * from render-loop and interaction state.  RenderSystem keeps thin delegating
 * wrappers so no external call-sites needed to change.
 *
 * The engine resolves its camera lazily from window.app so it never needs a
 * direct constructor dependency on the camera object.
 *
 * @module timeline-v2/utils
 */

import * as THREE from 'three';
import {
  EFFECTS_CONFIG,
  SCENE_CONFIG,
  TIMELINE_LAYOUT_CONFIG,
  IMAGE_ASPECT_RATIO,
  SLOT_1_WIDTH_PX,
  SLOT_1_HEIGHT_PX,
  SLOT_1_TOP_PX,
  getTimelineLayoutSlot,
  getSceneMargins,
} from './TimelineConstants.js';

class LayoutEngine {
  // ─── Camera ──────────────────────────────────────────────────────────────────

  /** Lazily resolves the active camera from window.app. */
  getCamera() {
    return window.app?.camera || null;
  }

  // ─── Viewport geometry ───────────────────────────────────────────────────────

  /**
   * Visible world-space width at a given Z depth.
   * Anchored to the timeline baseline camera Z so scroll-dolly doesn't
   * inadvertently rescale every image on each frame.
   */
  getVisibleWidthAtDepth(zDepth) {
    const camera = this.getCamera();
    if (!camera) return 1;
    const viewportWidth  = Math.max(1, window.innerWidth  || 1);
    const viewportHeight = Math.max(1, window.innerHeight || 1);
    const fovRad = THREE.MathUtils.degToRad(camera.fov || 30);
    const layoutReferenceZ = SCENE_CONFIG?.timeline?.position?.z ?? 2.5;
    const distance = Math.max(0.001, Math.abs(layoutReferenceZ - zDepth));
    const visibleHeight = 2 * Math.tan(fovRad / 2) * distance;
    return visibleHeight * ((camera.aspect && Number.isFinite(camera.aspect))
      ? camera.aspect
      : (viewportWidth / viewportHeight));
  }

  /**
   * Convert a screen Y (px) to world Y for a specific Z depth.
   */
  pixelYToWorldY(pixelY, zDepth, camera) {
    const viewportHeight = Math.max(1, window.innerHeight || 1);
    const fovRad = THREE.MathUtils.degToRad(camera.fov || 30);
    const layoutReferenceZ = SCENE_CONFIG?.timeline?.position?.z ?? 2.5;
    const distance = Math.max(0.001, Math.abs(layoutReferenceZ - zDepth));
    const visibleHeight = 2 * Math.tan(fovRad / 2) * distance;
    const normalizedY = 0.5 - (pixelY / viewportHeight);
    return normalizedY * visibleHeight;
  }

  /**
   * Convert a screen X (px) to world X for a specific Z depth.
   */
  pixelXToWorldX(pixelX, zDepth) {
    const camera = this.getCamera();
    if (!camera) return 0;
    const viewportWidth = Math.max(1, window.innerWidth || 1);
    const visibleWidth  = this.getVisibleWidthAtDepth(zDepth);
    const normalizedX   = (pixelX / viewportWidth) - 0.5;
    return normalizedX * visibleWidth;
  }

  // ─── Slot widths ─────────────────────────────────────────────────────────────

  getSlotWidthPercentage(slotIndex) {
    const percentages = TIMELINE_LAYOUT_CONFIG.IMAGE_WIDTH_PERCENTAGES || [0.3, 0.2, 0.15];
    return percentages[slotIndex] ?? percentages[0] ?? 0.3;
  }

  getConfiguredSlotWidthsPx() {
    const configuredWidths = TIMELINE_LAYOUT_CONFIG.IMAGE_WIDTHS_PX;
    if (!Array.isArray(configuredWidths) || configuredWidths.length < 3) return null;
    if (!configuredWidths.every(v => Number.isFinite(v) && v > 0)) return null;
    return configuredWidths;
  }

  getBaseSlotWidthPx(slotIndex) {
    const safeIndex = Math.abs(slotIndex) % 3;
    if (safeIndex === 1 && SLOT_1_WIDTH_PX) return SLOT_1_WIDTH_PX;

    const configuredWidths = this.getConfiguredSlotWidthsPx();
    if (configuredWidths) return configuredWidths[safeIndex];

    const viewportWidth   = Math.max(1, window.innerWidth || 1);
    const leftPaddingPx   = TIMELINE_LAYOUT_CONFIG.FIRST_IMAGE_LEFT_PADDING_PX ?? 50;
    const columnGapPx     = TIMELINE_LAYOUT_CONFIG.COLUMN_GAP_PX ?? 12;
    const weights = [
      this.getSlotWidthPercentage(0),
      this.getSlotWidthPercentage(1),
      this.getSlotWidthPercentage(2),
    ];
    const weightSum   = Math.max(0.001, weights[0] + weights[1] + weights[2]);
    const usableWidth = Math.max(1, viewportWidth - leftPaddingPx - (columnGapPx * 2));
    return usableWidth * (weights[safeIndex] ?? weights[0]) / weightSum;
  }

  getViewportResponsiveScaleFactor() {
    const viewportWidth  = Math.max(1, window.innerWidth  || 1);
    const viewportHeight = Math.max(1, window.innerHeight || 1);
    const leftPaddingPx  = TIMELINE_LAYOUT_CONFIG.FIRST_IMAGE_LEFT_PADDING_PX ?? 50;
    const columnGapPx    = TIMELINE_LAYOUT_CONFIG.COLUMN_GAP_PX ?? 12;
    const margins        = getSceneMargins();

    const baseWidths = [
      this.getBaseSlotWidthPx(0),
      this.getBaseSlotWidthPx(1),
      this.getBaseSlotWidthPx(2),
    ];
    const clusterWidth = baseWidths[0] + baseWidths[1] + baseWidths[2] + (columnGapPx * 2);
    const usableWidth  = Math.max(1, viewportWidth - leftPaddingPx - (columnGapPx * 2));

    let widthScale = 1;
    if (this.getConfiguredSlotWidthsPx()) {
      widthScale = Math.min(1, usableWidth / Math.max(1, clusterWidth));
    }

    const baseFirstHeight  = baseWidths[0] * IMAGE_ASPECT_RATIO;
    const baseSecondHeight = SLOT_1_HEIGHT_PX || (baseWidths[1] * IMAGE_ASPECT_RATIO);

    const firstTopRef  = TIMELINE_LAYOUT_CONFIG.FIRST_IMAGE_TOP_PX ?? 76;
    const slot1Offset  = SLOT_1_TOP_PX != null
      ? (SLOT_1_TOP_PX - firstTopRef)
      : baseFirstHeight;
    const maxColumnStackHeight = Math.max(baseFirstHeight, slot1Offset + baseSecondHeight);

    const availableHeightForStack = Math.max(
      1,
      viewportHeight - margins.top - margins.bottom
    );
    const heightScale = Math.min(1, availableHeightForStack / Math.max(1, maxColumnStackHeight));

    return Math.max(0.35, Math.min(widthScale, heightScale));
  }

  getSlotWidthPx(slotIndex) {
    return this.getBaseSlotWidthPx(slotIndex) * this.getViewportResponsiveScaleFactor();
  }

  // ─── Column metrics ───────────────────────────────────────────────────────────

  getColumnMetrics() {
    const widths       = [this.getSlotWidthPx(0), this.getSlotWidthPx(1), this.getSlotWidthPx(2)];
    const leftPaddingPx = TIMELINE_LAYOUT_CONFIG.FIRST_IMAGE_LEFT_PADDING_PX ?? 50;
    const columnGapPx  = TIMELINE_LAYOUT_CONFIG.COLUMN_GAP_PX ?? 12;
    const centers = [
      leftPaddingPx + (widths[0] / 2),
      leftPaddingPx + widths[0] + columnGapPx + (widths[1] / 2),
      leftPaddingPx + widths[0] + columnGapPx + widths[1] + columnGapPx + (widths[2] / 2),
    ];
    return { centers, clusterWidth: widths[0] + widths[1] + widths[2] + (columnGapPx * 2) };
  }

  getDiscreteSlotCenterPx(relativeIndex) {
    const safeIndex = Number.isFinite(relativeIndex) ? Math.floor(relativeIndex) : 0;
    const { centers, clusterWidth } = this.getColumnMetrics();
    const slotIndex    = ((safeIndex % 3) + 3) % 3;
    const clusterIndex = Math.floor(safeIndex / 3);
    return centers[slotIndex] + (clusterIndex * clusterWidth);
  }

  getInterpolatedSlotCenterPx(relativeIndex) {
    const safeIndex  = Number.isFinite(relativeIndex) ? relativeIndex : 0;
    const lower      = Math.floor(safeIndex);
    const upper      = lower + 1;
    const progress   = safeIndex - lower;
    return THREE.MathUtils.lerp(
      this.getDiscreteSlotCenterPx(lower),
      this.getDiscreteSlotCenterPx(upper),
      progress
    );
  }

  // ─── Scale helpers ────────────────────────────────────────────────────────────

  /**
   * Scale needed to make a plane fill its designated slot width exactly.
   */
  getSlotScaleForIndex(index, plane) {
    const slot          = getTimelineLayoutSlot(index);
    const slotIndex     = Math.abs(index) % 3;
    const geometryWidth = plane?.geometry?.parameters?.width ?? 2.5;
    const visibleWidth  = this.getVisibleWidthAtDepth(slot.z);
    const viewportWidth = Math.max(1, window.innerWidth || 1);
    const unitsPerPixel = visibleWidth / viewportWidth;
    const targetWorldWidth = this.getSlotWidthPx(slotIndex) * unitsPerPixel;
    return Math.max(0.001, targetWorldWidth / Math.max(0.001, geometryWidth));
  }

  /**
   * Distance-based scale falloff from the timeline centre.
   */
  getDistanceScaleMultiplier(worldX) {
    const minScale       = EFFECTS_CONFIG.TIMELINE_DISTANCE_MIN_SCALE ?? EFFECTS_CONFIG.NORMAL_SCALE ?? 0.75;
    const falloffDistance = EFFECTS_CONFIG.TIMELINE_DISTANCE_SCALE_RANGE ?? 6.0;
    const safeRange      = Math.max(0.001, falloffDistance);
    const distance       = Math.abs((Number.isFinite(worldX) ? worldX : 0) - 0);
    const t              = Math.min(1, distance / safeRange);
    const eased          = t * t * (3 - 2 * t);
    return 1 - eased * (1 - minScale);
  }

  /**
   * Additional decay for images beyond the first cluster.
   */
  getSequenceScaleMultiplier(relativeIndex) {
    const safeIndex     = Math.abs(Number.isFinite(relativeIndex) ? relativeIndex : 0);
    const overflowStart = EFFECTS_CONFIG.TIMELINE_OVERFLOW_DECAY_START_INDEX ?? 2;
    const extraSteps    = Math.max(0, safeIndex - overflowStart);
    if (extraSteps <= 0) return 1;

    const perStepDecay       = EFFECTS_CONFIG.TIMELINE_SEQUENCE_DECAY_PER_STEP ?? 0.94;
    const minSequenceScale   = EFFECTS_CONFIG.TIMELINE_SEQUENCE_MIN_SCALE ?? 0.65;
    const baseOverflowScale  = Math.max(minSequenceScale, Math.pow(perStepDecay, extraSteps));
    const focusBlendRange    = Math.max(0.001, EFFECTS_CONFIG.TIMELINE_OVERFLOW_FOCUS_BLEND_RANGE ?? 1.2);
    const focusBlendRaw      = ((overflowStart + focusBlendRange) - safeIndex) / focusBlendRange;
    const focusBlend         = Math.min(1, Math.max(0, focusBlendRaw));
    const easedBlend         = focusBlend * focusBlend * (3 - (2 * focusBlend));
    return baseOverflowScale + ((1 - baseOverflowScale) * easedBlend);
  }

  getSlotYScaleCorrection(slotIndex) {
    if (slotIndex !== 1 || !SLOT_1_WIDTH_PX || !SLOT_1_HEIGHT_PX) return 1.0;
    return (SLOT_1_HEIGHT_PX / SLOT_1_WIDTH_PX) / IMAGE_ASPECT_RATIO;
  }

  getSlotIndexFromRelativeIndex(relativeIndex) {
    const discreteIndex = Number.isFinite(relativeIndex) ? Math.round(relativeIndex) : 0;
    return ((discreteIndex % 3) + 3) % 3;
  }

  /**
   * Given a flat plane array and an index, return the layout-slot row index
   * (0 = upper row, 1 = lower row, 2 = third row).
   */
  getAlternatingRowSlotIndex(index, slotWorldY = []) {
    const fallbackTopIndex    = 0;
    const fallbackBottomIndex = 1;
    const rowValues = [0, 1, 2]
      .map(slotIndex => ({ slotIndex, y: slotWorldY?.[slotIndex] }))
      .filter(entry => Number.isFinite(entry.y));

    if (rowValues.length < 2) {
      return index % 2 === 0 ? fallbackTopIndex : fallbackBottomIndex;
    }
    const topIndex    = rowValues.reduce((b, c) => (c.y > b.y ? c : b)).slotIndex;
    const bottomIndex = rowValues.reduce((b, c) => (c.y < b.y ? c : b)).slotIndex;
    return index % 2 === 0 ? topIndex : bottomIndex;
  }

  // ─── Layout slot world positions ─────────────────────────────────────────────

  /**
   * Compute world-space Y centre for each of the three layout rows so:
   *   slot 0 = upper image, top at ~80 px from viewport top
   *   slot 1 = lower image, bottom-aligned inside nav clearance
   *   slot 2 = bottom-aligned with slot 0 (third column)
   */
  getLayoutSlotWorldY(allPlanes) {
    const camera = this.getCamera();
    if (!camera || !Array.isArray(allPlanes) || allPlanes.length === 0) return [0, 0, 0];

    const viewportHeight    = Math.max(1, window.innerHeight || 1);
    const margins           = getSceneMargins();
    const responsiveScale   = this.getViewportResponsiveScaleFactor();

    const firstSlot  = getTimelineLayoutSlot(0);
    const secondSlot = getTimelineLayoutSlot(1);
    const thirdSlot  = getTimelineLayoutSlot(2);

    const firstHeightPx  = this.getSlotWidthPx(0) * IMAGE_ASPECT_RATIO;
    const secondHeightPx = SLOT_1_HEIGHT_PX
      ? SLOT_1_HEIGHT_PX * responsiveScale
      : (this.getSlotWidthPx(1) * IMAGE_ASPECT_RATIO);
    const thirdHeightPx  = this.getSlotWidthPx(2) * IMAGE_ASPECT_RATIO;

    const firstTopPx         = margins.top;
    const maxAllowedBottomPx = viewportHeight - margins.bottom;

    const firstBottomPx  = Math.min(firstTopPx + firstHeightPx, maxAllowedBottomPx);
    const firstCenterPx  = firstBottomPx - (firstHeightPx / 2);

    const firstTopRef    = TIMELINE_LAYOUT_CONFIG.FIRST_IMAGE_TOP_PX ?? 76;
    const slot1BaseOffset = SLOT_1_TOP_PX != null
      ? (SLOT_1_TOP_PX - firstTopRef)
      : (firstHeightPx / responsiveScale);
    const secondTopPx    = firstTopPx + (slot1BaseOffset * responsiveScale);

    const metaSpacePx    = (TIMELINE_LAYOUT_CONFIG.META_OFFSET_PX ?? 14) +
                           (TIMELINE_LAYOUT_CONFIG.META_SAFE_SPACE_PX ?? 100);
    const secondMaxBottomPx = Math.max(secondTopPx, maxAllowedBottomPx - metaSpacePx);
    const secondBottomPx = Math.min(secondTopPx + secondHeightPx, secondMaxBottomPx);
    const upshift        = TIMELINE_LAYOUT_CONFIG.BOTTOM_SLOT_UPSHIFT_PX ?? 20;
    const secondCenterPx = secondBottomPx - (secondHeightPx / 2) - upshift;

    const thirdCenterPx  = firstBottomPx - (thirdHeightPx / 2) - upshift;

    return [
      this.pixelYToWorldY(firstCenterPx,  firstSlot.z,  camera),
      this.pixelYToWorldY(secondCenterPx, secondSlot.z, camera),
      this.pixelYToWorldY(thirdCenterPx,  thirdSlot.z,  camera),
    ];
  }

  /**
   * World-space X shift so the first (focused) image starts at the configured
   * left viewport padding.
   */
  getViewportAnchorShift(allPlanes) {
    const camera = this.getCamera();
    if (!camera || !Array.isArray(allPlanes) || allPlanes.length === 0) return 0;

    const firstPlane       = allPlanes[0];
    const viewportWidth    = Math.max(1, window.innerWidth || 1);
    const slotZ            = getTimelineLayoutSlot(0).z;
    const visibleWidth     = this.getVisibleWidthAtDepth(slotZ);
    const unitsPerPixel    = visibleWidth / viewportWidth;
    const configuredPaddingPx = TIMELINE_LAYOUT_CONFIG.FIRST_IMAGE_LEFT_PADDING_PX ?? 50;
    const firstScale       = this.getSlotScaleForIndex(0, firstPlane);
    const geometryWidth    = firstPlane?.geometry?.parameters?.width ?? 2.5;
    const planeWidthWorld  = geometryWidth * firstScale;

    return (-visibleWidth / 2) + (configuredPaddingPx * unitsPerPixel) + (planeWidthWorld / 2);
  }
}

export { LayoutEngine };
