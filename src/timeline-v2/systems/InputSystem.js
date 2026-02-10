/**
 * InputSystem - Unified input handling for all user interactions
 *
 * Replaces:
 * - TimelineEventHandler.js
 * - TimelineDragHandler.js
 * - MouseController.js
 * - Parts of SmoothScrollController.js
 *
 * Responsibilities:
 * 1. Attach/remove ALL event listeners with proper cleanup
 * 2. Normalize input across mouse, wheel, touch, keyboard
 * 3. Emit standardized events via EventBus
 * 4. Handle input guards (block during transitions, etc.)
 *
 * @module timeline-v2/systems
 */

import { screenToNormalizedCoords } from '../utils/TimelineUtils.js';
import { TIMELINE_CONFIG } from '../utils/TimelineConstants.js';

class InputSystem {
  constructor(state, eventBus) {
    this.state = state;
    this.eventBus = eventBus;

    // Input state
    this.isMouseDown = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.dragStartX = 0;
    this.dragStartTime = 0;
    this.lastDragTime = 0;
    this.dragVelocity = 0;

    // Touch state
    this.lastTouchX = 0;
    this.lastTouchY = 0;
    this.touchStartX = 0;
    this.isTouchActive = false;

    // Cooldown timers
    this.lastWheelTime = 0;
    this.wheelCooldownMs = 0;

    // Bind all event handlers in constructor (for proper cleanup)
    this.onWheel = this.onWheel.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
  }

  /**
   * Initialize - attach all event listeners
   */
  init() {
    // Wheel events (passive: false to allow preventDefault)
    document.addEventListener('wheel', this.onWheel, { passive: false });

    // Mouse events
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('click', this.onClick);

    // Touch events
    document.addEventListener('touchstart', this.onTouchStart, { passive: false });
    document.addEventListener('touchmove', this.onTouchMove, { passive: false });
    document.addEventListener('touchend', this.onTouchEnd);

    // Keyboard events
    document.addEventListener('keydown', this.onKeyDown);

    console.log('✅ InputSystem initialized');
  }

  /**
   * Check if input should be processed based on current state
   */
  shouldProcessInput() {
    const stateObj = this.state.getState();

    // Block during scene transitions
    if (stateObj.isTransitioning) {
      return false;
    }

    // Block during image close animation (wheel cooldown)
    if (this.wheelCooldownMs > 0 && Date.now() < this.wheelCooldownMs) {
      return false;
    }

    return true;
  }

  /**
   * Handle wheel events (mouse wheel, trackpad)
   * @param {WheelEvent} event
   */
  onWheel(event) {
    // Only process on timeline scene (index 1); initial scene (0) uses default scroll
    if (this.state.get('currentSceneIndex') === 0) {
      return;
    }

    if (!this.shouldProcessInput()) {
      event.preventDefault();
      return;
    }

    // Close enlarged image on scroll
    if (this.state.get('isImageEnlarged')) {
      event.preventDefault();
      this.eventBus.emit('timeline:image:close', {});
      this.wheelCooldownMs = Date.now() + 500;
      return;
    }

    event.preventDefault();

    const delta = this.normalizeWheelDelta(event);

    this.eventBus.emit('timeline:scroll', {
      delta,
      timestamp: performance.now(),
      deltaX: event.deltaX,
      deltaY: event.deltaY,
    });

    this.lastWheelTime = Date.now();
  }

  /**
   * Normalize wheel delta across different input devices
   * @param {WheelEvent} event
   * @returns {number} Normalized delta
   */
  normalizeWheelDelta(event) {
    let delta = 0;

    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      delta = event.deltaX;
    } else {
      delta = event.deltaY;
    }

    // DOM_DELTA_PIXEL = 0, DOM_DELTA_LINE = 1, DOM_DELTA_PAGE = 2
    if (event.deltaMode === 1) {
      delta *= 16;
    } else if (event.deltaMode === 2) {
      delta *= typeof window !== 'undefined' ? window.innerHeight : 600;
    }

    const isTrackpad = Math.abs(delta) < 50;
    if (isTrackpad) {
      return delta * 0.01;
    }
    return delta * 0.02;
  }

  /**
   * Handle mouse down (start drag)
   */
  onMouseDown(event) {
    if (this.state.get('currentSceneIndex') !== 1) return;
    if (!this.shouldProcessInput()) return;
    if (this.state.get('isImageEnlarged')) return;

    this.isMouseDown = true;
    this.dragStartX = event.clientX;
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
    this.dragStartTime = performance.now();
    this.lastDragTime = this.dragStartTime;
    this.dragVelocity = 0;

    const normalized = screenToNormalizedCoords(event.clientX, event.clientY);
    this.eventBus.emit('timeline:drag:start', {
      clientX: event.clientX,
      clientY: event.clientY,
      normalizedX: normalized.x,
      normalizedY: normalized.y,
      timestamp: this.dragStartTime,
    });
  }

  /**
   * Handle mouse move (during drag)
   */
  onMouseMove(event) {
    if (!this.isMouseDown) return;
    if (this.state.get('currentSceneIndex') !== 1) return;

    const currentTime = performance.now();
    const deltaTime = Math.max(currentTime - this.lastDragTime, 1);
    const deltaX = event.clientX - this.lastMouseX;

    this.dragVelocity = deltaX / deltaTime;
    const worldDelta = (deltaX / (typeof window !== 'undefined' ? window.innerWidth : 1)) * 10;

    this.eventBus.emit('timeline:drag:move', {
      delta: worldDelta,
      velocity: this.dragVelocity,
      clientX: event.clientX,
      clientY: event.clientY,
      timestamp: currentTime,
    });

    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
    this.lastDragTime = currentTime;
  }

  /**
   * Handle mouse up (end drag)
   */
  onMouseUp(event) {
    if (!this.isMouseDown) return;

    this.isMouseDown = false;

    const endTime = performance.now();
    const totalDragTime = endTime - this.dragStartTime;
    const totalDragDistance = event.clientX - this.dragStartX;

    this.eventBus.emit('timeline:drag:end', {
      velocity: this.dragVelocity,
      totalDistance: totalDragDistance,
      totalTime: totalDragTime,
      timestamp: endTime,
    });
  }

  /**
   * Handle click events (for image enlargement / raycast target)
   */
  onClick(event) {
    if (this.state.get('currentSceneIndex') !== 1) return;
    if (!this.shouldProcessInput()) return;

    const normalized = screenToNormalizedCoords(event.clientX, event.clientY);

    this.eventBus.emit('timeline:click', {
      clientX: event.clientX,
      clientY: event.clientY,
      normalizedX: normalized.x,
      normalizedY: normalized.y,
      timestamp: performance.now(),
      target: event.target,
    });
  }

  /**
   * Handle touch start
   */
  onTouchStart(event) {
    if (this.state.get('currentSceneIndex') !== 1) return;
    if (!this.shouldProcessInput()) return;

    const touch = event.touches[0];
    if (!touch) return;

    this.isTouchActive = true;
    this.touchStartX = touch.clientX;
    this.lastTouchX = touch.clientX;
    this.lastTouchY = touch.clientY;
    this.dragStartTime = performance.now();
    this.lastDragTime = this.dragStartTime;
    this.dragVelocity = 0;

    const normalized = screenToNormalizedCoords(touch.clientX, touch.clientY);
    this.eventBus.emit('timeline:drag:start', {
      clientX: touch.clientX,
      clientY: touch.clientY,
      normalizedX: normalized.x,
      normalizedY: normalized.y,
      timestamp: this.dragStartTime,
      isTouch: true,
    });
  }

  /**
   * Handle touch move
   */
  onTouchMove(event) {
    if (!this.isTouchActive || event.touches.length === 0) return;
    if (this.state.get('currentSceneIndex') !== 1) return;

    event.preventDefault();

    const touch = event.touches[0];
    const currentTime = performance.now();
    const deltaTime = Math.max(currentTime - this.lastDragTime, 1);
    const deltaX = touch.clientX - this.lastTouchX;

    this.dragVelocity = deltaX / deltaTime;
    const worldDelta = (deltaX / (typeof window !== 'undefined' ? window.innerWidth : 1)) * 10;

    this.eventBus.emit('timeline:drag:move', {
      delta: worldDelta,
      velocity: this.dragVelocity,
      clientX: touch.clientX,
      clientY: touch.clientY,
      timestamp: currentTime,
      isTouch: true,
    });

    this.lastTouchX = touch.clientX;
    this.lastTouchY = touch.clientY;
    this.lastDragTime = currentTime;
  }

  /**
   * Handle touch end
   */
  onTouchEnd(event) {
    if (!this.isTouchActive) return;

    this.isTouchActive = false;
    const endTime = performance.now();

    this.eventBus.emit('timeline:drag:end', {
      velocity: this.dragVelocity,
      timestamp: endTime,
      isTouch: true,
    });

    this.dragVelocity = 0;
  }

  /**
   * Handle keyboard events
   */
  onKeyDown(event) {
    if (event.key === 'Escape' && this.state.get('isImageEnlarged')) {
      this.eventBus.emit('timeline:image:close', {});
      return;
    }

    if (this.state.get('currentSceneIndex') !== 1) return;

    const maxSnapIndex = TIMELINE_CONFIG.YEAR_COUNT - 1;
    const currentIndex = this.state.get('currentSnapIndex');

    if (event.key === 'ArrowLeft' && currentIndex > 0) {
      this.eventBus.emit('timeline:navigate', {
        direction: 'prev',
        targetIndex: currentIndex - 1,
      });
    } else if (event.key === 'ArrowRight' && currentIndex < maxSnapIndex) {
      this.eventBus.emit('timeline:navigate', {
        direction: 'next',
        targetIndex: currentIndex + 1,
      });
    }
  }

  /**
   * Clean up - remove all event listeners
   */
  dispose() {
    document.removeEventListener('wheel', this.onWheel);
    document.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('click', this.onClick);
    document.removeEventListener('touchstart', this.onTouchStart);
    document.removeEventListener('touchmove', this.onTouchMove);
    document.removeEventListener('touchend', this.onTouchEnd);
    document.removeEventListener('keydown', this.onKeyDown);

    console.log('🧹 InputSystem disposed');
  }
}

export { InputSystem };
