/**
 * PhysicsSystem - Handles ALL timeline physics: momentum, friction, snapping, bounds
 *
 * Replaces:
 * - TimelineScrollController.js
 * - TimelineSnapHandler.js
 * - SmoothScrollController.js
 * - TimelineAnimationController.js (partially)
 *
 * Responsibilities:
 * 1. Apply scroll/drag input to velocity
 * 2. Update position based on velocity (frame-rate independent)
 * 3. Apply friction and momentum decay
 * 4. Handle snapping to nearest image
 * 5. Enforce timeline bounds
 *
 * @module timeline-v2/systems
 */

import { gsap } from 'gsap';
import { offsetToSnapIndex, snapIndexToOffset } from '../utils/TimelineUtils.js';
import { PHYSICS_CONFIG, TIMING_CONFIG, TIMELINE_CONFIG } from '../utils/TimelineConstants.js';

class PhysicsSystem {
  constructor(state, eventBus) {
    this.state = state;
    this.eventBus = eventBus;

    // CRITICAL: Initialize as a writable property
    this.enabled = true;
    this.scrollEnabled = true;
    this.imagePlanes = null;
    // console.log('✅ PhysicsSystem initialized with scrollEnabled:', this.scrollEnabled);

    // Physics state (local to this system)
    this.velocity = 0;
    this.targetVelocity = 0;
    this.isBeingRestored = false;
    this.isRestoring = false;
    this.isSnapping = false;
    this.snapAnimation = null;

    // Timers
    this.scrollStopTimeout = null;
    this.snapCheckTimeout = null;

    this.init();
  }

  init() {
    this.eventBus.on('timeline:scroll', this.onScroll.bind(this));
    this.eventBus.on('timeline:drag:move', this.onDragMove.bind(this));
    this.eventBus.on('timeline:drag:end', this.onDragEnd.bind(this));
    this.eventBus.on('timeline:navigate', this.onNavigate.bind(this));

    // console.log('✅ PhysicsSystem initialized');
  }

  /**
   * Main update loop - called every frame from TimelineController
   * @param {number} deltaTime - Time since last frame in seconds
   * @param {number} timestamp - High-res timestamp from requestAnimationFrame
   */
  update(deltaTime, timestamp) {
    if (!this.enabled) return;
    if (!this.scrollEnabled) return;
    if (this.isBeingRestored) return;
    if (this.isRestoring) return;

    // NEW: Don't update planes if one is fullscreen
    if (!this.imagePlanes) {
      this.imagePlanes = window.app?.imagePlanes || null;
    }
    const fullscreenPlane = this.imagePlanes?.planes?.find(p => p.userData.isFullscreen);
    if (fullscreenPlane) {
      // console.log('🔒 PhysicsSystem: Fullscreen plane detected, skipping updates');
      return;
    }

    if (this.state.get('isTransitioning') || this.isSnapping) {
      return;
    }

    if (this.state.get('isDragging')) {
      return;
    }

    // Store previous offset before physics step
    const previousOffset = this.state.get('timelineOffset');

    if (Math.abs(this.velocity) > 0.001) {
      const friction = this.state.get('friction');
      const frictionFactor = Math.pow(friction, deltaTime * 60);
      this.velocity *= frictionFactor;

      const displacement = this.velocity * deltaTime * 60;
      let newOffset = this.state.get('timelineOffset') + displacement;
      newOffset = this.applyBounds(newOffset);

      this.state.setState({
        timelineOffset: newOffset,
        scrollVelocity: this.velocity
      });

      if (Math.abs(this.velocity) < 0.001) {
        this.velocity = 0;
        this.state.setState({
          scrollVelocity: 0,
          isScrolling: false
        });
        this.scheduleSnapCheck();
      }
    }

    // Emit scroll event when offset meaningfully changes
    const currentOffset = this.state.get('timelineOffset');
    if (Math.abs(currentOffset - previousOffset) > 0.01) {
      this.eventBus.emit('physics:scrolled', {
        offset: currentOffset,
        velocity: this.velocity,
        progress: this.getScrollProgress()
      });
    }
  }

  /**
   * Handle scroll events from InputSystem
   * @param {object} data - { delta, timestamp, deltaX, deltaY }
   */
  onScroll({ delta, timestamp }) {
    // Check if scrolling is enabled
    if (!this.scrollEnabled) {
      // console.log('🔒 Scroll event blocked - system disabled');
      return; // Exit early
    }

    console.debug('PhysicsSystem: Scroll event, delta:', delta);

    const sensitivity = this.state.get('sensitivity');
    this.velocity += delta * sensitivity;

    const maxVelocity = PHYSICS_CONFIG.MAX_SCROLL_VELOCITY ?? 0.9;
    this.velocity = Math.max(-maxVelocity, Math.min(maxVelocity, this.velocity));

    this.state.setState({ isScrolling: true });

    clearTimeout(this.snapCheckTimeout);

    clearTimeout(this.scrollStopTimeout);
    this.scrollStopTimeout = setTimeout(() => {
      this.state.setState({ isScrolling: false });
      this.checkSnapAfterScroll();
    }, TIMING_CONFIG.SCROLL_STOP_DELAY ?? 400);
  }

  /**
   * Handle drag move events
   * @param {object} data - { delta, velocity, timestamp }
   */
  onDragMove({ delta, velocity, timestamp }) {
    if (!this.scrollEnabled) {
      // console.log('🔒 Drag move BLOCKED - system disabled');
      return;
    }

    const currentOffset = this.state.get('timelineOffset');
    let newOffset = currentOffset + delta;
    newOffset = this.applyBounds(newOffset, true);

    this.state.setState({
      timelineOffset: newOffset,
      dragVelocity: velocity,
      isDragging: true
    });

    this.velocity = 0;
  }

  /**
   * Handle drag end events
   * @param {object} data - { velocity, timestamp }
   */
  onDragEnd({ velocity, timestamp }) {
    if (!this.scrollEnabled) {
      // console.log('🔒 Drag end BLOCKED - system disabled');
      return;
    }

    console.debug('PhysicsSystem: Drag end, velocity:', velocity);

    const dragToScrollMultiplier = PHYSICS_CONFIG.DRAG_TO_SCROLL_MULTIPLIER ?? 0.5;
    this.velocity = velocity * dragToScrollMultiplier;

    const maxVelocity = PHYSICS_CONFIG.MAX_SCROLL_VELOCITY ?? 0.9;
    this.velocity = Math.max(-maxVelocity, Math.min(maxVelocity, this.velocity));

    this.state.setState({
      isDragging: false,
      dragVelocity: 0
    });

    this.scheduleSnapCheck();
  }

  /**
   * Handle keyboard navigation events
   * @param {object} data - { direction: 'prev'|'next', targetIndex }
   */
  onNavigate({ direction, targetIndex }) {
    if (!this.scrollEnabled) {
      // console.log('🔒 Navigation BLOCKED - system disabled');
      return;
    }

    console.debug('PhysicsSystem: Navigate to index', targetIndex);

    this.velocity = 0;
    const targetOffset = snapIndexToOffset(targetIndex);
    this.snapToOffset(targetOffset, targetIndex, 0.5);
  }

  /**
   * Apply bounds checking with optional bounce-back
   * @param {number} offset - Proposed offset
   * @param {boolean} allowOverscroll - Allow slight overscroll (for drag)
   * @returns {number} Clamped offset
   */
  applyBounds(offset, allowOverscroll = false) {
    // Get dynamic spacing if available, otherwise use snap positions
    const calculatedSpacing = this.state.get('calculatedSpacing');
    const yearCount = TIMELINE_CONFIG.YEAR_COUNT || 10;
    const firstPosition = TIMELINE_CONFIG.FIRST_POSITION || -4.5;

    let minOffset, maxOffset;

    if (calculatedSpacing) {
      // Use dynamically calculated spacing from AnimationChoreographer
      minOffset = firstPosition;
      maxOffset = firstPosition + ((yearCount - 1) * calculatedSpacing);
      // console.log(`📏 PhysicsSystem: Using dynamic bounds: ${minOffset.toFixed(2)} to ${maxOffset.toFixed(2)}`);
    } else {
      // Fallback to snap positions
      const positions = TIMELINE_CONFIG.SNAP_POSITIONS;
      minOffset = positions[0];
      maxOffset = positions[positions.length - 1];
      // console.log(`📏 PhysicsSystem: Using static bounds: ${minOffset.toFixed(2)} to ${maxOffset.toFixed(2)}`);
    }

    if (allowOverscroll) {
      const overscrollAmount = (maxOffset - minOffset) * (PHYSICS_CONFIG.OVERSCROLL_MULTIPLIER ?? 0.2);

      if (offset < minOffset - overscrollAmount) {
        this.velocity = 0;
        return minOffset - overscrollAmount;
      }

      if (offset > maxOffset + overscrollAmount) {
        this.velocity = 0;
        return maxOffset + overscrollAmount;
      }

      return offset;
    }

    const bounceDamping = PHYSICS_CONFIG.BOUNCE_DAMPING ?? 0.3;

    if (offset < minOffset) {
      this.velocity = Math.abs(this.velocity) * bounceDamping;
      return minOffset;
    }

    if (offset > maxOffset) {
      this.velocity = -Math.abs(this.velocity) * bounceDamping;
      return maxOffset;
    }

    return offset;
  }

  /**
   * Schedule snap check after delay
   */
  scheduleSnapCheck() {
    clearTimeout(this.snapCheckTimeout);

    const snapCheckDelay = TIMING_CONFIG.SNAP_CHECK_DELAY ?? 300;
    this.snapCheckTimeout = setTimeout(() => {
      const snapVelocityThreshold = PHYSICS_CONFIG.SNAP_VELOCITY_THRESHOLD ?? 0.05;
      if (Math.abs(this.velocity) < snapVelocityThreshold) {
        this.snapToNearest();
      }
    }, snapCheckDelay);
  }

  /**
   * Check if should snap after scroll stops
   */
  checkSnapAfterScroll() {
    const snapVelocityThreshold = PHYSICS_CONFIG.SNAP_VELOCITY_THRESHOLD ?? 0.05;
    if (Math.abs(this.velocity) < snapVelocityThreshold) {
      this.snapToNearest();
    }
  }

  /**
   * Calculate normalized scroll progress through the timeline (0..1)
   * @returns {number}
   */
  getScrollProgress() {
    const yearCount = TIMELINE_CONFIG.YEAR_COUNT || 10;
    const calculatedSpacing = this.state.get('calculatedSpacing');
    const firstPosition = TIMELINE_CONFIG.FIRST_POSITION || -4.5;
    const fallbackPositions = TIMELINE_CONFIG.SNAP_POSITIONS || [];

    let minOffset = firstPosition;
    let maxOffset = firstPosition;

    if (calculatedSpacing) {
      maxOffset = firstPosition + ((yearCount - 1) * calculatedSpacing);
    } else if (fallbackPositions.length > 1) {
      minOffset = fallbackPositions[0];
      maxOffset = fallbackPositions[fallbackPositions.length - 1];
    }

    const range = Math.max(0.0001, Math.abs(maxOffset - minOffset));
    const offset = this.state.get('timelineOffset');
    const normalized = Math.abs(offset - minOffset) / range;
    return Math.max(0, Math.min(1, normalized));
  }

  /**
   * Snap to nearest snap position
   */
  snapToNearest() {
    const currentOffset = this.state.get('timelineOffset');
    const calculatedSpacing = this.state.get('calculatedSpacing') || 1.8;
    const firstPosition = TIMELINE_CONFIG.FIRST_POSITION || -4.5;
    const yearCount = TIMELINE_CONFIG.YEAR_COUNT || 10;
    
    // Calculate nearest snap index based on current offset
    const relativeOffset = currentOffset - firstPosition;
    const nearestIndex = Math.round(relativeOffset / calculatedSpacing);
    const clampedIndex = Math.max(0, Math.min(nearestIndex, yearCount - 1));
    
    // Calculate target offset for that index
    const targetOffset = firstPosition + (clampedIndex * calculatedSpacing);
    
    const skipSnapDistance = 0.05;
    if (Math.abs(currentOffset - targetOffset) < skipSnapDistance) {
      this.state.setState({
        currentSnapIndex: clampedIndex,
        targetOffset: targetOffset
      });
      return;
    }
    
    // console.log(`📍 Snapping to index ${clampedIndex}, offset ${targetOffset.toFixed(2)}`);
    this.snapToOffset(targetOffset, clampedIndex);
  }

  /**
   * Snap to specific offset with animation
   * @param {number} targetOffset - Target offset to snap to
   * @param {number} targetIndex - Target snap index
   * @param {number} duration - Animation duration (default 0.4s)
   */
  snapToOffset(targetOffset, targetIndex, duration = 0.4) {
    console.debug('PhysicsSystem: Snapping to offset', targetOffset, 'index', targetIndex);

    this.isSnapping = true;
    this.velocity = 0;

    const fromOffset = this.state.get('timelineOffset');

    this.eventBus.emit('timeline:snap:start', {
      fromOffset,
      toOffset: targetOffset,
      toIndex: targetIndex
    });

    if (this.snapAnimation) {
      this.snapAnimation.kill();
    }

    const animTarget = { value: fromOffset };

    this.snapAnimation = gsap.to(animTarget, {
      value: targetOffset,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        this.state.setState({ timelineOffset: animTarget.value });
      },
      onComplete: () => {
        this.isSnapping = false;
        this.snapAnimation = null;

        this.state.setState({
          currentSnapIndex: targetIndex,
          targetOffset: targetOffset
        });

        this.eventBus.emit('timeline:snap:complete', {
          offset: targetOffset,
          index: targetIndex
        });

        this.triggerHaptic('snap');
        console.debug('PhysicsSystem: Snap complete to index', targetIndex);
      }
    });
  }

  /**
   * Trigger haptic feedback (if supported)
   * @param {string} type - 'snap', 'start', 'end'
   */
  triggerHaptic(type) {
    if (navigator.vibrate) {
      const patterns = {
        snap: [5, 20, 5],
        start: [20],
        end: [15]
      };
      navigator.vibrate(patterns[type] ?? [10]);
    }
  }

  /**
   * Clean up - clear timers and animations
   */
  dispose() {
    clearTimeout(this.scrollStopTimeout);
    clearTimeout(this.snapCheckTimeout);

    if (this.snapAnimation) {
      this.snapAnimation.kill();
      this.snapAnimation = null;
    }

    // console.log('PhysicsSystem disposed');
  }
}

export { PhysicsSystem };
