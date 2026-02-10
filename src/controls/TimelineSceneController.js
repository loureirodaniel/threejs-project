/**
 * TimelineSceneController - Manages scene transitions and timeline activation
 */
import * as THREE from 'three';
import { TIMELINE_FIRST_POSITION } from '../config/timelineLayout.js';

export class TimelineSceneController {
    constructor(timelineController) {
        this.controller = timelineController;
        this.camera = timelineController.camera;
        
        // Transition state
        this.startPosition = new THREE.Vector3();
        this.startTarget = new THREE.Vector3();
        this.startFov = 0;
        this.endPosition = new THREE.Vector3();
        this.endTarget = new THREE.Vector3();
        this.endFov = 0;
    }
    
    /**
     * Transition to a different scene
     */
    transitionToScene(targetIndex) {
        if (this.controller.isTransitioning || targetIndex === this.controller.currentSceneIndex) return;
        
        this.controller.isTransitioning = true;
        this.controller.transitionProgress = 0;
        this.controller.transitionStartTime = Date.now();
        
        const startConfig = this.controller.sceneConfigs[this.controller.currentSceneIndex];
        const endConfig = this.controller.sceneConfigs[targetIndex];
        
        if (targetIndex === 1 && this.controller.timelineScene) {
            this.controller.currentSceneIndex = 1;
            this.onSceneChange(1);
            this.controller.timelineScene.animateToTimeline(this.camera, () => {
                this.activateTimelineScene();
            });
        } else {
            this.controller.currentSceneIndex = targetIndex;
            this.onSceneChange(targetIndex);
            this.performOriginalTransition(targetIndex, startConfig, endConfig);
        }
    }
    
    /**
     * Perform original transition (not timeline-specific). Camera snaps to target – no movement.
     */
    performOriginalTransition(targetIndex, startConfig, endConfig) {
        const c = this.camera;
        c.position.copy(endConfig.position);
        c.fov = endConfig.fov;
        c.updateProjectionMatrix();
        c.lookAt(endConfig.target);
        this.controller.isTransitioning = false;
        this.controller.transitionProgress = 1;
        this.controller.transitionStartTime = 0;
        this.onTransitionComplete();
    }
    
    /**
     * Activate timeline scene and initialize state
     */
    activateTimelineScene() {
        // Activate the timeline scene which will handle its own animations
        if (this.controller.timelineScene) {
            this.controller.timelineScene.activate();
        }
        
        this.controller.timelineOffset = TIMELINE_FIRST_POSITION;
        console.log('TimelineController: Set timeline offset to', TIMELINE_FIRST_POSITION, '(first image centered)');

        // Reset first-drag guard state when entering the timeline
        this.controller.hasDraggedOnTimeline = false;
        this.controller.dragStartNearestIndex = null;
        this.controller.dragStartOffset = null;
        
        if (this.controller.dragHandler) {
            this.controller.dragHandler.stopDragMomentum();
        }
        this.controller.currentSnapIndex = 0;
        
        // Force transition completion for timeline scene
        console.log('TimelineController: Activating timeline scene and forcing transition complete');
        this.controller.isTransitioning = false;
        this.controller.transitionProgress = 1;
        this.controller.transitionStartTime = 0; // Reset transition start time
        
        this.onTransitionComplete();
        
        const detail = {
            sceneIndex: this.controller.currentSceneIndex,
            sceneName: this.controller.sceneConfigs[this.controller.currentSceneIndex].name
        };
        window.dispatchEvent(new CustomEvent('sceneChange', { detail }));
        window.dispatchEvent(new CustomEvent('sceneTransitionComplete', { detail }));
        
        console.log('TimelineController: Transition state cleared, scrolling should work now');

        // Apply the current offset immediately to position images and align look-at
        // This ensures we land with the first image centered when entering the timeline
        if (this.controller.imageManager) {
            this.controller.imageManager.moveTimelineImages(0);
        }
        if (this.controller.updateCameraLookAtForOriginalX) {
            this.controller.updateCameraLookAtForOriginalX(TIMELINE_FIRST_POSITION);
        }
        // Ensure vignette is visible immediately when landing on first image
        if (this.controller.effects) {
            this.controller.effects.updateTimelineVignette();
        }
        if (this.controller.updateCurrentYear) {
            this.controller.updateCurrentYear();
        }
        if (this.controller.syncDebugPanel) {
            this.controller.syncDebugPanel();
        }
    }
    
    /**
     * Update transition animation
     */
    update() {
        if (!this.controller.isTransitioning) return;
        
        // If timeline scene is running its animateToTimeline, keep isTransitioning true
        // so scroll events stay blocked. The animation callback will clear it.
        if (this.controller.currentSceneIndex === 1 && this.controller.timelineScene && this.controller.timelineScene.isTransitioning()) {
            return;
        }
        
        // Use original transition logic for other scenes
        const elapsed = (Date.now() - this.controller.transitionStartTime) / 1000;
        this.controller.transitionProgress = Math.min(elapsed / this.controller.transitionDuration, 1);
        
        // Use easing function for smooth animation
        const easedProgress = this.easeInOutCubic(this.controller.transitionProgress);
        
        // Interpolate camera position
        this.camera.position.lerpVectors(this.startPosition, this.endPosition, easedProgress);
        
        // Interpolate camera target (look-at point)
        const currentTarget = new THREE.Vector3();
        currentTarget.lerpVectors(this.startTarget, this.endTarget, easedProgress);
        
        // Interpolate FOV
        this.camera.fov = THREE.MathUtils.lerp(this.startFov, this.endFov, easedProgress);
        this.camera.updateProjectionMatrix();
        
        // Look at the interpolated target
        this.camera.lookAt(currentTarget);
        
        // Check if transition is complete
        if (this.controller.transitionProgress >= 1) {
            this.controller.isTransitioning = false;
            this.onTransitionComplete();
        }
    }
    
    /**
     * Easing function for smooth transitions
     */
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    /**
     * Handle scene change event
     */
    onSceneChange(sceneIndex) {
        // This method can be overridden or extended to handle scene-specific logic
        console.log(`Transitioning to scene: ${this.controller.sceneConfigs[sceneIndex].name}`);
        
        // Close any enlarged image when changing scenes
        if (this.controller.isImageEnlarged && this.controller.closeEnlargedImage) {
            this.controller.closeEnlargedImage();
        }
        
        // Clear any pending snap timeout
        if (this.controller.snapTimeout) {
            clearTimeout(this.controller.snapTimeout);
            this.controller.snapTimeout = null;
        }
        
        // Update UI if needed
        const event = new CustomEvent('sceneChange', {
            detail: {
                sceneIndex: sceneIndex,
                sceneName: this.controller.sceneConfigs[sceneIndex].name
            }
        });
        window.dispatchEvent(event);
    }
    
    /**
     * Handle transition complete
     */
    onTransitionComplete() {
        console.log('Transition complete to scene:', this.controller.currentSceneIndex);
        
        // Dispatch transition complete event
        const event = new CustomEvent('transitionComplete', {
            detail: {
                sceneIndex: this.controller.currentSceneIndex,
                sceneName: this.controller.sceneConfigs[this.controller.currentSceneIndex].name
            }
        });
        window.dispatchEvent(event);
    }
    
    /**
     * Get current scene index
     */
    getCurrentSceneIndex() {
        return this.controller.currentSceneIndex;
    }
    
    /**
     * Get current scene name
     */
    getCurrentSceneName() {
        return this.controller.sceneConfigs[this.controller.currentSceneIndex].name;
    }
    
    /**
     * Check if currently transitioning
     */
    isInTransition() {
        return this.controller.isTransitioning;
    }
    
    /**
     * Destroy the scene controller
     */
    destroy() {
        this.controller = null;
        this.camera = null;
    }
}

