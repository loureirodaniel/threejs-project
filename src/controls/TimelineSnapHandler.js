/**
 * TimelineSnapHandler - Handles snap positioning, magnetic behavior, and first-drag guards for timeline navigation
 * Spacing and positions from config/timelineLayout.js (Figma-aligned).
 */
import { gsap } from 'gsap';
import { getTimelineSnapPositions, getTimelinePlaneX, getTimelineAdditionalPlaneX } from '../config/timelineLayout.js';

export class TimelineSnapHandler {
    constructor(timelineController) {
        this.controller = timelineController;
        this.snapPositions = getTimelineSnapPositions();
        
        // Snap configuration
        this.config = {
            dragSnapThresholdUnits: 0.5, // Distance threshold to trigger next/prev snap
            snapTolerance: 0.1, // How close to snap point before snapping
            smoothSnapDuration: 0.8, // Duration for smooth snap animation
            smoothSnapEasing: "power2.out"
        };
    }
    
    /**
     * Get all snap positions
     * @returns {Array<number>} Array of snap positions in timeline units
     */
    getSnapPositions() {
        return [...this.snapPositions];
    }
    
    /**
     * Find the nearest snap index for a given offset
     * @param {number} offset - Current timeline offset
     * @returns {number} Index of nearest snap position
     */
    getNearestSnapIndex(offset) {
        let bestIndex = 0;
        let minDist = Infinity;
        
        this.snapPositions.forEach((p, i) => {
            const d = Math.abs(offset - p);
            if (d < minDist) {
                minDist = d;
                bestIndex = i;
            }
        });
        
        return bestIndex;
    }
    
    /**
     * Get the snap position for a given index
     * @param {number} index - Snap index
     * @returns {number} Snap position in timeline units
     */
    getSnapPosition(index) {
        return this.snapPositions[index];
    }
    
    /**
     * Snap after a drag ends with first-drag guard logic
     */
    snapAfterDrag() {
        const controller = this.controller;
        
        if (!controller) return;
        
        const targetIndexRaw = this.getNearestSnapIndex(controller.timelineOffset);
        let targetIndex = targetIndexRaw;
        
        // Directional threshold: advance to the next/prev image with smaller drag distance
        if (controller.dragStartNearestIndex !== null) {
            const startPos = this.snapPositions[controller.dragStartNearestIndex];
            const delta = controller.timelineOffset - startPos; // >0 means rightward
            const threshold = this.config.dragSnapThresholdUnits;
            
            if (delta >= threshold) {
                targetIndex = Math.min(controller.dragStartNearestIndex + 1, this.snapPositions.length - 1);
            } else if (delta <= -threshold) {
                targetIndex = Math.max(controller.dragStartNearestIndex - 1, 0);
            } else {
                targetIndex = targetIndexRaw;
            }
            
            // First-drag guard: limit large jumps to one step
            if (!controller.hasDraggedOnTimeline) {
                const clamped = Math.max(controller.dragStartNearestIndex - 1, Math.min(controller.dragStartNearestIndex + 1, targetIndex));
                targetIndex = clamped;
                controller.hasDraggedOnTimeline = true;
            }
        }
        
        const nearestPosition = this.snapPositions[targetIndex];
        
        // Check if already at snap position
        if (Math.abs(controller.timelineOffset - nearestPosition) <= this.config.snapTolerance) {
            return;
        }
        
        // Animate to nearest snap position
        gsap.to(controller, {
            timelineOffset: nearestPosition,
            duration: this.config.smoothSnapDuration,
            ease: this.config.smoothSnapEasing,
            onUpdate: () => {
                this.updateImagesDuringSnap(controller, nearestPosition);
                if (typeof controller.updateCurrentYear === 'function') {
                    controller.updateCurrentYear();
                }
                if (typeof controller.syncDebugPanel === 'function') {
                    controller.syncDebugPanel();
                }
                if (typeof controller.updateCameraLookAtForOriginalX === 'function') {
                    controller.updateCameraLookAtForOriginalX(nearestPosition);
                }
            },
            onComplete: () => {
                if (typeof controller.triggerHapticFeedback === 'function') {
                    controller.triggerHapticFeedback('snap');
                }
                controller.currentSnapIndex = targetIndex;
            }
        });
    }
    
    /**
     * Smooth snap to nearest image position
     */
    smoothSnapToNearestImage() {
        const controller = this.controller;
        
        if (!controller) return;
        
        // Find the nearest snap position
        let nearestPosition = 0;
        let minDistance = Infinity;
        
        this.snapPositions.forEach(position => {
            const distance = Math.abs(controller.timelineOffset - position);
            if (distance < minDistance) {
                minDistance = distance;
                nearestPosition = position;
            }
        });
        
        // First-drag guard: limit to at most one step from currentSnapIndex
        if (!controller.hasDraggedOnTimeline && controller.currentSnapIndex !== null && controller.currentSnapIndex !== undefined) {
            const targetIndexRaw = this.getNearestSnapIndex(nearestPosition);
            const clampedIndex = Math.max(controller.currentSnapIndex - 1, Math.min(controller.currentSnapIndex + 1, targetIndexRaw));
            nearestPosition = this.snapPositions[clampedIndex];
        }
        
        // Only snap if we're not already at a snap position
        if (Math.abs(controller.timelineOffset - nearestPosition) > this.config.snapTolerance) {
            // Animate to the nearest snap position with smooth easing
            gsap.to(controller, {
                timelineOffset: nearestPosition,
                duration: this.config.smoothSnapDuration,
                ease: this.config.smoothSnapEasing,
                onUpdate: () => {
                    this.updateImagesDuringSnap(controller, nearestPosition);
                    
                    if (typeof controller.updateCurrentYear === 'function') {
                        controller.updateCurrentYear();
                    }
                    if (typeof controller.syncDebugPanel === 'function') {
                        controller.syncDebugPanel();
                    }
                    if (typeof controller.updateCameraLookAtForOriginalX === 'function') {
                        controller.updateCameraLookAtForOriginalX(nearestPosition);
                    }
                },
                onComplete: () => {
                    if (typeof controller.triggerHapticFeedback === 'function') {
                        controller.triggerHapticFeedback('snap');
                    }
                    controller.currentSnapIndex = this.getNearestSnapIndex(nearestPosition);
                }
            });
        }
    }
    
    /**
     * Update images during snap animation
     * @param {TimelineController} controller - Controller instance
     * @param {number} targetPosition - Target snap position
     */
    updateImagesDuringSnap(controller, targetPosition) {
        // Update additional timeline images
        if (controller.timelineScene && typeof controller.timelineScene.getTimelinePlanes === 'function') {
            const planes = controller.timelineScene.getTimelinePlanes();
            planes.forEach((plane, index) => {
                const originalX = getTimelineAdditionalPlaneX(index);
                plane.position.x = originalX - controller.timelineOffset;
            });
        }
        
        // Update initial scene images
        if (window.app && window.app.imagePlanes) {
            const initialImages = window.app.imagePlanes.getPlanes();
            initialImages.forEach((image, index) => {
                if (image.userData.isTimelineTransitioned) {
                    const originalX = getTimelinePlaneX(index);
                    image.position.x = originalX - controller.timelineOffset;
                }
            });
        }
    }
    
    /**
     * Check if at a snap position
     * @param {number} offset - Current timeline offset
     * @param {number} tolerance - How close counts as "at" the snap
     * @returns {boolean} True if at snap position
     */
    isAtSnapPosition(offset, tolerance = null) {
        const tol = tolerance || this.config.snapTolerance;
        
        return this.snapPositions.some(snapPos => {
            return Math.abs(offset - snapPos) <= tol;
        });
    }
    
    /**
     * Get snap configuration
     * @returns {Object} Snap configuration
     */
    getConfig() {
        return { ...this.config };
    }
    
    /**
     * Update snap configuration
     * @param {Object} newConfig - New configuration to merge
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    
    /**
     * Destroy the snap handler
     */
    destroy() {
        // Cleanup
        this.snapPositions = [];
        this.config = null;
    }
}

