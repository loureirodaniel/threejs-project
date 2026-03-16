/**
 * AnimationChoreographer - GSAP-based image gathering animation
 * Handles smooth staggered motion with acceleration/deceleration
 */

import * as THREE from 'three';
import { gsap } from 'gsap';
import { EFFECTS_CONFIG, TIMELINE_CONFIG, TIMELINE_LAYOUT_CONFIG, SCENE_CONFIG, IMAGE_ASPECT_RATIO, getTimelineLayoutSlot } from '../utils/TimelineConstants.js';

class AnimationChoreographer {
  constructor(state, eventBus, camera, scene) {
    this.state = state;
    this.eventBus = eventBus;
    this.camera = camera;
    this.scene = scene;
    
    this.gatheringTimeline = null;
    this.gatherRetryCount = 0;
    this.gatherSnapshot = null;
    this.unsubscribeFns = [];
    
    this.init();
  }
  
  init() {
    this.unsubscribeFns.push(
      this.eventBus.on('images:gather:start', this.startGatheringAnimation.bind(this))
    );
    console.log('✅ AnimationChoreographer initialized');
  }
  
  /**
   * Calculate timeline spacing dynamically
   */
  calculateSpacing() {
    const viewportWidth = typeof window !== 'undefined' ? Math.max(1, window.innerWidth || 1) : 1920;
    const slot0 = getTimelineLayoutSlot(0);
    const slot1 = getTimelineLayoutSlot(1);
    const slot2 = getTimelineLayoutSlot(2);

    const visibleWidth = this.getVisibleWidthAtDepth(slot0.z);
    const unitsPerPixel = visibleWidth / viewportWidth;
    const gapPx = TIMELINE_LAYOUT_CONFIG.COLUMN_GAP_PX ?? 12;
    const gapWorld = gapPx * unitsPerPixel;

    const firstWidthWorld = this.getSlotWidthPx(0) * unitsPerPixel;
    const secondWidthWorld = this.getSlotWidthPx(1) * unitsPerPixel;
    const thirdWidthWorld = this.getSlotWidthPx(2) * unitsPerPixel;

    // Adjacent center distances required for exactly 12px edge-to-edge gaps.
    const distance01 = ((firstWidthWorld + secondWidthWorld) / 2) + gapWorld;
    const distance12 = ((secondWidthWorld + thirdWidthWorld) / 2) + gapWorld;

    // Single spacing value used by timeline physics; choose midpoint for stable rhythm.
    const spacingUnits = (distance01 + distance12) / 2;
    
    console.log(`📏 Spacing Calculation:
      Viewport Width: ${viewportWidth}px
      Gap: ${gapPx}px
      Slot Widths (world): ${firstWidthWorld.toFixed(3)}, ${secondWidthWorld.toFixed(3)}, ${thirdWidthWorld.toFixed(3)}
      Distances (world): d01=${distance01.toFixed(3)}, d12=${distance12.toFixed(3)}
      Chosen spacing: ${spacingUnits.toFixed(3)} units`);

    // Store calculated spacing in state for timeline navigation
    this.state.setState({
      calculatedSpacing: spacingUnits
    });
    
    return spacingUnits;
  }
  
  /**
   * Compute world-space X shift so the first focused image lands with
   * a fixed left viewport padding.
   * @param {Array} planes
   * @returns {number}
   */
  getVisibleWidthAtDepth(zDepth) {
    if (!this.camera) return 1;
    const viewportWidth = Math.max(1, window.innerWidth || 1);
    const viewportHeight = Math.max(1, window.innerHeight || 1);
    const fovRad = ((this.camera.fov || 30) * Math.PI) / 180;
    // Keep layout sizing anchored to the timeline baseline camera Z so
    // gather animation sizes exactly match runtime timeline sizes.
    const layoutReferenceZ = SCENE_CONFIG?.timeline?.position?.z ?? 2.5;
    const distance = Math.max(0.001, Math.abs(layoutReferenceZ - zDepth));
    const visibleHeight = 2 * Math.tan(fovRad / 2) * distance;
    return visibleHeight * ((this.camera.aspect && Number.isFinite(this.camera.aspect)) ? this.camera.aspect : (viewportWidth / viewportHeight));
  }

  getSlotWidthPercentage(slotIndex) {
    const percentages = TIMELINE_LAYOUT_CONFIG.IMAGE_WIDTH_PERCENTAGES || [0.3, 0.2, 0.15];
    return percentages[slotIndex] ?? percentages[0] ?? 0.3;
  }

  getConfiguredSlotWidthsPx() {
    const configuredWidths = TIMELINE_LAYOUT_CONFIG.IMAGE_WIDTHS_PX;
    if (!Array.isArray(configuredWidths) || configuredWidths.length < 3) return null;
    if (!configuredWidths.every((value) => Number.isFinite(value) && value > 0)) return null;
    return configuredWidths;
  }

  getBaseSlotWidthPx(slotIndex) {
    const safeIndex = Math.abs(slotIndex) % 3;
    const configuredWidths = this.getConfiguredSlotWidthsPx();
    if (configuredWidths) {
      return configuredWidths[safeIndex];
    }

    const viewportWidth = Math.max(1, window.innerWidth || 1);
    const leftPaddingPx = TIMELINE_LAYOUT_CONFIG.FIRST_IMAGE_LEFT_PADDING_PX ?? 50;
    const columnGapPx = TIMELINE_LAYOUT_CONFIG.COLUMN_GAP_PX ?? 12;
    const weights = [
      this.getSlotWidthPercentage(0),
      this.getSlotWidthPercentage(1),
      this.getSlotWidthPercentage(2)
    ];
    const weightSum = Math.max(0.001, weights[0] + weights[1] + weights[2]);
    const usableWidth = Math.max(1, viewportWidth - leftPaddingPx - (columnGapPx * 2));
    return usableWidth * (weights[safeIndex] ?? weights[0]) / weightSum;
  }

  getViewportResponsiveScaleFactor() {
    const viewportWidth = Math.max(1, window.innerWidth || 1);
    const viewportHeight = Math.max(1, window.innerHeight || 1);
    const leftPaddingPx = TIMELINE_LAYOUT_CONFIG.FIRST_IMAGE_LEFT_PADDING_PX ?? 50;
    const columnGapPx = TIMELINE_LAYOUT_CONFIG.COLUMN_GAP_PX ?? 12;
    const firstTopPx = TIMELINE_LAYOUT_CONFIG.FIRST_IMAGE_TOP_PX ?? 76;
    const metaSafeSpacePx = TIMELINE_LAYOUT_CONFIG.META_SAFE_SPACE_PX ?? 170;
    const metaOffsetPx = TIMELINE_LAYOUT_CONFIG.META_OFFSET_PX ?? 14;

    const baseWidths = [this.getBaseSlotWidthPx(0), this.getBaseSlotWidthPx(1), this.getBaseSlotWidthPx(2)];
    const clusterWidth = baseWidths[0] + baseWidths[1] + baseWidths[2] + (columnGapPx * 2);
    const usableWidth = Math.max(1, viewportWidth - leftPaddingPx - (columnGapPx * 2));

    let widthScale = 1;
    if (this.getConfiguredSlotWidthsPx()) {
      widthScale = Math.min(1, usableWidth / Math.max(1, clusterWidth));
    }

    const baseFirstHeight = baseWidths[0] * IMAGE_ASPECT_RATIO;
    const maxColumnStackHeight = baseFirstHeight;
    const availableHeightForStack = Math.max(
      1,
      viewportHeight - firstTopPx - metaOffsetPx - metaSafeSpacePx
    );
    const heightScale = Math.min(1, availableHeightForStack / Math.max(1, maxColumnStackHeight));

    return Math.max(0.35, Math.min(widthScale, heightScale));
  }

  getSlotWidthPx(slotIndex) {
    const responsiveScale = this.getViewportResponsiveScaleFactor();
    return this.getBaseSlotWidthPx(slotIndex) * responsiveScale;
  }

  getColumnMetrics() {
    const widths = [this.getSlotWidthPx(0), this.getSlotWidthPx(1), this.getSlotWidthPx(2)];
    const leftPaddingPx = TIMELINE_LAYOUT_CONFIG.FIRST_IMAGE_LEFT_PADDING_PX ?? 50;
    const columnGapPx = TIMELINE_LAYOUT_CONFIG.COLUMN_GAP_PX ?? 12;
    const centers = [
      leftPaddingPx + (widths[0] / 2),
      leftPaddingPx + widths[0] + columnGapPx + (widths[1] / 2),
      leftPaddingPx + widths[0] + columnGapPx + widths[1] + columnGapPx + (widths[2] / 2)
    ];

    return {
      centers,
      clusterWidth: widths[0] + widths[1] + widths[2] + (columnGapPx * 2)
    };
  }

  getDiscreteSlotCenterPx(relativeIndex) {
    const safeIndex = Number.isFinite(relativeIndex) ? Math.floor(relativeIndex) : 0;
    const { centers, clusterWidth } = this.getColumnMetrics();
    const slotIndex = ((safeIndex % 3) + 3) % 3;
    const clusterIndex = Math.floor(safeIndex / 3);
    return centers[slotIndex] + (clusterIndex * clusterWidth);
  }

  getInterpolatedSlotCenterPx(relativeIndex) {
    const safeIndex = Number.isFinite(relativeIndex) ? relativeIndex : 0;
    const lower = Math.floor(safeIndex);
    const upper = lower + 1;
    const progress = safeIndex - lower;
    const lowerCenter = this.getDiscreteSlotCenterPx(lower);
    const upperCenter = this.getDiscreteSlotCenterPx(upper);
    return THREE.MathUtils.lerp(lowerCenter, upperCenter, progress);
  }

  getSlotIndexFromRelativeIndex(relativeIndex) {
    const discreteIndex = Number.isFinite(relativeIndex) ? Math.round(relativeIndex) : 0;
    return ((discreteIndex % 3) + 3) % 3;
  }

  pixelXToWorldX(pixelX, zDepth) {
    if (!this.camera) return 0;
    const viewportWidth = Math.max(1, window.innerWidth || 1);
    const visibleWidth = this.getVisibleWidthAtDepth(zDepth);
    const normalizedX = (pixelX / viewportWidth) - 0.5;
    return normalizedX * visibleWidth;
  }

  getSlotScale(slotIndex, planeWidth = 2.5, slotZ = 0) {
    const visibleWidth = this.getVisibleWidthAtDepth(slotZ);
    const viewportWidth = Math.max(1, window.innerWidth || 1);
    const unitsPerPixel = visibleWidth / viewportWidth;
    const targetWorldWidth = this.getSlotWidthPx(slotIndex) * unitsPerPixel;
    return Math.max(0.001, targetWorldWidth / Math.max(0.001, planeWidth));
  }

  getDistanceScaleMultiplier(worldX) {
    const minScale = EFFECTS_CONFIG.TIMELINE_DISTANCE_MIN_SCALE ?? EFFECTS_CONFIG.NORMAL_SCALE ?? 0.75;
    const falloffDistance = EFFECTS_CONFIG.TIMELINE_DISTANCE_SCALE_RANGE ?? 6.0;
    const safeRange = Math.max(0.001, falloffDistance);
    const distance = Math.abs((Number.isFinite(worldX) ? worldX : 0) - 0);
    const t = Math.min(1, distance / safeRange);
    const eased = t * t * (3 - 2 * t);
    return 1 - eased * (1 - minScale);
  }

  getSequenceScaleMultiplier(relativeIndex) {
    const safeIndex = Math.abs(Number.isFinite(relativeIndex) ? relativeIndex : 0);
    const overflowStart = EFFECTS_CONFIG.TIMELINE_OVERFLOW_DECAY_START_INDEX ?? 2;
    const extraSteps = Math.max(0, safeIndex - overflowStart);
    if (extraSteps <= 0) return 1;

    const perStepDecay = EFFECTS_CONFIG.TIMELINE_SEQUENCE_DECAY_PER_STEP ?? 0.94;
    const minSequenceScale = EFFECTS_CONFIG.TIMELINE_SEQUENCE_MIN_SCALE ?? 0.65;
    const baseOverflowScale = Math.max(minSequenceScale, Math.pow(perStepDecay, extraSteps));

    const focusBlendRange = Math.max(0.001, EFFECTS_CONFIG.TIMELINE_OVERFLOW_FOCUS_BLEND_RANGE ?? 1.2);
    const focusBlendRaw = ((overflowStart + focusBlendRange) - safeIndex) / focusBlendRange;
    const focusBlend = Math.min(1, Math.max(0, focusBlendRaw));
    const easedBlend = focusBlend * focusBlend * (3 - (2 * focusBlend));

    return baseOverflowScale + ((1 - baseOverflowScale) * easedBlend);
  }

  getViewportAnchorShift(planes) {
    if (!this.camera || !Array.isArray(planes) || planes.length === 0) return 0;

    const firstPlane = planes[0];
    const viewportWidth = Math.max(1, window.innerWidth || 1);
    const slotZ = getTimelineLayoutSlot(0).z;
    const visibleWidth = this.getVisibleWidthAtDepth(slotZ);
    const unitsPerPixel = visibleWidth / viewportWidth;

    const configuredPaddingPx = TIMELINE_LAYOUT_CONFIG.FIRST_IMAGE_LEFT_PADDING_PX ?? 50;
    const baseScale = this.getSlotScale(0, firstPlane?.geometry?.parameters?.width ?? 2.5, slotZ);
    const geometryWidth = firstPlane?.geometry?.parameters?.width ?? 2.5;
    const planeWidthWorld = geometryWidth * baseScale;

    return (-visibleWidth / 2) + (configuredPaddingPx * unitsPerPixel) + (planeWidthWorld / 2);
  }

  pixelYToWorldY(pixelY, zDepth) {
    if (!this.camera) return 0;
    const viewportHeight = Math.max(1, window.innerHeight || 1);
    const fovRad = ((this.camera.fov || 30) * Math.PI) / 180;
    const layoutReferenceZ = SCENE_CONFIG?.timeline?.position?.z ?? 2.5;
    const distance = Math.max(0.001, Math.abs(layoutReferenceZ - zDepth));
    const visibleHeight = 2 * Math.tan(fovRad / 2) * distance;
    return (0.5 - (pixelY / viewportHeight)) * visibleHeight;
  }

  getLayoutSlotWorldY(planes) {
    if (!this.camera || !Array.isArray(planes) || planes.length === 0) return [0, 0, 0];

    const firstSlot = getTimelineLayoutSlot(0);
    const secondSlot = getTimelineLayoutSlot(1);
    const thirdSlot = getTimelineLayoutSlot(2);
    const firstHeightPx = this.getSlotWidthPx(0) * IMAGE_ASPECT_RATIO;
    const secondHeightPx = this.getSlotWidthPx(1) * IMAGE_ASPECT_RATIO;
    const thirdHeightPx = this.getSlotWidthPx(2) * IMAGE_ASPECT_RATIO;

    const firstTopPx = TIMELINE_LAYOUT_CONFIG.FIRST_IMAGE_TOP_PX ?? 80;
    const firstBottomPx = firstTopPx + firstHeightPx;
    // Diagram layout:
    // - image2 top aligned to image1 bottom
    // - image3 bottom aligned to image1 bottom
    const secondCenterPx = firstBottomPx + (secondHeightPx / 2);
    const thirdCenterPx = firstBottomPx - (thirdHeightPx / 2);
    const firstCenterPx = firstTopPx + (firstHeightPx / 2);

    return [
      this.pixelYToWorldY(firstCenterPx, firstSlot.z),
      this.pixelYToWorldY(secondCenterPx, secondSlot.z),
      this.pixelYToWorldY(thirdCenterPx, thirdSlot.z)
    ];
  }

  /**
   * Match timeline row assignment used by RenderSystem:
   * even indices on top row, odd indices on bottom row.
   */
  getAlternatingRowSlotIndex(index, slotWorldY = []) {
    const fallbackTopIndex = 0;
    const fallbackBottomIndex = 1;
    const rowValues = [0, 1, 2]
      .map((slotIndex) => ({ slotIndex, y: slotWorldY?.[slotIndex] }))
      .filter((entry) => Number.isFinite(entry.y));

    if (rowValues.length < 2) {
      return index % 2 === 0 ? fallbackTopIndex : fallbackBottomIndex;
    }

    const topIndex = rowValues.reduce((best, current) => (current.y > best.y ? current : best)).slotIndex;
    const bottomIndex = rowValues.reduce((best, current) => (current.y < best.y ? current : best)).slotIndex;
    return index % 2 === 0 ? topIndex : bottomIndex;
  }

  /**
   * Start the gathering animation sequence
   */
  startGatheringAnimation() {
    console.log('🎬 AnimationChoreographer: Starting gathering sequence...');
    
    // Get image planes (robustly handles either getPlanes() API or direct array)
    const imagePlanes = window.app?.imagePlanes;
    const planes = (
      imagePlanes?.getPlanes?.()
      || imagePlanes?.planes
      || []
    );

    if (!planes || planes.length === 0) {
      // If planes are not ready yet, retry a few times before giving up.
      if (this.gatherRetryCount < 10) {
        this.gatherRetryCount += 1;
        console.warn(`⚠️ No planes for gather animation, retry ${this.gatherRetryCount}/10`);
        setTimeout(() => this.startGatheringAnimation(), 100);
        return;
      }

      console.warn('⚠️ No planes available for animation after retries');
      this.gatherRetryCount = 0;
      this.completeGathering();
      return;
    }
    this.gatherRetryCount = 0;
    
    // Kill any existing animation
    if (this.gatheringTimeline) {
      this.gatheringTimeline.kill();
    }
    
    // Calculate spacing
    const spacing = this.calculateSpacing();
    const firstPosition = TIMELINE_CONFIG.FIRST_POSITION || -4.5;
    const offset = this.state.get('timelineOffset') || firstPosition;
    const slotWorldY = this.getLayoutSlotWorldY(planes);
    const progress = (offset - firstPosition) / Math.max(0.0001, spacing);
    this.gatherSnapshot = { offset, spacing, progress };
    
    // Transition timing is intentionally longer so users can clearly perceive
    // the initial scene -> timeline handoff choreography.
    const imageMoveDuration = 1.7;
    const imageStagger = 0.05;
    const pullbackDuration = 0.95;
    const dollyDuration = 1.65;
    const fourthImageSettleAt = imageMoveDuration + (Math.min(3, planes.length - 1) * imageStagger);
    const dollyStartAt = Math.max(pullbackDuration, fourthImageSettleAt + 0.12);

    // Create master timeline
    this.gatheringTimeline = gsap.timeline({
      onComplete: () => {
        this.applyFinalTimelineLayout(planes, progress);
        console.log('✅ Gathering sequence complete');
        console.log(`📷 Camera z after gathering: ${this.camera.position.z.toFixed(2)}`);
        this.completeGathering({ landingOffset: offset, spacing });
      }
    });
    
    // === ANIMATE IMAGES ===
    planes.forEach((plane, index) => {
      const relativeIndex = index - progress;
      const slotIndex = this.getSlotIndexFromRelativeIndex(relativeIndex);
      const slot = getTimelineLayoutSlot(slotIndex);
      const rowSlotIndex = this.getAlternatingRowSlotIndex(index, slotWorldY);
      const targetCenterPx = this.getInterpolatedSlotCenterPx(relativeIndex);
      const targetX = this.pixelXToWorldX(targetCenterPx, slot.z);
      const baseScale = this.getSlotScale(slotIndex, plane?.geometry?.parameters?.width ?? 2.5, slot.z);
      // Keep contiguous columns during gather animation as well.
      const targetScale = baseScale;
      // Ensure first four images settle early and consistently.
      const staggerIndex = Math.min(index, 2);
      const staggerDelay = staggerIndex * imageStagger;
      
      console.log(`  📍 Image ${index}: target x=${targetX.toFixed(3)}, spacing=${spacing.toFixed(3)}`);
      
      // Animate position
      this.gatheringTimeline.to(plane.position, {
        x: targetX,
        y: slotWorldY[rowSlotIndex] ?? slotWorldY[slotIndex] ?? slot.y,
        z: slot.z,
        duration: imageMoveDuration,
        ease: 'power2.inOut',
        delay: staggerDelay
      }, 0);
      
      // Animate scale
      this.gatheringTimeline.to(plane.scale, {
        x: targetScale,
        y: targetScale,
        z: targetScale,
        duration: imageMoveDuration,
        ease: 'power2.inOut',
        delay: staggerDelay
      }, 0);
      
      // Animate opacity if material exists
      if (plane.material) {
        this.gatheringTimeline.to(plane.material, {
          opacity: 1.0,
          duration: imageMoveDuration * 0.8,
          ease: 'power2.inOut',
          delay: staggerDelay
        }, 0);
      }
      
      plane.visible = true;
    });
    
    // ===== CAMERA SEQUENCE: pull back then glide into timeline =====
    const startCameraZ = 12; // Further pullback for stronger reveal
    const endCameraZ = SCENE_CONFIG.timeline.position.z; // reads 3.0 from constants

    console.log(`📷 Camera sequence: ${this.camera.position.z.toFixed(2)} -> ${startCameraZ} -> ${endCameraZ}`);

    // STEP 1: Pull camera back while images start converging
    this.gatheringTimeline.to(this.camera.position, {
      x: 0,
      y: 0,
      z: startCameraZ,
      duration: pullbackDuration,
      ease: 'power2.out',
      onComplete: () => {
        console.log('📷 Zoom-out complete, camera at overview position');
      }
    }, 0); // Start immediately

    // STEP 2: Smooth dolly-in as images land on timeline positions
    this.gatheringTimeline.to(this.camera.position, {
      x: 0,
      y: 0,
      z: endCameraZ,
      duration: dollyDuration,
      ease: 'power2.inOut',
      onComplete: () => {
        console.log(`📷 Dolly-in complete at z=${this.camera.position.z.toFixed(2)}`);
      }
    }, dollyStartAt);
    
    console.log(`⏱️ Total animation duration: ${this.gatheringTimeline.duration().toFixed(2)}s`);
  }

  /**
   * Ensure final transforms exactly match timeline runtime layout to avoid
   * a visible correction on handoff to RenderSystem.
   * @param {Array} planes
   * @param {number} progress
   */
  applyFinalTimelineLayout(planes, progress) {
    if (!Array.isArray(planes) || planes.length === 0) return;

    const slotWorldY = this.getLayoutSlotWorldY(planes);
    planes.forEach((plane, index) => {
      if (!plane) return;
      const relativeIndex = index - progress;
      const slotIndex = this.getSlotIndexFromRelativeIndex(relativeIndex);
      const rowSlotIndex = this.getAlternatingRowSlotIndex(index, slotWorldY);
      const slot = getTimelineLayoutSlot(slotIndex);
      const targetCenterPx = this.getInterpolatedSlotCenterPx(relativeIndex);
      const targetX = this.pixelXToWorldX(targetCenterPx, slot.z);
      const targetScale = this.getSlotScale(slotIndex, plane?.geometry?.parameters?.width ?? 2.5, slot.z);

      plane.position.set(
        targetX,
        slotWorldY[rowSlotIndex] ?? slotWorldY[slotIndex] ?? slot.y,
        slot.z
      );
      plane.scale.setScalar(targetScale);
      plane.visible = true;
      if (plane.material) {
        plane.material.opacity = 1;
      }
    });
  }
  
  /**
   * Complete the gathering animation
   */
  completeGathering({ landingOffset, spacing } = {}) {
    this.gatheringTimeline = null;
    const firstPosition = TIMELINE_CONFIG.FIRST_POSITION || -4.5;
    const safeSpacing = Number.isFinite(spacing) && spacing > 0
      ? spacing
      : (this.gatherSnapshot?.spacing ?? this.state.get('calculatedSpacing') ?? 1.8);
    const resolvedOffset = Number.isFinite(landingOffset)
      ? landingOffset
      : (this.gatherSnapshot?.offset ?? this.state.get('timelineOffset') ?? firstPosition);
    const approxIndex = Math.max(0, Math.round((resolvedOffset - firstPosition) / Math.max(0.0001, safeSpacing)));

    // Keep offset + camera target in perfect sync for the first timeline frame.
    const cameraSystem = window.app?.timelineController?.cameraSystem;
    if (cameraSystem?.lookAtTarget && cameraSystem?.lookAtCurrent && this.camera) {
      cameraSystem.lookAtTarget.set(-resolvedOffset, 0, 0);
      cameraSystem.lookAtCurrent.set(-resolvedOffset, 0, 0);
      this.camera.lookAt(cameraSystem.lookAtCurrent);
      this.camera.updateMatrixWorld(true);
    }
    
    this.state.setState({
      imagesGathering: false,
      imagesGathered: true,
      timelineOffset: resolvedOffset,
      targetOffset: resolvedOffset,
      currentSnapIndex: approxIndex,
      scrollVelocity: 0,
      isScrolling: false
    });
    this.gatherSnapshot = null;
    
    this.eventBus.emit('images:gather:complete');
  
    // Dispatch native DOM event that YearOverlay listens for
    const year = this.state.get('currentYear') || 2010;
    
    window.dispatchEvent(new CustomEvent('sceneTransitionComplete', {
      detail: { sceneName: 'timeline', year }
    }));
  
    console.log('📅 sceneTransitionComplete dispatched, year:', year);
  }
  
  /**
   * Clean up
   */
  dispose() {
    if (this.gatheringTimeline) {
      this.gatheringTimeline.kill();
      this.gatheringTimeline = null;
    }
    
    for (const unsubscribe of this.unsubscribeFns) {
      try {
        unsubscribe();
      } catch (err) {
        console.warn('AnimationChoreographer unsubscribe failed:', err);
      }
    }
    this.unsubscribeFns = [];
    
    console.log('🧹 AnimationChoreographer disposed');
  }
}

export { AnimationChoreographer };
