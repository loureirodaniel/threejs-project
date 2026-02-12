/**
 * TimelineController - Lightweight orchestrator for new architecture
 *
 * This consolidated controller coordinates four focused systems:
 * Input, Physics, Render, and Camera.
 *
 * Old: 800+ lines spread across many controllers
 * New: lean delegation-first architecture
 *
 * @module timeline-v2/core
 */

import { TimelineState } from './TimelineState.js';
import { timelineEventBus } from './EventBus.js';
import { InputSystem } from '../systems/InputSystem.js';
import { PhysicsSystem } from '../systems/PhysicsSystem.js';
import { RenderSystem } from '../systems/RenderSystem.js';
import { CameraSystem } from '../systems/CameraSystem.js';
import { AnimationChoreographer } from '../systems/AnimationChoreographer.js';
import * as TimelineUtils from '../utils/TimelineUtils.js';
import { TIMELINE_CONFIG } from '../utils/TimelineConstants.js';

class TimelineController {
  constructor(camera, sceneManager, timelineScene, effects = {}) {
    console.log('🆕 NEW TimelineController initializing...');

    // Core references
    this.camera = camera;
    this.sceneManager = sceneManager;
    this.timelineScene = timelineScene;
    this.effects = effects; // { vignetteEffect, liquidDistortionEffect, backgroundBlurEffect }

    // Core state and event bus
    this.state = new TimelineState();
    this.eventBus = timelineEventBus;

    // Systems
    this.inputSystem = new InputSystem(this.state, this.eventBus);
    this.physicsSystem = new PhysicsSystem(this.state, this.eventBus);
    this.renderSystem = new RenderSystem(this.state, this.eventBus, this.timelineScene, this.effects);
    this.cameraSystem = new CameraSystem(this.state, this.eventBus, this.camera);
    this.animationChoreographer = new AnimationChoreographer(
      this.state,
      this.eventBus,
      this.camera,
      this.sceneManager?.scene || null
    );

    this.unsubscribeFns = [];
    this.lastFrameTime = 0;

    this.init();
  }

  init() {
    // Input needs explicit listener attachment
    this.inputSystem.init();

    // External coordination hooks
    this.unsubscribeFns.push(
      this.eventBus.on('timeline:year:change', this.onYearChange.bind(this)),
      this.eventBus.on('scene:transition:complete', this.onTransitionComplete.bind(this))
    );

    console.log('✅ NEW TimelineController initialized');
    console.log('  - InputSystem ready');
    console.log('  - PhysicsSystem ready');
    console.log('  - RenderSystem ready');
    console.log('  - CameraSystem ready');
    console.log('  - AnimationChoreographer ready');

    // Position images for initial scene
    // Delay ensures imagePlanes is created
    setTimeout(() => {
      if (this.state.get('currentSceneIndex') === 0) {
        console.log('🎨 TimelineController: Setting up initial scene images...');
        if (this.cameraSystem?.positionInitialSceneImages) {
          this.cameraSystem.positionInitialSceneImages();
        }
      }
    }, 200);
  }

  /**
   * Main update loop - called from App.animate()
   * @param {number} deltaTime - Time since last frame in seconds
   * @param {number} timestamp - High-res timestamp from requestAnimationFrame
   */
  update(deltaTime, timestamp) {
    this.lastFrameTime = Number.isFinite(timestamp) ? timestamp : this.lastFrameTime;

    // Update physics (velocity, momentum, snapping)
    this.physicsSystem.update(deltaTime, timestamp);

    // Update camera (look-at, transitions)
    this.cameraSystem.update(deltaTime);

    // Update rendering (image positions, vignette, effects)
    this.renderSystem.update();
  }

  // ============================================
  // PUBLIC API (for external components to call)
  // ============================================

  /**
   * Transition to next scene
   */
  nextScene() {
    const currentIndex = this.state.get('currentSceneIndex');
    if (currentIndex < 1) {
      this.transitionToScene(1);
    }
  }

  /**
   * Transition to previous scene
   */
  previousScene() {
    const currentIndex = this.state.get('currentSceneIndex');
    if (currentIndex > 0) {
      this.transitionToScene(0);
    }
  }

  /**
   * Transition to specific scene
   * @param {number} sceneIndex - 0 = initial, 1 = timeline
   */
  transitionToScene(sceneIndex) {
    if (this.state.get('isTransitioning')) return;

    const nextIndex = sceneIndex === 0 ? 0 : 1;
    const currentIndex = this.state.get('currentSceneIndex');
    if (nextIndex === currentIndex) return;

    const sceneName = nextIndex === 0 ? 'initial' : 'timeline';
    const currentName = currentIndex === 0 ? 'initial' : 'timeline';

    console.log(`🎬 Transitioning: ${currentName} -> ${sceneName}`);

    this.eventBus.emit('scene:transition:start', {
      fromScene: currentName,
      toScene: sceneName
    });
  }

  /**
   * Animate to specific year
   * @param {number} year - Target year (2010-2019)
   */
  animateToYear(year) {
    if (typeof year !== 'number' || Number.isNaN(year)) return;

    const clampedYear = Math.max(2010, Math.min(2019, Math.round(year)));
    const targetOffset = TimelineUtils.yearToOffset(clampedYear);
    const targetIndex = clampedYear - 2010; // 0-based

    console.log(`📅 Animating to year ${clampedYear}, offset ${targetOffset}`);

    // PhysicsSystem owns actual movement and snapping.
    this.eventBus.emit('timeline:navigate', {
      direction: clampedYear > this.getCurrentYear() ? 'next' : 'prev',
      targetIndex
    });
  }

  // ============================================
  // EVENT HANDLERS (for external coordination)
  // ============================================

  /**
   * Handle year change event
   * @param {{ year: number, offset: number }} payload
   */
  onYearChange({ year, offset }) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('timelineYearChange', {
      detail: { year, offset }
    }));
  }

  /**
   * Handle transition complete event
   * @param {{ scene: string }} payload
   */
  onTransitionComplete({ scene }) {
    console.log(`✅ Transition complete: ${scene}`);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sceneTransitionComplete', {
        detail: { sceneName: scene }
      }));
    }

    // Activate timeline scene if needed
    if (scene === 'timeline' && this.timelineScene?.activate) {
      this.timelineScene.activate();
    }
  }

  // ============================================
  // GETTERS (for external components to read state)
  // ============================================

  getCurrentSceneIndex() {
    return this.state.get('currentSceneIndex');
  }

  getCurrentSceneName() {
    return this.state.get('currentSceneIndex') === 0 ? 'initial' : 'timeline';
  }

  getCurrentYear() {
    return this.state.get('currentYear');
  }

  isInTransition() {
    return this.state.get('isTransitioning');
  }

  isImageEnlarged() {
    return this.state.get('isImageEnlarged');
  }

  getState() {
    return this.state.getState();
  }

  // ============================================
  // COMPATIBILITY METHODS (for old UI components)
  // ============================================

  /**
   * Compatibility: Mark intro animation as complete
   * Called by TitleOverlay and AppIntroSequence
   */
  setIntroComplete() {
    console.log('✅ Intro animation complete');
    this.state.setState({ introComplete: true });
  }

  /**
   * Compatibility: Check if intro is complete
   * @returns {boolean}
   */
  isIntroComplete() {
    return this.state.get('introComplete') === true;
  }

  /**
   * Compatibility: Get snap positions
   * @returns {number[]} Array of snap offsets
   */
  getSnapPositions() {
    return TIMELINE_CONFIG.SNAP_POSITIONS || [];
  }

  /**
   * Compatibility: Move timeline images (called by old drag handlers)
   * @param {number} delta - Offset delta (not used in new system)
   */
  moveTimelineImages(delta) {
    // No-op: RenderSystem handles this automatically via state
    // Old code may call this, but new system doesn't need it
    void delta;
  }

  /**
   * Compatibility: Update current year (called by old code)
   */
  updateCurrentYear() {
    // No-op: RenderSystem handles this automatically via state
  }

  // ============================================
  // CLEANUP
  // ============================================

  dispose() {
    console.log('🧹 NEW TimelineController disposing...');

    for (const unsubscribe of this.unsubscribeFns) {
      try {
        unsubscribe();
      } catch (err) {
        console.warn('TimelineController unsubscribe failed:', err);
      }
    }
    this.unsubscribeFns = [];

    this.inputSystem.dispose();
    this.physicsSystem.dispose();
    this.renderSystem.dispose();
    this.cameraSystem.dispose();
    if (this.animationChoreographer) {
      this.animationChoreographer.dispose();
      this.animationChoreographer = null;
    }
    this.state.dispose();
    this.eventBus.clear();

    console.log('✅ NEW TimelineController disposed');
  }
}

export { TimelineController };
