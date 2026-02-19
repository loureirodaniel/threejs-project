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
    this.timelineStateBeforeDetail = null;
    this.savedTimelineState = null;
    this.savedTimelineConfig = null;
    this.boundHandleKeydown = null;
    this.isHandlingImageClose = false;
    this.suppressNextImageCloseEvent = false;
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

    this.setupKeyboardListeners();

    console.log('RenderSystem initialized');
  }

  setupKeyboardListeners() {
    this.handleKeydown = this.handleKeydown.bind(this);
    window.addEventListener('keydown', this.handleKeydown);
    console.log('⌨️ ESC key listener added');
  }

  handleKeydown(event) {
    if (event.key === 'Escape' || event.keyCode === 27) {
      console.log('ESC pressed - closing detail');
      this.onImageClose();
    }
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

    const fullscreenPlane = this.currentAnimatingPlane?.userData?.isFullscreen
      ? this.currentAnimatingPlane
      : null;

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
    const allPlanes = window.app?.imagePlanes?.planes || [];
    // All planes are treated as a flat sequence — no split between
    // transitionedPlanes and timelinePlanes anymore.
    return {
      timelinePlanes: [],
      transitionedPlanes: allPlanes,
      allPlanes
    };
  }

  /**
   * Update all image positions based on timeline offset.
   * @param {number} offset - Current timeline offset
   */
  updateImagePositions(offset) {
    const safeOffset = Number.isFinite(offset) ? offset : 0;
    const allPlanes = window.app?.imagePlanes?.planes || [];

    const spacing = this.state.get('calculatedSpacing') || 1.8;
    const firstPosition = TIMELINE_CONFIG.FIRST_POSITION || -4.5;
    const cullDistance = 15;

    allPlanes.forEach((plane, index) => {
      if (!plane) return;
      if (plane.userData?.isFrozen && plane.userData?.isFullscreen) return;
      const originalX = firstPosition + index * spacing;
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
      }).filter(Boolean);
      
      const clickRadius = Math.min(window.innerWidth, window.innerHeight) * 0.2; // 20% of shortest viewport dimension
      console.log(`🎯 Click radius: ${clickRadius.toFixed(0)}px, checking ${screenPositions.length} planes`);

      // Find closest plane within click radius
      const closest = screenPositions
        .filter(p => p.distance < clickRadius)
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
          // FIRST: Pause systems so we store a clean, settled state.
          this.pauseTimelineSystems();

          requestAnimationFrame(() => {
            this.physicsSystem = app.timelineController?.physicsSystem || this.physicsSystem;

            // === SAVE TIMELINE STATE FOR RESTORATION ===
            console.log('💾 ========== SAVING TIMELINE STATE ==========');

            this.savedTimelineState = {
              physicsOffset: this.physicsSystem?.currentOffset || 0,
              physicsVelocity: this.physicsSystem?.velocity || 0,
              physicsEnabled: this.physicsSystem?.scrollEnabled !== false,
              cameraPosition: this.camera.position.clone(),
              cameraRotation: this.camera.rotation.clone(),
              planesState: this.imagePlanes.planes.map((plane, index) => ({
                index,
                position: plane.position.clone(),
                scale: plane.scale.clone(),
                rotation: plane.rotation.clone(),
                visible: plane.visible,
                renderOrder: plane.renderOrder,
                inScene: !!plane.parent
              }))
            };

            console.log('💾 SAVED:', {
              offset: this.savedTimelineState.physicsOffset.toFixed(2),
              planes: this.savedTimelineState.planesState.length,
              visible: this.savedTimelineState.planesState.filter((p) => p.visible).length
            });

            // Disable TitleScrollAnimation to prevent interference
            if (window.app?.timelineController?.titleScrollAnimation) {
              window.app.timelineController.titleScrollAnimation.disable?.();
              console.log('📝 TitleScrollAnimation disabled');
            }

            // THEN: Store complete timeline state for restoration
            this.timelineStateBeforeDetail = {
              cameraPosition: camera.position.clone(),
              cameraRotation: camera.rotation.clone(),
              physicsOffset: this.physicsSystem?.currentOffset || 0,
              physicsVelocity: 0,
              allPlanesState: this.imagePlanes?.planes?.map((p) => ({
                position: p.position.clone(),
                scale: p.scale.clone(),
                visible: p.visible,
                userData: { ...p.userData }
              }))
            };

            console.log('💾 Stored CLEAN timeline state', {
              cameraPos: this.timelineStateBeforeDetail.cameraPosition,
              physicsOffset: this.timelineStateBeforeDetail.physicsOffset,
              planesCount: this.timelineStateBeforeDetail.allPlanesState?.length
            });

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
            console.log('🖱️ Click position:', { x: event.clientX, y: event.clientY });

            // Store original transforms for restoration later
            animatingPlane.userData.originalScale = animatingPlane.scale.clone();
            animatingPlane.userData.originalPosition = animatingPlane.position.clone();

            console.log('💾 Stored original transforms:', {
              scale: animatingPlane.userData.originalScale,
              position: animatingPlane.userData.originalPosition
            });

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

            // Save complete timeline configuration
            console.log('💾 ========== SAVING TIMELINE STATE ==========');

            this.savedTimelineConfig = {
              // Physics state
              physicsOffset: this.physicsSystem?.currentOffset || 0,
              physicsVelocity: this.physicsSystem?.velocity || 0,
              centeredImageIndex: this.physicsSystem?.centeredImageIndex || 0,

              // Camera state
              cameraPosition: this.camera.position.clone(),
              cameraRotation: this.camera.rotation.clone(),

              // EXACT plane positions and states
              planesConfig: this.imagePlanes?.planes?.map((p, i) => ({
                index: i,
                position: p.position.clone(),
                scale: p.scale.clone(),
                rotation: p.rotation.clone(),
                visible: p.visible,
                renderOrder: p.renderOrder,
                userData: { ...p.userData }
              })),

              // Timeline spacing configuration
              imageSpacing: this.physicsSystem?.imageSpacing || 4.5,
              scrollOffset: this.physicsSystem?.scrollOffset || 0
            };

            console.log('💾 SAVED CONFIG:', {
              physicsOffset: this.savedTimelineConfig.physicsOffset.toFixed(2),
              centeredImage: this.savedTimelineConfig.centeredImageIndex,
              plane0Pos: this.savedTimelineConfig.planesConfig?.[0]?.position?.x?.toFixed?.(2),
              plane1Pos: this.savedTimelineConfig.planesConfig?.[1]?.position?.x?.toFixed?.(2),
              plane2Pos: this.savedTimelineConfig.planesConfig?.[2]?.position?.x?.toFixed?.(2)
            });

            console.log('💾 ========================================');
            
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
    if (this.suppressNextImageCloseEvent) {
      this.suppressNextImageCloseEvent = false;
      return;
    }
    if (this.isHandlingImageClose) {
      return;
    }
    this.isHandlingImageClose = true;
    this.imagePlanes = this.imagePlanes || window.app?.imagePlanes;

    console.log('🔴 ========== CLOSING DETAIL ==========');

    const fullscreenPlane =
      this.currentAnimatingPlane ||
      this.imagePlanes?.planes?.find((p) => p.userData.isFullscreen);

    if (!fullscreenPlane) {
      console.error('❌ No fullscreen plane');
      if (this.savedTimelineState) {
        console.log('🔄 No fullscreen plane; running direct restoration fallback');
        this.restoreCompleteTimelineState();
      }
      this.isHandlingImageClose = false;
      this.suppressNextImageCloseEvent = true;
      this.eventBus.emit('timeline:image:close');
      return;
    }

    const detailOverlay =
      document.querySelector('.detail-overlay') ||
      document.querySelector('.image-detail-page');

    if (detailOverlay) {
      detailOverlay.style.opacity = '0';
      detailOverlay.style.pointerEvents = 'none';
      setTimeout(() => {
        detailOverlay.style.display = 'none';
      }, 300);
    }

    console.log('🌊 Starting reverse animation');

    this.rippleAnimation.animateFromFullscreen(fullscreenPlane, () => {
      console.log('✅ Reverse animation complete');
      this.currentAnimatingPlane = null;
      this.currentImageData = null;
      this.restoreCompleteTimelineState();
      this.isHandlingImageClose = false;
      this.suppressNextImageCloseEvent = true;
      this.eventBus.emit('timeline:image:close');
    });
  }

  closeDetailView(plane) {
    if (plane && !plane.userData?.isFullscreen) {
      console.log('⚠️ No fullscreen plane to close');
      return;
    }
    this.onImageClose();
  }

  // When close button is clicked
  handleCloseButton() {
    this.onImageClose();
  }

  handleDetailClose() {
    this.onImageClose();
  }

  restoreExactTimelineConfig() {
    console.log('🔄 ========== RESTORING EXACT TIMELINE ==========');

    // Remove ALL classes that might hide UI
    document.body.classList.remove('detail-view-open');
    document.body.classList.remove('is-fullscreen');
    document.body.classList.remove('detail-active');
    console.log('🎨 Removed detail classes from body');
    console.log('  Remaining body classes:', document.body.className);

    // Force remove any inline styles on body
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('pointer-events');

    if (!this.savedTimelineConfig) {
      console.error('❌ NO SAVED TIMELINE CONFIG');
      return;
    }

    const config = this.savedTimelineConfig;
    this.physicsSystem = window.app?.timelineController?.physicsSystem || this.physicsSystem;
    this.inputSystem = window.app?.timelineController?.inputSystem || this.inputSystem;
    this.cameraSystem = window.app?.timelineController?.cameraSystem || this.cameraSystem;
    this.animationChoreographer = window.app?.timelineController?.animationChoreographer || this.animationChoreographer;

    console.log('📊 Restoring from config:', {
      physicsOffset: config.physicsOffset.toFixed(2),
      centeredImage: config.centeredImageIndex,
      planesCount: config.planesConfig.length
    });

    // STEP 1: Restore camera
    if (this.camera && config.cameraPosition && config.cameraRotation) {
      console.log('📷 Step 1: Restoring camera');
      this.camera.position.copy(config.cameraPosition);
      this.camera.rotation.copy(config.cameraRotation);
      this.camera.updateMatrixWorld(true);
    }

    // STEP 2: Restore physics system
    console.log('⚙️ Step 2: Restoring physics system');
    if (this.physicsSystem) {
      // CRITICAL: Disable physics first to prevent overrides
      this.physicsSystem.enabled = false;
      this.physicsSystem.scrollEnabled = false;
      this.physicsSystem.isBeingRestored = true;

      // Restore exact values
      this.physicsSystem.currentOffset = config.physicsOffset;
      this.physicsSystem.targetOffset = config.physicsOffset;
      this.physicsSystem.velocity = 0;
      this.physicsSystem.centeredImageIndex = config.centeredImageIndex;
      this.physicsSystem.imageSpacing = config.imageSpacing;

      // Keep state store aligned with restored offset/index
      this.state.setState({
        timelineOffset: config.physicsOffset,
        currentSnapIndex: config.centeredImageIndex,
        targetOffset: config.physicsOffset,
        scrollVelocity: 0
      });

      console.log('  Physics offset:', this.physicsSystem.currentOffset.toFixed(2));
      console.log('  Centered image:', this.physicsSystem.centeredImageIndex);
    }

    const cameraSystem = window.app?.timelineController?.cameraSystem;
    if (cameraSystem) {
      const restoredOffset = config.physicsOffset;
      cameraSystem.lookAtTarget.set(-restoredOffset, 0, 0);
      cameraSystem.lookAtCurrent.set(-restoredOffset, 0, 0);
      cameraSystem.camera.lookAt(cameraSystem.lookAtCurrent);
      cameraSystem.camera.updateMatrixWorld(true);
      console.log('📷 Camera lookAt synced to offset:', restoredOffset);
    }

    // STEP 3: Restore ALL planes - AGGRESSIVE approach
    console.log('🖼️ Step 3: Making ALL planes visible (aggressive)');

    const totalPlanes = this.imagePlanes?.planes?.length || 0;
    console.log(`  Total planes in scene: ${totalPlanes}`);

    this.imagePlanes?.planes?.forEach((plane, index) => {
      const savedPlane = config.planesConfig?.[index];

      // Restore position from saved state if available
      if (savedPlane) {
        plane.position.copy(savedPlane.position);
        plane.scale.copy(savedPlane.scale);
      }

      // FORCE visible - no exceptions
      plane.visible = true;
      plane.renderOrder = index;

      // Ensure material is opaque
      if (plane.material) {
        plane.material.opacity = 1;
        plane.material.transparent = true;
        plane.material.needsUpdate = true;
      }

      // Clean up fullscreen userData
      plane.userData.isFullscreen = false;
      plane.userData.isFrozen = false;
      delete plane.userData.animatingToFullscreen;
      delete plane.userData.animatingFromFullscreen;

      plane.updateMatrixWorld(true);

      console.log(`  ✓ Plane ${index}: pos=(${plane.position.x.toFixed(1)}, ${plane.position.y.toFixed(1)}), visible=true`);
    });

    // Count visible planes
    const visibleCount = this.imagePlanes?.planes?.filter((p) => p.visible).length || 0;
    console.log(`  📊 Total visible planes: ${visibleCount}/${totalPlanes}`);

    if (visibleCount < totalPlanes) {
      console.error(`  ⚠️ WARNING: Only ${visibleCount} of ${totalPlanes} planes are visible!`);
    }

    // STEP 4: Force render to show restored state
    console.log('🎨 Step 4: Forcing render');
    requestAnimationFrame(() => {
      if (this.renderer && this.scene) {
        this.renderer.render(this.scene, this.camera);
        console.log('  ✓ Rendered restored state');
      }

      // STEP 5: Re-enable systems
      setTimeout(() => {
        if (this.physicsSystem) {
          this.physicsSystem.isBeingRestored = false;
          this.physicsSystem.enabled = true;
          this.physicsSystem.scrollEnabled = true;
          console.log('⚙️ Step 5: Physics re-enabled');
        }

        // Re-enable other systems
        if (this.inputSystem) {
          this.inputSystem.enabled = true;
        }
        if (this.cameraSystem?.unfreeze) {
          this.cameraSystem.unfreeze();
        } else if (this.cameraSystem?.unfreezeCamera) {
          this.cameraSystem.unfreezeCamera();
        }
        if (this.animationChoreographer) {
          this.animationChoreographer.enabled = true;
        }

        // Re-enable canvas interaction and stop detail render loop
        const canvas = this.renderer?.domElement;
        if (canvas) {
          canvas.style.pointerEvents = 'auto';
        }
        if (window.app?.enableCanvasInteraction) {
          window.app.enableCanvasInteraction();
        }
        this.stopContinuousRender();

        console.log('✅ All systems re-enabled');

        // STEP 6: Restore "Three.js Project" title at top
        console.log('📝 Step 6: Restoring title to top');

        // Try multiple selectors
        const title =
          document.querySelector('.title-overlay') ||
          document.querySelector('.title-div') ||
          document.querySelector('.timeline-title') ||
          document.querySelector('.project-title') ||
          document.querySelector('h1');

        if (title) {
          console.log('  Found title element:', title.className || title.tagName);
          console.log('  Current text:', title.textContent?.substring(0, 30));

          // Force title to top with !important
          title.style.cssText = `
            position: fixed !important;
            top: 32px !important;
            left: 50% !important;
            transform: translateX(-50%) scale(0.8) !important;
            opacity: 1 !important;
            visibility: visible !important;
            display: block !important;
            pointer-events: none !important;
            z-index: 100 !important;
          `;

          // Also trigger TitleScrollAnimation to move it to top
          if (window.app?.timelineController?.titleScrollAnimation) {
            const titleAnim = window.app.timelineController.titleScrollAnimation;
            if (titleAnim.isAtTop === false) {
              console.log('  Triggering TitleScrollAnimation to move to top');
              titleAnim.moveToTop();
            }
          }

          console.log('  ✓ Title positioned at top');
        } else {
          console.error('  ❌ Title element NOT FOUND');
          console.log('  Available h1 elements:', document.querySelectorAll('h1').length);
          console.log(
            '  Available title classes:',
            Array.from(document.querySelectorAll('[class*="title"]')).map((el) => el.className)
          );
        }

        // STEP 7: Show timeline navigation
        console.log('🧭 Step 7: Showing timeline navigation');
        const timelineNav = document.querySelector('.timeline-navigation');

        if (timelineNav) {
          timelineNav.style.display = 'flex';
          timelineNav.style.opacity = '1';
          timelineNav.style.visibility = 'visible';
          timelineNav.style.pointerEvents = 'auto';

          console.log('  ✓ Navigation visible');
        } else {
          console.warn('  ⚠️ Timeline navigation not found');
        }

        // Emit event for other components
        if (window.EventBus?.emit) {
          window.EventBus.emit('timeline:restored');
        } else if (this.eventBus?.emit) {
          this.eventBus.emit('timeline:restored', {});
        }

        // STEP 8: Restore year display
        console.log('📅 Step 8: Restoring year display');

        const yearDisplay =
          document.querySelector('.year-display') ||
          document.querySelector('.timeline-year') ||
          document.querySelector('[class*="year"]');

        if (yearDisplay) {
          console.log('  Found year element:', yearDisplay.className);

          yearDisplay.style.cssText = `
            opacity: 1 !important;
            visibility: visible !important;
            display: block !important;
            pointer-events: auto !important;
          `;

          console.log('  ✓ Year display visible');
        } else {
          console.error('  ❌ Year display NOT FOUND');
          console.log(
            '  Searching for year elements:',
            Array.from(document.querySelectorAll('[class*="year"]')).map((el) => ({
              class: el.className,
              text: el.textContent?.substring(0, 20)
            }))
          );
        }
      }, 100); // Small delay to let positions settle
    });

    // Clean up
    this.savedTimelineConfig = null;

    console.log('✅ ========== TIMELINE FULLY RESTORED ==========');

    // DIAGNOSTIC: Check what's still hidden
    setTimeout(() => {
      console.log('🔍 ========== VISIBILITY CHECK ==========');

      // Check planes
      const allPlanes = this.imagePlanes?.planes || [];
      const visiblePlanes = allPlanes.filter((p) => p.visible);
      const hiddenPlanes = allPlanes.filter((p) => !p.visible);

      console.log(`📊 Planes: ${visiblePlanes.length} visible, ${hiddenPlanes.length} hidden`);
      if (hiddenPlanes.length > 0) {
        console.log(
          '  Hidden plane indices:',
          hiddenPlanes.map((p) => allPlanes.indexOf(p))
        );
      }

      // Check title
      const title =
        document.querySelector('h1') ||
        document.querySelector('[class*="title"]');
      if (title) {
        const styles = window.getComputedStyle(title);
        console.log('📝 Title state:', {
          exists: true,
          text: title.textContent?.substring(0, 30),
          display: styles.display,
          opacity: styles.opacity,
          visibility: styles.visibility,
          top: styles.top
        });
      } else {
        console.error('❌ Title element not found in DOM');
      }

      // Check year
      const year = document.querySelector('[class*="year"]');
      if (year) {
        const styles = window.getComputedStyle(year);
        console.log('📅 Year state:', {
          exists: true,
          text: year.textContent?.substring(0, 20),
          display: styles.display,
          opacity: styles.opacity,
          visibility: styles.visibility
        });
      } else {
        console.error('❌ Year element not found in DOM');
      }

      console.log('🔍 ====================================');
    }, 1000);

    // NUCLEAR OPTION: Force everything visible
    setTimeout(() => {
      console.log('🔥 FORCING VISIBILITY (nuclear option)');

      // Force all planes
      this.imagePlanes?.planes?.forEach((p, i) => {
        p.visible = true;
        if (p.material) {
          p.material.opacity = 1;
          p.material.transparent = true;
        }
        console.log(`  Plane ${i}: FORCED visible`);
      });

      // Force title
      const title =
        document.querySelector('.timeline-title') ||
        document.querySelector('h1');
      if (title) {
        title.style.cssText = `
          position: fixed !important;
          top: 32px !important;
          left: 50% !important;
          transform: translateX(-50%) scale(0.8) !important;
          opacity: 1 !important;
          visibility: visible !important;
          display: block !important;
        `;
        console.log('  Title: FORCED visible');
      }

      // Force navigation
      const nav = document.querySelector('.timeline-navigation');
      if (nav) {
        nav.style.cssText = `
          display: flex !important;
          opacity: 1 !important;
          visibility: visible !important;
          pointer-events: auto !important;
        `;
        console.log('  Navigation: FORCED visible');
      }

      // Force render
      if (this.renderer && this.scene) {
        this.renderer.render(this.scene, this.camera);
        console.log('  Forced final render');
      }

      console.log('✅ Everything forced visible with !important');
    }, 500);

    // NUCLEAR OPTION: Force everything visible over multiple frames
    const forceVisibility = (attempt = 1) => {
      if (attempt > 3) return; // Max 3 attempts

      console.log(`🔥 Force visibility attempt ${attempt}/3`);

      // Force all planes
      this.imagePlanes?.planes?.forEach((p) => {
        p.visible = true;
        if (p.material) {
          p.material.opacity = 1;
        }
      });

      // Force title
      const title =
        document.querySelector('.title-overlay') ||
        document.querySelector('h1');
      if (title) {
        title.style.display = 'block';
        title.style.opacity = '1';
        title.style.visibility = 'visible';
      }

      // Force year
      const year = document.querySelector('[class*="year"]');
      if (year) {
        year.style.display = 'block';
        year.style.opacity = '1';
        year.style.visibility = 'visible';
      }

      // Force render
      if (this.renderer && this.scene) {
        this.renderer.render(this.scene, this.camera);
      }

      // Try again next frame
      requestAnimationFrame(() => forceVisibility(attempt + 1));
    };

    // Start forcing
    setTimeout(() => forceVisibility(), 200);
  }

  restoreCompleteTimelineState() {
    console.log('🔄 ========== RESTORING TIMELINE ==========');

    if (!this.savedTimelineState) {
      console.error('❌ NO SAVED STATE');
      return;
    }

    const state = this.savedTimelineState;

    // Remove hiding classes
    document.body.classList.remove('detail-view-open', 'is-fullscreen');
    this.state.setState({ isImageEnlarged: false, enlargedImageId: null });
    this.effects.backgroundBlurEffect?.deactivate?.();

    // Restore camera
    console.log('📷 Restoring camera');
    this.camera.position.copy(state.cameraPosition);
    this.camera.rotation.copy(state.cameraRotation);
    this.camera.updateMatrixWorld(true);

    // Restore physics
    console.log('⚙️ Restoring physics');
    if (this.physicsSystem) {
      this.physicsSystem.scrollEnabled = false;
      this.physicsSystem.currentOffset = state.physicsOffset;
      this.physicsSystem.targetOffset = state.physicsOffset;
      this.physicsSystem.velocity = 0;
    }

    // Restore ALL planes
    console.log('🖼️ Restoring ALL planes');
    let restored = 0;

    this.imagePlanes.planes.forEach((plane, index) => {
      const saved = state.planesState[index];
      if (saved) {
        plane.scale.copy(saved.scale);
        plane.rotation.copy(saved.rotation);
        restored++;
      }

      plane.visible = true;
      plane.renderOrder = index;

      if (!plane.parent && this.scene) this.scene.add(plane);
      if (plane.material) {
        plane.material.opacity = 1;
        plane.material.needsUpdate = true;
      }

      plane.userData.isFullscreen = false;
      plane.userData.isFrozen = false;
      plane.updateMatrixWorld(true);
    });

    // Force immediate position update with restored offset
    this.updateImagePositions(state.physicsOffset);
    const cameraSystem = window.app?.timelineController?.cameraSystem;
    if (cameraSystem) {
      const restoredOffset = state.physicsOffset;
      cameraSystem.lookAtTarget.set(-restoredOffset, 0, 0);
      cameraSystem.lookAtCurrent.set(-restoredOffset, 0, 0);
      cameraSystem.camera.lookAt(cameraSystem.lookAtCurrent);
      cameraSystem.camera.updateMatrixWorld(true);
      console.log('📷 Camera lookAt synced to offset:', restoredOffset);
    }

    console.log(`  ✓ ${restored}/${this.imagePlanes.planes.length} planes`);

    // Restore title - FORCE to top and disable scroll animation
    console.log('📝 Restoring title (forcing to top)');

    // First, disable TitleScrollAnimation if it exists
    let titleAnimation = null;
    if (window.app?.timelineController?.titleScrollAnimation) {
      titleAnimation = window.app.timelineController.titleScrollAnimation;
      titleAnimation.disable?.();
      console.log('  Disabled TitleScrollAnimation');
    }

    const titleSelectors = ['.title-overlay', '.title-div', '.project-title', '.timeline-title', 'h1'];
    let title = null;
    for (const selector of titleSelectors) {
      title = document.querySelector(selector);
      if (title) {
        console.log(`  Found: ${selector}`);
        break;
      }
    }

    if (title) {
      // Force title to top position
      title.style.cssText = `
        position: fixed !important;
        top: 32px !important;
        left: 50% !important;
        transform: translateX(-50%) scale(0.8) !important;
        opacity: 1 !important;
        visibility: visible !important;
        display: block !important;
        z-index: 100 !important;
        pointer-events: none !important;
      `;

      // Force parent containers visible
      let parent = title.parentElement;
      while (parent && parent !== document.body) {
        parent.style.opacity = '1';
        parent.style.visibility = 'visible';
        parent = parent.parentElement;
      }

      console.log('  ✓ Title forced to top');

      // Re-enable TitleScrollAnimation AFTER positioning, and reset to top state
      setTimeout(() => {
        if (titleAnimation) {
          // Reset animation to "already at top" state
          titleAnimation.isAtTop = true;
          titleAnimation.hasScrolled = false;

          // Re-enable
          titleAnimation.enable?.();
          console.log('  ✓ TitleScrollAnimation re-enabled and reset');
        }
      }, 500);
    } else {
      console.error('  ❌ Title NOT FOUND');
    }

    console.log("RESTORING BIG YEAR OVERLAY");
    const bigYearElement = document.querySelector('.year-overlay');
    if (!bigYearElement) {
      console.error("Big year overlay NOT FOUND");
      return;
    }

    // Calculate current year from restored state
    const calculatedSpacing = this.state?.get?.('calculatedSpacing') ?? 4.194;
    const firstPosition = 0;
    const startYear = 2010;
    const yearCount = 10;
    const relativeOffset = state.physicsOffset - firstPosition;
    const yearIndex = Math.round(relativeOffset / calculatedSpacing);
    const clampedIndex = Math.max(0, Math.min(yearIndex, yearCount - 1));
    const currentYear = startYear + clampedIndex;

    // Restore element through YearOverlay API to keep ticker DOM intact.
    const yearOverlay = window.app?.yearOverlay;
    if (yearOverlay) {
      yearOverlay.setYear(currentYear);
      yearOverlay.show();
    } else {
      // Fallback if overlay instance is unavailable.
      const firstSlot = bigYearElement.querySelector('.year-overlay-slot');
      if (firstSlot) {
        firstSlot.textContent = currentYear.toString();
      }
    }
    bigYearElement.classList.remove('hidden', 'fade-out', 'detail-active');
    bigYearElement.style.cssText = `
      opacity: 1 !important;
      visibility: visible !important;
      display: block !important;
      pointer-events: none !important;
      position: fixed !important;
      top: 20% !important;
      left: 50% !important;
      transform: translateX(-50%) scale(1.2) !important;
      z-index: 999999 !important;
      font-size: clamp(120px, 20vw, 300px) !important;
      color: white !important;
    `;
    let parent = bigYearElement.parentElement;
    while (parent && parent !== document.body) {
      parent.style.setProperty('opacity', '1', 'important');
      parent.style.setProperty('visibility', 'visible', 'important');
      parent.style.setProperty('z-index', '99999', 'important');
      parent = parent.parentElement;
    }
    console.log(`Big year overlay restored to ${currentYear}`);

    // === STEP 6: Restore Navigation ===
    const nav = document.querySelector('.timeline-navigation');
    if (nav) {
      nav.style.cssText = `
        display: flex !important;
        opacity: 1 !important;
        visibility: visible !important;
      `;
      console.log('🧭 Navigation visible');
    }

    // Restore year display
    console.log('📅 Restoring year (aggressive)');
    const yearSelectors = ['.year-display', '.timeline-year', '.current-year', '[class*="year"]', '.timeline-navigation .year'];
    let yearDisplay = null;
    for (const selector of yearSelectors) {
      yearDisplay = document.querySelector(selector);
      if (yearDisplay) break;
    }
    if (yearDisplay) {
      yearDisplay.style.cssText = 'opacity: 1 !important; visibility: visible !important; display: block !important;';
      let parent = yearDisplay.parentElement;
      while (parent && parent !== document.body) {
        parent.style.opacity = '1';
        parent.style.visibility = 'visible';
        parent = parent.parentElement;
      }
      console.log('  ✓ Year visible');
    } else {
      console.error('  ❌ Year NOT FOUND');
    }

    // Force render
    requestAnimationFrame(() => {
      if (this.renderer && this.scene) {
        this.renderer.render(this.scene, this.camera);
      }

      setTimeout(() => {
        console.log('▶️ Re-enabling systems');
        if (this.physicsSystem) {
          this.physicsSystem.scrollEnabled = true;
          this.physicsSystem.enabled = true;
          this.physicsSystem.paused = false;
          delete this.physicsSystem.isBeingRestored;
          console.log('  ✓ Physics enabled:', this.physicsSystem.scrollEnabled);
        }
        if (this.state) {
          this.state.setState({ isImageEnlarged: false, isDragging: false });
        }
        if (window.app?.timelineController) {
          window.app.timelineController.resumeTimeline?.();
          window.app.timelineController.cameraSystem?.unfreezeCamera?.();
          if (window.app.timelineController.inputSystem) {
            window.app.timelineController.inputSystem.enabled = true;
            console.log('  ✓ InputSystem enabled');
          }
        }
        if (window.app) {
          window.app.enableCanvasInteraction?.();
        }
        const canvas = document.querySelector('canvas');
        if (canvas) {
          canvas.style.pointerEvents = 'auto';
          canvas.style.touchAction = 'none';
          canvas.focus?.();
          console.log('  ✓ Canvas events enabled and focused');
        }

        for (let i = 0; i < 3; i++) {
          requestAnimationFrame(() => {
            if (this.renderer && this.scene) {
              this.renderer.render(this.scene, this.camera);
            }
          });
        }

        console.log('✅ All systems enabled');
      }, 100);
    });

    this.savedTimelineState = null;

    setTimeout(() => {
      console.log('🔍 POST-RESTORATION CHECK:');
      const t = document.querySelector('h1');
      const y = document.querySelector('[class*="year"]');
      console.log('  Title:', t ? window.getComputedStyle(t).display : 'NOT FOUND');
      console.log('  Year:', y ? window.getComputedStyle(y).display : 'NOT FOUND');
      console.log('  Physics scrollEnabled:', this.physicsSystem?.scrollEnabled);
      console.log('  Input enabled:', window.app?.timelineController?.inputSystem?.enabled);
    }, 1000);
    console.log('✅ ========== RESTORATION COMPLETE ==========');
  }

  restoreTimelineState() {
    // Backward-compatible alias
    this.restoreCompleteTimelineState();
  }

  pauseTimelineSystems() {
    const timelineController = window.app?.timelineController;
    this.physicsSystem = timelineController?.physicsSystem || this.physicsSystem;
    this.inputSystem = timelineController?.inputSystem || this.inputSystem;
    this.cameraSystem = timelineController?.cameraSystem || this.cameraSystem;
    this.animationChoreographer = timelineController?.animationChoreographer || this.animationChoreographer;

    if (this.physicsSystem) {
      if ('enabled' in this.physicsSystem) {
        this.physicsSystem.enabled = false;
      }
      if ('scrollEnabled' in this.physicsSystem) {
        this.physicsSystem.scrollEnabled = false;
      }
      this.physicsSystem.velocity = 0;
    }
    if (this.inputSystem && 'enabled' in this.inputSystem) {
      this.inputSystem.enabled = false;
    }
    if (this.animationChoreographer && 'enabled' in this.animationChoreographer) {
      this.animationChoreographer.enabled = false;
    }
    if (this.cameraSystem?.freeze) {
      this.cameraSystem.freeze();
    } else if (this.cameraSystem?.freezeCamera) {
      this.cameraSystem.freezeCamera();
    }

    console.log('⏸️ Timeline systems paused');
  }

  resumeTimelineSystems() {
    console.log('▶️ Resuming timeline systems');

    const timelineController = window.app?.timelineController;
    this.physicsSystem = timelineController?.physicsSystem || this.physicsSystem;
    this.inputSystem = timelineController?.inputSystem || this.inputSystem;
    this.cameraSystem = timelineController?.cameraSystem || this.cameraSystem;
    this.animationChoreographer = timelineController?.animationChoreographer || this.animationChoreographer;

    // Re-enable physics
    if (this.physicsSystem) {
      if ('enabled' in this.physicsSystem) {
        this.physicsSystem.enabled = true;
      }
      if ('scrollEnabled' in this.physicsSystem) {
        this.physicsSystem.scrollEnabled = true;
      }
    }

    // Re-enable input
    if (this.inputSystem && 'enabled' in this.inputSystem) {
      this.inputSystem.enabled = true;
    }

    // Unfreeze camera
    if (this.cameraSystem?.unfreeze) {
      this.cameraSystem.unfreeze();
    } else if (this.cameraSystem?.unfreezeCamera) {
      this.cameraSystem.unfreezeCamera();
    }

    // Resume animation choreographer
    if (this.animationChoreographer && 'enabled' in this.animationChoreographer) {
      this.animationChoreographer.enabled = true;
    }

    if (timelineController?.resumeTimeline) {
      timelineController.resumeTimeline();
    } else {
      this.paused = false;
      this.showTimelineUI();
      this.eventBus.emit('timeline:resume', {});
    }

    console.log('✅ Timeline systems resumed');
  }

  stopContinuousRender() {
    this.stopDetailRenderLoop();
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
    const selectors = ['.timeline-ui-wrapper', '.project-title', '.year-overlay'];
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
    if (this.handleKeydown) {
      window.removeEventListener('keydown', this.handleKeydown);
    }
    if (this.boundHandleKeydown) {
      window.removeEventListener('keydown', this.boundHandleKeydown);
      this.boundHandleKeydown = null;
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
