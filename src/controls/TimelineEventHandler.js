/**
 * TimelineEventHandler - Manages all event handling for timeline interaction
 * Extracted from TimelineController to improve code organization and maintainability
 */
import * as THREE from 'three';
import { gsap } from 'gsap';

export class TimelineEventHandler {
    constructor(timelineController) {
        this.controller = timelineController;
        this.camera = timelineController.camera;
        
        // Bind event handlers to preserve 'this' context
        this.onClick = this.onClick.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onScroll = this.onScroll.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseEnter = this.onMouseEnter.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
    }
    
    /**
     * Initialize event listeners
     */
    init() {
        window.addEventListener('click', this.onClick);
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('wheel', this.onScroll, { passive: false });
        window.addEventListener('mousedown', this.onMouseDown);
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('mouseup', this.onMouseUp);
    }
    
    /**
     * Handle click events for image enlargement
     */
    onClick(event) {
        // Only handle clicks in timeline scene
        if (this.controller.currentSceneIndex !== 1) return;
        
        console.log('Click detected in timeline scene');
        
        // If an image is already enlarged, close it
        if (this.controller.isImageEnlarged) {
            console.log('Closing enlarged image');
            if (this.controller.closeEnlargedImage) {
                this.controller.closeEnlargedImage();
            }
            return;
        }
        
        // Check if we're dragging (don't trigger click if dragging)
        if (this.controller.isDragging) {
            console.log('Ignoring click - dragging detected');
            return;
        }
        
        // Check if mouse moved significantly since mousedown (indicates drag)
        const mouseDeltaX = Math.abs(event.clientX - this.controller.dragStartX);
        const mouseDeltaY = Math.abs(event.clientY - this.controller.dragStartY);
        if (mouseDeltaX > 5 || mouseDeltaY > 5) {
            console.log('Ignoring click - mouse moved too much');
            return; // Small threshold for click vs drag
        }
        
        // Get mouse position
        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        console.log('Mouse position:', mouse);
        
        // Create raycaster
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        
        // Get all clickable images: timeline planes + initial scene images that are part of timeline
        const clickableImages = [];
        
        // Add timeline planes (additional timeline images)
        const timelinePlanes = this.controller.timelineScene.getTimelinePlanes();
        if (timelinePlanes) {
            clickableImages.push(...timelinePlanes);
        }
        
        // Add initial scene images that have been transitioned to timeline
        if (window.app && window.app.imagePlanes) {
            const initialImages = window.app.imagePlanes.getPlanes();
            initialImages.forEach(image => {
                if (image.userData.isTimelineTransitioned) {
                    clickableImages.push(image);
                }
            });
        }
        
        console.log('Total clickable images:', clickableImages.length);
        console.log('Timeline planes count:', timelinePlanes ? timelinePlanes.length : 0);
        console.log('Initial images in timeline:', clickableImages.length - (timelinePlanes ? timelinePlanes.length : 0));
        
        // Check for intersections with all clickable images
        const intersects = raycaster.intersectObjects(clickableImages);
        
        console.log('Intersections found:', intersects.length);
        
        if (intersects.length > 0) {
            const clickedPlane = intersects[0].object;
            console.log('Enlarging image:', clickedPlane);
            if (this.controller.enlargeImage) {
                this.controller.enlargeImage(clickedPlane);
            }
        }
    }
    
    /**
     * Handle keyboard events
     */
    onKeyDown(event) {
        // Close enlarged image with Escape key
        if (event.key === 'Escape' && this.controller.isImageEnlarged) {
            if (this.controller.closeEnlargedImage) {
                this.controller.closeEnlargedImage();
            }
        }
    }
    
    /**
     * Handle scroll/wheel events
     */
    onScroll(event) {
        console.log('onScroll called, currentSceneIndex:', this.controller.currentSceneIndex, 'isTransitioning:', this.controller.isTransitioning);
        
        if (this.controller.isTransitioning) return;
        
        // Ignore wheel while dragging timeline or shortly after drag end to avoid interference
        if (this.controller.currentSceneIndex === 1) {
            if (this.controller.isDragging) {
                console.log('Scroll ignored - isDragging is true');
                return;
            }
            if (Date.now() < this.controller.dragWheelCooldownUntil) {
                console.log('Scroll ignored - within drag cooldown');
                return;
            }
        }
        
        // Disable scrolling when an image is enlarged
        if (this.controller.isImageEnlarged) {
            console.log('Scroll disabled - image is enlarged');
            return;
        }
        
        const delta = event.deltaY;
        
        // If we're in the timeline scene, handle smooth horizontal scrolling
        if (this.controller.currentSceneIndex === 1) {
            // Safety mechanism: end any active pullback during scroll to prevent stuck camera
            if (this.controller.cameraController && this.controller.cameraController.isHoldPullbackActive()) {
                if (this.controller.endHoldToPullback) {
                    this.controller.endHoldToPullback();
                }
            }
            
            // Prevent vertical scrolling from affecting timeline
            event.preventDefault();
            if (this.controller.handleSmoothTimelineScroll) {
                this.controller.handleSmoothTimelineScroll(delta);
            }
        } else {
            // In initial scene, handle scene transitions
            if (delta > 0) {
                if (this.controller.nextScene) {
                    this.controller.nextScene();
                }
            } else if (delta < 0) {
                if (this.controller.previousScene) {
                    this.controller.previousScene();
                }
            }
        }
    }
    
    /**
     * Handle mouse down events (start dragging)
     */
    onMouseDown(event) {
        if (this.controller.currentSceneIndex === 1) {
            // Allow dragging when an image is enlarged by closing it first for smooth transition
            if (this.controller.isImageEnlarged) {
                console.log('Image is enlarged - closing it to allow smooth dragging');
                if (this.controller.closeEnlargedImage) {
                    this.controller.closeEnlargedImage();
                }
            }
            
            this.controller.isDragging = true;
            this.controller.dragStartX = event.clientX;
            this.controller.dragStartY = event.clientY;
            this.controller.lastDragX = event.clientX;
            this.controller.dragVelocity = 0;
            this.controller.dragLastTime = performance.now();
            this.controller.dragAccumulatedOffset = 0;
            this.controller.firstDragDirection = null;
            
            // Reset physics state
            if (this.controller.dragHandler) {
                this.controller.dragHandler.dragPhysics.screenVelocity = 0;
                this.controller.dragHandler.dragPhysics.lastScreenDelta = 0;
                this.controller.dragHandler.dragPhysics.currentSensitivity = this.controller.dragHandler.dragPhysics.baseSensitivity;
                this.controller.dragHandler.dragPhysics.magneticSnapOffset = 0;
            }
            
            document.body.style.cursor = 'grabbing';
            this.controller.dragWheelCooldownUntil = Date.now() + 250;
            
            // Clear any pending external snap timeouts to prevent race conditions
            if (this.controller.snapTimeout) {
                clearTimeout(this.controller.snapTimeout);
                this.controller.snapTimeout = null;
            }
            
            // Haptic feedback for drag start
            if (this.controller.effects) {
                this.controller.effects.triggerHapticFeedback('start');
            }
            
            // Stop any ongoing momentum
            if (this.controller.dragHandler) {
                this.controller.dragHandler.stopDragMomentum();
            }
            
            // Record nearest index at drag start for first-drag guard
            if (this.controller.currentSceneIndex === 1) {
                this.controller.dragStartOffset = this.controller.timelineOffset ?? -5.25;
                this.controller.dragStartNearestIndex = this.controller.getNearestSnapIndex(this.controller.dragStartOffset);
            }
            
            // Start hold-to-pullback behavior (delayed)
            if (this.controller.startHoldToPullback) {
                this.controller.startHoldToPullback();
            }
            
            // Prepare liquid effect but do NOT show on mouse-down
            this.controller.liquidDragStarted = false;
            if (window.app && window.app.liquidDistortionEffect) {
                const eff = window.app.liquidDistortionEffect;
                eff.setControlMode('external');
                eff.setExcludeRect(0.45, 0.45, 0.55, 0.55);
                eff.setSideMask(0);
                eff.setApplyRect(0.0, 0.0, 0.0, 0.0);
            }
        }
    }
    
    /**
     * Handle mouse enter events
     */
    onMouseEnter() {
        if (this.controller.currentSceneIndex === 1) {
            document.body.style.cursor = 'grab';
        }
    }
    
    /**
     * Handle mouse move events (dragging)
     */
    onMouseMove(event) {
        if (this.controller.isDragging && this.controller.currentSceneIndex === 1) {
            // Allow dragging when an image is enlarged by closing it first for smooth transition
            if (this.controller.isImageEnlarged) {
                console.log('Image is enlarged - closing it to allow smooth dragging');
                if (this.controller.closeEnlargedImage) {
                    this.controller.closeEnlargedImage();
                }
            }
            
            const now = performance.now();
            const deltaX = event.clientX - this.controller.lastDragX;
            const dt = Math.max(now - this.controller.dragLastTime, 1);
            
            // Ignore micro-movements to prevent jitter
            if (Math.abs(deltaX) < 0.5) {
                return;
            }
            
            // Calculate physics-based sensitivity
            if (this.controller.dragHandler) {
                this.controller.dragHandler.updateDragPhysics(deltaX, dt);
            }
            
            // Calculate dynamic drag speed with physics-based sensitivity
            const viewportWidth = window.innerWidth;
            const baseDragSpeed = this.controller.timelineWidth / viewportWidth * this.controller.viewportDragScale;
            const physicsAdjustedSpeed = baseDragSpeed * this.controller.dragHandler.getSensitivity();
            let instOffsetDelta = deltaX * physicsAdjustedSpeed;
            
            // Apply magnetic snap adjustment for slow drags
            if (this.controller.applyMagneticSnap) {
                instOffsetDelta = this.controller.applyMagneticSnap(instOffsetDelta);
            }
            
            // Cancel hold-to-pullback if user starts dragging
            if (this.controller.cancelHoldToPullback) {
                this.controller.cancelHoldToPullback();
            }
            
            // Keep camera at X=0 and maintain proper Y position for timeline view
            this.camera.position.x = 0;
            
            // Maintain camera Y position from timeline scene configuration; do not change Z or lookAt here
            const currentConfig = this.controller.sceneConfigs[1]; // Timeline scene config
            this.camera.position.y = currentConfig.position.y;
            
            this.controller.lastDragX = event.clientX;
            
            // Move timeline images horizontally based on drag
            if (this.controller.imageManager) {
                this.controller.imageManager.moveTimelineImages(instOffsetDelta);
            }
            this.controller.dragAccumulatedOffset += instOffsetDelta;
            
            // Update vignette after positions move
            if (this.controller.effects) {
                this.controller.effects.updateTimelineVignette();
            }

            // Detect first-drag direction when starting from first image
            if (!this.controller.hasDraggedOnTimeline && this.controller.dragStartNearestIndex === 0 && this.controller.firstDragDirection === null) {
                if (deltaX > 0) this.controller.firstDragDirection = 'right';
                else if (deltaX < 0) this.controller.firstDragDirection = 'left';
            }

            // Update smoothed velocity for momentum
            this.controller.dragVelocity = this.controller.dragVelocity * 0.7 + instOffsetDelta * 0.3;
            this.controller.dragLastTime = now;
            
            // Drive liquid effect velocity based on drag direction and magnitude
            if (window.app && window.app.liquidDistortionEffect) {
                const uvX = 0.5;
                const uvY = 0.5;
                const velX = -instOffsetDelta * 2.5;
                const velY = 0;
                
                if (!this.controller.liquidDragStarted) {
                    if (Math.abs(deltaX) >= 0.5) {
                        if (!window.app.liquidDistortionEffect.isActive) {
                            window.app.liquidDistortionEffect.activate();
                        }
                        this.controller.liquidDragStarted = true;
                        window.app.liquidDistortionEffect.fadeInEffect(0.6);
                    } else {
                        window.app.liquidDistortionEffect.setApplyRect(0.0, 0.0, 0.0, 0.0);
                        return;
                    }
                }
                
                window.app.liquidDistortionEffect.setDirectionalOnly(true);
                window.app.liquidDistortionEffect.setExternalCenterAndVelocity(uvX, uvY, velX, velY);
                
                const side = instOffsetDelta > 0 ? -1 : (instOffsetDelta < 0 ? 1 : 0);
                window.app.liquidDistortionEffect.setSideMask(side);

                if (side === -1) {
                    window.app.liquidDistortionEffect.setApplyRect(0.0, 0.2, 0.45, 0.8);
                } else if (side === 1) {
                    window.app.liquidDistortionEffect.setApplyRect(0.55, 0.2, 1.0, 0.8);
                } else {
                    window.app.liquidDistortionEffect.setApplyRect(0.0, 0.0, 0.0, 0.0);
                }
                
                window.app.liquidDistortionEffect.setExcludeRect(0.48, 0.40, 0.52, 0.60);
                const speedMag = Math.min(1.0, Math.abs(instOffsetDelta) * 120.0);
                window.app.liquidDistortionEffect.fadeInEffect(0.4 + 0.4 * speedMag);
            }
            
            // Add haptic feedback during drag
            if (this.controller.effects) {
                this.controller.effects.triggerHapticFeedback();
            }
            
            // Update year display and sync debug panel
            if (this.controller.updateCurrentYear) {
                this.controller.updateCurrentYear();
            }
            if (this.controller.syncDebugPanel) {
                this.controller.syncDebugPanel();
            }
        }
    }
    
    /**
     * Handle mouse up events (end dragging)
     */
    onMouseUp(event) {
        if (this.controller.isDragging) {
            this.controller.isDragging = false;
            document.body.style.cursor = 'grab';
            
            // End hold-to-pullback behavior
            if (this.controller.endHoldToPullback) {
                this.controller.endHoldToPullback();
            }
            this.controller.dragWheelCooldownUntil = Date.now() + 300;
            
            // Haptic feedback for drag end
            if (this.controller.effects) {
                this.controller.effects.triggerHapticFeedback('end');
            }

            // Handle first rightward drag from first image
            if (!this.controller.hasDraggedOnTimeline && this.controller.dragStartNearestIndex === 0 && this.controller.firstDragDirection === 'right') {
                const targetOffset = -3.75;
                if (this.controller.dragHandler) {
                    this.controller.dragHandler.stopDragMomentum();
                }
                
                gsap.to(this.controller, {
                    timelineOffset: targetOffset,
                    duration: 0.6,
                    ease: "power2.out",
                    onUpdate: () => {
                        if (this.controller.timelineScene && this.controller.timelineScene.getTimelinePlanes) {
                            const planes = this.controller.timelineScene.getTimelinePlanes();
                            planes.forEach((plane, index) => {
                                const originalX = ((index + 8) * 1.5) - 5.25;
                                plane.position.x = originalX - this.controller.timelineOffset;
                            });
                        }
                        
                        if (window.app && window.app.imagePlanes) {
                            const initialImages = window.app.imagePlanes.getPlanes();
                            initialImages.forEach((image, index) => {
                                if (image.userData.isTimelineTransitioned) {
                                    const originalX = (index * 1.5) - 5.25;
                                    image.position.x = originalX - this.controller.timelineOffset;
                                }
                            });
                        }
                        
                        if (this.controller.updateCurrentYear) {
                            this.controller.updateCurrentYear();
                        }
                        if (this.controller.syncDebugPanel) {
                            this.controller.syncDebugPanel();
                        }
                        if (this.controller.updateCameraLookAtForOriginalX) {
                            this.controller.updateCameraLookAtForOriginalX(targetOffset);
                        }
                    },
                    onComplete: () => {
                        if (this.controller.effects) {
                            this.controller.effects.triggerHapticFeedback('snap');
                        }
                        this.controller.hasDraggedOnTimeline = true;
                        this.controller.currentSnapIndex = 1;
                    }
                });
            } else {
                // Stop any momentum
                if (this.controller.dragHandler) {
                    this.controller.dragHandler.stopDragMomentum();
                }
                
                // Handle snap logic
                const isRecent = (performance.now() - this.controller.dragLastTime) < this.controller.releaseNoSnapRecentMs;
                const isFast = Math.abs(this.controller.dragVelocity) > this.controller.releaseNoSnapVelocityThreshold;
                
                if (isRecent || isFast) {
                    this.controller.hasDraggedOnTimeline = true;
                    if (this.controller.updateCurrentYear) {
                        this.controller.updateCurrentYear();
                    }
                    if (this.controller.syncDebugPanel) {
                        this.controller.syncDebugPanel();
                    }
                    if (this.controller.effects) {
                        this.controller.effects.updateTimelineVignette();
                    }
                } else {
                    if (this.controller.snapAfterDrag) {
                        this.controller.snapAfterDrag();
                    }
                }
            }
            
            // Add a small delay to prevent click event from firing after drag
            setTimeout(() => {
                this.controller.isDragging = false;
            }, 100);

            // Turn off liquid effect immediately after release
            if (window.app && window.app.liquidDistortionEffect) {
                window.app.liquidDistortionEffect.fadeOutEffect();
                setTimeout(() => {
                    if (window.app && window.app.liquidDistortionEffect) {
                        window.app.liquidDistortionEffect.deactivate();
                    }
                }, 120);
                this.controller.liquidDragStarted = false;
            }
        }
    }
    
    /**
     * Destroy event handler and clean up listeners
     */
    destroy() {
        window.removeEventListener('click', this.onClick);
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('wheel', this.onScroll);
        window.removeEventListener('mousedown', this.onMouseDown);
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('mouseup', this.onMouseUp);
        
        this.controller = null;
        this.camera = null;
    }
}

