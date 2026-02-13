/**
 * RenderSystem - Handles ALL visual updates for timeline
 *
 * Replaces:
 * - TimelineImageManager.js
 * - TimelineEffects.js
 * - Parts of TimelineScene.js
 *
 * Responsibilities:
 * 1. Update image positions based on timelineOffset
 * 2. Apply vignette effect (opacity + scale)
 * 3. Manage visibility culling (hide off-screen images)
 * 4. Handle image enlargement animations
 * 5. Coordinate with effects (liquid distortion, blur)
 *
 * @module timeline-v2/systems
 */

import * as THREE from 'three';
import { gsap } from 'gsap';
import * as TimelineUtils from '../utils/TimelineUtils.js';
import { EFFECTS_CONFIG, TIMELINE_CONFIG } from '../utils/TimelineConstants.js';

class RenderSystem {
  constructor(state, eventBus, timelineScene, effects = {}) {
    this.state = state;
    this.eventBus = eventBus;
    this.timelineScene = timelineScene;
    this.effects = effects; // { vignetteEffect, liquidDistortionEffect, backgroundBlurEffect }

    // Render state
    this.lastVignetteUpdate = 0;
    this.vignetteUpdateThrottle = 16; // ~60fps

    // Image enlargement state
    this.enlargedImage = null;
    this.originalImageState = null;
    this.enlargeAnimation = null;

    // One reusable raycaster + vector (avoid allocations on each click)
    this.raycaster = new THREE.Raycaster();
    this.mouseNDC = new THREE.Vector2();
    this.paused = false;

    this.unsubscribeFns = [];
    this.init();
  }

  init() {
    // Subscribe to state changes
    this.unsubscribeFns.push(
      this.state.subscribe('timelineOffset', this.onOffsetChange.bind(this)),
      this.state.subscribe('isImageEnlarged', this.onImageEnlargedChange.bind(this)),
      this.state.subscribe('isDragging', this.onDraggingChange.bind(this))
    );

    // Subscribe to events
    this.unsubscribeFns.push(
      this.eventBus.on('timeline:click', this.onTimelineClick.bind(this)),
      this.eventBus.on('timeline:image:close', this.onImageClose.bind(this)),
      this.eventBus.on('timeline:snap:complete', this.onSnapComplete.bind(this)),
      this.eventBus.on('timeline:pause', () => {
        this.paused = true;
        console.log('⏸️ Timeline rendering paused');
      }),
      this.eventBus.on('timeline:resume', () => {
        this.paused = false;
        console.log('▶️ Timeline rendering resumed');
      })
    );

    console.log('RenderSystem initialized');
  }

  /**
   * Main render update - called every frame
   */
  update(deltaTime) {
    if (this.paused) {
      return; // Skip rendering when detail page is open
    }
    void deltaTime;

    const { timelineOffset, currentSceneIndex } = this.state.getState();

    // Only update if on timeline scene
    if (currentSceneIndex !== 1) return;

    // Update image positions based on offset
    this.updateImagePositions(timelineOffset);

    // Update vignette (throttled)
    const now = Date.now();
    if (now - this.lastVignetteUpdate >= this.vignetteUpdateThrottle) {
      this.updateVignette(timelineOffset);
      this.lastVignetteUpdate = now;
    }
  }

  /**
   * Get timeline plane arrays used by this system.
   * @returns {{timelinePlanes: Array, transitionedPlanes: Array, allPlanes: Array}}
   */
  getPlaneCollections() {
    const timelinePlanes = this.timelineScene?.getTimelinePlanes?.() || [];
    const initialPlanes = typeof window !== 'undefined' ? window.app?.imagePlanes?.getPlanes?.() || [] : [];
    const transitionedPlanes = initialPlanes.filter((p) => p?.userData?.isTimelineTransitioned);
    return {
      timelinePlanes,
      transitionedPlanes,
      allPlanes: [...transitionedPlanes, ...timelinePlanes]
    };
  }

  /**
   * Update all image positions based on timeline offset.
   * @param {number} offset - Current timeline offset
   */
  updateImagePositions(offset) {
    const safeOffset = Number.isFinite(offset) ? offset : 0;
    const { timelinePlanes, transitionedPlanes } = this.getPlaneCollections();

    const spacing = this.state.get('calculatedSpacing') || 1.8; // Use dynamic spacing
    const firstPosition = TIMELINE_CONFIG.FIRST_POSITION || -4.5;
    const cullDistance = 15;

    // Update transitioned initial planes (first sequence: 0..)
    transitionedPlanes.forEach((plane, index) => {
      if (!plane) return;
      const originalX = firstPosition + index * spacing;
      plane.position.x = originalX - safeOffset;
      plane.visible = Math.abs(plane.position.x) < cullDistance;
    });

    // Update timeline planes (additional planes that continue sequence, usually from 2018+)
    timelinePlanes.forEach((plane, index) => {
      if (!plane) return;
      const imageIndex = 8 + index;
      const originalX = firstPosition + imageIndex * spacing;
      plane.position.x = originalX - safeOffset;
      plane.visible = Math.abs(plane.position.x) < cullDistance;
    });
  }

  /**
   * Update vignette effect - highlight center, dim sides.
   * @param {number} _offset - Current timeline offset (kept for API parity)
   */
  updateVignette(_offset) {
    const { allPlanes } = this.getPlaneCollections();
    if (allPlanes.length === 0) return;

    const centerX = 0;
    const focusWidth = EFFECTS_CONFIG.VIGNETTE_FOCUS_WIDTH ?? EFFECTS_CONFIG.VIGNETTE_WIDTH ?? 2.0;
    const falloffWidth = EFFECTS_CONFIG.VIGNETTE_FALLOFF_WIDTH ?? 4.0;
    const minOpacity = EFFECTS_CONFIG.VIGNETTE_MIN_OPACITY ?? (1 - (EFFECTS_CONFIG.VIGNETTE_STRENGTH ?? 0.7));
    const focusScale = EFFECTS_CONFIG.FOCUS_SCALE ?? 0.85;
    const normalScale = EFFECTS_CONFIG.NORMAL_SCALE ?? 0.75;

    const imagesToUnfocus = [];

    allPlanes.forEach((plane) => {
      if (!plane || !plane.visible || !plane.material) return;

      const distance = Math.abs(plane.position.x - centerX);

      // Opacity falloff by distance from center
      let opacity;
      if (distance < focusWidth) {
        opacity = 1.0;
      } else {
        const fadeDistance = distance - focusWidth;
        const fadeFactor = Math.min(1.0, fadeDistance / Math.max(0.001, falloffWidth));
        opacity = 1.0 - fadeFactor * (1.0 - minOpacity);
      }

      plane.material.opacity = opacity;
      plane.material.transparent = true;
      plane.material.needsUpdate = true;

      const isFocused = distance < 1.0;
      const targetScale = isFocused ? focusScale : normalScale;
      const needsScaleChange = Math.abs(plane.scale.x - targetScale) > 0.01;
      if (!needsScaleChange) return;

      gsap.killTweensOf(plane.scale);

      if (isFocused) {
        gsap.to(plane.scale, {
          x: targetScale,
          y: targetScale,
          z: targetScale,
          duration: 0.4,
          ease: 'back.out(1.2)',
          overwrite: 'auto'
        });
      } else {
        imagesToUnfocus.push(plane.scale);
      }
    });

    if (imagesToUnfocus.length > 0) {
      gsap.to(imagesToUnfocus, {
        x: normalScale,
        y: normalScale,
        z: normalScale,
        duration: 0.3,
        ease: 'power2.out',
        stagger: {
          amount: 0.1,
          from: 'center',
          ease: 'power1.inOut'
        },
        overwrite: 'auto'
      });
    }
  }

  /**
   * Handle timeline offset state updates.
   * @param {{newValue: number}} payload
   */
  onOffsetChange({ newValue }) {
    // Calculate current year based on dynamic spacing
    const currentOffset = this.state.get('timelineOffset');
    const calculatedSpacing = this.state.get('calculatedSpacing') || 1.8;
    const firstPosition = TIMELINE_CONFIG.FIRST_POSITION || -4.5;
    const startYear = 2010;
    const yearCount = TIMELINE_CONFIG.YEAR_COUNT || 10;

    // Calculate which year we're closest to
    const relativeOffset = currentOffset - firstPosition;
    const yearIndex = Math.round(relativeOffset / calculatedSpacing);
    const clampedIndex = Math.max(0, Math.min(yearIndex, yearCount - 1));
    const currentYear = startYear + clampedIndex;

    // Update state if year changed
    const previousYear = this.state.get('currentYear');
    if (currentYear !== previousYear) {
      this.state.setState({ currentYear });
      this.eventBus.emit('timeline:year:change', {
        year: currentYear,
        offset: currentOffset
      });
      console.log(`📅 Year changed to ${currentYear} (index ${clampedIndex})`);
    }
  }

  /**
   * Handle image enlarged state change.
   * @param {{newValue: boolean}} payload
   */
  onImageEnlargedChange({ newValue }) {
    if (newValue) {
      this.effects.backgroundBlurEffect?.activate?.();
      return;
    }
    this.effects.backgroundBlurEffect?.deactivate?.();
  }

  /**
   * Handle dragging state change.
   * @param {{newValue: boolean}} payload
   */
  onDraggingChange({ newValue }) {
    if (newValue) {
      this.effects.liquidDistortionEffect?.setControlMode?.('external');
      return;
    }
    this.effects.liquidDistortionEffect?.fadeOutEffect?.();
  }

  /**
   * Handle timeline clicks - Proximity-based detection (more reliable)
   */
  onTimelineClick(data) {
    console.log('🖱️ CLICK at screen:', data.clientX, data.clientY);
    
    try {
      const app = window.app;
      if (!app || !app.imagePlanes || !app.camera) {
        console.error('❌ Missing components');
        return;
      }
      
      const imagePlanes = app.imagePlanes;
      const planes = imagePlanes.planes || imagePlanes.getPlanes();
      const imageData = imagePlanes.imageData;
      const camera = app.camera;
      const detailPage = app.timelineController?.imageDetailPage;
      
      if (!planes || !imageData || !camera || !detailPage) {
        console.error('❌ Missing required data');
        return;
      }
      
      console.log(`✅ Checking ${planes.length} planes`);
      
      // Convert each plane's 3D position to screen coordinates
      const screenPositions = planes.map((plane, index) => {
        const vector = plane.position.clone();
        vector.project(camera);
        
        const widthHalf = window.innerWidth / 2;
        const heightHalf = window.innerHeight / 2;
        
        const screenX = (vector.x * widthHalf) + widthHalf;
        const screenY = -(vector.y * heightHalf) + heightHalf;
        
        // Calculate distance from click to plane center
        const distance = Math.sqrt(
          Math.pow(screenX - data.clientX, 2) + 
          Math.pow(screenY - data.clientY, 2)
        );
        
        return {
          index,
          plane,
          screenX,
          screenY,
          distance,
          imageData: imageData[index]
        };
      });
      
      // Find closest plane within 150px radius
      const closest = screenPositions
        .filter(p => p.distance < 150)
        .sort((a, b) => a.distance - b.distance)[0];
      
      if (closest) {
        console.log(`✅ Clicked image ${closest.index} (${closest.distance.toFixed(0)}px away)`);
        console.log(`   Image year: ${closest.imageData.year}`);
        
        // Open detail page
        detailPage.open({
          plane: closest.plane,
          imageData: closest.imageData
        });
      } else {
        console.log('❌ No image within 150px of click');
        
        // Show distances for debugging
        const sorted = screenPositions.sort((a, b) => a.distance - b.distance);
        console.log('Closest 3 images:', sorted.slice(0, 3).map(p => ({
          index: p.index,
          year: p.imageData.year,
          distance: p.distance.toFixed(0) + 'px',
          screenPos: `(${p.screenX.toFixed(0)}, ${p.screenY.toFixed(0)})`
        })));
      }
      
    } catch (error) {
      console.error('❌ Error in onTimelineClick:', error);
    }
  }

  /**
   * Handle close request from InputSystem/UI.
   */
  onImageClose() {
    console.log('🔴 onImageClose called from RenderSystem');
    // Just emit the close event, ImageDetailPage handles it
    this.eventBus.emit('timeline:image:close');
  }

  /**
   * Handle snap complete - force vignette update.
   * @param {object} payload
   */
  onSnapComplete({ offset }) {
    this.updateVignette(offset);
  }

  /**
   * Clean up
   */
  dispose() {
    if (this.enlargeAnimation) {
      this.enlargeAnimation.kill();
      this.enlargeAnimation = null;
    }

    // Remove any in-flight tweens from plane scales
    const { allPlanes } = this.getPlaneCollections();
    for (const plane of allPlanes) {
      if (plane?.scale) {
        gsap.killTweensOf(plane.scale);
      }
    }

    for (const unsubscribe of this.unsubscribeFns) {
      try {
        unsubscribe();
      } catch (err) {
        console.warn('RenderSystem unsubscribe failed:', err);
      }
    }
    this.unsubscribeFns = [];

    this.enlargedImage = null;
    this.originalImageState = null;
    this.timelineScene = null;
    this.effects = null;

    console.log('RenderSystem disposed');
  }
}

export { RenderSystem };
