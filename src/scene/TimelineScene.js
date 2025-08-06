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
        
        years.forEach((year, index) => {
            const x = ((index + 5) * 2) - 4; // Positions 6, 8, 10, 12, 14 (years 2015-2019)
            const y = 0;
            const z = 0;
            
            this.createTimelinePlane(index, x, y, z, width, height, year);
        });
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
    }
    
    deactivate() {
        this.isActive = false;
        this.timelineGroup.visible = false;
        
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
        if (this.cameraTransitionState !== 'idle') return;
        
        console.log('TimelineScene: Starting scene transition');
        
        this.cameraTransitionState = 'transitioning';
        this.transitionCamera = camera;
        
        // Store original camera state
        this.originalCameraPosition = camera.position.clone();
        this.originalCameraTarget = new THREE.Vector3();
        camera.getWorldDirection(this.originalCameraTarget);
        this.originalCameraTarget.multiplyScalar(5).add(camera.position);
        this.originalCameraFov = camera.fov;
        
        console.log('TimelineScene: Original camera position:', this.originalCameraPosition);
        console.log('TimelineScene: Original camera FOV:', this.originalCameraFov);
        
        // Calculate transition camera position (zoomed out to see all images)
        const transitionPosition = new THREE.Vector3(0, 0, 12); // Further back to see all images
        const transitionTarget = new THREE.Vector3(0, 0, 0); // Look at center
        const transitionFov = 45; // Wider FOV to see more of the scene
        
        console.log('TimelineScene: Transition camera position:', transitionPosition);
        console.log('TimelineScene: Transition camera FOV:', transitionFov);
        
        // Create smooth camera transition
        const tl = gsap.timeline({
            onComplete: () => {
                console.log('TimelineScene: Camera transition complete');
                this.cameraTransitionState = 'idle';
                if (onComplete) onComplete();
            }
        });
        
        // Animate camera position
        tl.to(camera.position, {
            x: transitionPosition.x,
            y: transitionPosition.y,
            z: transitionPosition.z,
            duration: 1.2,
            ease: "power2.inOut"
        }, 0);
        
        // Animate camera FOV
        tl.to(camera, {
            fov: transitionFov,
            duration: 1.2,
            ease: "power2.inOut",
            onUpdate: () => {
                camera.updateProjectionMatrix();
            }
        }, 0);
        
        // Animate camera look-at target
        tl.to({}, {
            duration: 1.2,
            ease: "power2.inOut",
            onUpdate: () => {
                const progress = tl.progress();
                const currentTarget = new THREE.Vector3();
                currentTarget.lerpVectors(this.originalCameraTarget, transitionTarget, progress);
                camera.lookAt(currentTarget);
            }
        }, 0);
        
        // Start image layout transition after camera starts moving
        setTimeout(() => {
            this.startImageLayoutTransition();
        }, 300);
    }
    
    startImageLayoutTransition() {
        // Get initial scene images and animate them to timeline positions
        const initialImages = this.getInitialSceneImages();
        if (!initialImages || initialImages.length === 0) {
            console.log('TimelineScene: No initial images found for layout transition');
            return;
        }
        
        console.log('TimelineScene: Starting image layout transition with', initialImages.length, 'images');
        
        // Calculate timeline positions for the first 5 images (years 2010-2014)
        const timelinePositions = [];
        for (let i = 0; i < 5; i++) {
            const x = (i * 2) - 4; // Timeline positions: -4, -2, 0, 2, 4 (years 2010-2014)
            timelinePositions.push({ x: x, y: 0, z: 0 }); // All images at Y=0 for perfect horizontal alignment
        }
        
        console.log('TimelineScene: Timeline positions for initial images:', timelinePositions);
        
        // Animate each initial image to its timeline position
        initialImages.forEach((image, index) => {
            if (index < timelinePositions.length) {
                const targetPos = timelinePositions[index];
                
                console.log(`TimelineScene: Animating initial image ${index} from`, image.position, 'to', targetPos);
                
                // Store original position for potential reversal
                if (!image.userData.originalPosition) {
                    image.userData.originalPosition = image.position.clone();
                    image.userData.originalScale = image.scale.clone();
                }
                
                // Animate position
                gsap.to(image.position, {
                    x: targetPos.x,
                    y: targetPos.y,
                    z: targetPos.z,
                    duration: 1.5,
                    ease: "power2.inOut",
                    delay: index * 0.1 // Stagger the animations
                });
                
                // Animate scale to timeline size
                gsap.to(image.scale, {
                    x: 0.75, // Timeline images are smaller
                    y: 0.75,
                    z: 0.75,
                    duration: 1.5,
                    ease: "power2.inOut",
                    delay: index * 0.1
                });
                
                // Reset rotation to ensure proper horizontal alignment
                gsap.to(image.rotation, {
                    x: 0,
                    y: 0,
                    z: 0,
                    duration: 1.5,
                    ease: "power2.inOut",
                    delay: index * 0.1
                });
                
                // Mark this image as part of the timeline transition
                image.userData.isTimelineTransitioned = true;
                image.userData.timelineIndex = index; // Mark which timeline position this image occupies
            }
        });
        
        // After initial images are positioned, show the additional timeline images
        setTimeout(() => {
            this.showAdditionalTimelineImages();
        }, 1800); // Slightly before the initial transition completes
    }
    
    showAdditionalTimelineImages() {
        console.log('TimelineScene: Showing additional timeline images (years 2015-2019)');
        
        // Make additional timeline images visible and animate them in
        this.timelinePlanes.forEach((plane, index) => {
            plane.visible = true;
            plane.material.opacity = 0;
            plane.scale.setScalar(0); // Start from scale 0
            
            // Ensure proper horizontal alignment
            plane.position.y = 0; // All images at Y=0 for perfect horizontal alignment
            plane.rotation.x = 0;
            plane.rotation.z = 0;
            
            // Animate scale and opacity
            gsap.to(plane.scale, {
                x: 0.75,
                y: 0.75,
                z: 0.75,
                duration: 1.0,
                ease: "back.out(1.7)",
                delay: index * 0.15 // Stagger the animations
            });
            
            gsap.to(plane.material, {
                opacity: 0.9,
                duration: 1.0,
                ease: "power2.out",
                delay: index * 0.15
            });
        });
        
        // Emit event when all additional images are loaded
        const totalAnimationTime = (this.timelinePlanes.length * 150) + 1000;
        setTimeout(() => {
            this.emitTimelineImagesLoaded();
            // Start camera zoom-in animation after all images are positioned
            this.startCameraZoomIn();
        }, totalAnimationTime);
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
    
    startCameraZoomIn() {
        if (!this.transitionCamera || this.cameraTransitionState !== 'idle') return;
        
        this.cameraTransitionState = 'zooming-in';
        
        // Target camera position for timeline view
        const targetPosition = new THREE.Vector3(0, 0, 8);
        const targetTarget = new THREE.Vector3(0, 0, 0);
        const targetFov = 30;
        
        // Create smooth zoom-in animation
        const tl = gsap.timeline({
            onComplete: () => {
                this.cameraTransitionState = 'idle';
            }
        });
        
        // Animate camera position
        tl.to(this.transitionCamera.position, {
            x: targetPosition.x,
            y: targetPosition.y,
            z: targetPosition.z,
            duration: 1.0,
            ease: "power2.out"
        }, 0);
        
        // Animate camera FOV
        tl.to(this.transitionCamera, {
            fov: targetFov,
            duration: 1.0,
            ease: "power2.out",
            onUpdate: () => {
                this.transitionCamera.updateProjectionMatrix();
            }
        }, 0);
        
        // Animate camera look-at target
        tl.to({}, {
            duration: 1.0,
            ease: "power2.out",
            onUpdate: () => {
                const progress = tl.progress();
                const currentTarget = new THREE.Vector3();
                currentTarget.lerpVectors(new THREE.Vector3(0, 0, 0), targetTarget, progress);
                this.transitionCamera.lookAt(currentTarget);
            }
        }, 0);
    }
    
    getCameraTransitionState() {
        return this.cameraTransitionState;
    }
    
    isTransitioning() {
        return this.cameraTransitionState !== 'idle';
    }
} 