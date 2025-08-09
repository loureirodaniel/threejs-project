import * as THREE from 'three';
import { gsap } from 'gsap';

export class TimelineScene {
    constructor(scene) {
        this.scene = scene;
        this.timelinePlanes = [];
        this.timelineGroup = new THREE.Group();
        this.isActive = false;
        this.animationProgress = 0;
        this.textureLoader = new THREE.TextureLoader();
        
        // Camera transition properties
        this.cameraTransitionState = 'idle'; // 'idle', 'transitioning', 'zooming-in'
        this.transitionCamera = null;
        this.originalCameraPosition = null;
        this.originalCameraTarget = null;
        this.originalCameraFov = null;
        
        // Image transition properties
        this.isImageLayoutTransitioning = false; // Flag to disable floating during image transitions
        
        this.init();
    }
    
    init() {
        // Add timeline group to scene
        this.scene.add(this.timelineGroup);
        
        // Create timeline elements
        this.createTimelineElements();
        
        // Initially hide timeline
        this.timelineGroup.visible = false;
    }
    
    createTimelineElements() {
        // Timeline image URLs - only create 5 additional images (positions 5-9)
        // The first 5 images will come from the initial scene
        this.additionalImageUrls = [
            'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop', // Sunset over mountains
            'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop', // Forest path
            'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop', // Mountain peaks
            'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop', // Ocean sunset
            'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=800&h=600&fit=crop'  // Desert landscape
        ];
        
        // Create only 5 additional timeline image planes (positions 5-9, years 2015-2019)
        const years = ['2015', '2016', '2017', '2018', '2019'];
        const aspectRatio = 4/3;
        const width = 1.5;
        const height = width / aspectRatio;
        
        console.log('TimelineScene: Creating additional timeline images for years:', years);
        
        years.forEach((year, index) => {
            const x = ((index + 5) * 2) - 4; // Positions 6, 8, 10, 12, 14 (years 2015-2019)
            const y = 0;
            const z = 0;
            
            this.createTimelinePlane(index, x, y, z, width, height, year);
            console.log(`TimelineScene: Created additional image ${index} for year ${year} at position (${x}, ${y}, ${z})`);
        });
        
        console.log(`TimelineScene: Total additional timeline images created: ${this.timelinePlanes.length}`);
    }
    
    createTimelinePlane(index, x, y, z, width, height, year) {
        const texture = this.textureLoader.load(this.additionalImageUrls[index % this.additionalImageUrls.length]);
        const geometry = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshBasicMaterial({ 
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });
        const plane = new THREE.Mesh(geometry, material);
        plane.position.set(x, y, z);
        plane.rotation.set(0, 0, 0);
        
        // Set initial scale to 0 for animation
        plane.scale.set(0, 0, 0);
        
        // Store animation data
        plane.userData = {
            animationStartTime: Date.now() + (index * 200), // Staggered animation
            animationDuration: 1000,
            targetScale: 1.0,
            year: year,
            originalPosition: new THREE.Vector3(x, y, z)
        };
        
        this.timelinePlanes.push(plane);
        this.timelineGroup.add(plane);
    }
    
    activate() {
        this.isActive = true;
        this.timelineGroup.visible = true;
        this.animationProgress = 0;
        
        // Initially hide additional timeline images - they will be shown after the transition
        this.timelinePlanes.forEach(plane => {
            plane.visible = false;
        });
        
        console.log('TimelineScene: Activated - waiting for image layout transition');
        console.log(`TimelineScene: Created ${this.timelinePlanes.length} additional timeline images`);
    }
    
    deactivate() {
        this.isActive = false;
        this.timelineGroup.visible = false;
        
        // Reset flags
        this.isImageLayoutTransitioning = false;
        
        // Reset all planes
        this.timelinePlanes.forEach((plane, index) => {
            plane.position.copy(plane.userData.originalPosition);
            plane.scale.setScalar(0);
            plane.material.opacity = 0.9;
            plane.visible = false;
        });
        
        // Reset initial scene images if they were transitioned
        this.resetInitialSceneImages();
    }
    
    resetInitialSceneImages() {
        const initialImages = this.getInitialSceneImages();
        initialImages.forEach(image => {
            if (image.userData.isTimelineTransitioned && image.userData.originalPosition) {
                // Reset to original position and scale
                gsap.to(image.position, {
                    x: image.userData.originalPosition.x,
                    y: image.userData.originalPosition.y,
                    z: image.userData.originalPosition.z,
                    duration: 1.0,
                    ease: "power2.out"
                });
                
                gsap.to(image.scale, {
                    x: image.userData.originalScale.x,
                    y: image.userData.originalScale.y,
                    z: image.userData.originalScale.z,
                    duration: 1.0,
                    ease: "power2.out"
                });
                
                gsap.to(image.material, {
                    opacity: 0.9,
                    duration: 0.5,
                    ease: "power2.out"
                });
                
                // Reset rotation to ensure proper alignment
                gsap.to(image.rotation, {
                    x: 0,
                    y: 0,
                    z: 0,
                    duration: 1.0,
                    ease: "power2.out"
                });
                
                image.visible = true;
                image.userData.isTimelineTransitioned = false;
                image.userData.timelineIndex = null;
            }
        });
    }
    
    animateIn() {
        // Staggered animation for timeline planes with longer delay
        this.timelinePlanes.forEach((plane, index) => {
            setTimeout(() => {
                this.animatePlaneIn(plane);
            }, index * 200); // Increased delay between planes
        });
        
        // Emit event when all images are loaded and animated
        const totalAnimationTime = (this.timelinePlanes.length * 200) + 1500 + 500; // Total time for all animations
        setTimeout(() => {
            this.emitTimelineImagesLoaded();
            // Start camera zoom-in animation after images are aligned
            this.startCameraZoomIn();
        }, totalAnimationTime);
    }
    
    animatePlaneIn(plane) {
        const originalPosition = plane.userData.originalPosition;
        
        // Start from above
        plane.position.copy(originalPosition);
        plane.position.y += 4;
        plane.scale.setScalar(0);
        plane.material.opacity = 0;
        
        // Use GSAP for smooth animation with damping
        gsap.to(plane.position, {
            y: originalPosition.y,
            duration: 1.5,
            ease: "back.out(1.7)",
            delay: 0.1
        });
        
        gsap.to(plane.scale, {
            x: 1,
            y: 1,
            z: 1,
            duration: 1.5,
            ease: "back.out(1.7)",
            delay: 0.1
        });
        
        gsap.to(plane.material, {
            opacity: 0.9,
            duration: 1.5,
            ease: "back.out(1.7)",
            delay: 0.1
        });
    }
    
    easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
    
    update(time, camera) {
        if (!this.isActive) return;
        
        // Skip floating animation during transitions
        if (this.cameraTransitionState !== 'idle' || this.isImageLayoutTransitioning) {
            return;
        }
        
        // Animate additional timeline planes with subtle floating motion
        this.timelinePlanes.forEach((plane, index) => {
            // Skip floating animation if this plane is currently enlarged
            if (plane.userData.isEnlarged) {
                // Only apply billboard effect to enlarged image, no floating
                const direction = new THREE.Vector3();
                direction.subVectors(camera.position, plane.position);
                direction.y = 0; // Keep Y component at 0 to maintain upright orientation
                
                if (direction.length() > 0.001) {
                    direction.normalize();
                    const angle = Math.atan2(direction.x, direction.z);
                    plane.rotation.y = angle;
                }
            } else {
                // Subtle floating animation for non-enlarged planes - maintain horizontal alignment
                plane.position.y = Math.sin(time * 0.001 + index) * 0.02; // Reduced floating amplitude
                
                // Billboard effect: only rotate around Y-axis to face camera
                const direction = new THREE.Vector3();
                direction.subVectors(camera.position, plane.position);
                direction.y = 0; // Keep Y component at 0 to maintain upright orientation
                
                if (direction.length() > 0.001) {
                    direction.normalize();
                    const angle = Math.atan2(direction.x, direction.z);
                    plane.rotation.y = angle;
                    // Keep X and Z rotation at 0 for proper alignment
                    plane.rotation.x = 0;
                    plane.rotation.z = 0;
                }
            }
        });
        
        // Also animate initial scene images that have been transitioned to timeline
        const initialImages = this.getInitialSceneImages();
        initialImages.forEach((image, index) => {
            if (image.userData.isTimelineTransitioned && !image.userData.isEnlarged) {
                // Apply subtle floating animation to transitioned initial images
                // Keep them at Y=0 for horizontal alignment, only add minimal floating
                image.position.y = Math.sin(time * 0.001 + index) * 0.02; // Reduced floating amplitude
                
                // Billboard effect for transitioned images - only rotate around Y-axis
                const direction = new THREE.Vector3();
                direction.subVectors(camera.position, image.position);
                direction.y = 0; // Keep Y component at 0 to maintain upright orientation
                
                if (direction.length() > 0.001) {
                    direction.normalize();
                    const angle = Math.atan2(direction.x, direction.z);
                    image.rotation.y = angle;
                    // Keep X and Z rotation at 0 for proper alignment
                    image.rotation.x = 0;
                    image.rotation.z = 0;
                }
            }
        });
    }
    
    getTimelineGroup() {
        return this.timelineGroup;
    }
    
    isTimelineActive() {
        return this.isActive;
    }
    
    getTimelinePlanes() {
        return this.timelinePlanes;
    }
    
    emitTimelineImagesLoaded() {
        // Dispatch custom event when timeline images are fully loaded and animated
        const event = new CustomEvent('timelineImagesLoaded', {
            detail: {
                scene: 'timeline',
                imageCount: this.timelinePlanes.length
            }
        });
        window.dispatchEvent(event);
    }

    // New camera transition methods
    startSceneTransition(camera, onComplete) {
        if (this.cameraTransitionState !== 'idle') {
            console.log('TimelineScene: Transition already in progress, skipping');
            return;
        }
        
        console.log('TimelineScene: Starting scene transition');
        
        this.cameraTransitionState = 'transitioning';
        this.transitionCamera = camera;
        this.isImageLayoutTransitioning = true; // Disable floating animations immediately
        
        // Store original camera state
        this.originalCameraPosition = camera.position.clone();
        this.originalCameraTarget = new THREE.Vector3();
        camera.getWorldDirection(this.originalCameraTarget);
        this.originalCameraTarget.multiplyScalar(5).add(camera.position);
        this.originalCameraFov = camera.fov;
        
        // Store original camera look-at target
        this.originalCameraLookAt = new THREE.Vector3();
        camera.getWorldDirection(this.originalCameraLookAt);
        this.originalCameraLookAt.multiplyScalar(10).add(camera.position);
        
        console.log('TimelineScene: Original camera position:', this.originalCameraPosition);
        console.log('TimelineScene: Original camera FOV:', this.originalCameraFov);
        
        // Calculate transition camera position (zoomed out to see all images)
        const transitionPosition = new THREE.Vector3(0, 0, 12); // Further back to see all images
        const transitionTarget = new THREE.Vector3(0, 0, 0); // Look at center
        const transitionFov = 45; // Wider FOV to see more of the scene
        
        console.log('TimelineScene: Transition camera position:', transitionPosition);
        console.log('TimelineScene: Transition camera FOV:', transitionFov);
        
        // Get initial scene images
        const initialImages = this.getInitialSceneImages();
        if (!initialImages || initialImages.length === 0) {
            console.log('TimelineScene: No initial images found for transition');
            this.cameraTransitionState = 'idle';
            this.isImageLayoutTransitioning = false;
            if (onComplete) onComplete();
            return;
        }
        
        // Pre-position images to prevent glitches
        this.prePositionImagesForTransition(initialImages);
        
        // Create ONE master timeline for the entire transition
        const masterTl = gsap.timeline({
            onComplete: () => {
                console.log('TimelineScene: Master transition complete');
                this.enforceFinalPositions(initialImages);
                this.ensureAdditionalImagesVisible();
                this.cameraTransitionState = 'idle';
                this.isImageLayoutTransitioning = false;
                if (onComplete) onComplete();
            }
        });
        
        // Phase 1: Camera zoom out (0-1.5s)
        masterTl.to(camera.position, {
            x: transitionPosition.x,
            y: transitionPosition.y,
            z: transitionPosition.z,
            duration: 1.5,
            ease: "power2.inOut"
        }, 0);
        
        masterTl.to(camera, {
            fov: transitionFov,
            duration: 1.5,
            ease: "power2.inOut",
            onUpdate: () => {
                camera.updateProjectionMatrix();
            }
        }, 0);
        
        const lookAtPhase1 = { p: 0 };
        masterTl.to(lookAtPhase1, {
            p: 1,
            duration: 1.5,
            ease: "power2.inOut",
            onUpdate: () => {
                const progress = lookAtPhase1.p;
                const currentTarget = new THREE.Vector3();
                currentTarget.lerpVectors(this.originalCameraLookAt, transitionTarget, progress);
                camera.lookAt(currentTarget);
            }
        }, 0);
        
        // Phase 2: Image layout transition (starts at 0.8s, duration 1.2s)
        this.animateImagesToTimeline(masterTl, initialImages, 0.8);
        
        // Phase 3: Additional timeline images (starts at 2.0s, duration 1.0s)
        this.animateAdditionalTimelineImages(masterTl, 2.0);
        
        // Phase 4: Camera zoom in (starts at 3.2s, duration 1.2s)
        this.animateCameraZoomIn(masterTl, camera, 3.2);
        
        // Phase 5: Force all images visible (starts at 4.5s)
        masterTl.call(() => {
            this.forceAllImagesVisible();
        }, [], 4.5);
    }
    
    animateImagesToTimeline(masterTl, initialImages, startTime) {
        console.log('TimelineScene: Animating images to timeline positions');
        
        // Calculate timeline positions for the first 5 images (years 2010-2014)
        const timelinePositions = [];
        for (let i = 0; i < 5; i++) {
            const x = (i * 2) - 4; // Timeline positions: -4, -2, 0, 2, 4 (years 2010-2014)
            timelinePositions.push({ x: x, y: 0, z: 0 }); // All images at Y=0 for perfect horizontal alignment
        }
        
        // Animate each initial image to its timeline position
        initialImages.forEach((image, index) => {
            if (index < timelinePositions.length) {
                const targetPos = timelinePositions[index];
                
                // Store original position for potential reversal
                if (!image.userData.originalPosition) {
                    image.userData.originalPosition = image.position.clone();
                    image.userData.originalScale = image.scale.clone();
                }
                
                // Calculate individual start time with stagger
                const imageStartTime = startTime + (index * 0.1);
                
                // Animate position
                masterTl.to(image.position, {
                    x: targetPos.x,
                    y: targetPos.y,
                    z: targetPos.z,
                    duration: 1.2,
                    ease: "power2.out"
                }, imageStartTime);
                
                // Animate scale
                masterTl.to(image.scale, {
                    x: 0.75,
                    y: 0.75,
                    z: 0.75,
                    duration: 1.2,
                    ease: "power2.out"
                }, imageStartTime);
                
                // Animate rotation
                masterTl.to(image.rotation, {
                    x: 0,
                    y: 0,
                    z: 0,
                    duration: 1.2,
                    ease: "power2.out"
                }, imageStartTime);
                
                // Mark this image as part of the timeline transition
                image.userData.isTimelineTransitioned = true;
                image.userData.timelineIndex = index;
            }
        });
    }
    
    animateAdditionalTimelineImages(masterTl, startTime) {
        console.log('TimelineScene: Animating additional timeline images');
        
        // Make additional timeline images visible and animate them in
        this.timelinePlanes.forEach((plane, index) => {
            // Ensure proper initial state
            plane.visible = true;
            plane.material.opacity = 0;
            plane.scale.setScalar(0); // Start from scale 0
            
            // Ensure proper horizontal alignment and position
            const x = ((index + 5) * 2) - 4; // Positions 6, 8, 10, 12, 14 (years 2015-2019)
            plane.position.set(x, 0, 0); // All images at Y=0 for perfect horizontal alignment
            plane.rotation.set(0, 0, 0);
            
            console.log(`TimelineScene: Setting up additional image ${index} (year ${2015 + index}) at position (${x}, 0, 0)`);
            
            // Calculate individual start time with stagger
            const planeStartTime = startTime + (index * 0.15);
            
            // Animate scale
            masterTl.to(plane.scale, {
                x: 0.75,
                y: 0.75,
                z: 0.75,
                duration: 1.0,
                ease: "back.out(1.7)"
            }, planeStartTime);
            
            // Animate opacity
            masterTl.to(plane.material, {
                opacity: 0.9,
                duration: 1.0,
                ease: "power2.out"
            }, planeStartTime);
        });
        
        // Emit event when all additional images are loaded
        const totalAnimationTime = (this.timelinePlanes.length * 150) + 1000;
        masterTl.call(() => {
            this.emitTimelineImagesLoaded();
        }, [], startTime + totalAnimationTime);
    }
    
    getInitialSceneImages() {
        // Access the initial scene images through the global app instance
        if (window.app && window.app.imagePlanes) {
            return window.app.imagePlanes.getPlanes();
        }
        return [];
    }
    
    setInitialSceneImages(images) {
        // Store reference to initial scene images for transition
        this.initialSceneImages = images;
    }
    
    animateCameraZoomIn(masterTl, camera, startTime) {
        console.log('TimelineScene: Animating camera zoom-in');
        
        // Target camera position for timeline view
        const targetPosition = new THREE.Vector3(0, 0, 5);
        // Focus on the first timeline image (index 0 is positioned at x = -4)
        const targetTarget = new THREE.Vector3(-4, 0, 0);
        const targetFov = 30;
        
        // Animate camera position
        masterTl.to(camera.position, {
            x: targetPosition.x,
            y: targetPosition.y,
            z: targetPosition.z,
            duration: 1.2,
            ease: "power2.inOut"
        }, startTime);
        
        // Animate camera FOV
        masterTl.to(camera, {
            fov: targetFov,
            duration: 1.2,
            ease: "power2.inOut",
            onUpdate: () => {
                camera.updateProjectionMatrix();
            }
        }, startTime);
        
        // Animate camera look-at target
        const lookAtPhase4 = { p: 0 };
        masterTl.to(lookAtPhase4, {
            p: 1,
            duration: 1.2,
            ease: "power2.inOut",
            onUpdate: () => {
                const progress = lookAtPhase4.p;
                const currentTarget = new THREE.Vector3();
                currentTarget.lerpVectors(new THREE.Vector3(0, 0, 0), targetTarget, progress);
                camera.lookAt(currentTarget);
            }
        }, startTime);
    }
    
    getCameraTransitionState() {
        return this.cameraTransitionState;
    }
    
    isTransitioning() {
        return this.cameraTransitionState !== 'idle';
    }
    
    prePositionImagesForTransition(initialImages) {
        // Pre-position images to prevent glitches during transition
        initialImages.forEach((image, index) => {
            if (index < 5) {
                // Ensure images are visible and at a stable position before transition
                image.visible = true;
                
                // If image doesn't have original position stored, store it now
                if (!image.userData.originalPosition) {
                    image.userData.originalPosition = image.position.clone();
                    image.userData.originalScale = image.scale.clone();
                }
                
                // Ensure image is at a stable position (no floating animation)
                image.position.y = image.userData.originalPosition.y;
                image.rotation.x = 0;
                image.rotation.z = 0;
            }
        });
    }
    
    enforceFinalPositions(initialImages) {
        // Ensure all images are at their exact final positions
        console.log('TimelineScene: Enforcing final positions');
        
        // Enforce initial images positions
        initialImages.forEach((image, index) => {
            if (index < 5 && image.userData.isTimelineTransitioned) {
                const x = (index * 2) - 4; // Timeline positions: -4, -2, 0, 2, 4
                image.position.set(x, 0, 0);
                image.scale.setScalar(0.75);
                image.rotation.set(0, 0, 0);
                image.visible = true;
            }
        });
        
        // Enforce additional timeline images positions
        this.timelinePlanes.forEach((plane, index) => {
            const x = ((index + 5) * 2) - 4; // Positions 6, 8, 10, 12, 14
            plane.position.set(x, 0, 0);
            plane.scale.setScalar(0.75);
            plane.rotation.set(0, 0, 0);
            plane.visible = true;
            plane.material.opacity = 0.9;
            
            console.log(`TimelineScene: Enforced position for additional image ${index} (year ${2015 + index}) at (${x}, 0, 0)`);
        });
    }
    
    ensureAdditionalImagesVisible() {
        // Double-check that all additional timeline images are visible and properly positioned
        console.log('TimelineScene: Ensuring additional images are visible');
        
        this.timelinePlanes.forEach((plane, index) => {
            const x = ((index + 5) * 2) - 4; // Positions 6, 8, 10, 12, 14
            
            // Force visibility and position
            plane.visible = true;
            plane.position.set(x, 0, 0);
            plane.scale.setScalar(0.75);
            plane.rotation.set(0, 0, 0);
            plane.material.opacity = 0.9;
            
            console.log(`TimelineScene: Ensured visibility for additional image ${index} (year ${2015 + index}) at (${x}, 0, 0)`);
        });
        
        // Also ensure the timeline group is visible
        this.timelineGroup.visible = true;
    }
    
    forceAllImagesVisible() {
        console.log('TimelineScene: Force all images visible');
        
        // Force all additional timeline images to be visible and properly positioned
        this.timelinePlanes.forEach((plane, index) => {
            const x = ((index + 5) * 2) - 4; // Positions 6, 8, 10, 12, 14 (years 2015-2019)
            
            // Force visibility and position
            plane.visible = true;
            plane.position.set(x, 0, 0);
            plane.scale.setScalar(0.75);
            plane.rotation.set(0, 0, 0);
            plane.material.opacity = 0.9;
            
            console.log(`TimelineScene: Forced visibility for additional image ${index} (year ${2015 + index}) at (${x}, 0, 0)`);
        });
        
        // Ensure timeline group is visible
        this.timelineGroup.visible = true;
        
        // Also ensure initial scene images are visible
        const initialImages = this.getInitialSceneImages();
        initialImages.forEach((image, index) => {
            if (image.userData.isTimelineTransitioned) {
                image.visible = true;
                console.log(`TimelineScene: Ensured initial image ${index} (year ${2010 + index}) is visible`);
            }
        });
    }
} 