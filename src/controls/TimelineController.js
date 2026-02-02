import * as THREE from 'three';
import { gsap } from 'gsap';
import { TimelineDragHandler } from './TimelineDragHandler.js';
import { TimelineSnapHandler } from './TimelineSnapHandler.js';
import { TimelineCameraController } from './TimelineCameraController.js';
import { TimelineImageManager } from './TimelineImageManager.js';
import { TimelineEffects } from './TimelineEffects.js';
import { TimelineEventHandler } from './TimelineEventHandler.js';
import { TimelineSceneController } from './TimelineSceneController.js';
import { TimelineScrollController } from './TimelineScrollController.js';
import { TimelineAnimationController } from './TimelineAnimationController.js';
import { SmoothScrollController } from './SmoothScrollController.js';

export class TimelineController {
    constructor(camera, sceneManager, timelineScene, backgroundBlurEffect = null) {
        this.camera = camera;
        this.sceneManager = sceneManager;
        this.timelineScene = timelineScene;
        this.backgroundBlurEffect = backgroundBlurEffect;
        this.scenes = [];
        this.currentSceneIndex = 0;
        this.introComplete = false;
        this.isTransitioning = false;
        this.transitionProgress = 0;
        this.transitionDuration = 1.5; // seconds
        this.transitionStartTime = 0;
        
        // Image enlargement state
        this.enlargedImage = null;
        this.originalImageState = null;
        this.isImageEnlarged = false;
        
        // Snap functionality
        this.snapTimeout = null;
        
        // Smooth scrolling properties - managed by TimelineScrollController

        // Drag physics
        this.dragSpeed = 0.008; // base drag speed
        this.dragVelocity = 0; // offset delta per frame
        this.dragLastTime = 0;
        this.dragFriction = 0.96; // gentler damping
        this.isMomentumActive = false;
        this.momentumRaf = null;
        
        // Enhanced drag scaling for full timeline traversal
        this.timelineWidth = 13.5; // Total timeline width (-5.25 to 8.25)
        this.viewportDragScale = 1.0; // Scale factor for viewport-based dragging (managed by drag handler)

        // Hold-to-pullback camera behavior
        // Hold-to-pullback camera behavior (now managed by TimelineCameraController)

        // Camera look-at smoothing driver (world X the camera looks at during timeline)
        this.lookAtX = 0;

        // Timeline vignette (center emphasis) parameters
        this.timelineVignetteStrength = 0.6; // 0..1 amount of dimming at edges
        this.timelineVignetteWidth = 4.0;     // radius in world units for full brightness region

        // Drag snap threshold (world units along offset) to advance to next image on release
        // Images are spaced by 1.5 units; 0.5 means ~33% of the distance triggers the next snap
        this.dragSnapThresholdUnits = 0.5;

        // Liquid effect should only show after actual drag movement begins
        this.liquidDragStarted = false;

        // Quick-release thresholds: if releasing while moving fast/recently, do not snap
        this.releaseNoSnapVelocityThreshold = 0.02; // offset units/frame-equivalent
        this.releaseNoSnapRecentMs = 60; // if last movement was within 60ms, treat as quick

        // Track current snap index (0..9 where 0 corresponds to -4)
        this.currentSnapIndex = 0;

        // Wheel cooldown to prevent trackpad scroll interference during/after drag
        this.dragWheelCooldownUntil = 0;

        // Track accumulated offset moved during a drag (in offset units)
        this.dragAccumulatedOffset = 0;
        this.firstDragDirection = null;

        // First-drag guard and bookkeeping
        this.hasDraggedOnTimeline = false;
        this.dragStartNearestIndex = null;
        this.dragStartOffset = null;
        
        // Camera positions for different scenes
        this.sceneConfigs = [
            {
                name: 'initial',
                position: new THREE.Vector3(0, 0, 5),
                target: new THREE.Vector3(0, 0, 0),
                fov: 75
            },
            {
                name: 'timeline',
                position: new THREE.Vector3(0, 0, 8),   // Camera at origin X; first image at world (0,0,0) when offset=-5.25
                target: new THREE.Vector3(0, 0, 0),    // Look at first image
                fov: 30
            }
        ];
        
        this.dragHandler = null;
        this.snapHandler = null;
        this.cameraController = null;
        this.imageManager = null;
        this.effects = null;
        this.eventHandler = null;
        this.sceneController = null;
        this.scrollController = null;
        this.animationController = null;
        this.smoothScrollController = null;

        this.init();
    }
    
    init() {
        // Initialize drag handler
        this.dragHandler = new TimelineDragHandler(this);
        this.dragHandler.init();
        
        // Initialize snap handler
        this.snapHandler = new TimelineSnapHandler(this);
        
        // Initialize camera controller
        this.cameraController = new TimelineCameraController(this);
        
        // Initialize image manager
        this.imageManager = new TimelineImageManager(this);
        
        // Initialize effects manager
        this.effects = new TimelineEffects(this);
        
        // Initialize event handler
        this.eventHandler = new TimelineEventHandler(this);
        
        // Initialize scene controller
        this.sceneController = new TimelineSceneController(this);
        
        // Initialize scroll controller
        this.scrollController = new TimelineScrollController(this);
        this.scrollController.initSmoothScrolling();

        // Initialize Lenis + ScrollTrigger for year-by-year smooth scroll (activates when entering timeline)
        this.smoothScrollController = new SmoothScrollController(this);

        // Initialize animation controller
        this.animationController = new TimelineAnimationController(this);
        
        // Update drag scale via handler
        this.viewportDragScale = this.dragHandler.viewportDragScale;
        
        // Disable default scroll behavior
        document.body.style.overflow = 'hidden';
        
        // Initialize event handler (handles all events including touch)
        this.eventHandler.init();
    }

    // Compute world-space X of a timeline image given its original X and current offset,
    // then update the camera's look-at to smoothly follow that focal point
    updateCameraLookAtForOriginalX(originalImageX) {
        // Delegate to camera controller
        if (this.cameraController) {
            this.cameraController.updateCameraLookAtForOriginalX(originalImageX);
        }
    }
    
    onClick(event) {
        // Delegate to event handler
        if (this.eventHandler) {
            this.eventHandler.onClick(event);
        }
    }
    
    
    onKeyDown(event) {
        // Delegate to event handler
        if (this.eventHandler) {
            this.eventHandler.onKeyDown(event);
        }
    }
    
    enlargeImage(plane) {
        // Delegate to image manager
        if (this.imageManager) {
            this.imageManager.enlargeImage(plane);
        }
    }
    
    
    closeEnlargedImage() {
        // Delegate to image manager
        if (this.imageManager) {
            this.imageManager.closeEnlargedImage();
        }
    }
    
    
    addCloseButton() {
        // Delegate to effects manager
        if (this.effects) {
            this.effects.addCloseButton();
        }
    }
    
    
    removeCloseButton() {
        // Delegate to effects manager
        if (this.effects) {
            this.effects.removeCloseButton();
        }
    }
    
    
    addBackgroundOverlay() {
        // Delegate to effects manager
        if (this.effects) {
            this.effects.addBackgroundOverlay();
        }
    }
    
    

    
    getBackgroundOpacity() {
        // Get background opacity from debug panel or use default
        const debugPanel = document.querySelector('#backgroundOpacitySlider');
        if (debugPanel) {
            return parseFloat(debugPanel.value);
        }
        return 0.8; // Default opacity
    }
    
    onScroll(event) {
        // Delegate to event handler
        if (this.eventHandler) {
            this.eventHandler.onScroll(event);
        }
    }
    
    
    onMouseDown(event) {
        // Delegate to event handler
        if (this.eventHandler) {
            this.eventHandler.onMouseDown(event);
        }
    }
    
    onMouseEnter() {
        // Delegate to event handler
        if (this.eventHandler) {
            this.eventHandler.onMouseEnter();
        }
    }
    
    onMouseMove(event) {
        // Delegate to event handler
        if (this.eventHandler) {
            this.eventHandler.onMouseMove(event);
        }
    }
    
    
    onMouseUp(event) {
        // Delegate to event handler
        if (this.eventHandler) {
            this.eventHandler.onMouseUp(event);
        }
    }
    


    startHoldToPullback() {
        if (this.cameraController) {
            this.cameraController.startHoldToPullback();
        }
    }
    
    executeHoldPullback() {
        if (this.cameraController) {
            this.cameraController.executeHoldPullback();
        }
    }
    
    cancelHoldToPullback() {
        if (this.cameraController) {
            this.cameraController.cancelHoldToPullback();
        }
    }
    
    endHoldToPullback() {
        if (this.cameraController) {
            this.cameraController.endHoldToPullback();
        }
    }
    
    handleSmoothTimelineScroll(delta) {
        // Allow scrolling when an image is enlarged by closing it first for smooth transition
        if (this.isImageEnlarged) {
            console.log('Image is enlarged - closing it to allow smooth scrolling');
            this.closeEnlargedImage();
        }
        
        // Safety mechanism: end any active pullback during scroll to prevent stuck camera
        if (this.cameraController && this.cameraController.isHoldPullbackActive()) {
            this.endHoldToPullback();
        }
        
        // Keep camera at X=0 and maintain proper Y position for timeline view
        this.camera.position.x = 0;
        
        // Maintain camera Y position from timeline scene configuration; do not change Z or lookAt here
        const currentConfig = this.sceneConfigs[1];
        this.camera.position.y = currentConfig.position.y;
        
        // Apply smooth scrolling with subtle friction
        if (this.scrollController) {
            this.scrollController.applySmoothScroll(delta);
        }
        // Update vignette after scroll movement
        this.updateTimelineVignette();
        
        // Avoid heavy visibility checks on wheel while scrolling; handled on-demand
        
        // Update the current year display
        this.updateCurrentYear();
        
        // Sync debug panel with current camera position
        this.syncDebugPanel();
        
        // Clear any existing snap timeout
        if (this.snapTimeout) {
            clearTimeout(this.snapTimeout);
        }
        
        // Set a timeout to snap after scrolling stops (shorter for better responsiveness)
        this.snapTimeout = setTimeout(() => {
            if (this.snapHandler) {
                this.snapHandler.smoothSnapToNearestImage();
            }
        }, 400); // Quick snap for better control
    }
    
    syncDebugPanel() {
        // Dispatch event to sync debug panel with current camera position
        const currentConfig = this.sceneConfigs[1]; // Timeline scene config
        const event = new CustomEvent('syncDebugPanel', {
            detail: {
                cameraX: 0, // Camera always stays at X=0
                cameraY: this.camera.position.y,
                cameraZ: this.camera.position.z,
                targetY: currentConfig.target.y, // Use configured Target Y
                fov: this.camera.fov
            }
        });
        window.dispatchEvent(event);
    }
    
    getCurrentYear() {
        // Delegate to image manager
        if (this.imageManager) {
            return this.imageManager.getCurrentYear();
        }
        return 2010; // Default
    }
    
    moveTimelineImages(deltaX) {
        // Delegate to image manager
        if (this.imageManager) {
            this.imageManager.moveTimelineImages(deltaX);
        }
    }

    // Dim side images based on distance from viewport center
    updateTimelineVignette() {
        // Delegate to effects manager
        if (this.effects) {
            this.effects.updateTimelineVignette();
        }
    }
    
    
    snapToNearestImage() {
        if (this.timelineOffset === undefined || this.timelineOffset === null) return;
        
        // Define snap positions (every 1.5 units, corresponding to image positions, starting at -5.25)
        const snapPositions = [-5.25, -3.75, -2.25, -0.75, 0.75, 2.25, 3.75, 5.25, 6.75, 8.25];
        
        // Find the nearest snap position
        let nearestPosition = 0;
        let minDistance = Infinity;
        
        snapPositions.forEach(position => {
            const distance = Math.abs(this.timelineOffset - position);
            if (distance < minDistance) {
                minDistance = distance;
                nearestPosition = position;
            }
        });

        // First-drag guard: if starting at first and moving rightward, restrict snap to second image
        if (!this.hasDraggedOnTimeline && this.dragStartNearestIndex === 0 && this.timelineOffset > -5.25) {
            nearestPosition = -3.75;
        }
        
        // Only snap if we're not already at a snap position
        if (Math.abs(this.timelineOffset - nearestPosition) > 0.1) {
            console.log(`Snapping from ${this.timelineOffset.toFixed(2)} to ${nearestPosition}`);
            
            // Animate to the nearest snap position
            gsap.to(this, {
                timelineOffset: nearestPosition,
                duration: 0.3,
                ease: "power2.out",
                onUpdate: () => {
                    // Update additional timeline images during animation
                    if (this.timelineScene && this.timelineScene.getTimelinePlanes) {
                        const planes = this.timelineScene.getTimelinePlanes();
                        planes.forEach((plane, index) => {
                            const originalX = ((index + 8) * 1.5) - 5.25; // Positions 6, 8, 10, 12, 14
                            plane.position.x = originalX - this.timelineOffset;
                        });
                    }
                    
                    // Update initial scene images that have been transitioned
                    if (window.app && window.app.imagePlanes) {
                        const initialImages = window.app.imagePlanes.getPlanes();
                        initialImages.forEach((image, index) => {
                            if (image.userData.isTimelineTransitioned) {
                                const originalX = (index * 1.5) - 5.25; // Positions -4, -2, 0, 2, 4
                                image.position.x = originalX - this.timelineOffset;
                            }
                        });
                    }
                    
                    // Update year display and sync debug panel
                    this.updateCurrentYear();
                    this.syncDebugPanel();
                },
                onComplete: () => {
                    // Trigger haptic feedback when snapping completes
                    this.triggerHapticFeedback('snap');
                    // Update current snap index bookkeeping
                    const idx = this.getNearestSnapIndex(nearestPosition);
                    this.currentSnapIndex = idx;
                    this.hasDraggedOnTimeline = true;
                }
            });
        }
    }

    // Momentum handling for drag release - delegated to drag handler
    startDragMomentum() {
        this.dragHandler.startDragMomentum();
    }

    stopDragMomentum() {
        this.dragHandler.stopDragMomentum();
    }

    // Utility to compute nearest snap - delegated to handler
    getSnapPositions() {
        return this.snapHandler.getSnapPositions();
    }

    getNearestSnapIndex(offset) {
        return this.snapHandler.getNearestSnapIndex(offset);
    }

    // Snap after a drag ends - delegated to handler
    snapAfterDrag() {
        this.snapHandler.snapAfterDrag();
    }
    
    triggerHapticFeedback(type = 'drag') {
        // Delegate to effects manager
        if (this.effects) {
            this.effects.triggerHapticFeedback(type);
        }
    }
    
    updateCurrentYear() {
        const currentYear = this.getCurrentYear();
        
        // Dispatch custom event for year change
        const event = new CustomEvent('timelineYearChange', {
            detail: {
                year: currentYear,
                position: this.camera.position.x
            }
        });
        window.dispatchEvent(event);
    }
    
    nextScene() {
        if (this.currentSceneIndex < this.sceneConfigs.length - 1) {
            this.transitionToScene(this.currentSceneIndex + 1);
        }
    }
    
    previousScene() {
        if (this.currentSceneIndex > 0) {
            this.transitionToScene(this.currentSceneIndex - 1);
        }
    }
    
    transitionToScene(targetIndex) {
        // Delegate to scene controller
        if (this.sceneController) {
            this.sceneController.transitionToScene(targetIndex);
        }
    }
    
    
    performOriginalTransition(targetIndex, startConfig, endConfig) {
        // Delegate to camera controller
        if (this.cameraController) {
            this.cameraController.setupTransition(targetIndex, startConfig, endConfig);
        }
        
        // Also store locally for update() method
        this.startPosition = this.camera.position.clone();
        this.startTarget = new THREE.Vector3();
        this.camera.getWorldDirection(this.startTarget);
        this.startTarget.multiplyScalar(5).add(this.camera.position);
        this.startFov = this.camera.fov;
        
        // Store target camera state
        this.endPosition = endConfig.position.clone();
        this.endTarget = endConfig.target.clone();
        this.endFov = endConfig.fov;
    }
    
    activateTimelineScene() {
        // Activate the timeline scene which will handle its own animations
        if (this.timelineScene) {
            this.timelineScene.activate();
        }
        
        // Initialize timeline offset so the FIRST image (original X = -5.25) lands centered at X=0
        this.timelineOffset = -5.25;
        console.log('TimelineController: Set timeline offset to -5.25 (first image centered)');

        // Reset first-drag guard state when entering the timeline
        this.hasDraggedOnTimeline = false;
        this.dragStartNearestIndex = null;
        this.dragStartOffset = null;
        this.dragHandler.stopDragMomentum();
        this.currentSnapIndex = 0;
        
        // Force transition completion for timeline scene
        console.log('TimelineController: Activating timeline scene and forcing transition complete');
        this.isTransitioning = false;
        this.transitionProgress = 1;
        this.transitionStartTime = 0; // Reset transition start time
        
        this.onTransitionComplete();
        
        // Dispatch scene change event to update UI
        const event = new CustomEvent('sceneChange', {
            detail: {
                sceneIndex: this.currentSceneIndex,
                sceneName: this.sceneConfigs[this.currentSceneIndex].name
            }
        });
        window.dispatchEvent(event);
        
        console.log('TimelineController: Transition state cleared, scrolling should work now');

        // Apply the current offset immediately to position images and align look-at
        // This ensures we land with the first image centered when entering the timeline
        this.moveTimelineImages(0);
        this.updateCameraLookAtForOriginalX(-5.25);
        // Ensure vignette is visible immediately when landing on first image
        this.updateTimelineVignette();
        this.updateCurrentYear();
        this.syncDebugPanel();
    }
    
    update() {
        // Delegate to scene controller
        if (this.sceneController) {
            this.sceneController.update();
        }
        // Lenis RAF for smooth scroll (when active in timeline)
        if (this.smoothScrollController) {
            this.smoothScrollController.raf(performance.now());
        }
    }
    
    
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    onSceneChange(sceneIndex) {
        // This method can be overridden or extended to handle scene-specific logic
        console.log(`Transitioning to scene: ${this.sceneConfigs[sceneIndex].name}`);
        
        // Close any enlarged image when changing scenes
        if (this.isImageEnlarged) {
            this.closeEnlargedImage();
        }
        
        // Clear any pending snap timeout
        if (this.snapTimeout) {
            clearTimeout(this.snapTimeout);
            this.snapTimeout = null;
        }
        
        // Emit custom event for other components to listen to
        const event = new CustomEvent('sceneChange', {
            detail: {
                sceneIndex,
                sceneName: this.sceneConfigs[sceneIndex].name
            }
        });
        window.dispatchEvent(event);
    }
    
    onTransitionComplete() {
        console.log(`Transition complete to scene: ${this.sceneConfigs[this.currentSceneIndex].name}`);
        
        // Emit custom event for transition completion
        const event = new CustomEvent('sceneTransitionComplete', {
            detail: {
                sceneIndex: this.currentSceneIndex,
                sceneName: this.sceneConfigs[this.currentSceneIndex].name
            }
        });
        window.dispatchEvent(event);
    }
    
    getCurrentSceneIndex() {
        return this.currentSceneIndex;
    }

    setIntroComplete(value) {
        this.introComplete = !!value;
    }

    isIntroComplete() {
        return this.introComplete;
    }
    
    getCurrentSceneName() {
        return this.sceneConfigs[this.currentSceneIndex].name;
    }
    
    isInTransition() {
        return this.isTransitioning;
    }
    
    updateTimelineCameraConfig(config) {
        // Delegate to camera controller
        if (this.cameraController) {
            this.cameraController.updateTimelineCameraConfig(config);
        }
    }
    
    isImageCurrentlyEnlarged() {
        return this.isImageEnlarged;
    }
    
    getEnlargedImage() {
        return this.enlargedImage;
    }
    
    animateToYear(year, targetOffset) {
        // Delegate to animation controller
        if (this.animationController) {
            this.animationController.animateToYear(year, targetOffset);
        }
    }
    
    // Smooth scrolling methods - delegated to scroll controller
    initSmoothScrolling() {
        if (this.scrollController) {
            this.scrollController.initSmoothScrolling();
        }
    }
    
    applySmoothScroll(delta) {
        if (this.scrollController) {
            this.scrollController.applySmoothScroll(delta);
        }
    }
    
    applyMomentumDeceleration() {
        if (this.scrollController) {
            this.scrollController.applyMomentumDeceleration();
        }
    }
    
    setSmoothScrollSensitivity(value) {
        if (this.scrollController) {
            this.scrollController.setSensitivity(value);
        }
    }
    
    setSmoothScrollFriction(value) {
        if (this.scrollController) {
            this.scrollController.setFriction(value);
        }
    }
    
    getSmoothScrollSettings() {
        if (this.scrollController) {
            return this.scrollController.getSettings();
        }
        return { sensitivity: 0.50, friction: 0.92 };
    }
    
    ensureTimelineImagesVisible() {
        console.log('🔧 Ensuring timeline images are visible...');
        
        // Ensure all timeline images are visible and properly positioned
        if (this.timelineScene && this.timelineScene.getTimelinePlanes) {
            const planes = this.timelineScene.getTimelinePlanes();
            console.log(`Found ${planes.length} timeline planes`);
            
            planes.forEach((plane, index) => {
                plane.visible = true;
                plane.position.y = 0; // Keep horizontal alignment
                
                // Ensure proper scale
                if (plane.scale.x < 0.5) {
                    plane.scale.setScalar(0.75);
                }
                
                console.log(`Timeline plane ${index}: visible=${plane.visible}, position=(${plane.position.x.toFixed(2)}, ${plane.position.y.toFixed(2)}, ${plane.position.z.toFixed(2)}), scale=(${plane.scale.x.toFixed(2)}, ${plane.scale.y.toFixed(2)}, ${plane.scale.z.toFixed(2)})`);
            });
        }
        
        // Ensure initial scene images that are part of timeline are visible
        if (window.app && window.app.imagePlanes) {
            const initialImages = window.app.imagePlanes.getPlanes();
            console.log(`Found ${initialImages.length} initial images`);
            
            initialImages.forEach((image, index) => {
                if (image.userData.isTimelineTransitioned) {
                    image.visible = true;
                    image.position.y = 0; // Keep horizontal alignment
                    
                    // Ensure proper scale
                    if (image.scale.x < 0.5) {
                        image.scale.setScalar(0.75);
                    }
                    
                    console.log(`Initial image ${index} (timeline): visible=${image.visible}, position=(${image.position.x.toFixed(2)}, ${image.position.y.toFixed(2)}, ${image.position.z.toFixed(2)}), scale=(${image.scale.x.toFixed(2)}, ${image.scale.y.toFixed(2)}, ${image.scale.z.toFixed(2)})`);
                }
            });
        }
        
        console.log('✅ Timeline images visibility check complete');
    }
    
    checkImageVisibilityInView() {
        // Check if images are within camera's view frustum
        const camera = this.camera;
        const frustum = new THREE.Frustum();
        const matrix = new THREE.Matrix4();
        
        matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(matrix);
        
        console.log('🔍 Checking image visibility in camera view...');
        
        // Check timeline images
        if (this.timelineScene && this.timelineScene.getTimelinePlanes) {
            const planes = this.timelineScene.getTimelinePlanes();
            planes.forEach((plane, index) => {
                const isInFrustum = frustum.containsPoint(plane.position);
                console.log(`Timeline plane ${index}: in frustum=${isInFrustum}, position=(${plane.position.x.toFixed(2)}, ${plane.position.y.toFixed(2)}, ${plane.position.z.toFixed(2)})`);
            });
        }
        
        // Check initial scene images
        if (window.app && window.app.imagePlanes) {
            const initialImages = window.app.imagePlanes.getPlanes();
            initialImages.forEach((image, index) => {
                if (image.userData.isTimelineTransitioned) {
                    const isInFrustum = frustum.containsPoint(image.position);
                    console.log(`Initial image ${index}: in frustum=${isInFrustum}, position=(${image.position.x.toFixed(2)}, ${image.position.y.toFixed(2)}, ${image.position.z.toFixed(2)})`);
                }
            });
        }
    }
    
    applyMagneticSnap(baseDelta) {
        const magneticOffset = this.dragHandler.getMagneticSnapOffset();
        
        // Apply magnetic offset to the base movement
        // This creates a subtle pull toward snap positions during slow drags
        return baseDelta + magneticOffset;
    }
} 