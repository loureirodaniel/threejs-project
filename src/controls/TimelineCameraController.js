/**
 * TimelineCameraController - Handles camera positioning, look-at management, and transitions for timeline navigation
 * Extracted from TimelineController to reduce complexity and improve maintainability
 */
import * as THREE from 'three';
import { gsap } from 'gsap';

export class TimelineCameraController {
    constructor(timelineController) {
        this.controller = timelineController;
        this.camera = timelineController.camera;
        
        // Hold-to-pullback camera behavior
        this.holdPullback = {
            active: false,
            startTime: 0,
            delayMs: 150, // Delay before pullback starts
            pullbackDistance: 6, // Additional Z distance to pull back
            fovIncrease: 8, // Additional FOV for wider view
            transitionDuration: 0.4, // Smooth transition duration in seconds
            originalZ: 0,
            originalFov: 0,
            timeout: null,
            safetyTimeout: null
        };
        
        // Transition state
        this.transitionState = {
            startPosition: new THREE.Vector3(),
            startTarget: new THREE.Vector3(),
            startFov: 0,
            endPosition: new THREE.Vector3(),
            endTarget: new THREE.Vector3(),
            endFov: 0
        };
    }
    
    /**
     * Update camera look-at point based on original image X position
     * @param {number} originalImageX - Original image X position in world space
     */
    updateCameraLookAtForOriginalX(originalImageX) {
        if (!this.controller || !this.camera) return;
        
        const timelineConfig = this.controller.sceneConfigs[1];
        const targetY = timelineConfig ? timelineConfig.target.y : 0;
        
        if (this.controller.timelineOffset === undefined || this.controller.timelineOffset === null) {
            this.controller.timelineOffset = 0;
        }
        
        const worldX = originalImageX - this.controller.timelineOffset;
        this.camera.lookAt(new THREE.Vector3(worldX, targetY, 0));
    }
    
    /**
     * Start hold-to-pullback behavior (triggered when user starts dragging)
     * Zoom out while mouse is down; zoom back in on release.
     */
    startHoldToPullback() {
        if (!this.camera || this.controller?.currentSceneIndex !== 1) return;
        this.cancelHoldToPullback();
        this.holdPullback.originalZ = this.camera.position.z;
        this.holdPullback.originalFov = this.camera.fov;
        this.holdPullback.startTime = performance.now();
        this.holdPullback.timeout = setTimeout(() => {
            this.holdPullback.timeout = null;
            this.executeHoldPullback();
        }, this.holdPullback.delayMs);
    }
    
    /**
     * Execute the hold pullback animation
     */
    executeHoldPullback() {
        if (!this.camera) return;
        
        if (this.holdPullback.active) return; // Already active
        
        this.holdPullback.active = true;
        
        // Calculate target camera position (pull back on Z-axis)
        const targetZ = this.holdPullback.originalZ + this.holdPullback.pullbackDistance;
        const targetFov = this.holdPullback.originalFov + this.holdPullback.fovIncrease;
        
        // Smooth camera pullback animation
        gsap.killTweensOf(this.camera.position);
        gsap.killTweensOf(this.camera);
        
        gsap.to(this.camera.position, {
            z: targetZ,
            duration: this.holdPullback.transitionDuration,
            ease: "power2.out"
        });
        
        gsap.to(this.camera, {
            fov: targetFov,
            duration: this.holdPullback.transitionDuration,
            ease: "power2.out",
            onUpdate: () => {
                this.camera.updateProjectionMatrix();
            }
        });
        
        // Safety timeout: auto-reset pullback after 5 seconds if it gets stuck
        this.holdPullback.safetyTimeout = setTimeout(() => {
            if (this.holdPullback.active) {
                this.endHoldToPullback();
            }
        }, 5000);
    }
    
    cancelHoldToPullback() {
        if (this.holdPullback?.timeout) {
            clearTimeout(this.holdPullback.timeout);
            this.holdPullback.timeout = null;
        }
        if (this.holdPullback?.safetyTimeout) {
            clearTimeout(this.holdPullback.safetyTimeout);
            this.holdPullback.safetyTimeout = null;
        }
    }
    
    /**
     * End hold-to-pullback behavior (triggered when user releases mouse)
     * Animate camera back to original zoom.
     */
    endHoldToPullback() {
        this.cancelHoldToPullback();
        if (!this.camera) return;
        if (!this.holdPullback.active) return;
        this.holdPullback.active = false;
        gsap.killTweensOf(this.camera.position);
        gsap.killTweensOf(this.camera);
        gsap.to(this.camera.position, {
            z: this.holdPullback.originalZ,
            duration: this.holdPullback.transitionDuration,
            ease: "power2.out"
        });
        gsap.to(this.camera, {
            fov: this.holdPullback.originalFov,
            duration: this.holdPullback.transitionDuration,
            ease: "power2.out",
            onUpdate: () => {
                this.camera.updateProjectionMatrix();
            }
        });
    }
    
    /**
     * Setup transition state for scene changes
     * @param {number} targetIndex - Target scene index
     * @param {Object} startConfig - Starting camera configuration
     * @param {Object} endConfig - Ending camera configuration
     */
    setupTransition(targetIndex, startConfig, endConfig) {
        if (!this.camera) return;
        
        // Store initial camera state
        this.transitionState.startPosition = this.camera.position.clone();
        this.transitionState.startTarget = new THREE.Vector3();
        this.camera.getWorldDirection(this.transitionState.startTarget);
        this.transitionState.startTarget.multiplyScalar(5).add(this.camera.position);
        this.transitionState.startFov = this.camera.fov;
        
        // Store target camera state
        this.transitionState.endPosition = endConfig.position.clone();
        this.transitionState.endTarget = endConfig.target.clone();
        this.transitionState.endFov = endConfig.fov;
    }
    
    /**
     * Update timeline camera configuration
     * @param {Object} config - Camera configuration
     */
    updateTimelineCameraConfig(config) {
        if (!this.controller || !this.controller.sceneConfigs) return;
        
        // Update the timeline scene configuration
        if (this.controller.sceneConfigs[1]) { // Timeline scene is at index 1
            this.controller.sceneConfigs[1].position.set(config.position.x, config.position.y, config.position.z);
            this.controller.sceneConfigs[1].target.set(config.target.x, config.target.y, config.target.z);
            this.controller.sceneConfigs[1].fov = config.fov;
        }
    }
    
    /**
     * Get hold pullback state
     * @returns {Object} Hold pullback configuration
     */
    getHoldPullbackConfig() {
        return { ...this.holdPullback };
    }
    
    /**
     * Update hold pullback configuration
     * @param {Object} newConfig - New pullback configuration
     */
    updateHoldPullbackConfig(newConfig) {
        this.holdPullback = { ...this.holdPullback, ...newConfig };
    }
    
    /**
     * Check if hold pullback is active
     * @returns {boolean} True if active
     */
    isHoldPullbackActive() {
        return this.holdPullback.active;
    }
    
    /**
     * Destroy the camera controller
     */
    destroy() {
        // Clear any pending timeouts
        this.cancelHoldToPullback();
        
        // Kill any active animations
        if (this.camera) {
            gsap.killTweensOf(this.camera.position);
            gsap.killTweensOf(this.camera);
        }
        
        // Clear references
        this.controller = null;
        this.camera = null;
        this.holdPullback = null;
        this.transitionState = null;
    }
}

