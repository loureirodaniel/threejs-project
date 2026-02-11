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

    this.unsubscribeFns = [];
    this.init();
  }

  init() {
    // Subscribe to events
    this.unsubscribeFns.push(
      this.eventBus.on('scene:transition:start', this.onSceneTransition.bind(this)),
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
    const currentScene = this.state.get('currentSceneIndex');

    // Only update look-at on timeline scene
    if (currentScene === 1 && !this.state.get('isTransitioning')) {
      this.updateLookAt(deltaTime);
    }
  }

  /**
   * Smooth camera look-at following timeline offset (frame-rate independent)
   * @param {number} deltaTime
   */
  updateLookAt(deltaTime) {
    // Calculate target look-at X based on timeline offset
    const offset = this.state.get('timelineOffset');
    this.lookAtTarget.x = -offset; // Camera looks at where images are
    this.lookAtTarget.y = 0;
    this.lookAtTarget.z = 0;

    // Exponential smoothing for frame-rate independence
    const lookAtLerpSpeed = CAMERA_CONFIG?.LOOK_AT_LERP_SPEED ?? 5.0;
    const safeDelta = Math.max(0, Number.isFinite(deltaTime) ? deltaTime : 0);
    const t = 1 - Math.exp(-lookAtLerpSpeed * safeDelta);

    this.lookAtCurrent.lerp(this.lookAtTarget, t);

    // Update camera orientation
    this.camera.lookAt(this.lookAtCurrent);
  }

  /**
   * Handle scene transition
   * @param {object} data - { fromScene, toScene }
   */
  onSceneTransition({ fromScene, toScene } = {}) {
    console.log(`🎬 CameraSystem: Transitioning ${fromScene} -> ${toScene}`);

    // Get scene configurations
    const toConfig = SCENE_CONFIG[toScene];
    if (!toConfig) {
      console.error('❌ Scene config not found:', { fromScene, toScene });
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

    // Animate camera position and FOV
    this.transitionAnimation = gsap.timeline({
      onComplete: () => {
        this.transitionAnimation = null;
      }
    })
      .to(this.camera.position, {
        x: toConfig.position.x,
        y: toConfig.position.y,
        z: toConfig.position.z,
        duration,
        ease: 'power2.inOut'
      })
      .to(this.camera, {
        fov: toConfig.fov,
        duration,
        ease: 'power2.inOut',
        onUpdate: () => {
          // Projection matrix must update whenever FOV changes
          this.camera.updateProjectionMatrix();
        }
      }, '<')
      .call(() => {
        // Transition complete
        const newSceneIndex = toScene === 'timeline' ? 1 : 0;
        this.state.setState({
          isTransitioning: false,
          currentSceneIndex: newSceneIndex
        });

        // Reset look-at vectors after transition
        if (newSceneIndex === 1) {
          const offset = this.state.get('timelineOffset');
          this.lookAtCurrent.set(-offset, 0, 0);
          this.lookAtTarget.set(-offset, 0, 0);
          this.camera.lookAt(this.lookAtCurrent);
        } else {
          const target = toConfig.target || { x: 0, y: 0, z: 0 };
          this.lookAtCurrent.set(target.x, target.y, target.z);
          this.lookAtTarget.copy(this.lookAtCurrent);
          this.camera.lookAt(this.lookAtCurrent);
        }

        this.eventBus.emit('scene:transition:complete', { scene: toScene });
        console.log('✅ CameraSystem: Transition complete');
      });
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
    const targetZ = timelineSceneConfig?.position?.z ?? 8;

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
