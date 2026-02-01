import * as THREE from 'three';
import { gsap } from 'gsap';

export class TimelineScene {
    constructor(scene, renderer, camera) {
        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;
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
        // Timeline image URLs - only create 2 additional images (positions 8-9)
        // The first 8 images will come from the initial scene
        this.additionalImageUrls = [
            'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop', // Sunset over mountains
            'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop', // Forest path
            'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop', // Mountain peaks
            'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop', // Ocean sunset
            'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=800&h=600&fit=crop'  // Desert landscape
        ];
        
        // Create only 2 additional timeline image planes (positions 8-9, years 2018-2019)
        // since initial scene now covers 2010-2017 (8 images)
        const years = ['2018', '2019'];
        const aspectRatio = 4/3;
        const width = 1.5;
        const height = width / aspectRatio;
        
        console.log('TimelineScene: Creating additional timeline images for years:', years);
        
        years.forEach((year, index) => {
            const x = ((index + 8) * 1.5) - 5.25; // Positions 6.75, 8.25 (years 2018-2019)
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
            opacity: 0.9,
            depthTest: true,
            depthWrite: true
        });
        const plane = new THREE.Mesh(geometry, material);
        plane.position.set(x, y, z);
        plane.rotation.set(0, 0, 0);
        
        // Set renderOrder based on timeline index (8 + index) to prevent z-index fighting
        // Images further right (higher index) render on top
        plane.renderOrder = 8 + index;
        
        // Set initial scale to 0 for animation
        plane.scale.set(0, 0, 0);
        
        // Store animation data
        plane.userData = {
            animationStartTime: Date.now() + (index * 200), // Staggered animation
            animationDuration: 1000,
            targetScale: 1.0,
            year: year,
            originalPosition: new THREE.Vector3(x, y, z),
            isTransitioning: false // Flag to prevent floating animation conflicts
        };
        
        this.timelinePlanes.push(plane);
        this.timelineGroup.add(plane);
    }
    
    activate() {
        this.isActive = true;
        this.timelineGroup.visible = true;
        this.animationProgress = 0;

        const skipPositionOverwrite = this.justAnimatedToTimeline;
        if (this.justAnimatedToTimeline) this.justAnimatedToTimeline = false;

        if (!skipPositionOverwrite) {
            this.timelinePlanes.forEach((plane, index) => {
                const x = ((index + 8) * 1.5) - 5.25;
                plane.visible = true;
                plane.position.set(x, 0, 0);
                plane.scale.setScalar(0.75);
                plane.rotation.set(0, 0, 0);
                plane.material.opacity = 0.9;
            });
            const offset = -5.25;
            const initialImages = this.getInitialSceneImages();
            initialImages.forEach((image, index) => {
                if (index < 8) {
                    if (!image.userData.originalPosition) {
                        image.userData.originalPosition = image.position.clone();
                        image.userData.originalScale = image.scale.clone();
                    }
                    const originalX = (index * 1.5) - 5.25;
                    image.visible = true;
                    image.position.set(originalX - offset, 0, 0);
                    image.scale.setScalar(0.75);
                    image.rotation.set(0, 0, 0);
                    image.userData.isTimelineTransitioned = true;
                }
            });
        }

        this.emitTimelineImagesLoaded();
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
                image.position.copy(image.userData.originalPosition);
                image.scale.copy(image.userData.originalScale);
                image.rotation.set(0, 0, 0);
                if (image.material) image.material.opacity = 0.9;
                image.visible = true;
                image.userData.isTimelineTransitioned = false;
                image.userData.timelineIndex = null;
            }
        });
    }
    
    update(time, camera) {
        if (!this.isActive) return;
        
        // Skip floating animation during transitions
        if (this.cameraTransitionState !== 'idle' || this.isImageLayoutTransitioning) {
            return;
        }
        
        // Animate additional timeline planes with subtle floating motion
        this.timelinePlanes.forEach((plane, index) => {
            // Skip floating animation if this plane is currently transitioning or enlarged
            if (plane.userData.isTransitioning || plane.userData.isEnlarged) {
                // Only apply billboard effect to enlarged image, no floating
                if (plane.userData.isEnlarged) {
                    const direction = new THREE.Vector3();
                    direction.subVectors(camera.position, plane.position);
                    direction.y = 0; // Keep Y component at 0 to maintain upright orientation
                    
                    if (direction.length() > 0.001) {
                        direction.normalize();
                        const angle = Math.atan2(direction.x, direction.z);
                        plane.rotation.y = angle;
                    }
                }
                return;
            }
            
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
        });
        
        // Also animate initial scene images that have been transitioned to timeline
        const initialImages = this.getInitialSceneImages();
        initialImages.forEach((image, index) => {
            if (image.userData.isTimelineTransitioned && !image.userData.isEnlarged) {
                // Skip floating animation if image is currently transitioning
                if (image.userData.isTransitioning) {
                    return;
                }
                
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
        const event = new CustomEvent('timelineImagesLoaded', {
            detail: { scene: 'timeline', imageCount: this.timelinePlanes.length }
        });
        window.dispatchEvent(event);
    }

    /**
     * Animate image planes from initial (grid) layout into timeline layout.
     * Single scene: same images morph from grid to horizontal timeline.
     * Caller must snap camera to timeline config before calling.
     */
    animateToTimeline(camera, onComplete) {
        if (this.cameraTransitionState !== 'idle') return;
        this.cameraTransitionState = 'transitioning';
        this.isImageLayoutTransitioning = true;

        const initialImages = this.getInitialSceneImages();
        const hasInitial = initialImages && initialImages.length > 0;
        const offset = -5.25;
        const duration = 2;
        const stagger = 0.12;
        const ease = 'power2.inOut';

        if (hasInitial) {
            initialImages.forEach((img, i) => {
                if (i >= 8) return;
                if (!img.userData.originalPosition) {
                    img.userData.originalPosition = img.position.clone();
                    img.userData.originalScale = img.scale.clone();
                }
                img.visible = true;
                if (img.material) {
                    img.material.depthTest = true;
                    img.material.depthWrite = true;
                }
                img.userData.isTransitioning = true;
                img.renderOrder = i;
            });
        }

        this.timelineGroup.visible = true;
        this.timelinePlanes.forEach((plane, i) => {
            plane.visible = true;
            plane.material.opacity = 0;
            plane.scale.setScalar(0);
            const x = ((i + 8) * 1.5) - 5.25;
            plane.position.set(x, 0, 0);
            plane.rotation.set(0, 0, 0);
            plane.renderOrder = 8 + i;
            plane.userData.isTransitioning = true;
        });

        const clearPlaneFlags = () => {
            this.timelinePlanes.forEach((p) => { p.userData.isTransitioning = false; });
            if (hasInitial) {
                initialImages.forEach((img, i) => {
                    if (i < 8) img.userData.isTransitioning = false;
                });
            }
        };

        const finishTransition = () => {
            this.justAnimatedToTimeline = true;
            this.cameraTransitionState = 'idle';
            this.isImageLayoutTransitioning = false;
            if (onComplete) onComplete();
        };

        const tl = gsap.timeline({
            onComplete: () => {
                clearPlaneFlags();
                if (!hasInitial) {
                    const cfg = (window.app?.timelineController?.sceneConfigs)?.[1];
                    if (cfg && camera) {
                        camera.position.copy(cfg.position);
                        camera.fov = cfg.fov;
                        camera.updateProjectionMatrix();
                        camera.lookAt(cfg.target);
                    }
                    finishTransition();
                }
            }
        });

        if (hasInitial) {
            initialImages.forEach((img, i) => {
                if (i >= 8) return;
                const origX = (i * 1.5) - 5.25;
                const targetX = origX - offset;
                gsap.killTweensOf([img.position, img.scale, img.rotation]);
                tl.to(img.position, { x: targetX, y: 0, z: 0, duration, ease }, i * stagger);
                tl.to(img.scale, { x: 0.75, y: 0.75, z: 0.75, duration, ease }, i * stagger);
                tl.to(img.rotation, { x: 0, y: 0, z: 0, duration, ease }, i * stagger);
                tl.call(() => { img.userData.isTimelineTransitioned = true; img.userData.timelineIndex = i; }, [], i * stagger + duration);
            });
            tl.call(() => {
                clearPlaneFlags();
                this.runZoomInOntoFirstImage(camera, finishTransition);
            }, [], duration);
        }

        const planeDuration = 1.2;
        const planeStagger = 0.12;
        this.timelinePlanes.forEach((plane, i) => {
            gsap.killTweensOf([plane.scale, plane.material]);
            tl.to(plane.scale, { x: 0.75, y: 0.75, z: 0.75, duration: planeDuration, ease }, (hasInitial ? 8 * stagger + duration : 0) + i * planeStagger);
            tl.to(plane.material, { opacity: 0.9, duration: planeDuration, ease }, (hasInitial ? 8 * stagger + duration : 0) + i * planeStagger);
            tl.call(() => { plane.userData.isTransitioning = false; }, [], (hasInitial ? 8 * stagger + duration : 0) + i * planeStagger + planeDuration);
        });
    }

    /**
     * Dolly zoom: smoothly move camera toward the first timeline image (at 0,0,0)
     * and land on it. Look-at stays fixed on the first image throughout.
     * Runs when the first image has landed; keeps transition blocked until zoom completes.
     */
    runZoomInOntoFirstImage(camera, onComplete) {
        if (!camera) { if (onComplete) onComplete(); return; }
        const firstImageCenter = new THREE.Vector3(0, 0, 0);
        const zoomDuration = 1.2;
        const zoomEase = 'power2.out';
        const targetFov = 28;
        const endDistance = 5;
        const startPos = camera.position.clone();
        const dir = new THREE.Vector3().subVectors(firstImageCenter, startPos).normalize();
        const targetPos = new THREE.Vector3().copy(firstImageCenter).addScaledVector(dir, -endDistance);
        gsap.killTweensOf([camera.position, camera]);
        gsap.to(camera.position, {
            x: targetPos.x,
            y: targetPos.y,
            z: targetPos.z,
            duration: zoomDuration,
            ease: zoomEase,
            onUpdate: () => { camera.lookAt(firstImageCenter); }
        });
        gsap.to(camera, {
            fov: targetFov,
            duration: zoomDuration,
            ease: zoomEase,
            onUpdate: () => camera.updateProjectionMatrix(),
            onComplete: () => {
                camera.lookAt(firstImageCenter);
                if (onComplete) onComplete();
            }
        });
    }

    getInitialSceneImages() {
        if (window.app && window.app.imagePlanes) {
            return window.app.imagePlanes.getPlanes();
        }
        return this.initialSceneImages || [];
    }
    
    setInitialSceneImages(images) {
        // Store reference to initial scene images for transition
        this.initialSceneImages = images;
    }
    
    getCameraTransitionState() {
        return this.cameraTransitionState;
    }
    
    isTransitioning() {
        return this.cameraTransitionState !== 'idle';
    }
} 