/**
 * CameraSystem - Manages camera position, FOV, look-at, and scene transitions
 *
 * Replaces:
 * - TimelineCameraController.js
 * - Parts of TimelineSceneController.js
 *
 * Responsibilities:
 * 1. Scene transitions (initial <-> timeline)
 * 2. Camera look-at smoothing (follow timeline offset)
 * 3. FOV animations during transitions
 * 4. Hold-to-pullback behavior (optional)
 *
 * @module timeline-v2/systems
 */

import * as THREE from 'three';
import { gsap } from 'gsap';
import { CAMERA_CONFIG, SCENE_CONFIG, TIMING_CONFIG } from '../utils/TimelineConstants.js';

class CameraSystem {
  constructor(state, eventBus, camera) {
    this.state = state;
    this.eventBus = eventBus;
    this.camera = camera;

    // Camera state
    this.lookAtTarget = new THREE.Vector3(0, 0, 0);
    this.lookAtCurrent = new THREE.Vector3(0, 0, 0);
    this.transitionAnimation = null;

    // Hold-to-pullback state (optional feature)
    this.isPullingBack = false;
    this.pullbackStartTime = 0;
    this.pullbackAnimation = null;
    this.pullbackCheckRafId = null;
    this.cameraFrozen = false;
    this.frozenPosition = null;
    this.debugCameraConfig = null;

    this.unsubscribeFns = [];
    this.init();
  }

  init() {
    // Subscribe to events
    this.unsubscribeFns.push(
      this.eventBus.on('scene:transition:start', this.onSceneTransition.bind(this)),
      this.eventBus.on('scene:transition', this.onSceneTransition.bind(this)),
      this.eventBus.on('timeline:drag:start', this.onDragStart.bind(this)),
      this.eventBus.on('timeline:drag:end', this.onDragEnd.bind(this))
    );

    console.log('✅ CameraSystem initialized');
  }

  /**
   * Update camera every frame
   * @param {number} deltaTime - Time since last frame in seconds
   */
  update(deltaTime) {
    // Don't update camera if frozen
    if (this.cameraFrozen) {
      if (this.frozenPosition) {
        this.camera.position.copy(this.frozenPosition);
      }
      return;
    }

    const currentScene = this.state.get('currentSceneIndex');

    // Only update look-at on timeline scene
    if (currentScene === 1 && !this.state.get('isTransitioning')) {
      this.updateLookAt(deltaTime);
    }
  }

  /**
   * Freeze camera for fullscreen view
   */
  freezeCamera() {
    this.cameraFrozen = true;
    this.frozenPosition = this.camera.position.clone();
    console.log('📷 Camera frozen at:', {
      x: this.frozenPosition.x.toFixed(2),
      y: this.frozenPosition.y.toFixed(2),
      z: this.frozenPosition.z.toFixed(2)
    });
  }

  /**
   * Unfreeze camera
   */
  unfreezeCamera() {
    this.cameraFrozen = false;
    console.log('📷 Camera unfrozen');
  }

  /**
   * Smooth camera look-at following timeline offset (frame-rate independent)
   * @param {number} deltaTime
   */
  updateLookAt(deltaTime) {
    const debugConfig = this.debugCameraConfig;
    if (debugConfig?.enabled) {
      const target = debugConfig.target || { x: 0, y: 0, z: 0 };
      this.lookAtTarget.set(target.x, target.y, target.z);
    } else {
      // Calculate target look-at X based on timeline offset
      const offset = this.state.get('timelineOffset');
      this.lookAtTarget.x = -offset; // Camera looks at where images are
      this.lookAtTarget.y = 0;
      this.lookAtTarget.z = 0;
    }

    // Exponential smoothing for frame-rate independence
    const lookAtLerpSpeed = CAMERA_CONFIG?.LOOK_AT_LERP_SPEED ?? 5.0;
    const safeDelta = Math.max(0, Number.isFinite(deltaTime) ? deltaTime : 0);
    const t = 1 - Math.exp(-lookAtLerpSpeed * safeDelta);

    this.lookAtCurrent.lerp(this.lookAtTarget, t);

    if (debugConfig?.enabled && debugConfig.position) {
      this.camera.position.set(
        debugConfig.position.x,
        debugConfig.position.y,
        debugConfig.position.z
      );
    }

    if (debugConfig?.enabled && Number.isFinite(debugConfig.fov)) {
      this.camera.fov = debugConfig.fov;
    }

    if (debugConfig?.enabled && Number.isFinite(debugConfig.near)) {
      this.camera.near = debugConfig.near;
    }

    if (debugConfig?.enabled && Number.isFinite(debugConfig.far)) {
      this.camera.far = debugConfig.far;
    }

    if (debugConfig?.enabled && Number.isFinite(debugConfig.zoom)) {
      this.camera.zoom = debugConfig.zoom;
    }

    if (debugConfig?.enabled) {
      this.camera.updateProjectionMatrix();
    }

    // Update camera orientation
    this.camera.lookAt(this.lookAtCurrent);

    // Scroll zoom - camera pulls back slightly while scrolling
    if (CAMERA_CONFIG.SCROLL_ZOOM_ENABLED) {
      const scrollVelocity = Math.abs(this.state.get('scrollVelocity') || 0);
      const baseZ = SCENE_CONFIG.timeline.position.z; // 2.5
      const maxPullback = CAMERA_CONFIG.SCROLL_ZOOM_MAX_PULLBACK;
      const velocityScale = CAMERA_CONFIG.SCROLL_ZOOM_VELOCITY_SCALE;
      const lerpSpeed = CAMERA_CONFIG.SCROLL_ZOOM_LERP_SPEED;

      const targetZ = baseZ + Math.min(scrollVelocity * velocityScale, maxPullback);
      const safeDeltaZ = Math.max(0, Number.isFinite(deltaTime) ? deltaTime : 0);
      const tZ = 1 - Math.exp(-lerpSpeed * safeDeltaZ);
      this.camera.position.z += (targetZ - this.camera.position.z) * tZ;
    }

    if (debugConfig?.enabled && debugConfig.rotationOffset) {
      const { x = 0, y = 0, z = 0 } = debugConfig.rotationOffset;
      const baseQuaternion = this.camera.quaternion.clone();
      const rotationOffset = new THREE.Euler(
        THREE.MathUtils.degToRad(x),
        THREE.MathUtils.degToRad(y),
        THREE.MathUtils.degToRad(z),
        'XYZ'
      );
      const rotationOffsetQuat = new THREE.Quaternion().setFromEuler(rotationOffset);
      this.camera.quaternion.copy(baseQuaternion).multiply(rotationOffsetQuat);
    }
  }

  /**
   * Apply debug camera overrides from the debug panel.
   * @param {object|null} config
   */
  setDebugCameraConfig(config) {
    if (!config || config.enabled === false) {
      this.debugCameraConfig = null;
      return;
    }

    this.debugCameraConfig = {
      enabled: true,
      position: config.position || null,
      target: config.target || null,
      rotationOffset: config.rotationOffset || null,
      fov: config.fov,
      near: config.near,
      far: config.far,
      zoom: config.zoom
    };
  }

  /**
   * Handle scene transition
   * @param {object} data - { fromScene, toScene }
   */
  onSceneTransition({ fromScene, toScene } = {}) {
    let resolvedFromScene = fromScene;
    let resolvedToScene = toScene;

    // Support both scene-name payload and scene-index payload.
    if ((!resolvedFromScene || !resolvedToScene) && typeof arguments[0] === 'object' && arguments[0] !== null) {
      const { from, to } = arguments[0];
      if (typeof from === 'number') resolvedFromScene = from === 0 ? 'initial' : 'timeline';
      if (typeof to === 'number') resolvedToScene = to === 0 ? 'initial' : 'timeline';
    }

    console.log(`🎬 CameraSystem: Transitioning ${resolvedFromScene} -> ${resolvedToScene}`);

    if (resolvedFromScene === 'initial' && resolvedToScene === 'timeline') {
      const imagesGathered = this.state.get('imagesGathered');
      if (imagesGathered) {
        console.log('📷 CameraSystem: Images already gathered, skipping camera animation');
        this.state.setState({ isTransitioning: false });
        this.eventBus.emit('scene:transition:complete', { scene: 'timeline' });
        return; // Exit early, don't touch camera
      }
    }

    // Get scene configurations
    const toConfig = SCENE_CONFIG[resolvedToScene];
    if (!toConfig) {
      console.error('❌ Scene config not found:', { fromScene: resolvedFromScene, toScene: resolvedToScene });
      return;
    }

    // Kill existing transition
    if (this.transitionAnimation) {
      this.transitionAnimation.kill();
      this.transitionAnimation = null;
    }

    // Mark as transitioning
    this.state.setState({ isTransitioning: true });

    const duration = TIMING_CONFIG?.TRANSITION_DURATION ?? 1.5;
    const isInitialToTimelineTransition = (
      resolvedFromScene === 'initial' && resolvedToScene === 'timeline'
    );
    const shouldSkipCameraMovement = isInitialToTimelineTransition;

    // Animate camera position and FOV
    this.transitionAnimation = gsap.timeline({
      onComplete: () => {
        this.transitionAnimation = null;
      }
    });

    // Initial -> timeline camera positioning is fully handled by AnimationChoreographer.
    if (!shouldSkipCameraMovement) {
      this.transitionAnimation.to(this.camera.position, {
        x: toConfig.position.x,
        y: toConfig.position.y,
        z: toConfig.position.z,
        duration,
        ease: 'power2.inOut'
      });
    } else {
      console.log('📷 CameraSystem: Skipping camera movement (position handled by AnimationChoreographer)');
    }

    this.transitionAnimation
      .to(this.camera, {
      fov: toConfig.fov,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        // Projection matrix must update whenever FOV changes
        this.camera.updateProjectionMatrix();
      }
    }, shouldSkipCameraMovement ? 0 : '<')
      .call(() => {
        // Transition complete
        const newSceneIndex = resolvedToScene === 'timeline' ? 1 : 0;
        
        this.state.setState({ 
          isTransitioning: false,
          currentSceneIndex: newSceneIndex
        });
        
        // CRITICAL: Timeline scene activation
        if (newSceneIndex === 1) {
          const offset = this.state.get('timelineOffset') || -4.5;
          this.lookAtCurrent.set(-offset, 0, 0);
          this.lookAtTarget.set(-offset, 0, 0);
          this.camera.lookAt(this.lookAtCurrent);
          
          console.log('🎬 CameraSystem: Activating timeline scene (images already gathered)...');
          
          if (window.app && window.app.imagePlanes) {
            const planes = window.app.imagePlanes.getPlanes();
            
            planes.forEach((plane, index) => {
              plane.userData.isTimelineTransitioned = true;
              plane.visible = true;
              console.log(`  Image ${index}: already at timeline position x=${plane.position.x.toFixed(2)}`);
            });
            
            console.log('✅ Timeline scene activated (no repositioning needed)');
          } else {
            console.error('❌ window.app.imagePlanes not found!');
          }
        } else {
          // INITIAL SCENE - Return to scattered layout
          this.lookAtCurrent.set(0, 0, 0);
          this.lookAtTarget.set(0, 0, 0);
          this.camera.lookAt(0, 0, 0);
          
          console.log('📐 CameraSystem: Returning to initial scene - scattering images...');
          this.scatterImagesToInitialLayout();
        }
        
        this.eventBus.emit('scene:transition:complete', { scene: resolvedToScene });
        console.log('✅ CameraSystem: Transition complete');
      });
  }

  /**
   * Animate images back to scattered initial-scene layout.
   */
  scatterImagesToInitialLayout() {
    if (!(window.app && window.app.imagePlanes)) return;

    const planes = window.app.imagePlanes.getPlanes();
    const scatteredPositions = [
      { x: -2.5, y: 2.8, scale: 0.6 },
      { x: -3.0, y: 2.0, scale: 0.5 },
      { x: 2.5, y: 2.5, scale: 0.55 },
      { x: 3.2, y: 3.0, scale: 0.5 },
      { x: -3.5, y: 0.5, scale: 0.5 },
      { x: -2.8, y: -0.5, scale: 0.55 },
      { x: 3.0, y: 0.3, scale: 0.6 },
      { x: 3.5, y: -0.8, scale: 0.5 },
      { x: -2.2, y: -2.8, scale: 0.55 },
      { x: 2.0, y: -2.5, scale: 0.6 }
    ];

    planes.forEach((plane, index) => {
      plane.userData.isTimelineTransitioned = false;

      const pos = scatteredPositions[index] || {
        x: (Math.random() - 0.5) * 6,
        y: (Math.random() - 0.5) * 5,
        scale: 0.5 + Math.random() * 0.2
      };

      gsap.to(plane.position, {
        x: pos.x,
        y: pos.y,
        z: 0,
        duration: 1.0,
        ease: 'power3.inOut',
        delay: index * 0.05
      });

      gsap.to(plane.scale, {
        x: pos.scale,
        y: pos.scale,
        z: pos.scale,
        duration: 1.0,
        ease: 'power3.inOut',
        delay: index * 0.05
      });

      if (plane.material) {
        gsap.to(plane.material, {
          opacity: 0.7,
          duration: 1.0,
          ease: 'power2.inOut',
          delay: index * 0.05
        });
      }

      plane.visible = true;
    });

    console.log('✅ Images scattered back to initial positions');
  }

  positionInitialSceneImages() {
    if (window.app && window.app.imagePlanes) {
      const planes = window.app.imagePlanes.getPlanes();

      // Position images in artistic scattered pattern
      // These positions create a balanced composition around the title
      // Camera: z=5, FOV=75 -> visible range ~= +/-4 units X/Y at z=0
      const scatteredPositions = [
        // Top-left cluster
        { x: -2.5, y: 2.8, scale: 0.6 },
        { x: -3.0, y: 2.0, scale: 0.5 },

        // Top-right cluster
        { x: 2.5, y: 2.5, scale: 0.55 },
        { x: 3.2, y: 3.0, scale: 0.5 },

        // Left side
        { x: -3.5, y: 0.5, scale: 0.5 },
        { x: -2.8, y: -0.5, scale: 0.55 },

        // Right side
        { x: 3.0, y: 0.3, scale: 0.6 },
        { x: 3.5, y: -0.8, scale: 0.5 },

        // Bottom cluster
        { x: -2.2, y: -2.8, scale: 0.55 },
        { x: 2.0, y: -2.5, scale: 0.6 }
      ];

      planes.forEach((plane, index) => {
        // Reset timeline flag
        plane.userData.isTimelineTransitioned = false;

        // Get position (or generate if more than 10 images)
        const pos = scatteredPositions[index] || {
          x: (Math.random() - 0.5) * 6,
          y: (Math.random() - 0.5) * 5,
          scale: 0.5 + Math.random() * 0.2
        };

        // Set position
        plane.position.set(pos.x, pos.y, 0);

        // Set scale (smaller and varied for artistic effect)
        plane.scale.set(pos.scale, pos.scale, pos.scale);

        // Ensure visible
        plane.visible = true;

        // Set initial opacity (will fade in)
        if (plane.material) {
          plane.material.opacity = 0;
          plane.material.transparent = true;
        }

        console.log(`  Image ${index}: x=${pos.x.toFixed(2)}, y=${pos.y.toFixed(2)}, scale=${pos.scale}`);
      });

      // Fade in images with stagger
      planes.forEach((plane, index) => {
        if (plane.material) {
          gsap.to(plane.material, {
            opacity: 0.7, // Subtle opacity (not full bright)
            duration: 1.2,
            delay: 0.3 + index * 0.1, // Stagger by 100ms per image
            ease: 'power2.out'
          });
        }

        // Optional: Slight scale animation for drama
        gsap.from(plane.scale, {
          x: 0,
          y: 0,
          z: 0,
          duration: 1.2,
          delay: 0.3 + index * 0.1,
          ease: 'back.out(1.7)'
        });
      });

      console.log('✅ Initial scene images positioned with fade-in animation');
    }
  }

  /**
   * Handle drag start (for hold-to-pullback)
   */
  onDragStart() {
    // Optional: Start hold-to-pullback timer
    if (!CAMERA_CONFIG?.ENABLE_PULLBACK) return;

    this.pullbackStartTime = performance.now();
    this.schedulePullbackCheck();
  }

  /**
   * Schedule pullback check while dragging.
   */
  schedulePullbackCheck() {
    if (this.pullbackCheckRafId !== null) {
      cancelAnimationFrame(this.pullbackCheckRafId);
      this.pullbackCheckRafId = null;
    }
    this.pullbackCheckRafId = requestAnimationFrame(() => this.checkPullback());
  }

  /**
   * Check if should trigger pullback
   */
  checkPullback() {
    this.pullbackCheckRafId = null;
    if (!this.state.get('isDragging')) return;

    const elapsed = performance.now() - this.pullbackStartTime;
    const pullbackDelay = TIMING_CONFIG?.PULLBACK_DELAY ?? 500;

    if (elapsed >= pullbackDelay && !this.isPullingBack) {
      this.startPullback();
      return;
    }

    // Keep checking while dragging
    this.schedulePullbackCheck();
  }

  /**
   * Start pullback animation
   */
  startPullback() {
    if (!CAMERA_CONFIG?.ENABLE_PULLBACK || this.isPullingBack) return;

    console.log('🔙 CameraSystem: Starting pullback');
    this.isPullingBack = true;

    const currentZ = this.camera.position.z;
    const pullbackDistance = CAMERA_CONFIG?.PULLBACK_DISTANCE ?? 2.0;
    const targetZ = currentZ + pullbackDistance;

    if (this.pullbackAnimation) {
      this.pullbackAnimation.kill();
      this.pullbackAnimation = null;
    }

    this.pullbackAnimation = gsap.to(this.camera.position, {
      z: targetZ,
      duration: CAMERA_CONFIG?.PULLBACK_DURATION ?? 0.3,
      ease: 'power2.out'
    });
  }

  /**
   * Handle drag end (return from pullback)
   */
  onDragEnd() {
    if (this.pullbackCheckRafId !== null) {
      cancelAnimationFrame(this.pullbackCheckRafId);
      this.pullbackCheckRafId = null;
    }

    if (this.isPullingBack) {
      this.endPullback();
    }
  }

  /**
   * End pullback animation
   */
  endPullback() {
    if (!this.isPullingBack) return;

    console.log('🔙 CameraSystem: Ending pullback');

    if (this.pullbackAnimation) {
      this.pullbackAnimation.kill();
      this.pullbackAnimation = null;
    }

    // Return to timeline camera Z by default
    const timelineSceneConfig = SCENE_CONFIG.timeline;
    const targetZ = timelineSceneConfig?.position?.z ?? 2.5;

    this.pullbackAnimation = gsap.to(this.camera.position, {
      z: targetZ,
      duration: CAMERA_CONFIG?.PULLBACK_RETURN_DURATION ?? 0.3,
      ease: 'power2.inOut',
      onComplete: () => {
        this.isPullingBack = false;
        this.pullbackAnimation = null;
      }
    });
  }

  /**
   * Clean up
   */
  dispose() {
    if (this.transitionAnimation) {
      this.transitionAnimation.kill();
      this.transitionAnimation = null;
    }
    if (this.pullbackAnimation) {
      this.pullbackAnimation.kill();
      this.pullbackAnimation = null;
    }
    if (this.pullbackCheckRafId !== null) {
      cancelAnimationFrame(this.pullbackCheckRafId);
      this.pullbackCheckRafId = null;
    }

    for (const unsubscribe of this.unsubscribeFns) {
      try {
        unsubscribe();
      } catch (err) {
        console.warn('CameraSystem unsubscribe failed:', err);
      }
    }
    this.unsubscribeFns = [];

    console.log('🧹 CameraSystem disposed');
  }
}

export { CameraSystem };
