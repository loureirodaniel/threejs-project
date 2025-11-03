/**
 * TimelineScrollController - Handles smooth scrolling with momentum and friction
 * Extracted from TimelineController to reduce complexity and improve maintainability
 */
import { gsap } from 'gsap';

export class TimelineScrollController {
    constructor(timelineController) {
        this.controller = timelineController;
        
        // Smooth scrolling properties (balanced for smooth, controlled scrolling)
        this.smoothScrollSensitivity = 0.50;
        this.smoothScrollFriction = 0.92;
        this.smoothScrollVelocity = 0;
        this.lastScrollTime = 0;
        this.momentumTimeout = null;
    }
    
    /**
     * Initialize smooth scrolling with optimal values
     */
    initSmoothScrolling() {
        // Initialize smooth scrolling with optimal values (balanced for smooth control)
        this.smoothScrollSensitivity = 0.50;
        this.smoothScrollFriction = 0.92;
        this.smoothScrollVelocity = 0;
        this.lastScrollTime = 0;
    }
    
    /**
     * Apply smooth scrolling with velocity and friction
     * @param {number} delta - Scroll delta value
     */
    applySmoothScroll(delta) {
        const currentTime = Date.now();
        const timeDelta = Math.max(currentTime - this.lastScrollTime, 1);
        
        // Calculate scroll velocity with subtle friction
        const scrollVelocity = (delta / timeDelta) * this.smoothScrollSensitivity;
        
        // Apply velocity with friction
        this.smoothScrollVelocity = this.smoothScrollVelocity * this.smoothScrollFriction + scrollVelocity;
        
        // Clamp velocity to prevent excessive speed (balanced for smooth scrolling)
        this.smoothScrollVelocity = Math.max(-0.9, Math.min(0.9, this.smoothScrollVelocity));
        
        // Move timeline images based on velocity
        if (this.controller && this.controller.moveTimelineImages) {
            this.controller.moveTimelineImages(-this.smoothScrollVelocity);
        }
        
        this.lastScrollTime = currentTime;
        
        // Clear existing momentum timeout
        if (this.momentumTimeout) {
            clearTimeout(this.momentumTimeout);
        }
        
        // Apply momentum deceleration
        this.momentumTimeout = setTimeout(() => {
            this.applyMomentumDeceleration();
        }, 16);
    }
    
    /**
     * Apply momentum deceleration when scrolling stops
     */
    applyMomentumDeceleration() {
        if (Math.abs(this.smoothScrollVelocity) > 0.005) {
            // Apply friction to slow down
            this.smoothScrollVelocity *= this.smoothScrollFriction;
            
            // Apply remaining velocity
            if (this.controller && this.controller.moveTimelineImages) {
                this.controller.moveTimelineImages(-this.smoothScrollVelocity);
            }
            
            // Continue deceleration
            this.momentumTimeout = setTimeout(() => {
                this.applyMomentumDeceleration();
            }, 16);
        } else {
            // Stop scrolling
            this.smoothScrollVelocity = 0;
        }
    }
    
    /**
     * Stop all smooth scrolling momentum
     */
    stopScrolling() {
        this.smoothScrollVelocity = 0;
        if (this.momentumTimeout) {
            clearTimeout(this.momentumTimeout);
            this.momentumTimeout = null;
        }
    }
    
    /**
     * Set smooth scroll sensitivity
     * @param {number} value - Sensitivity value (0.1 to 1.0)
     */
    setSensitivity(value) {
        this.smoothScrollSensitivity = Math.max(0.1, Math.min(1.0, value));
    }
    
    /**
     * Set smooth scroll friction
     * @param {number} value - Friction value (0.7 to 0.95)
     */
    setFriction(value) {
        this.smoothScrollFriction = Math.max(0.7, Math.min(0.95, value));
    }
    
    /**
     * Get current smooth scroll settings
     * @returns {Object} Settings object with sensitivity and friction
     */
    getSettings() {
        return {
            sensitivity: this.smoothScrollSensitivity,
            friction: this.smoothScrollFriction
        };
    }
}

