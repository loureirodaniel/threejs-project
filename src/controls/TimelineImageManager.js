/**
 * TimelineImageManager - Handles image positioning, enlargement, and year calculations for timeline
 * Extracted from TimelineController to reduce complexity and improve maintainability
 */
import * as THREE from 'three';
import { gsap } from 'gsap';

export class TimelineImageManager {
    constructor(timelineController) {
        this.controller = timelineController;
        this.camera = timelineController.camera;
        
        // Image enlargement state
        this.enlargedImage = null;
        this.originalImageState = null;
        this.isImageEnlarged = false;
        
        // Image configuration
        this.imageConfig = {
            originalWidth: 1.5,
            originalHeight: 1.5 / (4 / 3), // 4:3 aspect ratio
            targetViewportScale: 1.0, // 100% of viewport
            enlargedOpacity: 1.0,
            dimmedOpacity: 0.25,
            animationDuration: 0.5
        };

        // Focused image scale animation (center image becomes larger)
        this.focusScaleConfig = {
            baseScale: 0.75,   // match TimelineScene default
            focusedScale: 1.08,
            duration: 0.35,
            ease: 'power2.out',
            staggerDelay: 0.07,  // delay between scale axes for focused plane
            staggerDuration: 0.28 // duration per axis for staggered feel
        };
        this.lastFocusedSlot = -1;
        this.focusScaleTweens = new Map();
    }
    
    /**
     * Get current year based on timeline offset
     * @returns {number} Current year (2010-2019)
     */
    getCurrentYear() {
        const timelineOffset = this.controller.timelineOffset;
        
        // Calculate year based on timeline image positions
        if (timelineOffset === undefined || timelineOffset === null) {
            return 2010; // Default to start
        }
        
        const yearRange = 2019 - 2010; // 9 years (2010-2019)
        const xRange = 13.5; // -5.25 to 8.25 (images are at -5.25, -3.75, -2.25, -0.75, 0.75, 2.25, 3.75, 5.25, 6.75, 8.25)
        
        // Map timeline offset to year (offset=-5.25 is 2010, offset=8.25 is 2019)
        const normalizedX = Math.max(0, Math.min(1, (timelineOffset + 5.25) / xRange)); // 0 to 1
        const year = Math.round(2010 + (normalizedX * yearRange));
        
        return Math.max(2010, Math.min(2019, year));
    }
    
    /**
     * Move timeline images horizontally based on deltaX
     * @param {number} deltaX - Horizontal movement delta
     */
    moveTimelineImages(deltaX) {
        // Allow limited timeline movement when an image is enlarged but close it first
        if (this.isImageEnlarged) {
            console.log('Image is enlarged - closing it to allow smooth timeline movement');
            this.closeEnlargedImage();
        }
        
        // Track timeline offset for year calculation
        if (this.controller.timelineOffset === undefined || this.controller.timelineOffset === null) {
            this.controller.timelineOffset = 0;
        }
        
        const previousOffset = this.controller.timelineOffset;
        this.controller.timelineOffset += deltaX;
        
        // Clamp timeline offset (new range: -5.25 to 8.25)
        this.controller.timelineOffset = Math.max(-5.25, Math.min(8.25, this.controller.timelineOffset));
        
        // Check if we hit a boundary and trigger haptic feedback
        if (this.controller.timelineOffset === -5.25 && previousOffset > -5.25) {
            // Hit start boundary (2010)
            this.controller.triggerHapticFeedback('boundary');
        } else if (this.controller.timelineOffset === 8.25 && previousOffset < 8.25) {
            // Hit end boundary (2019)
            this.controller.triggerHapticFeedback('boundary');
        }
        
        // Move additional timeline images horizontally
        this.updateTimelinePlanePositions();
        
        // Move initial scene images that have been transitioned to timeline
        this.updateInitialImagePositions();
        
        // Smoothly pan camera look-at toward the nearest image
        this.updateCameraLookAt();

        // Animate focused (centered) image plane to larger scale
        this.updateFocusedImageScale();
    }
    
    /**
     * Update timeline plane positions
     */
    updateTimelinePlanePositions() {
        if (!this.controller.timelineScene || !this.controller.timelineScene.getTimelinePlanes) return;
        
        const planes = this.controller.timelineScene.getTimelinePlanes();
        planes.forEach((plane, index) => {
            const originalX = ((index + 8) * 1.5) - 5.25;
            plane.position.x = originalX - this.controller.timelineOffset;
            
            // Ensure images remain visible
            plane.visible = true;
            plane.position.y = 0; // Keep at horizontal alignment
        });
    }
    
    /**
     * Update initial image positions
     */
    updateInitialImagePositions() {
        if (!window.app || !window.app.imagePlanes) return;
        
        const initialImages = window.app.imagePlanes.getPlanes();
        initialImages.forEach((image, index) => {
            if (image.userData.isTimelineTransitioned) {
                const originalX = (index * 1.5) - 5.25;
                image.position.x = originalX - this.controller.timelineOffset;
                
                // Ensure images remain visible
                image.visible = true;
                image.position.y = 0; // Keep at horizontal alignment
            }
        });
    }
    
    /**
     * Get the current focused slot index (0-9) from timeline offset.
     */
    getFocusedSlotIndex() {
        const snapPositions = [-5.25, -3.75, -2.25, -0.75, 0.75, 2.25, 3.75, 5.25, 6.75, 8.25];
        const offset = this.controller.timelineOffset ?? -5.25;
        let best = 0;
        let minDist = Infinity;
        snapPositions.forEach((p, i) => {
            const d = Math.abs(p - offset);
            if (d < minDist) {
                minDist = d;
                best = i;
            }
        });
        return best;
    }

    /**
     * Animate the focused (centered) image plane to a larger scale; others to base scale.
     */
    updateFocusedImageScale() {
        if (this.controller.getCurrentSceneIndex?.() !== 1) return;
        if (this.isImageEnlarged) return;

        const focusedSlot = this.getFocusedSlotIndex();
        if (focusedSlot === this.lastFocusedSlot) return;
        this.lastFocusedSlot = focusedSlot;

        const { baseScale, focusedScale, duration, ease, staggerDelay, staggerDuration } = this.focusScaleConfig;

        const applyScale = (obj, targetScale, key, isFocused) => {
            if (this.focusScaleTweens.has(key)) {
                const prev = this.focusScaleTweens.get(key);
                if (prev.kill) prev.kill(); else if (prev.length) prev.kill();
                this.focusScaleTweens.delete(key);
            }
            if (isFocused && targetScale === focusedScale) {
                const tl = gsap.timeline({ overwrite: true });
                tl.to(obj.scale, {
                    x: targetScale,
                    duration: staggerDuration,
                    ease
                }).to(obj.scale, {
                    y: targetScale,
                    z: targetScale,
                    duration: staggerDuration,
                    ease
                }, staggerDelay);
                this.focusScaleTweens.set(key, tl);
            } else {
                const tween = gsap.to(obj.scale, {
                    x: targetScale,
                    y: targetScale,
                    z: targetScale,
                    duration,
                    ease,
                    overwrite: true
                });
                this.focusScaleTweens.set(key, tween);
            }
        };

        // Timeline planes: indices 0,1 map to slots 8,9
        if (this.controller.timelineScene?.getTimelinePlanes) {
            const planes = this.controller.timelineScene.getTimelinePlanes();
            planes.forEach((plane, i) => {
                const slot = 8 + i;
                const isFocused = slot === focusedSlot;
                const targetScale = isFocused ? focusedScale : baseScale;
                applyScale(plane, targetScale, `timeline-${i}`, isFocused);
            });
        }

        // Initial scene images (slots 0-7) that are transitioned to timeline
        if (window.app?.imagePlanes) {
            const initialImages = window.app.imagePlanes.getPlanes();
            initialImages.forEach((image, i) => {
                if (!image.userData.isTimelineTransitioned) return;
                const slot = i;
                const isFocused = slot === focusedSlot;
                const targetScale = isFocused ? focusedScale : baseScale;
                applyScale(image, targetScale, `initial-${i}`, isFocused);
            });
        }

        // Clear finished tweens from map to avoid leak (optional; GSAP overwrite handles reuse)
        const maxDuration = duration + (staggerDelay != null ? staggerDelay + staggerDuration : 0);
        setTimeout(() => {
            this.focusScaleTweens.forEach((t, k) => {
                if (t && !t.isActive?.()) this.focusScaleTweens.delete(k);
            });
        }, maxDuration * 1000 + 50);
    }

    /**
     * Update camera look-at based on nearest snap position (instant, no movement).
     */
    updateCameraLookAt() {
        const snapPositions = [-5.25, -3.75, -2.25, -0.75, 0.75, 2.25, 3.75, 5.25, 6.75, 8.25];
        let nearestX = snapPositions[0];
        let minDist = Infinity;
        for (const x of snapPositions) {
            const dist = Math.abs(x - this.controller.timelineOffset);
            if (dist < minDist) {
                minDist = dist;
                nearestX = x;
            }
        }
        const timelineConfig = this.controller.sceneConfigs[1];
        const targetY = timelineConfig ? timelineConfig.target.y : 0;
        const targetLookAtX = nearestX - this.controller.timelineOffset;
        this.controller.lookAtX = targetLookAtX;
        this.controller.camera.lookAt(new THREE.Vector3(targetLookAtX, targetY, 0));
    }
    
    /**
     * Enlarge an image to fullscreen
     * @param {THREE.Mesh} plane - Plane to enlarge
     */
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
        
        // Calculate target position first (plane placed between camera and timeline)
        const currentConfig = this.controller.sceneConfigs[1];
        const cameraLookAtTarget = new THREE.Vector3(
            this.controller.lookAtX || 0,
            currentConfig?.target?.y || 0,
            0
        );
        const planeZ = Math.abs(this.camera.position.z) * 0.85;
        const targetPosition = new THREE.Vector3(
            cameraLookAtTarget.x,
            cameraLookAtTarget.y,
            planeZ
        );

        // Viewport size must be computed at the plane's distance from camera so the image fills 100% of the viewport
        const distanceFromCamera = this.camera.position.distanceTo(targetPosition);
        const halfFovRad = (this.camera.fov * Math.PI / 180) / 2;
        const viewportHeightAtPlane = 2 * Math.tan(halfFovRad) * distanceFromCamera;
        const viewportWidthAtPlane = viewportHeightAtPlane * this.camera.aspect;

        const targetWidth = viewportWidthAtPlane * this.imageConfig.targetViewportScale;
        const targetHeight = viewportHeightAtPlane * this.imageConfig.targetViewportScale;

        // Use plane's actual geometry size so any image plane fills the viewport correctly
        const geomParams = plane.geometry?.parameters || {};
        const planeWidth = geomParams.width ?? this.imageConfig.originalWidth;
        const planeHeight = geomParams.height ?? this.imageConfig.originalHeight;

        // Scale so the plane covers 100% of the viewport (cover: use max to fill and possibly extend)
        const scaleX = targetWidth / planeWidth;
        const scaleY = targetHeight / planeHeight;
        const scale = Math.max(scaleX, scaleY);
        
        // Mark plane as enlarged
        plane.userData.isEnlarged = true;
        
        // Kill any existing animations
        gsap.killTweensOf(plane.position);
        gsap.killTweensOf(plane.scale);
        gsap.killTweensOf(plane.material);
        
        // Create animation timeline
        const tl = gsap.timeline();
        
        // Animate position, scale, and z-index
        tl.to(plane.position, {
            x: targetPosition.x,
            y: targetPosition.y,
            z: targetPosition.z,
            duration: this.imageConfig.animationDuration,
            ease: "power3.out"
        }, 0);
        
        tl.to(plane.scale, {
            x: scale,
            y: scale,
            z: scale,
            duration: this.imageConfig.animationDuration,
            ease: "power3.out"
        }, 0);
        
        // Make the enlarged image fully opaque
        tl.to(plane.material, {
            opacity: this.imageConfig.enlargedOpacity,
            duration: this.imageConfig.animationDuration,
            ease: "power2.out"
        }, 0);
        
        // Fade out other images
        this.dimOtherImages(tl, plane);
        
        // Add UI overlays via effects manager
        if (this.controller.effects) {
            this.controller.effects.addBackgroundOverlay();
            this.controller.effects.addCloseButton();
        }
    }
    
    /**
     * Dim other images when one is enlarged
     * @param {GSAP Timeline} timeline - Animation timeline
     * @param {THREE.Mesh} currentPlane - Currently enlarged plane
     */
    dimOtherImages(timeline, currentPlane) {
        // Fade out other timeline planes
        if (this.controller.timelineScene && this.controller.timelineScene.getTimelinePlanes) {
            const timelinePlanes = this.controller.timelineScene.getTimelinePlanes();
            timelinePlanes.forEach(otherPlane => {
                if (otherPlane !== currentPlane) {
                    timeline.to(otherPlane.material, {
                        opacity: this.imageConfig.dimmedOpacity,
                        duration: this.imageConfig.animationDuration,
                        ease: "power2.out"
                    }, 0);
                }
            });
        }
        
        // Fade out initial scene images
        if (window.app && window.app.imagePlanes) {
            const initialImages = window.app.imagePlanes.getPlanes();
            initialImages.forEach(otherImage => {
                if (otherImage.userData.isTimelineTransitioned && otherImage !== currentPlane) {
                    timeline.to(otherImage.material, {
                        opacity: this.imageConfig.dimmedOpacity,
                        duration: this.imageConfig.animationDuration,
                        ease: "power2.out"
                    }, 0);
                }
            });
        }
    }
    
    /**
     * Close enlarged image and restore to original state
     */
    closeEnlargedImage() {
        if (!this.isImageEnlarged || !this.enlargedImage || !this.originalImageState) return;
        
        const plane = this.enlargedImage;
        const originalState = this.originalImageState;
        
        console.log('Closing enlarged image - restoring original state');
        
        // Mark plane as no longer enlarged
        plane.userData.isEnlarged = false;
        
        // Kill any existing animations
        gsap.killTweensOf(plane.position);
        gsap.killTweensOf(plane.scale);
        gsap.killTweensOf(plane.material);
        
        // Animate back to original state
        gsap.to(plane.position, {
            x: originalState.position.x,
            y: originalState.position.y,
            z: originalState.position.z,
            duration: this.imageConfig.animationDuration,
            ease: "power3.out"
        });
        
        gsap.to(plane.scale, {
            x: originalState.scale.x,
            y: originalState.scale.y,
            z: originalState.scale.z,
            duration: this.imageConfig.animationDuration,
            ease: "power3.out"
        });
        
        // Restore other images to normal opacity
        this.restoreOtherImages();
        
        // Remove overlays via effects manager
        if (this.controller.effects) {
            this.controller.effects.removeBackgroundOverlay();
            this.controller.effects.removeCloseButton();
        }
        
        // Reset state
        this.enlargedImage = null;
        this.originalImageState = null;
        this.isImageEnlarged = false;
    }
    
    /**
     * Restore other images to normal opacity
     */
    restoreOtherImages() {
        // Restore timeline planes
        if (this.controller.timelineScene && this.controller.timelineScene.getTimelinePlanes) {
            const timelinePlanes = this.controller.timelineScene.getTimelinePlanes();
            timelinePlanes.forEach(plane => {
                if (!plane.userData.isEnlarged) {
                    gsap.to(plane.material, {
                        opacity: 0.9, // Base opacity
                        duration: this.imageConfig.animationDuration,
                        ease: "power2.out"
                    });
                }
            });
        }
        
        // Restore initial scene images
        if (window.app && window.app.imagePlanes) {
            const initialImages = window.app.imagePlanes.getPlanes();
            initialImages.forEach(image => {
                if (image.userData.isTimelineTransitioned && !image.userData.isEnlarged) {
                    gsap.to(image.material, {
                        opacity: 0.9, // Base opacity
                        duration: this.imageConfig.animationDuration,
                        ease: "power2.out"
                    });
                }
            });
        }
    }
    
    /**
     * Ensure timeline images are visible
     */
    ensureTimelineImagesVisible() {
        console.log('🔧 Ensuring timeline images are visible...');
        
        // Ensure all timeline images are visible and properly positioned
        if (this.controller.timelineScene && this.controller.timelineScene.getTimelinePlanes) {
            const planes = this.controller.timelineScene.getTimelinePlanes();
            console.log(`Found ${planes.length} timeline planes`);
            
            planes.forEach((plane, index) => {
                plane.visible = true;
                plane.position.y = 0;
                
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
                    image.position.y = 0;
                    
                    // Ensure proper scale
                    if (image.scale.x < 0.5) {
                        image.scale.setScalar(0.75);
                    }
                    
                    console.log(`Initial image ${index}: visible=${image.visible}`);
                }
            });
        }
    }
    
    /**
     * Check if image is currently enlarged
     * @returns {boolean} True if enlarged
     */
    isImageCurrentlyEnlarged() {
        return this.isImageEnlarged;
    }
    
    /**
     * Get enlarged image
     * @returns {THREE.Mesh|null} Enlarged image or null
     */
    getEnlargedImage() {
        return this.enlargedImage;
    }
    
    /**
     * Destroy the image manager
     */
    destroy() {
        // Close any enlarged image
        if (this.isImageEnlarged) {
            this.closeEnlargedImage();
        }
        
        // Clear references
        this.enlargedImage = null;
        this.originalImageState = null;
        this.controller = null;
        this.camera = null;
    }
}

