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
import { PHYSICS_CONFIG, TIMING_CONFIG, TIMELINE_CONFIG, CAMERA_CONFIG } from '../utils/TimelineConstants.js';

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
    this.pendingScrollSteps = [];
    this.lastWheelEventAt = 0;
    this.lastGestureAt = 0;
    this.burstCount = 0;
    this.snapStartTime = 0;
    this.accumulatedScrollDelta = 0;

    // Hover-to-navigate tween (separate from snap system, no camera pullback)
    this._hoverNavTween = null;

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
    this.eventBus.on('timeline:hover:navigate', this.onHoverNavigate.bind(this));

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
   * Handle scroll events from InputSystem.
   *
   * Strategy: accumulate normalized wheel delta and trigger exactly one
   * snap step when the accumulated value crosses SCROLL_STEP_THRESHOLD.
   * While a snap animation is playing, at most one additional step may
   * be queued (only after the snap has been running for ≥250 ms so that
   * a single trackpad swipe never double-fires).
   *
   * @param {object} data - { delta, timestamp, deltaX, deltaY }
   */
  onScroll({ delta, timestamp }) {
    if (!this.scrollEnabled) return;

    if (this._hoverNavTween) {
      this._hoverNavTween.kill();
      this._hoverNavTween = null;
    }

    if (Math.abs(delta) < 0.08) return;

    const now = performance.now();
    const direction = Math.sign(delta);
    if (direction === 0) return;

    // --- Guard: while a snap is playing, or during the post-snap cooldown ---
    if (this.isSnapping) {
      // Allow up to MAX_PENDING_SNAP_STEPS to queue so rapid consecutive scrolls
      // chain without dropping input. Coast/momentum events (delta < 0.25) are still
      // filtered to prevent trackpad deceleration from stacking phantom steps.
      const maxPending = PHYSICS_CONFIG.MAX_PENDING_SNAP_STEPS ?? 3;
      if (this.pendingScrollSteps.length < maxPending && Math.abs(delta) >= 0.25) {
        this.pendingScrollSteps.push(direction);

        if ((now - this.lastGestureAt) <= 1000) {
          this.burstCount = Math.min(8, this.burstCount + 1);
        } else {
          this.burstCount = 1;
        }
        this.lastGestureAt = now;
      }
      this.state.setState({ isScrolling: true });
      return;
    }

    if (this.snapCooldownUntil && now < this.snapCooldownUntil) {
      return;
    }

    // --- Not snapping: accumulate delta toward threshold ---
    if ((now - this.lastWheelEventAt) > 300) {
      this.accumulatedScrollDelta = 0;
    }
    this.lastWheelEventAt = now;

    this.accumulatedScrollDelta += delta;

    const threshold = PHYSICS_CONFIG.SCROLL_STEP_THRESHOLD ?? 0.9;

    if (Math.abs(this.accumulatedScrollDelta) >= threshold) {
      const stepDirection = Math.sign(this.accumulatedScrollDelta);

      // Two-tier gesture model:
      //   Short  (~130–285px / 0.9–1.9 normalized) → 1 step
      //   Fast   (~285px+ / 2.0+ normalized)        → MAX_STEPS_PER_GESTURE steps
      const fastThreshold = PHYSICS_CONFIG.SCROLL_FAST_GESTURE_THRESHOLD ?? 3.5;
      const numSteps = Math.abs(this.accumulatedScrollDelta) >= fastThreshold
        ? (PHYSICS_CONFIG.MAX_STEPS_PER_GESTURE ?? 4)
        : 1;

      this.accumulatedScrollDelta = 0;

      if ((now - this.lastGestureAt) <= 800) {
        this.burstCount = Math.min(6, this.burstCount + numSteps);
      } else {
        this.burstCount = numSteps;
      }
      this.lastGestureAt = now;

      this.pendingScrollSteps = Array(numSteps).fill(stepDirection);
      this.processNextScrollStep();
    }

    this.state.setState({ isScrolling: true });

    clearTimeout(this.snapCheckTimeout);
    clearTimeout(this.scrollStopTimeout);
    this.scrollStopTimeout = setTimeout(() => {
      this.accumulatedScrollDelta = 0;
      this.burstCount = 0;
      this.state.setState({ isScrolling: false });
      this.checkSnapAfterScroll();
    }, TIMING_CONFIG.SCROLL_STOP_DELAY ?? 400);
  }

  processNextScrollStep() {
    if (this.isSnapping) return;
    if (this.pendingScrollSteps.length === 0) return;

    this.velocity = 0;

    const currentOffset = this.state.get('timelineOffset');
    const calculatedSpacing = this.state.get('calculatedSpacing') || 1.8;
    const firstPosition = TIMELINE_CONFIG.FIRST_POSITION || -4.5;
    const yearCount = TIMELINE_CONFIG.YEAR_COUNT || 10;
    const relativeOffset = currentOffset - firstPosition;
    const nearestIndex = Math.max(0, Math.min(yearCount - 1, Math.round(relativeOffset / calculatedSpacing)));
    const stateIndex = this.state.get('currentSnapIndex');
    const baseIndex = Number.isInteger(stateIndex) ? stateIndex : nearestIndex;
    const direction = this.pendingScrollSteps.shift();
    const targetIndex = Math.max(0, Math.min(yearCount - 1, baseIndex + direction));
    const targetOffset = firstPosition + (targetIndex * calculatedSpacing);

    if (targetIndex === baseIndex) {
      return;
    }

    const baseDuration = PHYSICS_CONFIG.SCROLL_STEP_DURATION ?? 0.58;
    const burstBoost = Math.min(0.72, Math.max(0, this.burstCount - 1) * 0.15);
    const dynamicDuration = Math.max(0.18, baseDuration * (1 - burstBoost));

    this.snapToOffset(
      targetOffset,
      targetIndex,
      dynamicDuration
    );
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

    if (this._hoverNavTween) {
      this._hoverNavTween.kill();
      this._hoverNavTween = null;
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
    const calculatedSpacing = this.state.get('calculatedSpacing') || 1.8;
    const firstPosition = TIMELINE_CONFIG.FIRST_POSITION || -4.5;
    const yearCount = TIMELINE_CONFIG.YEAR_COUNT || 10;
    const clampedIndex = Math.max(0, Math.min(yearCount - 1, Number.isFinite(targetIndex) ? Math.round(targetIndex) : 0));
    const targetOffset = firstPosition + (clampedIndex * calculatedSpacing);
    this.snapToOffset(targetOffset, clampedIndex, 0.5);
  }

  /**
   * Handle hover-to-navigate events.
   * Smoothly pans the timeline to the hovered image without triggering the
   * camera pullback that normal snaps produce. The tween is intentionally
   * slow (HOVER_NAV_DURATION) for a cinematic feel and keeps camera Z fixed.
   * Cancelled immediately if the user scrolls or drags.
   * @param {object} data - { targetIndex }
   */
  onHoverNavigate({ targetIndex }) {
    if (!this.scrollEnabled) return;
    if (this.isSnapping) return;

    const calculatedSpacing = this.state.get('calculatedSpacing') || 1.8;
    const firstPosition = TIMELINE_CONFIG.FIRST_POSITION || -4.5;
    const yearCount = TIMELINE_CONFIG.YEAR_COUNT || 10;
    const clampedIndex = Math.max(0, Math.min(yearCount - 1, Number.isFinite(targetIndex) ? Math.round(targetIndex) : 0));
    const targetOffset = firstPosition + (clampedIndex * calculatedSpacing);

    const currentIndex = this.state.get('currentSnapIndex');
    if (clampedIndex === currentIndex) return;

    // Don't restart the tween if already heading to the same target
    if (this._hoverNavTween && this._hoverNavTargetIndex === clampedIndex) return;

    if (this._hoverNavTween) {
      this._hoverNavTween.kill();
      this._hoverNavTween = null;
    }

    this.velocity = 0;
    this._hoverNavTargetIndex = clampedIndex;

    const duration = CAMERA_CONFIG.HOVER_NAV_DURATION ?? 1.8;
    const fromOffset = this.state.get('timelineOffset');
    const animTarget = { value: fromOffset };

    this._hoverNavTween = gsap.to(animTarget, {
      value: targetOffset,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        this.state.setState({
          timelineOffset: animTarget.value,
          scrollVelocity: 0
        });
      },
      onComplete: () => {
        this._hoverNavTween = null;
        this._hoverNavTargetIndex = null;
        this.state.setState({
          currentSnapIndex: clampedIndex,
          targetOffset: targetOffset,
          scrollVelocity: 0
        });
        console.debug('PhysicsSystem: Hover navigate complete to index', clampedIndex);
      }
    });
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
    if (this.isSnapping) return;
    if (this.pendingScrollSteps.length > 0) {
      this.processNextScrollStep();
      return;
    }

    this.burstCount = 0;

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
    this.snapStartTime = performance.now();
    this.snapCooldownUntil = 0;
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
      ease: 'sine.inOut',
      onUpdate: () => {
        const prevOffset = this.state.get('timelineOffset') || 0;
        const newOffset = animTarget.value;
        const snapVelocity = Math.abs(newOffset - prevOffset);
        this.state.setState({
          timelineOffset: newOffset,
          scrollVelocity: snapVelocity
        });
      },
      onComplete: () => {
        this.isSnapping = false;
        this.snapAnimation = null;

        const hasPendingSteps = this.pendingScrollSteps.length > 0;

        // Apply cooldown and reset accumulator only after the final step of a
        // burst, not between queued steps — so the camera stays pulled back
        // and rapid navigation continues without interruption.
        if (!hasPendingSteps) {
          this.snapCooldownUntil = performance.now() + 320;
          this.accumulatedScrollDelta = 0;
        }

        this.state.setState({
          currentSnapIndex: targetIndex,
          targetOffset: targetOffset,
          scrollVelocity: 0
        });

        this.eventBus.emit('timeline:snap:complete', {
          offset: targetOffset,
          index: targetIndex,
          hasPendingSteps
        });

        this.triggerHaptic('snap');
        console.debug('PhysicsSystem: Snap complete to index', targetIndex);

        this.processNextScrollStep();
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

    if (this._hoverNavTween) {
      this._hoverNavTween.kill();
      this._hoverNavTween = null;
    }

    // console.log('PhysicsSystem disposed');
  }
}

export { PhysicsSystem };
