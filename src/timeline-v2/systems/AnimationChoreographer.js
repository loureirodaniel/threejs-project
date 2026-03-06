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
    const cameraZ = 3.0; // Initial scene camera Z position
    const fov = 75; // Camera field of view in degrees
    
    // Calculate visible height at z=0
    const vFOV = (fov * Math.PI) / 180;
    const visibleHeight = 2 * Math.tan(vFOV / 2) * cameraZ;
    
    // Get viewport height
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
    
    // Calculate pixels per three.js unit
    const pixelsPerUnit = viewportHeight / visibleHeight;
    
    // Image width in pixels (0.75 three.js units at scale 0.75)
    const imageWidthPx = 0.75 * pixelsPerUnit;
    
    // Desired margin between images (increased to open up the timeline layout)
    const marginPx = 520;
    
    // Total spacing (center to center) in pixels
    const totalSpacingPx = imageWidthPx + marginPx;
    
    // Convert back to three.js units
    const spacingUnits = totalSpacingPx / pixelsPerUnit;
    
    console.log(`📏 Spacing Calculation:
      Viewport Height: ${viewportHeight}px
      Pixels per Unit: ${pixelsPerUnit.toFixed(2)}px
      Image Width: ${imageWidthPx.toFixed(0)}px
      Margin: ${marginPx}px
      Total Spacing: ${spacingUnits.toFixed(3)} units (${totalSpacingPx.toFixed(0)}px)`);

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

  getSlotScale(slotIndex, planeWidth = 2.5, slotZ = 0) {
    const visibleWidth = this.getVisibleWidthAtDepth(slotZ);
    const targetWorldWidth = visibleWidth * this.getSlotWidthPercentage(slotIndex);
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

    const viewportWidth = Math.max(1, window.innerWidth || 1);
    const firstSlot = getTimelineLayoutSlot(0);
    const secondSlot = getTimelineLayoutSlot(1);
    const thirdSlot = getTimelineLayoutSlot(2);
    const firstHeightPx = viewportWidth * this.getSlotWidthPercentage(0) * 0.75;
    const secondHeightPx = viewportWidth * this.getSlotWidthPercentage(1) * 0.75;
    const thirdHeightPx = viewportWidth * this.getSlotWidthPercentage(2) * 0.75;

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
    const anchorShiftX = this.getViewportAnchorShift(planes);
    const slotWorldY = this.getLayoutSlotWorldY(planes);
    
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
      const targetX = firstPosition + (index * spacing) - offset + anchorShiftX;
      const slot = getTimelineLayoutSlot(index);
      const slotIndex = Math.abs(index) % slotWorldY.length;
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
