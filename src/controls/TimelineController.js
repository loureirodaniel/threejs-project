import * as THREE from 'three';
import { gsap } from 'gsap';

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
        
        // Smooth scrolling properties
        this.smoothScrollSensitivity = 0.25;
        this.smoothScrollFriction = 0.85;
        this.smoothScrollVelocity = 0;
        this.lastScrollTime = 0;
        this.momentumTimeout = null;
        
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
                position: new THREE.Vector3(0, 0, 8), // Start at 2010 (centered)
                target: new THREE.Vector3(0, 0, 0), // Look at center where images are positioned
                fov: 30
            }
        ];
        
        this.init();
    }
    
    init() {
        // Disable default scroll behavior
        document.body.style.overflow = 'hidden';
        
        // Add scroll event listener
        window.addEventListener('wheel', this.onScroll.bind(this), { passive: false });
        
        // Add mouse drag events for timeline
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.lastDragX = 0;
        
        window.addEventListener('mousedown', this.onMouseDown.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('mouseup', this.onMouseUp.bind(this));
        
        // Add click event for image enlargement
        window.addEventListener('click', this.onClick.bind(this));
        
        // Add escape key to close enlarged image
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        
        // Initialize smooth scrolling
        this.initSmoothScrolling();
        
        // Add touch events for mobile
        let touchStartY = 0;
        let touchStartX = 0;
        window.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
            touchStartX = e.touches[0].clientX;
        }, { passive: true });
        
        window.addEventListener('touchend', (e) => {
            // Disable touch events when an image is enlarged
            if (this.isImageEnlarged) {
                console.log('Touch events disabled - image is enlarged');
                return;
            }
            
            const touchEndY = e.changedTouches[0].clientY;
            const touchEndX = e.changedTouches[0].clientX;
            const deltaY = touchStartY - touchEndY;
            const deltaX = touchStartX - touchEndX;
            
            if (this.currentSceneIndex === 1) {
                // In timeline scene, handle horizontal scrolling only
                if (Math.abs(deltaX) > 50) { // Minimum swipe distance
                    if (deltaX > 0) {
                        // Swipe left - scroll right in timeline (towards 2019)
                        this.handleTimelineScroll(-1);
                    } else {
                        // Swipe right - scroll left in timeline (towards 2010)
                        this.handleTimelineScroll(1);
                    }
                }
            } else {
                // In initial scene, handle scene transitions
                if (Math.abs(deltaY) > 50) { // Minimum swipe distance
                    if (deltaY > 0) {
                        this.nextScene();
                    } else {
                        this.previousScene();
                    }
                }
            }
        }, { passive: true });
    }

    // Compute world-space X of a timeline image given its original X and current offset,
    // then update the camera's look-at to smoothly follow that focal point
    updateCameraLookAtForOriginalX(originalImageX) {
        const timelineConfig = this.sceneConfigs[1];
        const targetY = timelineConfig ? timelineConfig.target.y : 0;
        if (this.timelineOffset === undefined || this.timelineOffset === null) {
            this.timelineOffset = 0;
        }
        const worldX = originalImageX - this.timelineOffset;
        this.camera.lookAt(new THREE.Vector3(worldX, targetY, 0));
    }
    
    onClick(event) {
        // Only handle clicks in timeline scene
        if (this.currentSceneIndex !== 1) return;
        
        console.log('Click detected in timeline scene');
        
        // If an image is already enlarged, close it
        if (this.isImageEnlarged) {
            console.log('Closing enlarged image');
            this.closeEnlargedImage();
            return;
        }
        
        // Check if we're dragging (don't trigger click if dragging)
        if (this.isDragging) {
            console.log('Ignoring click - dragging detected');
            return;
        }
        
        // Check if mouse moved significantly since mousedown (indicates drag)
        const mouseDeltaX = Math.abs(event.clientX - this.dragStartX);
        const mouseDeltaY = Math.abs(event.clientY - this.dragStartY);
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
        const timelinePlanes = this.timelineScene.getTimelinePlanes();
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
            this.enlargeImage(clickedPlane);
        }
    }
    
    onKeyDown(event) {
        // Close enlarged image with Escape key
        if (event.key === 'Escape' && this.isImageEnlarged) {
            this.closeEnlargedImage();
        }
    }
    
    enlargeImage(plane) {
        if (this.isImageEnlarged) return;
        
        console.log('Starting image enlargement - bringing to front and reducing other images to 25% opacity');
        
        this.enlargedImage = plane;
        this.isImageEnlarged = true;
        
        // Store original state
        this.originalImageState = {
            position: plane.position.clone(),
            scale: plane.scale.clone(),
            rotation: plane.rotation.clone(),
            material: plane.material.clone()
        };
        
        // Calculate 70% of viewport size
        const viewportHeight = 2 * Math.tan((this.camera.fov * Math.PI / 180) / 2) * Math.abs(this.camera.position.z);
        const viewportWidth = viewportHeight * this.camera.aspect;
        
        const targetWidth = viewportWidth * 0.7;
        const targetHeight = viewportHeight * 0.7;
        
        console.log('Viewport dimensions:', { viewportWidth, viewportHeight });
        console.log('Target dimensions:', { targetWidth, targetHeight });
        
        // Calculate scale factor based on original plane size
        const originalWidth = 1.5; // Original plane width
        const originalHeight = 1.5 / (4/3); // Original plane height (4:3 aspect ratio)
        
        const scaleX = targetWidth / originalWidth;
        const scaleY = targetHeight / originalHeight;
        const scale = Math.min(scaleX, scaleY); // Use the smaller scale to maintain aspect ratio
        
        // Animate to center and scale up
        const targetPosition = new THREE.Vector3(0, 0, 0);
        
        // Mark this plane as enlarged to disable floating animation
        plane.userData.isEnlarged = true;
        
        // Activate background blur effect immediately
        if (this.backgroundBlurEffect) {
            console.log('TimelineController: Activating background blur immediately');
            this.backgroundBlurEffect.activate();
        } else {
            console.log('TimelineController: No background blur effect available');
        }
        
        // Kill any existing animations on this plane to prevent conflicts
        gsap.killTweensOf(plane.position);
        gsap.killTweensOf(plane.scale);
        gsap.killTweensOf(plane.material);
        
        // Create a single timeline for all animations to prevent conflicts
        const tl = gsap.timeline();
        
        // Animate position, scale, and z-index together in one smooth animation
        tl.to(plane.position, {
            x: targetPosition.x,
            y: targetPosition.y,
            z: 2, // Move to front, above blur overlay
            duration: 0.6,
            ease: "power2.out"
        }, 0);
        
        tl.to(plane.scale, {
            x: scale,
            y: scale,
            z: scale,
            duration: 0.6,
            ease: "power2.out"
        }, 0);
        
        // Make the enlarged image fully opaque
        tl.to(plane.material, {
            opacity: 1.0,
            duration: 0.5,
            ease: "power2.out"
        }, 0);
        
        // Fade out other timeline planes
        const timelinePlanes = this.timelineScene.getTimelinePlanes();
        timelinePlanes.forEach(otherPlane => {
            if (otherPlane !== plane) {
                // Reduce opacity to 25%
                tl.to(otherPlane.material, {
                    opacity: 0.25,
                    duration: 0.5,
                    ease: "power2.out"
                }, 0);
            }
        });
        
        // Fade out initial scene images that are part of timeline
        if (window.app && window.app.imagePlanes) {
            const initialImages = window.app.imagePlanes.getPlanes();
            initialImages.forEach(otherImage => {
                if (otherImage.userData.isTimelineTransitioned && otherImage !== plane) {
                    // Reduce opacity to 25%
                    tl.to(otherImage.material, {
                        opacity: 0.25,
                        duration: 0.5,
                        ease: "power2.out"
                    }, 0);
                }
            });
        }
        
        // Add background overlay to obscure other images
        this.addBackgroundOverlay();
        
        // Add close button overlay
        this.addCloseButton();
    }
    
    closeEnlargedImage() {
        if (!this.isImageEnlarged || !this.enlargedImage || !this.originalImageState) return;
        
        const plane = this.enlargedImage;
        const originalState = this.originalImageState;
        
        // Deactivate background blur effect immediately
        if (this.backgroundBlurEffect) {
            console.log('TimelineController: Deactivating background blur immediately');
            this.backgroundBlurEffect.fadeOutBlur();
        }
        
        // Kill any existing animations on this plane to prevent conflicts
        gsap.killTweensOf(plane.position);
        gsap.killTweensOf(plane.scale);
        gsap.killTweensOf(plane.material);
        
        // Create a single timeline for all close animations to prevent conflicts
        const closeTl = gsap.timeline();
        
        // Animate position and scale together in one smooth animation
        closeTl.to(plane.position, {
            x: originalState.position.x,
            y: originalState.position.y,
            z: originalState.position.z,
            duration: 0.6,
            ease: "power2.out"
        }, 0);
        
        closeTl.to(plane.scale, {
            x: originalState.scale.x,
            y: originalState.scale.y,
            z: originalState.scale.z,
            duration: 0.6,
            ease: "power2.out"
        }, 0);
        
        // Fade in other timeline planes back to original opacity
        const timelinePlanes = this.timelineScene.getTimelinePlanes();
        timelinePlanes.forEach(otherPlane => {
            if (otherPlane !== plane) {
                closeTl.to(otherPlane.material, {
                    opacity: 0.9,
                    duration: 0.5,
                    ease: "power2.out"
                }, 0);
            }
        });
        
        // Fade in initial scene images that are part of timeline back to original opacity
        if (window.app && window.app.imagePlanes) {
            const initialImages = window.app.imagePlanes.getPlanes();
            initialImages.forEach(otherImage => {
                if (otherImage.userData.isTimelineTransitioned && otherImage !== plane) {
                    closeTl.to(otherImage.material, {
                        opacity: 0.9,
                        duration: 0.5,
                        ease: "power2.out"
                    }, 0);
                }
            });
        }
        
        // Restore the enlarged image opacity to original value
        closeTl.to(plane.material, {
            opacity: 0.9,
            duration: 0.5,
            ease: "power2.out"
        }, 0);
        
        // Clear the enlarged flag to re-enable floating animation
        plane.userData.isEnlarged = false;
        
        // Remove close button
        this.removeCloseButton();
        
        // Reset state
        this.enlargedImage = null;
        this.originalImageState = null;
        this.isImageEnlarged = false;
    }
    
    addCloseButton() {
        // Remove existing close button if any
        this.removeCloseButton();
        
        // Create close button
        this.closeButton = document.createElement('div');
        this.closeButton.innerHTML = '✕';
        this.closeButton.style.position = 'fixed';
        this.closeButton.style.top = '20px';
        this.closeButton.style.right = '20px';
        this.closeButton.style.width = '50px';
        this.closeButton.style.height = '50px';
        this.closeButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.closeButton.style.color = 'white';
        this.closeButton.style.border = '2px solid white';
        this.closeButton.style.borderRadius = '50%';
        this.closeButton.style.display = 'flex';
        this.closeButton.style.alignItems = 'center';
        this.closeButton.style.justifyContent = 'center';
        this.closeButton.style.fontSize = '24px';
        this.closeButton.style.fontWeight = 'bold';
        this.closeButton.style.cursor = 'pointer';
        this.closeButton.style.zIndex = '1000';
        this.closeButton.style.opacity = '0';
        this.closeButton.style.transition = 'opacity 0.3s ease';
        
        // Add click event
        this.closeButton.addEventListener('click', () => {
            this.closeEnlargedImage();
        });
        
        document.body.appendChild(this.closeButton);
        
        // Create scroll disabled indicator
        this.scrollIndicator = document.createElement('div');
        this.scrollIndicator.innerHTML = 'Scroll disabled';
        this.scrollIndicator.style.position = 'fixed';
        this.scrollIndicator.style.bottom = '20px';
        this.scrollIndicator.style.left = '50%';
        this.scrollIndicator.style.transform = 'translateX(-50%)';
        this.scrollIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.scrollIndicator.style.color = 'white';
        this.scrollIndicator.style.padding = '8px 16px';
        this.scrollIndicator.style.borderRadius = '20px';
        this.scrollIndicator.style.fontSize = '14px';
        this.scrollIndicator.style.fontWeight = 'bold';
        this.scrollIndicator.style.zIndex = '1000';
        this.scrollIndicator.style.opacity = '0';
        this.scrollIndicator.style.transition = 'opacity 0.3s ease';
        
        document.body.appendChild(this.scrollIndicator);
        
        // Fade in both elements
        setTimeout(() => {
            this.closeButton.style.opacity = '1';
            this.scrollIndicator.style.opacity = '1';
        }, 100);
    }
    
    removeCloseButton() {
        if (this.closeButton) {
            this.closeButton.remove();
            this.closeButton = null;
        }
        if (this.scrollIndicator) {
            this.scrollIndicator.remove();
            this.scrollIndicator = null;
        }
        if (this.backgroundOverlay) {
            this.backgroundOverlay.remove();
            this.backgroundOverlay = null;
        }

    }
    
    addBackgroundOverlay() {
        // Remove existing background overlay if any
        if (this.backgroundOverlay) {
            this.backgroundOverlay.remove();
        }
        
        // Create background overlay
        this.backgroundOverlay = document.createElement('div');
        this.backgroundOverlay.style.position = 'fixed';
        this.backgroundOverlay.style.top = '0';
        this.backgroundOverlay.style.left = '0';
        this.backgroundOverlay.style.width = '100%';
        this.backgroundOverlay.style.height = '100%';
        this.backgroundOverlay.style.backgroundColor = `rgba(0, 0, 0, ${this.getBackgroundOpacity()})`;
        this.backgroundOverlay.style.zIndex = '999';
        this.backgroundOverlay.style.opacity = '0';
        this.backgroundOverlay.style.transition = 'opacity 0.3s ease';
        this.backgroundOverlay.style.pointerEvents = 'none'; // Allow clicks to pass through to the image
        
        document.body.appendChild(this.backgroundOverlay);
        
        // Fade in
        setTimeout(() => {
            this.backgroundOverlay.style.opacity = '1';
        }, 100);
        

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
        if (this.isTransitioning) return;
        
        // Disable scrolling when an image is enlarged
        if (this.isImageEnlarged) {
            console.log('Scroll disabled - image is enlarged');
            return;
        }
        
        const delta = event.deltaY;
        
        // If we're in the timeline scene, handle smooth horizontal scrolling
        if (this.currentSceneIndex === 1) {
            // Prevent vertical scrolling from affecting timeline
            event.preventDefault();
            this.handleSmoothTimelineScroll(delta);
        } else {
            // In initial scene, handle scene transitions
            if (delta > 0) {
                this.nextScene();
            } else if (delta < 0) {
                this.previousScene();
            }
        }
    }
    
    onMouseDown(event) {
        if (this.currentSceneIndex === 1) {
            // Disable dragging when an image is enlarged
            if (this.isImageEnlarged) {
                console.log('Drag disabled - image is enlarged');
                return;
            }
            
            this.isDragging = true;
            this.dragStartX = event.clientX;
            this.dragStartY = event.clientY;
            this.lastDragX = event.clientX;
            document.body.style.cursor = 'grabbing';
            
            // Haptic feedback for drag start
            this.triggerHapticFeedback('start');
        }
    }
    
    onMouseEnter() {
        if (this.currentSceneIndex === 1) {
            document.body.style.cursor = 'grab';
        }
    }
    
    onMouseMove(event) {
        if (this.isDragging && this.currentSceneIndex === 1) {
            // Disable dragging when an image is enlarged
            if (this.isImageEnlarged) {
                console.log('Drag move disabled - image is enlarged');
                return;
            }
            
            const deltaX = event.clientX - this.lastDragX;
            const dragSpeed = 0.01;
            
            // Keep camera at X=0 and maintain proper Y position for timeline view
            this.camera.position.x = 0;
            
            // Maintain camera Y and Z position from timeline scene configuration
            const currentConfig = this.sceneConfigs[1]; // Timeline scene config
            this.camera.position.y = currentConfig.position.y;
            this.camera.position.z = currentConfig.position.z;
            
            // Update camera target to stay at center where images are positioned
            this.camera.lookAt(currentConfig.target);
            
            this.lastDragX = event.clientX;
            
            // Move timeline images horizontally based on drag
            this.moveTimelineImages(deltaX * dragSpeed);
            
            // Ensure timeline images remain visible
            this.ensureTimelineImagesVisible();
            
            // Add haptic feedback during drag
            this.triggerHapticFeedback();
            
            // Update year display and sync debug panel
            this.updateCurrentYear();
            this.syncDebugPanel();
        }
    }
    
    onMouseUp(event) {
        if (this.isDragging) {
            this.isDragging = false;
            document.body.style.cursor = 'grab';
            
            // Haptic feedback for drag end
            this.triggerHapticFeedback('end');
            
            // Snap to nearest image after dragging ends
            setTimeout(() => {
                this.snapToNearestImage();
            }, 50);
            
            // Add a small delay to prevent click event from firing after drag
            setTimeout(() => {
                this.isDragging = false;
            }, 100);
        }
    }
    
    handleSmoothTimelineScroll(delta) {
        // Disable scrolling when an image is enlarged
        if (this.isImageEnlarged) {
            return;
        }
        
        // Keep camera at X=0 and maintain proper Y position for timeline view
        this.camera.position.x = 0;
        
        // Maintain camera Y position from timeline scene configuration
        const currentConfig = this.sceneConfigs[1];
        this.camera.position.y = currentConfig.position.y;
        this.camera.position.z = currentConfig.position.z;
        
        // Update camera target to stay at center where images are positioned
        this.camera.lookAt(currentConfig.target);
        
        // Apply smooth scrolling with subtle friction
        this.applySmoothScroll(delta);
        
        // Ensure timeline images remain visible
        this.ensureTimelineImagesVisible();
        
        // Update the current year display
        this.updateCurrentYear();
        
        // Sync debug panel with current camera position
        this.syncDebugPanel();
        
        // Clear any existing snap timeout
        if (this.snapTimeout) {
            clearTimeout(this.snapTimeout);
        }
        
        // Set a timeout to snap after scrolling stops
        this.snapTimeout = setTimeout(() => {
            this.smoothSnapToNearestImage();
        }, 600); // Slightly longer delay for smoother feel
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
        if (!this.timelineOffset) this.timelineOffset = 0;
        
        const yearRange = 2019 - 2010; // 9 years (2010-2019)
        const xRange = 18; // -4 to 14 (images are at -4, -2, 0, 2, 4, 6, 8, 10, 12, 14)
        
        // Map timeline offset to year (offset=-4 is 2010, offset=14 is 2019)
        const normalizedX = Math.max(0, Math.min(1, (this.timelineOffset + 4) / xRange)); // 0 to 1
        const year = Math.round(2010 + (normalizedX * yearRange));
        
        return Math.max(2010, Math.min(2019, year));
    }
    
    moveTimelineImages(deltaX) {
        // Disable timeline movement when an image is enlarged
        if (this.isImageEnlarged) {
            console.log('Timeline movement disabled - image is enlarged');
            return;
        }
        
        // Track timeline offset for year calculation
        if (!this.timelineOffset) this.timelineOffset = 0;
        const previousOffset = this.timelineOffset;
        this.timelineOffset += deltaX;
        
        // Clamp timeline offset (new range: -4 to 14)
        this.timelineOffset = Math.max(-4, Math.min(14, this.timelineOffset));
        
        // Check if we hit a boundary and trigger haptic feedback
        if (this.timelineOffset === -4 && previousOffset > -4) {
            // Hit start boundary (2010)
            this.triggerHapticFeedback('boundary');
        } else if (this.timelineOffset === 14 && previousOffset < 14) {
            // Hit end boundary (2019)
            this.triggerHapticFeedback('boundary');
        }
        
        // Move additional timeline images horizontally (positions 6, 8, 10, 12, 14)
        if (this.timelineScene && this.timelineScene.getTimelinePlanes) {
            const planes = this.timelineScene.getTimelinePlanes();
            planes.forEach((plane, index) => {
                const originalX = ((index + 5) * 2) - 4; // Positions 6, 8, 10, 12, 14
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
                    const originalX = (index * 2) - 4; // Positions -4, -2, 0, 2, 4
                    image.position.x = originalX - this.timelineOffset;
                    
                    // Ensure images remain visible
                    image.visible = true;
                    image.position.y = 0; // Keep at horizontal alignment
                }
            });
        }

        // Smoothly pan camera look-at toward the nearest image based on current offset
        // Find nearest original image X from the combined list [-4,-2,0,2,4,6,8,10,12,14]
        const snapPositions = [-4, -2, 0, 2, 4, 6, 8, 10, 12, 14];
        let nearestX = snapPositions[0];
        let minDist = Infinity;
        snapPositions.forEach((x) => {
            const dist = Math.abs((x) - this.timelineOffset);
            if (dist < minDist) {
                minDist = dist;
                nearestX = x;
            }
        });
        // Tween the camera look-at toward that image smoothly
        const timelineConfig = this.sceneConfigs[1];
        const targetY = timelineConfig ? timelineConfig.target.y : 0;
        const worldX = nearestX - this.timelineOffset;
        gsap.to({}, {
            duration: 0.2,
            onUpdate: () => {
                this.camera.lookAt(new THREE.Vector3(worldX, targetY, 0));
            }
        });
    }
    
    snapToNearestImage() {
        if (!this.timelineOffset) return;
        
        // Define snap positions (every 2 units, corresponding to image positions, starting at -4)
        const snapPositions = [-4, -2, 0, 2, 4, 6, 8, 10, 12, 14];
        
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
                            const originalX = ((index + 5) * 2) - 4; // Positions 6, 8, 10, 12, 14
                            plane.position.x = originalX - this.timelineOffset;
                        });
                    }
                    
                    // Update initial scene images that have been transitioned
                    if (window.app && window.app.imagePlanes) {
                        const initialImages = window.app.imagePlanes.getPlanes();
                        initialImages.forEach((image, index) => {
                            if (image.userData.isTimelineTransitioned) {
                                const originalX = (index * 2) - 4; // Positions -4, -2, 0, 2, 4
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
                }
            });
        }
    }
    
    triggerHapticFeedback(type = 'drag') {
        // Debug logging
        console.log(`Haptic feedback triggered: ${type}`);
        
        // Show visual feedback indicator
        this.showHapticIndicator(type);
        
        // Check device capabilities
        this.checkDeviceCapabilities();
        
        // Throttle haptic feedback to avoid overwhelming the device
        if (!this.lastHapticTime) this.lastHapticTime = 0;
        const now = Date.now();
        
        // Different throttling based on feedback type
        let throttleTime = 100; // Default for drag
        if (type === 'start' || type === 'end') {
            throttleTime = 0; // No throttle for start/end
        }
        
        if (now - this.lastHapticTime > throttleTime) {
            this.lastHapticTime = now;
            
            // Different vibration patterns based on type
            let vibrationPattern = 10; // Default short vibration
            if (type === 'start') {
                vibrationPattern = 20; // Slightly longer for start
            } else if (type === 'end') {
                vibrationPattern = 15; // Medium for end
            } else if (type === 'boundary') {
                vibrationPattern = [10, 50, 10]; // Pattern for boundaries
            } else if (type === 'snap') {
                vibrationPattern = [5, 20, 5]; // Quick double tap for snap
            }
            
            // Try multiple haptic feedback methods
            let hapticTriggered = false;
            
            // Method 1: Standard vibration API
            if (navigator.vibrate) {
                try {
                    console.log(`Attempting vibration with pattern:`, vibrationPattern);
                    const result = navigator.vibrate(vibrationPattern);
                    console.log(`Vibration API result: ${result}`);
                    hapticTriggered = result;
                    
                    // If vibration returns false, try a longer pattern
                    if (!result && type === 'start') {
                        console.log('Trying longer vibration pattern...');
                        navigator.vibrate(100);
                    }
                } catch (e) {
                    console.log('Vibration API failed:', e);
                }
            } else {
                console.log('Vibration API not available');
            }
            
            // Method 2: iOS specific haptic feedback
            if (window.navigator && window.navigator.userAgent.includes('iPhone')) {
                this.triggerIOSHaptic(type);
                hapticTriggered = true;
            }
            
            // Method 3: Try alternative vibration methods
            if (!hapticTriggered) {
                this.tryAlternativeHaptic(type);
            }
            
            // Method 4: Audio feedback as fallback
            if (!hapticTriggered) {
                this.triggerAudioFeedback(type);
            }
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
        if (this.isTransitioning || targetIndex === this.currentSceneIndex) return;
        
        this.isTransitioning = true;
        this.transitionProgress = 0;
        this.transitionStartTime = Date.now();
        
        const startConfig = this.sceneConfigs[this.currentSceneIndex];
        const endConfig = this.sceneConfigs[targetIndex];
        
        // If transitioning to timeline scene, use the new camera transition system
        if (targetIndex === 1 && this.timelineScene) {
            this.timelineScene.startSceneTransition(this.camera, () => {
                // Camera transition complete, now activate timeline scene
                this.activateTimelineScene();
            });
        } else {
            // Use original transition for other scenes
            this.performOriginalTransition(targetIndex, startConfig, endConfig);
        }
        
        // Update current scene index
        this.currentSceneIndex = targetIndex;
        
        // Trigger scene change event
        this.onSceneChange(targetIndex);
    }
    
    performOriginalTransition(targetIndex, startConfig, endConfig) {
        // Store initial camera state
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
        
        // Initialize timeline offset to ensure proper positioning
        if (!this.timelineOffset) {
            this.timelineOffset = 0;
            console.log('TimelineController: Initialized timeline offset to 0');
        }
        
        // Mark transition as complete
        this.isTransitioning = false;
        this.onTransitionComplete();
        
        // Dispatch scene change event to update UI
        const event = new CustomEvent('sceneChange', {
            detail: {
                sceneIndex: this.currentSceneIndex,
                sceneName: this.sceneConfigs[this.currentSceneIndex].name
            }
        });
        window.dispatchEvent(event);
    }
    
    update() {
        if (!this.isTransitioning) return;
        
        // Check if timeline scene is handling the transition
        if (this.currentSceneIndex === 1 && this.timelineScene && this.timelineScene.isTransitioning()) {
            // Timeline scene is handling the camera transition, don't interfere
            return;
        }
        
        // Use original transition logic for other scenes
        const elapsed = (Date.now() - this.transitionStartTime) / 1000;
        this.transitionProgress = Math.min(elapsed / this.transitionDuration, 1);
        
        // Use easing function for smooth animation
        const easedProgress = this.easeInOutCubic(this.transitionProgress);
        
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
        if (this.transitionProgress >= 1) {
            this.isTransitioning = false;
            this.onTransitionComplete();
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
        // Update the timeline scene configuration
        if (this.sceneConfigs[1]) { // Timeline scene is at index 1
            this.sceneConfigs[1].position.set(config.position.x, config.position.y, config.position.z);
            this.sceneConfigs[1].target.set(config.target.x, config.target.y, config.target.z);
            this.sceneConfigs[1].fov = config.fov;
        }
    }
    
    isImageCurrentlyEnlarged() {
        return this.isImageEnlarged;
    }
    
    getEnlargedImage() {
        return this.enlargedImage;
    }
    
    animateToYear(year, targetOffset) {
        // Disable timeline movement when an image is enlarged
        if (this.isImageEnlarged) {
            console.log('Timeline animation disabled - image is enlarged');
            return;
        }
        
        console.log(`Animating to year ${year} with offset ${targetOffset}`);
        
        // Clear any existing snap timeout
        if (this.snapTimeout) {
            clearTimeout(this.snapTimeout);
            this.snapTimeout = null;
        }
        
        // Initialize timeline offset if not set
        if (!this.timelineOffset) this.timelineOffset = 0;
        
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
                        const originalX = ((index + 5) * 2) - 4; // Positions 6, 8, 10, 12, 14
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
                            const originalX = (index * 2) - 4; // Positions -4, -2, 0, 2, 4
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
                const originalX = (yearIndex * 2) - 4; // -4..14
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
        // Initialize smooth scrolling with optimal values
        this.smoothScrollSensitivity = 0.25;
        this.smoothScrollFriction = 0.85;
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
        
        // Clamp velocity to prevent excessive speed
        this.smoothScrollVelocity = Math.max(-0.5, Math.min(0.5, this.smoothScrollVelocity));
        
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
        if (Math.abs(this.smoothScrollVelocity) > 0.001) {
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
        // Define snap positions (every 2 units, corresponding to image positions, starting at -4)
        const snapPositions = [-4, -2, 0, 2, 4, 6, 8, 10, 12, 14];
        
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
        
        // Only snap if we're not already at a snap position
        if (Math.abs(this.timelineOffset - nearestPosition) > 0.1) {
            // Animate to the nearest snap position with smooth easing
            gsap.to(this, {
                timelineOffset: nearestPosition,
                duration: 0.8,
                ease: "power2.out",
                onUpdate: () => {
                    // Update timeline images during animation
                    if (this.timelineScene && this.timelineScene.getTimelinePlanes) {
                        const planes = this.timelineScene.getTimelinePlanes();
                        planes.forEach((plane, index) => {
                            const originalX = (index * 2) - 4;
                            plane.position.x = originalX - this.timelineOffset;
                        });
                    }
                    
                    // Update year display and sync debug panel
                    this.updateCurrentYear();
                    this.syncDebugPanel();

                    // Pan camera look-at toward the snapping image
                    this.updateCameraLookAtForOriginalX(nearestPosition);
                },
                onComplete: () => {
                    // Trigger haptic feedback when snapping completes
                    this.triggerHapticFeedback('snap');
                }
            });
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
} 