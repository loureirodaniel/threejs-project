/**
 * AnimationChoreographer - GSAP-based image gathering animation
 * Handles smooth staggered motion with acceleration/deceleration
 */

import { gsap } from 'gsap';
import { TIMELINE_CONFIG } from '../utils/TimelineConstants.js';

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
   * Calculate 130px margin spacing dynamically
   */
  calculateSpacing() {
    const cameraZ = 5; // Initial scene camera Z position
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
    
    // Desired margin between images
    const marginPx = 430;
    
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
      const targetX = firstPosition + (index * spacing) - offset;
      const staggerDelay = index * 0.06; // 60ms between each image
      
      console.log(`  📍 Image ${index}: target x=${targetX.toFixed(3)}, spacing=${spacing.toFixed(3)}`);
      
      // Animate position
      this.gatheringTimeline.to(plane.position, {
        x: targetX,
        y: 0,
        z: 0,
        duration: 1.2,
        ease: 'power2.inOut', // Smooth acceleration and deceleration
        delay: staggerDelay
      }, 0);
      
      // Animate scale
      this.gatheringTimeline.to(plane.scale, {
        x: 0.75,
        y: 0.75,
        z: 0.75,
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
    const endCameraZ = 5;    // Close view at timeline

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
