/**
 * TimelineAnimationController - Handles complex timeline animations and transitions
 * Extracted from TimelineController to reduce complexity and improve maintainability
 */
import { gsap } from 'gsap';
import { getTimelinePlaneX, getTimelineAdditionalPlaneX } from '../config/timelineLayout.js';

export class TimelineAnimationController {
    constructor(timelineController) {
        this.controller = timelineController;
    }
    
    /**
     * Animate to a specific year on the timeline
     * @param {number} year - Target year (2010-2019)
     * @param {number} targetOffset - Target timeline offset
     */
    animateToYear(year, targetOffset) {
        if (!this.controller) return;
        
        // Allow timeline movement when an image is enlarged by closing it first
        if (this.controller.isImageEnlarged) {
            console.log('Image is enlarged - closing it to allow smooth timeline animation');
            this.controller.closeEnlargedImage();
        }
        
        console.log(`Animating to year ${year} with offset ${targetOffset}`);
        
        // Clear any existing snap timeout
        if (this.controller.snapTimeout) {
            clearTimeout(this.controller.snapTimeout);
            this.controller.snapTimeout = null;
        }
        
        // Initialize timeline offset if not set
        if (this.controller.timelineOffset === undefined || this.controller.timelineOffset === null) {
            this.controller.timelineOffset = 0;
        }
        
        // Ensure we're not already at the target
        if (Math.abs(this.controller.timelineOffset - targetOffset) < 0.1) {
            console.log('Already at target position, skipping animation');
            return;
        }
        
        // Animate to the target offset with smooth easing
        gsap.to(this.controller, {
            timelineOffset: targetOffset,
            duration: 1.2, // Slightly longer for smoother feel
            ease: "power2.inOut", // Smoother easing
            onUpdate: () => {
                this.updateTimelineImagesDuringAnimation();
                this.updateYearDisplayAndPanel();
                this.updateCameraLookAt(year);
            },
            onComplete: () => {
                this.onAnimationComplete(year);
            }
        });
    }
    
    /**
     * Update timeline images during animation
     */
    updateTimelineImagesDuringAnimation() {
        if (!this.controller) return;
        
        // Update additional timeline images during animation (positions 6, 8, 10, 12, 14)
        if (this.controller.timelineScene && this.controller.timelineScene.getTimelinePlanes) {
            const planes = this.controller.timelineScene.getTimelinePlanes();
            planes.forEach((plane, index) => {
                const originalX = getTimelineAdditionalPlaneX(index);
                plane.position.x = originalX - this.controller.timelineOffset;
                
                // Ensure images remain visible
                plane.visible = true;
                plane.position.y = 0; // Keep horizontal alignment
            });
        }
        
        // Update initial scene images that have been transitioned to timeline
        if (window.app && window.app.imagePlanes) {
            const initialImages = window.app.imagePlanes.getPlanes();
            initialImages.forEach((image, index) => {
                if (image.userData.isTimelineTransitioned) {
                    const originalX = getTimelinePlaneX(index);
                    image.position.x = originalX - this.controller.timelineOffset;
                    
                    // Ensure images remain visible
                    image.visible = true;
                    image.position.y = 0; // Keep horizontal alignment
                }
            });
        }
    }
    
    /**
     * Update year display and debug panel
     */
    updateYearDisplayAndPanel() {
        if (!this.controller) return;
        
        // Update year display and sync debug panel
        if (this.controller.updateCurrentYear) {
            this.controller.updateCurrentYear();
        }
        if (this.controller.syncDebugPanel) {
            this.controller.syncDebugPanel();
        }
        
        // Ensure images remain visible and properly positioned
        if (this.controller.ensureTimelineImagesVisible) {
            this.controller.ensureTimelineImagesVisible();
        }
    }
    
    /**
     * Update camera look-at during animation
     * @param {number} year - Target year
     */
    updateCameraLookAt(year) {
        if (!this.controller) return;
        
        // During the year animation, pan camera look-at to the target image
        // Compute the original X for the requested year
        const yearIndex = year - 2010; // 0..9
        const originalX = getTimelinePlaneX(yearIndex);
        if (this.controller.updateCameraLookAtForOriginalX) {
            this.controller.updateCameraLookAtForOriginalX(originalX);
        }
    }
    
    /**
     * Handle animation completion
     * @param {number} year - Final year
     */
    onAnimationComplete(year) {
        if (!this.controller) return;
        
        // Trigger haptic feedback when animation completes
        if (this.controller.triggerHapticFeedback) {
            this.controller.triggerHapticFeedback('snap');
        }
        
        // Dispatch year change event
        if (this.controller.updateCurrentYear) {
            this.controller.updateCurrentYear();
        }
        
        // Final check to ensure all images are properly positioned
        if (this.controller.ensureTimelineImagesVisible) {
            this.controller.ensureTimelineImagesVisible();
        }
        
        console.log(`Animation complete: Now at year ${this.controller.getCurrentYear()}, offset ${this.controller.timelineOffset}`);
    }
}

