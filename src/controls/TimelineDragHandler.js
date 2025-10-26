/**
 * TimelineDragHandler - Handles drag physics, momentum, and sensitivity for timeline navigation
 * Extracted from TimelineController to reduce complexity and improve maintainability
 */
export class TimelineDragHandler {
    constructor(timelineController) {
        this.controller = timelineController;
        
        // Initialize drag physics configuration
        this.dragPhysics = {
            velocitySmoothing: 0.8, // Smoothing factor for velocity calculation
            screenVelocity: 0, // Current velocity in pixels/ms
            lastScreenDelta: 0, // Last screen movement delta
            
            // Sensitivity scaling parameters
            baseSensitivity: 1.0, // Base sensitivity multiplier
            minSensitivity: 0.3, // Minimum sensitivity (for fast drags)
            maxSensitivity: 2.0, // Maximum sensitivity (for slow drags)
            velocityThreshold: {
                slow: 0.5, // px/ms - below this is considered slow
                fast: 5.0  // px/ms - above this is considered fast
            },
            
            // Easing and smoothing
            sensitivitySmoothing: 0.85, // How quickly sensitivity changes
            currentSensitivity: 1.0, // Current applied sensitivity
            
            // Magnetic snap for slow dragging
            magneticSnap: {
                enabled: true,
                activationVelocity: 1.2, // px/ms - only activate below this velocity
                snapStrength: 0.12, // How strong the magnetic pull is (0-1)
                snapZone: 0.4, // Distance from snap point where magnetism activates (in timeline units)
                smoothing: 0.85, // How smoothly the snap is applied
                deadZone: 0.05 // Very close to snap point, reduce magnetism to allow precise positioning
            },
            
            // Magnetic snap offset (calculated during drag)
            magneticSnapOffset: 0
        };
        
        // Initialize viewport drag scale
        this.viewportDragScale = 1.0;
        this.timelineWidth = 13.5; // Set default, will be updated from controller if needed
        
        // Don't call init() here - let the controller manage initialization timing
    }
    
    init() {
        // Update drag scale on initialization
        this.updateDragScale();
        
        // Listen for window resize to update drag scale
        window.addEventListener('resize', this.updateDragScale.bind(this));
    }
    
    /**
     * Calculate drag physics based on mouse movement
     * @param {number} deltaX - Mouse delta in pixels
     * @param {number} deltaTime - Time delta in milliseconds
     */
    updateDragPhysics(deltaX, deltaTime) {
        // Guard: ensure controller is available
        if (!this.controller) return;
        
        const controller = this.controller;
        
        // Calculate screen velocity (pixels per millisecond)
        const screenVelocity = Math.abs(deltaX) / deltaTime;
        
        // Smooth the velocity using exponential moving average
        this.dragPhysics.screenVelocity = this.dragPhysics.screenVelocity * this.dragPhysics.velocitySmoothing + 
                                         screenVelocity * (1 - this.dragPhysics.velocitySmoothing);
        
        // Calculate target sensitivity based on velocity
        let targetSensitivity;
        const { slow, fast } = this.dragPhysics.velocityThreshold;
        const { minSensitivity, maxSensitivity, baseSensitivity } = this.dragPhysics;
        
        if (this.dragPhysics.screenVelocity <= slow) {
            // Slow drag: high sensitivity for precise control
            targetSensitivity = maxSensitivity;
        } else if (this.dragPhysics.screenVelocity >= fast) {
            // Fast drag: low sensitivity to prevent overshooting
            targetSensitivity = minSensitivity;
        } else {
            // Interpolate between slow and fast thresholds
            const t = (this.dragPhysics.screenVelocity - slow) / (fast - slow);
            // Use ease-out curve for smooth transition
            const easedT = 1 - Math.pow(1 - t, 2);
            targetSensitivity = maxSensitivity + easedT * (minSensitivity - maxSensitivity);
        }
        
        // Smooth sensitivity changes to avoid jarring transitions
        this.dragPhysics.currentSensitivity = this.dragPhysics.currentSensitivity * this.dragPhysics.sensitivitySmoothing + 
                                             targetSensitivity * (1 - this.dragPhysics.sensitivitySmoothing);
        
        // Calculate magnetic snap adjustment for slow dragging
        this.calculateMagneticSnap(controller);
        
        // Store last delta for debugging
        this.dragPhysics.lastScreenDelta = deltaX;
        
        // Optional visual feedback for physics state
        this.updatePhysicsVisualFeedback();
        
        // Debug logging (can be removed in production)
        if (Math.random() < 0.05) { // Log only 5% of the time to reduce spam
            const velocityCategory = this.dragPhysics.screenVelocity <= slow ? 'SLOW' : 
                                   this.dragPhysics.screenVelocity >= fast ? 'FAST' : 'MEDIUM';
            const magneticOffset = this.dragPhysics.magneticSnapOffset || 0;
            const magneticActive = Math.abs(magneticOffset) > 0.001;
            console.log(`Drag Physics: ${velocityCategory} velocity=${this.dragPhysics.screenVelocity.toFixed(2)}px/ms, sensitivity=${this.dragPhysics.currentSensitivity.toFixed(2)}x${magneticActive ? `, magnetic=${magneticOffset.toFixed(3)}` : ''}`);
        }
    }
    
    /**
     * Calculate magnetic snap offset for slow dragging
     * @param {TimelineController} controller - The timeline controller instance
     */
    calculateMagneticSnap(controller) {
        // Guard clause: make sure controller is available
        if (!controller) return;
        
        const magneticConfig = this.dragPhysics.magneticSnap;
        if (!magneticConfig.enabled) {
            this.dragPhysics.magneticSnapOffset = 0;
            return;
        }
        
        // Only apply magnetic snap for slow dragging
        if (this.dragPhysics.screenVelocity > magneticConfig.activationVelocity) {
            this.dragPhysics.magneticSnapOffset = 0;
            return;
        }
        
        // Find nearest snap position
        if (typeof controller.getSnapPositions !== 'function') return;
        
        const snapPositions = controller.getSnapPositions();
        let nearestSnap = snapPositions[0];
        let minDistance = Infinity;
        
        for (const snapPos of snapPositions) {
            const distance = Math.abs(controller.timelineOffset - snapPos);
            if (distance < minDistance) {
                minDistance = distance;
                nearestSnap = snapPos;
            }
        }
        
        // Check if we're within the magnetic zone
        if (minDistance <= magneticConfig.snapZone && minDistance > magneticConfig.deadZone) {
            // Calculate magnetic pull strength based on distance
            // Use a curve that provides gentle attraction with stronger pull in the middle range
            const normalizedDistance = (minDistance - magneticConfig.deadZone) / (magneticConfig.snapZone - magneticConfig.deadZone);
            const strength = (1 - normalizedDistance) * magneticConfig.snapStrength;
            
            // Apply magnetic offset towards the snap position
            const direction = nearestSnap > controller.timelineOffset ? 1 : -1;
            this.dragPhysics.magneticSnapOffset = strength * direction * minDistance;
        } else if (minDistance <= magneticConfig.deadZone) {
            // Very close to snap point - reduce magnetism to allow precise positioning
            this.dragPhysics.magneticSnapOffset = 0;
        } else {
            // Outside magnetic zone
            this.dragPhysics.magneticSnapOffset = 0;
        }
    }
    
    /**
     * Start drag momentum after release
     */
    startDragMomentum() {
        // Guard: ensure controller is available
        if (!this.controller) return;
        
        const controller = this.controller;
        
        if (controller.isMomentumActive) this.stopDragMomentum();
        controller.isMomentumActive = true;
        
        // Apply physics-based momentum scaling
        // Higher sensitivity at release means the momentum should be more controlled
        const momentumScale = 1.0 / (this.dragPhysics.currentSensitivity * 0.5 + 0.5);
        
        // Cap maximum projected additional travel to avoid skipping an image on release
        const projectedDistance = Math.abs(controller.dragVelocity) / Math.max(1e-4, (1 - controller.dragFriction));
        const maxAdditionalTravel = 1.2 * momentumScale; // Scale based on current sensitivity
        if (projectedDistance > maxAdditionalTravel) {
            const scale = maxAdditionalTravel * (1 - controller.dragFriction) / Math.max(Math.abs(controller.dragVelocity), 1e-6);
            controller.dragVelocity *= scale;
        }
        
        // Enhanced friction based on drag physics
        const baseFriction = controller.dragFriction;
        const physicsAdjustedFriction = baseFriction + (1 - baseFriction) * (1 - this.dragPhysics.currentSensitivity) * 0.3;
        
        const step = () => {
            if (!controller.isMomentumActive) return;
            // Apply velocity with physics-adjusted friction
            if (Math.abs(controller.dragVelocity) > 0.0005) {
                controller.moveTimelineImages(controller.dragVelocity);
                controller.dragVelocity *= physicsAdjustedFriction;
                
                // Gradually reduce physics sensitivity during momentum
                this.dragPhysics.screenVelocity *= 0.95;
                this.updateDragPhysics(0, 16); // Simulate 16ms frame time
                
                controller.momentumRaf = requestAnimationFrame(step);
            } else {
                controller.isMomentumActive = false;
                controller.dragVelocity = 0;
                // Reset physics state after momentum ends
                this.dragPhysics.screenVelocity = 0;
                this.dragPhysics.currentSensitivity = this.dragPhysics.baseSensitivity;
                // After settling, perform a smooth snap
                controller.snapAfterDrag();
            }
        };
        controller.momentumRaf = requestAnimationFrame(step);
    }
    
    /**
     * Stop drag momentum
     */
    stopDragMomentum() {
        // Guard: ensure controller is available
        if (!this.controller) return;
        
        const controller = this.controller;
        controller.isMomentumActive = false;
        if (controller.momentumRaf) {
            cancelAnimationFrame(controller.momentumRaf);
            controller.momentumRaf = null;
        }
    }
    
    /**
     * Update visual feedback for drag physics
     */
    updatePhysicsVisualFeedback() {
        // Guard: ensure controller is available
        if (!this.controller) return;
        
        const controller = this.controller;
        // Update cursor style based on drag sensitivity for subtle visual feedback
        if (controller.isDragging) {
            const sensitivity = this.dragPhysics.currentSensitivity;
            const opacity = Math.min(1, 0.3 + (sensitivity - 0.3) / 1.7 * 0.7); // Map 0.3-2.0 to 0.3-1.0
            
            // Subtle visual indication through cursor opacity or document effects
            if (document.body.style.cursor === 'grabbing') {
                // Could add subtle visual effects here, like changing the cursor or adding screen effects
                // For now, we'll just maintain the existing cursor
            }
        }
    }
    
    /**
     * Update drag scale based on viewport width
     */
    updateDragScale() {
        // Calculate drag scale based on viewport width vs timeline width
        // This allows a full viewport drag to traverse the entire timeline
        const viewportWidth = window.innerWidth;
        if (viewportWidth > 0) {
            // Scale factor for viewport-based dragging
            // Adjust this value to fine-tune sensitivity (1.0 = full viewport = full timeline)
            this.viewportDragScale = 1.0;
            console.log(`Updated drag scale for viewport width: ${viewportWidth}px, timeline width: ${this.timelineWidth} units`);
        }
    }
    
    /**
     * Get the current sensitivity
     * @returns {number} Current sensitivity value
     */
    getSensitivity() {
        return this.dragPhysics.currentSensitivity;
    }
    
    /**
     * Get the current magnetic snap offset
     * @returns {number} Magnetic snap offset in timeline units
     */
    getMagneticSnapOffset() {
        return this.dragPhysics.magneticSnapOffset || 0;
    }
    
    /**
     * Destroy the drag handler
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('resize', this.updateDragScale);
        
        // Stop any active momentum
        this.stopDragMomentum();
    }
}

