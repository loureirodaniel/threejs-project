/**
 * AnimationChoreographer - GSAP-based image gathering animation
 * Handles smooth staggered motion with acceleration/deceleration
 */

import { gsap } from 'gsap';
import { EFFECTS_CONFIG, TIMELINE_CONFIG, TIMELINE_LAYOUT_CONFIG, SCENE_CONFIG, getTimelineLayoutSlot } from '../utils/TimelineConstants.js';

class AnimationChoreographer {
  constructor(state, eventBus, camera, scene) {
    this.state = state;
    this.eventBus = eventBus;
    this.camera = camera;
    this.scene = scene;
    
    this.gatheringTimeline = null;
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
    const distance = Math.max(0.001, Math.abs((this.camera.position?.z ?? 2.5) - zDepth));
    const visibleHeight = 2 * Math.tan(fovRad / 2) * distance;
    return visibleHeight * ((this.camera.aspect && Number.isFinite(this.camera.aspect)) ? this.camera.aspect : (viewportWidth / viewportHeight));
  }

  getSlotWidthPercentage(slotIndex) {
    const percentages = TIMELINE_LAYOUT_CONFIG.IMAGE_WIDTH_PERCENTAGES || [0.3, 0.2, 0.15];
    return percentages[slotIndex] ?? percentages[0] ?? 0.3;
  }

  getSlotWidthPx(slotIndex) {
    const configuredWidths = TIMELINE_LAYOUT_CONFIG.IMAGE_WIDTHS_PX;
    const safeIndex = Math.abs(slotIndex) % 3;
    const configuredWidth = configuredWidths?.[safeIndex];
    if (Number.isFinite(configuredWidth) && configuredWidth > 0) {
      return configuredWidth;
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
    const distance = Math.max(0.001, Math.abs((this.camera.position?.z ?? 2.5) - zDepth));
    const visibleHeight = 2 * Math.tan(fovRad / 2) * distance;
    return (0.5 - (pixelY / viewportHeight)) * visibleHeight;
  }

  getLayoutSlotWorldY(planes) {
    if (!this.camera || !Array.isArray(planes) || planes.length === 0) return [0, 0, 0];

    const firstSlot = getTimelineLayoutSlot(0);
    const secondSlot = getTimelineLayoutSlot(1);
    const thirdSlot = getTimelineLayoutSlot(2);
    const firstHeightPx = this.getSlotWidthPx(0) * 0.75;
    const secondHeightPx = this.getSlotWidthPx(1) * 0.75;
    const thirdHeightPx = this.getSlotWidthPx(2) * 0.75;

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
   * Start the gathering animation sequence
   */
  startGatheringAnimation() {
    console.log('🎬 AnimationChoreographer: Starting gathering sequence...');
    
    // Get image planes
    const planes = window.app?.imagePlanes?.getPlanes();
    if (!planes || planes.length === 0) {
      console.warn('⚠️ No planes available for animation');
      this.completeGathering();
      return;
    }
    
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
    
    // Create master timeline
    this.gatheringTimeline = gsap.timeline({
      onComplete: () => {
        console.log('✅ Gathering sequence complete');
        console.log(`📷 Camera z after gathering: ${this.camera.position.z.toFixed(2)}`);
        this.completeGathering();
      }
    });
    
    // === ANIMATE IMAGES ===
    planes.forEach((plane, index) => {
      const slot = getTimelineLayoutSlot(index);
      const slotIndex = Math.abs(index) % slotWorldY.length;
      const targetCenterPx = this.getInterpolatedSlotCenterPx(index - progress);
      const targetX = this.pixelXToWorldX(targetCenterPx, slot.z);
      const staggerDelay = index * 0.06; // 60ms between each image
      
      console.log(`  📍 Image ${index}: target x=${targetX.toFixed(3)}, spacing=${spacing.toFixed(3)}`);
      
      // Animate position
      this.gatheringTimeline.to(plane.position, {
        x: targetX,
        y: slotWorldY[slotIndex] ?? slot.y,
        z: slot.z,
        duration: 1.2,
        ease: 'power2.inOut', // Smooth acceleration and deceleration
        delay: staggerDelay
      }, 0);
      
      // Animate scale
      this.gatheringTimeline.to(plane.scale, {
        x: this.getSlotScale(Math.abs(index) % 3, plane?.geometry?.parameters?.width ?? 2.5, slot.z),
        y: this.getSlotScale(Math.abs(index) % 3, plane?.geometry?.parameters?.width ?? 2.5, slot.z),
        z: this.getSlotScale(Math.abs(index) % 3, plane?.geometry?.parameters?.width ?? 2.5, slot.z),
        duration: 1.2,
        ease: 'power2.inOut',
        delay: staggerDelay
      }, 0);
      
      // Animate opacity if material exists
      if (plane.material) {
        this.gatheringTimeline.to(plane.material, {
          opacity: 1.0,
          duration: 1.0,
          ease: 'power2.inOut',
          delay: staggerDelay
        }, 0);
      }
      
      plane.visible = true;
    });
    
    // ===== CAMERA SEQUENCE: Smooth zoom-out, then dolly in =====
    const startCameraZ = 10; // Far view during gathering
    const endCameraZ = SCENE_CONFIG.timeline.position.z; // reads 3.0 from constants

    console.log(`📷 Camera sequence: ${this.camera.position.z.toFixed(2)} -> ${startCameraZ} -> ${endCameraZ}`);

    // STEP 1: Smooth zoom-out (0.0s - 0.5s)
    // Pull camera back for overview as images start moving
    this.gatheringTimeline.to(this.camera.position, {
      x: 0,
      y: 0,
      z: startCameraZ,
      duration: 0.5,
      ease: 'power1.out', // Fast at start, slow at end
      onComplete: () => {
        console.log('📷 Zoom-out complete, camera at overview position');
      }
    }, 0); // Start immediately

    // STEP 2: Hold at overview (0.5s - 0.8s)
    // Let user see the full gathering motion

    // STEP 3: Smooth dolly-in (0.8s - 2.3s)
    // Zoom into timeline as images settle
    this.gatheringTimeline.to(this.camera.position, {
      x: 0,
      y: 0,
      z: endCameraZ,
      duration: 1.5,
      ease: 'power2.inOut', // Smooth acceleration/deceleration
      onComplete: () => {
        console.log(`📷 Dolly-in complete at z=${this.camera.position.z.toFixed(2)}`);
      }
    }, 0.8); // Start after 0.8 seconds
    
    console.log(`⏱️ Total animation duration: ${this.gatheringTimeline.duration().toFixed(2)}s`);
  }
  
  /**
   * Complete the gathering animation
   */
  completeGathering() {
    this.gatheringTimeline = null;
    
    this.state.setState({
      imagesGathering: false,
      imagesGathered: true
    });
    
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
