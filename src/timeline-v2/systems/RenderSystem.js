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
import { RippleAnimation } from './RippleAnimation.js';
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
    this.detailRenderInterval = null;
    this.currentAnimatingPlane = null;
    this.currentImageData = null;
    this.hiddenTimelineUIState = [];
    const app = typeof window !== 'undefined' ? (window.app || {}) : {};
    this.camera = app.camera;

    // Initialize expand animation system
    this.rippleAnimation = new RippleAnimation(
      this.camera,
      () => this.renderer || window.app?.renderer,
      () => this.scene || window.app?.scene
    );

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
        this.stopDetailRenderLoop();
        this.showTimelineUI();
        console.log('👁️ Title and year visible again');
        console.log('▶️ Timeline rendering resumed');
      })
    );

    // Listen for signal to hide 3D plane when detail page takes over
    this.onHidePlaneForDetailPage = () => {
      // Find currently animating plane and hide it
      if (this.currentAnimatingPlane) {
        this.currentAnimatingPlane.visible = false;
        console.log('🙈 3D plane hidden on detail page signal');
      }
    };
    window.addEventListener('hidePlaneForDetailPage', this.onHidePlaneForDetailPage);

    // Listen for animation handoff signal
    this.onImageExpandHandoff = (event) => {
      const { plane } = event.detail;
      
      console.log('🎨 Handoff signal received - hiding plane and revealing detail');
      
      // Simply hide the 3D plane
      if (this.currentAnimatingPlane) {
        this.currentAnimatingPlane.visible = false;
        console.log('🙈 3D plane hidden');
      }
      
      // Reveal detail page with smooth fade
      const detailPage = window.app.timelineController?.imageDetailPage;
      if (detailPage) {
        detailPage.open({
          plane: this.currentAnimatingPlane,
          imageData: this.currentImageData, // Store this when animation starts
          reveal: true
        });
        this.hideTimelineUI();
        console.log('🙈 Title and year hidden via CSS class');
        console.log('📋 Body classes:', document.body.className);
        console.log('🎨 Using safe CSS-only approach');

        // Check if elements are actually hidden
        setTimeout(() => {
          const title = document.querySelector('h1');
          const year = document.querySelector('[class*="year"]');

          console.log('🔍 Title element:', {
            exists: !!title,
            text: title?.textContent.substring(0, 30),
            opacity: title ? window.getComputedStyle(title).opacity : 'N/A',
            visibility: title ? window.getComputedStyle(title).visibility : 'N/A'
          });

          console.log('🔍 Year element:', {
            exists: !!year,
            opacity: year ? window.getComputedStyle(year).opacity : 'N/A',
            visibility: year ? window.getComputedStyle(year).visibility : 'N/A'
          });
        }, 100);
        console.log('👁️ Detail page reveal triggered');
      }
    };
    window.addEventListener('imageExpandHandoff', this.onImageExpandHandoff);

    console.log('RenderSystem initialized');
  }

  /**
   * Main render update - called every frame
   */
  update(deltaTime) {
    this.imagePlanes = this.imagePlanes || window.app?.imagePlanes;

    // CRITICAL: Restore fullscreen planes if they've been moved
    this.imagePlanes?.planes?.forEach(plane => {
      if (plane.userData.isFullscreen && plane.userData.isFrozen) {
        const targetScale = plane.userData.fullscreenScale;
        const targetPosition = plane.userData.fullscreenPosition;
        
        if (targetScale && targetPosition) {
          // Check if plane has been moved from fullscreen
          const scaleDiff = Math.abs(plane.scale.x - targetScale.x);
          const posDiff = Math.abs(plane.position.x - targetPosition.x);
          
          if (scaleDiff > 0.01 || posDiff > 0.01) {
            console.warn('🚨 Fullscreen plane was moved! Restoring...', {
              currentScale: plane.scale.x.toFixed(2),
              targetScale: targetScale.x.toFixed(2),
              currentPos: plane.position.x.toFixed(2),
              targetPos: targetPosition.x.toFixed(2)
            });
            
            // Force restore fullscreen transform
            plane.scale.copy(targetScale);
            plane.position.copy(targetPosition);
          }
        }
      }
    });

    if (this.paused) {
      // Still render the fullscreen plane when paused
      this.render();
      return; // Skip timeline updates but NOT rendering
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

  render() {
    this.renderer = this.renderer || window.app?.renderer;
    this.scene = this.scene || window.app?.scene;
    this.camera = this.camera || window.app?.camera;
    this.imagePlanes = this.imagePlanes || window.app?.imagePlanes;

    if (!this.renderer || !this.scene || !this.camera) {
      console.error('❌ Missing renderer/scene/camera:', {
        renderer: !!this.renderer,
        scene: !!this.scene,
        camera: !!this.camera
      });
      return;
    }

    const fullscreenPlane = this.imagePlanes?.planes?.find(p => p.userData.isFullscreen);

    if (fullscreenPlane) {
      fullscreenPlane.visible = true;
      fullscreenPlane.renderOrder = 10000;
      fullscreenPlane.frustumCulled = false;

      if (fullscreenPlane.material) {
        fullscreenPlane.material.opacity = 1.0;
        fullscreenPlane.material.transparent = true;
        fullscreenPlane.material.depthTest = false;
        fullscreenPlane.material.depthWrite = false;
      }

      this.renderer.setClearColor(0x000000, 1);
    } else {
      this.renderer.setClearColor(0x000000, 0);
    }

    this.renderer.render(this.scene, this.camera);
  }

  startDetailRenderLoop() {
    if (this.detailRenderInterval) return;
    
    console.log('🔄 Starting continuous render loop for detail view');
    this.detailRenderInterval = setInterval(() => {
      this.render();
    }, 16); // 60fps
  }

  stopDetailRenderLoop() {
    if (this.detailRenderInterval) {
      clearInterval(this.detailRenderInterval);
      this.detailRenderInterval = null;
      console.log('⏹️ Stopped continuous render loop');
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
      if (plane.userData?.isFrozen && plane.userData?.isFullscreen) return;
      const originalX = firstPosition + index * spacing;
      plane.position.x = originalX - safeOffset;
      plane.visible = Math.abs(plane.position.x) < cullDistance;
    });

    // Update timeline planes (additional planes that continue sequence, usually from 2018+)
    timelinePlanes.forEach((plane, index) => {
      if (!plane) return;
      if (plane.userData?.isFrozen && plane.userData?.isFullscreen) return;
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
      if (plane.userData?.isFrozen && plane.userData?.isFullscreen) return;

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
      this.imagePlanes = imagePlanes;
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
        
        // Get current centered image index from state
        const currentIndex = this.state.get('currentImageIndex') || 0;
        const clickedIndex = closest.index;
        
        console.log(`📍 Current centered image: ${currentIndex}, clicked: ${clickedIndex}`);

        const startSeamlessHandoff = () => {
          const animatingPlane = closest.plane;
          const imageDataForDetail = closest.imageData;

          // STEP 1: Preload detail page (invisible) BEFORE animation starts
          console.log('🔧 Step 1: Preloading detail page');
          detailPage.open({
            plane: animatingPlane,
            imageData: imageDataForDetail,
            preload: true // Sets up DOM but keeps invisible
          });

          // STEP 2: Start 3D plane animation
          console.log('🎬 Step 2: Starting 3D plane animation');
          this.currentAnimatingPlane = animatingPlane;
          this.currentImageData = imageDataForDetail;

          const event = data;
          // Store click position
          const clickPos = { x: event.clientX, y: event.clientY };

          // Store original transforms for restoration later
          animatingPlane.userData.originalScale = animatingPlane.scale.clone();
          animatingPlane.userData.originalPosition = animatingPlane.position.clone();

          console.log('💾 Stored original transforms:', {
            scale: animatingPlane.userData.originalScale,
            position: animatingPlane.userData.originalPosition
          });

          this.physicsSystem = app.timelineController?.physicsSystem || this.physicsSystem;

          // NEW: Disable physics system to prevent interference
          if (this.physicsSystem) {
            this.physicsSystem.scrollEnabled = false;
            console.log('🔒 Physics system DISABLED for fullscreen animation');
          }

          // Start ripple animation
          this.rippleAnimation.animateToFullscreen(animatingPlane, clickPos, () => {
            console.log('🌊 Ripple animation complete, showing detail page');
            
            // PAUSE ENTIRE TIMELINE
            if (window.app?.timelineController) {
              window.app.timelineController.pauseTimeline();

              // Freeze camera
              if (window.app.timelineController.cameraSystem) {
                window.app.timelineController.cameraSystem.freezeCamera();
              }
            }

            // Disable canvas interactions
            if (window.app) {
              window.app.disableCanvasInteraction();
            }
            
            // Store hidden planes for restoration
            this.hiddenPlanes = [];
            this.fullscreenPlane = animatingPlane;  // Store reference

            // Remove all OTHER planes from scene (NOT the fullscreen one!)
            this.imagePlanes.planes.forEach(p => {
              if (p.uuid !== animatingPlane.uuid) {
                // Remove from scene completely
                if (p.parent) {
                  p.parent.remove(p);
                  this.hiddenPlanes.push(p);
                }
              } else {
                p.visible = true;
                p.renderOrder = 9999;
                console.log('👁️ Fullscreen plane render order:', p.renderOrder);
              }
            });

            // CRITICAL: Force render the fullscreen plane
            console.log('🔄 Forcing render after animation complete');
            this.render();

            // Start continuous rendering while detail page is open
            this.startDetailRenderLoop();
            
            // Show detail page
            detailPage.open({
              plane: animatingPlane,
              imageData: this.currentImageData,
              reveal: true,
              showImageOnly: false,
              onDOMImageReady: () => {
                // Hide WebGL plane once DOM image takes over
                console.log('🔄 Hiding WebGL plane, DOM image taking over');
                animatingPlane.visible = false;
              }
            });
            this.hideTimelineUI();
            console.log('🙈 Title and year hidden via CSS class');
            console.log('📋 Body classes:', document.body.className);
            console.log('🎨 Using safe CSS-only approach');

            // Check if elements are actually hidden
            setTimeout(() => {
              const title = document.querySelector('h1');
              const year = document.querySelector('[class*="year"]');

              console.log('🔍 Title element:', {
                exists: !!title,
                text: title?.textContent.substring(0, 30),
                opacity: title ? window.getComputedStyle(title).opacity : 'N/A',
                visibility: title ? window.getComputedStyle(title).visibility : 'N/A'
              });

              console.log('🔍 Year element:', {
                exists: !!year,
                opacity: year ? window.getComputedStyle(year).opacity : 'N/A',
                visibility: year ? window.getComputedStyle(year).visibility : 'N/A'
              });
            }, 100);

            // Verify canvas is visible
            const canvas = this.renderer?.domElement;
            if (canvas) {
              console.log('🎨 Canvas state after detail opens:', {
                display: canvas.style.display || 'not set',
                visibility: canvas.style.visibility || 'not set',
                opacity: canvas.style.opacity || 'not set',
                width: canvas.width,
                height: canvas.height,
                inDOM: document.body.contains(canvas)
              });
              
              // Force canvas to be visible
              canvas.style.display = '';
              canvas.style.visibility = 'visible';
              canvas.style.opacity = '1';
              
              console.log('✅ Forced canvas to visible state');
            }
          });

          // Optional: Listen for animation progress to hide plane earlier (more seamless)
          // Add this inside the animation timeline in ImageExpandAnimation.js
        };
        
        // Check if we need to snap to this image first
        if (clickedIndex !== currentIndex) {
          console.log(`📹 Image ${clickedIndex} is not centered, snapping camera first...`);
          
          // Calculate target offset for this image
          const calculatedSpacing = this.state.get('calculatedSpacing') || 4.194;
          const firstPosition = -4.5;
          const targetOffset = firstPosition + (clickedIndex * calculatedSpacing);
          
          console.log(`📹 Snapping to offset ${targetOffset.toFixed(2)}`);
          
          // Get PhysicsSystem for camera movement
          const physicsSystem = app.timelineController?.physicsSystem;
          
          if (physicsSystem && physicsSystem.snapToOffset) {
            // Snap camera to clicked image
            physicsSystem.snapToOffset(targetOffset, clickedIndex);
            
            // Wait 200ms for camera to reach image, then open detail page
            setTimeout(() => {
              console.log(`⏰ Camera snap complete, opening detail page for ${closest.imageData.year}`);
              startSeamlessHandoff();
            }, 500);
          } else {
            console.warn('⚠️ PhysicsSystem not available, opening without snap');
            startSeamlessHandoff();
          }
        } else {
          // Image is already centered, open immediately
          console.log(`✅ Image ${clickedIndex} is already centered, opening immediately`);
          startSeamlessHandoff();
        }
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
   * Safely hide only timeline UI elements.
   */
  hideTimelineUI() {
    if (typeof document === 'undefined') return;
    const selectors = ['.timeline-ui-wrapper', '.project-title', '#year-overlay'];
    const elements = selectors
      .map((selector) => document.querySelector(selector))
      .filter(Boolean);

    this.hiddenTimelineUIState = [];
    elements.forEach((el) => {
      this.hiddenTimelineUIState.push({
        el,
        opacity: el.style.opacity,
        visibility: el.style.visibility,
        pointerEvents: el.style.pointerEvents
      });
      el.style.opacity = '0';
      el.style.visibility = 'hidden';
      el.style.pointerEvents = 'none';
    });
  }

  /**
   * Restore timeline UI elements hidden by hideTimelineUI().
   */
  showTimelineUI() {
    if (!Array.isArray(this.hiddenTimelineUIState) || this.hiddenTimelineUIState.length === 0) {
      return;
    }

    this.hiddenTimelineUIState.forEach((item) => {
      const { el, opacity, visibility, pointerEvents } = item;
      if (!el) return;
      el.style.opacity = opacity || '';
      el.style.visibility = visibility || '';
      el.style.pointerEvents = pointerEvents || '';
    });

    this.hiddenTimelineUIState = [];
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
    if (this.onHidePlaneForDetailPage) {
      window.removeEventListener('hidePlaneForDetailPage', this.onHidePlaneForDetailPage);
      this.onHidePlaneForDetailPage = null;
    }
    if (this.onImageExpandHandoff) {
      window.removeEventListener('imageExpandHandoff', this.onImageExpandHandoff);
      this.onImageExpandHandoff = null;
    }
    this.stopDetailRenderLoop();
    this.currentAnimatingPlane = null;
    this.currentImageData = null;
    this.showTimelineUI();
    this.hiddenTimelineUIState = [];
    this.rippleAnimation = null;
    this.timelineScene = null;
    this.effects = null;

    console.log('RenderSystem disposed');
  }
}

export { RenderSystem };
