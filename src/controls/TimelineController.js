import * as THREE from 'three';
import { gsap } from 'gsap';
import { TimelineDragHandler } from './TimelineDragHandler.js';
import { TimelineSnapHandler } from './TimelineSnapHandler.js';
import { TimelineCameraController } from './TimelineCameraController.js';
import { TimelineImageManager } from './TimelineImageManager.js';
import { TimelineEffects } from './TimelineEffects.js';
import { TimelineEventHandler } from './TimelineEventHandler.js';
import { TimelineSceneController } from './TimelineSceneController.js';

export class TimelineController {
    constructor(camera, sceneManager, timelineScene, backgroundBlurEffect = null) {
        this.camera = camera;
        this.sceneManager = sceneManager;
        this.timelineScene = timelineScene;
        this.backgroundBlurEffect = backgroundBlurEffect;
        this.scenes = [];
        this.currentSceneIndex = 0;
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
        
        // Smooth scrolling properties (balanced for smooth, controlled scrolling)
        this.smoothScrollSensitivity = 0.50;
        this.smoothScrollFriction = 0.92;
        this.smoothScrollVelocity = 0;
        this.lastScrollTime = 0;
        this.momentumTimeout = null;

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
                position: new THREE.Vector3(-5.25, 0, 8), // Start at 2010 (first image position)
                target: new THREE.Vector3(-5.25, 0, 0), // Look at first image
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
        
        // Update drag scale via handler
        this.viewportDragScale = this.dragHandler.viewportDragScale;
        
        // Disable default scroll behavior
        document.body.style.overflow = 'hidden';
        
        // Initialize event handler (handles all events including touch)
        this.eventHandler.init();
        
        // Initialize smooth scrolling
        this.initSmoothScrolling();
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
        this.applySmoothScroll(delta);
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
        // Calculate year based on timeline image positions
        // Since camera stays at X=0, we need to track timeline offset
        if (this.timelineOffset === undefined || this.timelineOffset === null) this.timelineOffset = -5.25;
        
        const yearRange = 2019 - 2010; // 9 years (2010-2019)
        const xRange = 13.5; // -5.25 to 8.25 (images are at -5.25, -3.75, -2.25, -0.75, 0.75, 2.25, 3.75, 5.25, 6.75, 8.25)
        
        // Map timeline offset to year (offset=-5.25 is 2010, offset=8.25 is 2019)
        const normalizedX = Math.max(0, Math.min(1, (this.timelineOffset + 5.25) / xRange)); // 0 to 1
        const year = Math.round(2010 + (normalizedX * yearRange));
        
        return Math.max(2010, Math.min(2019, year));
    }
    
    moveTimelineImages(deltaX) {
        // Allow limited timeline movement when an image is enlarged but close it first
        if (this.isImageEnlarged) {
            console.log('Image is enlarged - closing it to allow smooth timeline movement');
            this.closeEnlargedImage();
        }
        
        // Track timeline offset for year calculation
        if (this.timelineOffset === undefined || this.timelineOffset === null) this.timelineOffset = 0;
        const previousOffset = this.timelineOffset;
        this.timelineOffset += deltaX;
        
        // Clamp timeline offset (new range: -5.25 to 8.25)
        this.timelineOffset = Math.max(-5.25, Math.min(8.25, this.timelineOffset));

        // Remove in-drag clamping to prevent oscillation between -4 and -2
        
        // Check if we hit a boundary and trigger haptic feedback
        if (this.timelineOffset === -5.25 && previousOffset > -5.25) {
            // Hit start boundary (2010)
            this.triggerHapticFeedback('boundary');
        } else if (this.timelineOffset === 8.25 && previousOffset < 8.25) {
            // Hit end boundary (2019)
            this.triggerHapticFeedback('boundary');
        }
        
        // Move additional timeline images horizontally (positions 6, 8, 10, 12, 14)
        if (this.timelineScene && this.timelineScene.getTimelinePlanes) {
            const planes = this.timelineScene.getTimelinePlanes();
            planes.forEach((plane, index) => {
                const originalX = ((index + 8) * 1.5) - 5.25; // Positions 6, 8, 10, 12, 14
                plane.position.x = originalX - this.timelineOffset;
                
                // Ensure images remain visible
                plane.visible = true;
                plane.position.y = 0; // Keep at horizontal alignment
            });
        }
        
        // Move initial scene images that have been transitioned to timeline
        if (window.app && window.app.imagePlanes) {
            const initialImages = window.app.imagePlanes.getPlanes();
            initialImages.forEach((image, index) => {
                if (image.userData.isTimelineTransitioned) {
                    const originalX = (index * 1.5) - 5.25; // Positions -4, -2, 0, 2, 4
                    image.position.x = originalX - this.timelineOffset;
                    
                    // Ensure images remain visible
                    image.visible = true;
                    image.position.y = 0; // Keep at horizontal alignment
                }
            });
        }

        // Smoothly pan camera look-at toward the nearest image based on current offset
        // Use a single driver value to avoid stacking tweens and jitter
        const snapPositions = [-5.25, -3.75, -2.25, -0.75, 0.75, 2.25, 3.75, 5.25, 6.75, 8.25];
        let nearestX = snapPositions[0];
        let minDist = Infinity;
        for (const x of snapPositions) {
            const dist = Math.abs(x - this.timelineOffset);
            if (dist < minDist) {
                minDist = dist;
                nearestX = x;
            }
        }
        const timelineConfig = this.sceneConfigs[1];
        const targetY = timelineConfig ? timelineConfig.target.y : 0;
        const targetLookAtX = nearestX - this.timelineOffset;
        gsap.killTweensOf(this, { lookAtX: true });
        gsap.to(this, {
            lookAtX: targetLookAtX,
            duration: 0.2,
            ease: 'power2.out',
            onUpdate: () => {
                this.camera.lookAt(new THREE.Vector3(this.lookAtX, targetY, 0));
            }
        });
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
    
    
    triggerIOSHaptic(type = 'drag') {
        console.log('Attempting iOS haptic feedback');
        // iOS haptic feedback using WebKit
        if (window.webkit && window.webkit.messageHandlers) {
            // Try to trigger haptic feedback through iOS WebKit
            try {
                let style = 'light';
                if (type === 'start' || type === 'end') {
                    style = 'medium';
                } else if (type === 'boundary') {
                    style = 'heavy';
                } else if (type === 'snap') {
                    style = 'light';
                }
                
                window.webkit.messageHandlers.hapticFeedback.postMessage({
                    type: 'impact',
                    style: style
                });
                console.log('iOS haptic feedback sent');
            } catch (e) {
                console.log('iOS haptic feedback failed:', e);
                // Fallback to vibration if haptic feedback fails
                if (navigator.vibrate) {
                    let vibrationPattern = 15;
                    if (type === 'start') vibrationPattern = 20;
                    else if (type === 'end') vibrationPattern = 15;
                    else if (type === 'boundary') vibrationPattern = [10, 50, 10];
                    navigator.vibrate(vibrationPattern);
                }
            }
        } else {
            console.log('iOS WebKit not available');
        }
    }
    
    tryAlternativeHaptic(type = 'drag') {
        console.log('Trying alternative haptic methods');
        
        // Try different vibration patterns
        try {
            if (navigator.vibrate) {
                let pattern = 10;
                if (type === 'start') pattern = 30;
                else if (type === 'end') pattern = 20;
                else if (type === 'boundary') pattern = 50;
                else if (type === 'snap') pattern = [5, 20, 5];
                
                navigator.vibrate(pattern);
                console.log('Alternative vibration triggered');
            }
        } catch (e) {
            console.log('Alternative vibration failed:', e);
        }
    }
    
    triggerAudioFeedback(type = 'drag') {
        console.log('Triggering audio feedback');
        
        // Create audio context for feedback
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.log('Audio context not available:', e);
                return;
            }
        }
        
        try {
            // Create oscillator for audio feedback
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // Different frequencies based on type
            let frequency = 200; // Default
            if (type === 'start') frequency = 300;
            else if (type === 'end') frequency = 250;
            else if (type === 'boundary') frequency = 400;
            else if (type === 'snap') frequency = 150;
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = 'sine';
            
            // Very short duration
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.05);
            
            console.log('Audio feedback triggered');
        } catch (e) {
            console.log('Audio feedback failed:', e);
        }
    }
    
    checkDeviceCapabilities() {
        // Only check once
        if (this.capabilitiesChecked) return;
        this.capabilitiesChecked = true;
        
        console.log('=== DEVICE CAPABILITIES CHECK ===');
        console.log('User Agent:', navigator.userAgent);
        console.log('Platform:', navigator.platform);
        console.log('Vendor:', navigator.vendor);
        
        // Check vibration support
        if (navigator.vibrate) {
            console.log('✅ Vibration API supported');
            // Test vibration
            try {
                const result = navigator.vibrate(10);
                console.log('Vibration test result:', result);
            } catch (e) {
                console.log('❌ Vibration test failed:', e);
            }
        } else {
            console.log('❌ Vibration API not supported');
        }
        
        // Check iOS WebKit
        if (window.webkit && window.webkit.messageHandlers) {
            console.log('✅ iOS WebKit detected');
        } else {
            console.log('❌ iOS WebKit not available');
        }
        
        // Check audio context
        if (window.AudioContext || window.webkitAudioContext) {
            console.log('✅ Audio Context supported');
        } else {
            console.log('❌ Audio Context not supported');
        }
        
        // Check if on mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        console.log('Mobile device:', isMobile);
        
        // Check permissions
        if (navigator.permissions) {
            navigator.permissions.query({ name: 'notifications' }).then(result => {
                console.log('Notification permission:', result.state);
            });
        }
        
        console.log('=== END CAPABILITIES CHECK ===');
    }
    
    showHapticIndicator(type = 'drag') {
        // Create or get haptic indicator element
        if (!this.hapticIndicator) {
            this.hapticIndicator = document.createElement('div');
            this.hapticIndicator.style.position = 'fixed';
            this.hapticIndicator.style.top = '50%';
            this.hapticIndicator.style.left = '50%';
            this.hapticIndicator.style.transform = 'translate(-50%, -50%)';
            this.hapticIndicator.style.width = '100px';
            this.hapticIndicator.style.height = '100px';
            this.hapticIndicator.style.borderRadius = '50%';
            this.hapticIndicator.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
            this.hapticIndicator.style.border = '3px solid white';
            this.hapticIndicator.style.zIndex = '9999';
            this.hapticIndicator.style.pointerEvents = 'none';
            this.hapticIndicator.style.transition = 'all 0.1s ease-out';
            this.hapticIndicator.style.opacity = '0';
            this.hapticIndicator.style.scale = '0';
            document.body.appendChild(this.hapticIndicator);
        }
        
        // Different colors based on type
        let color = '#ffffff';
        if (type === 'start') color = '#4CAF50';
        else if (type === 'end') color = '#FF9800';
        else if (type === 'boundary') color = '#F44336';
        else if (type === 'snap') color = '#2196F3';
        
        // Animate the indicator
        this.hapticIndicator.style.backgroundColor = color;
        this.hapticIndicator.style.borderColor = color;
        this.hapticIndicator.style.opacity = '1';
        this.hapticIndicator.style.scale = '1';
        
        // Hide after animation
        setTimeout(() => {
            this.hapticIndicator.style.opacity = '0';
            this.hapticIndicator.style.scale = '0';
        }, 100);
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
        // Allow timeline movement when an image is enlarged by closing it first
        if (this.isImageEnlarged) {
            console.log('Image is enlarged - closing it to allow smooth timeline animation');
            this.closeEnlargedImage();
        }
        
        console.log(`Animating to year ${year} with offset ${targetOffset}`);
        
        // Clear any existing snap timeout
        if (this.snapTimeout) {
            clearTimeout(this.snapTimeout);
            this.snapTimeout = null;
        }
        
        // Initialize timeline offset if not set
        if (this.timelineOffset === undefined || this.timelineOffset === null) this.timelineOffset = 0;
        
        // Ensure we're not already at the target
        if (Math.abs(this.timelineOffset - targetOffset) < 0.1) {
            console.log('Already at target position, skipping animation');
            return;
        }
        
        // Animate to the target offset with smooth easing
        gsap.to(this, {
            timelineOffset: targetOffset,
            duration: 1.2, // Slightly longer for smoother feel
            ease: "power2.inOut", // Smoother easing
            onUpdate: () => {
                // Update additional timeline images during animation (positions 6, 8, 10, 12, 14)
                if (this.timelineScene && this.timelineScene.getTimelinePlanes) {
                    const planes = this.timelineScene.getTimelinePlanes();
                    planes.forEach((plane, index) => {
                        const originalX = ((index + 8) * 1.5) - 5.25; // Positions 6, 8, 10, 12, 14
                        plane.position.x = originalX - this.timelineOffset;
                        
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
                            const originalX = (index * 1.5) - 5.25; // Positions -4, -2, 0, 2, 4
                            image.position.x = originalX - this.timelineOffset;
                            
                            // Ensure images remain visible
                            image.visible = true;
                            image.position.y = 0; // Keep horizontal alignment
                        }
                    });
                }
                
                // Update year display and sync debug panel
                this.updateCurrentYear();
                this.syncDebugPanel();
                
                // Ensure images remain visible and properly positioned
                this.ensureTimelineImagesVisible();

                // During the year animation, pan camera look-at to the target image
                // Compute the original X for the requested year
                const yearIndex = year - 2010; // 0..9
                const originalX = (yearIndex * 1.5) - 5.25; // -5.25..8.25
                this.updateCameraLookAtForOriginalX(originalX);
            },
            onComplete: () => {
                // Trigger haptic feedback when animation completes
                this.triggerHapticFeedback('snap');
                
                // Dispatch year change event
                this.updateCurrentYear();
                
                // Final check to ensure all images are properly positioned
                this.ensureTimelineImagesVisible();
                
                console.log(`Animation complete: Now at year ${this.getCurrentYear()}, offset ${this.timelineOffset}`);
            }
        });
    }
    
    // Clean smooth scrolling implementation
    initSmoothScrolling() {
        // Initialize smooth scrolling with optimal values (balanced for smooth control)
        this.smoothScrollSensitivity = 0.50;
        this.smoothScrollFriction = 0.92;
        this.smoothScrollVelocity = 0;
        this.lastScrollTime = 0;
    }
    
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
        this.moveTimelineImages(-this.smoothScrollVelocity);
        
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
    
    applyMomentumDeceleration() {
        if (Math.abs(this.smoothScrollVelocity) > 0.005) {
            // Apply friction to slow down
            this.smoothScrollVelocity *= this.smoothScrollFriction;
            
            // Apply remaining velocity
            this.moveTimelineImages(-this.smoothScrollVelocity);
            
            // Continue deceleration
            this.momentumTimeout = setTimeout(() => {
                this.applyMomentumDeceleration();
            }, 16);
        } else {
            // Stop scrolling
            this.smoothScrollVelocity = 0;
        }
    }
    
    smoothSnapToNearestImage() {
        // Delegate to snap handler
        if (this.snapHandler) {
            this.snapHandler.smoothSnapToNearestImage();
        }
    }
    
    // Smooth scrolling control methods
    setSmoothScrollSensitivity(value) {
        this.smoothScrollSensitivity = Math.max(0.1, Math.min(1.0, value));
    }
    
    setSmoothScrollFriction(value) {
        this.smoothScrollFriction = Math.max(0.7, Math.min(0.95, value));
    }
    
    getSmoothScrollSettings() {
        return {
            sensitivity: this.smoothScrollSensitivity,
            friction: this.smoothScrollFriction
        };
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