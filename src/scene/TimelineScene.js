import * as THREE from 'three';
import { gsap } from 'gsap';
import { TIMELINE_BOTTOM_SLOT_UPSHIFT_PX, TIMELINE_COLUMN_GAP_PX, TIMELINE_FIRST_IMAGE_LEFT_PADDING_PX, TIMELINE_FIRST_IMAGE_TOP_PX, TIMELINE_IMAGE_WIDTH_PERCENTAGES, TIMELINE_IMAGE_WIDTHS_PX, TIMELINE_PLANE_WIDTH, getTimelineAdditionalPlaneX, getTimelineLayoutSlot, getTimelinePlaneX } from '../config/timelineLayout.js';

const TIMELINE_SCALE_REFERENCE_Z = 0;

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

    getVisibleWidthAtDepth(zDepth) {
        if (!this.camera) return 1;
        const viewportWidth = Math.max(1, window.innerWidth || 1);
        const viewportHeight = Math.max(1, window.innerHeight || 1);
        const fovRad = (this.camera.fov * Math.PI) / 180;
        const distance = Math.max(0.001, Math.abs((this.camera.position?.z ?? 2.5) - zDepth));
        const visibleHeight = 2 * Math.tan(fovRad / 2) * distance;
        return visibleHeight * ((this.camera.aspect && Number.isFinite(this.camera.aspect)) ? this.camera.aspect : (viewportWidth / viewportHeight));
    }

    getSlotWidthPercentage(slotIndex) {
        return TIMELINE_IMAGE_WIDTH_PERCENTAGES[slotIndex] ?? TIMELINE_IMAGE_WIDTH_PERCENTAGES[0] ?? 0.3;
    }

    getSlotWidthPx(slotIndex) {
        const safeIndex = Math.abs(slotIndex) % 3;
        const configuredWidth = TIMELINE_IMAGE_WIDTHS_PX?.[safeIndex];
        if (Number.isFinite(configuredWidth) && configuredWidth > 0) {
            return configuredWidth;
        }

        const viewportWidth = Math.max(1, window.innerWidth || 1);
        const leftPaddingPx = TIMELINE_FIRST_IMAGE_LEFT_PADDING_PX;
        const columnGapPx = TIMELINE_COLUMN_GAP_PX;
        const weight0 = this.getSlotWidthPercentage(0);
        const weight1 = this.getSlotWidthPercentage(1);
        const weight2 = this.getSlotWidthPercentage(2);
        const weightSum = Math.max(0.001, weight0 + weight1 + weight2);
        const usableWidth = Math.max(1, viewportWidth - leftPaddingPx - (columnGapPx * 2));
        const weights = [weight0, weight1, weight2];
        return usableWidth * (weights[safeIndex] ?? weights[0]) / weightSum;
    }

    getColumnMetrics() {
        const widths = [this.getSlotWidthPx(0), this.getSlotWidthPx(1), this.getSlotWidthPx(2)];
        const centers = [
            TIMELINE_FIRST_IMAGE_LEFT_PADDING_PX + (widths[0] / 2),
            TIMELINE_FIRST_IMAGE_LEFT_PADDING_PX + widths[0] + TIMELINE_COLUMN_GAP_PX + (widths[1] / 2),
            TIMELINE_FIRST_IMAGE_LEFT_PADDING_PX + widths[0] + TIMELINE_COLUMN_GAP_PX + widths[1] + TIMELINE_COLUMN_GAP_PX + (widths[2] / 2)
        ];

        return {
            centers,
            clusterWidth: widths[0] + widths[1] + widths[2] + (TIMELINE_COLUMN_GAP_PX * 2)
        };
    }

    getDiscreteSlotCenterPx(relativeIndex) {
        const safeIndex = Number.isFinite(relativeIndex) ? Math.floor(relativeIndex) : 0;
        const { centers, clusterWidth } = this.getColumnMetrics();
        const slotIndex = ((safeIndex % 3) + 3) % 3;
        const clusterIndex = Math.floor(safeIndex / 3);
        return centers[slotIndex] + (clusterIndex * clusterWidth);
    }

    getInterpolatedSlotCenterPx(relativeIndex) {
        const safeIndex = Number.isFinite(relativeIndex) ? relativeIndex : 0;
        const lower = Math.floor(safeIndex);
        const upper = lower + 1;
        const progress = safeIndex - lower;
        const lowerCenter = this.getDiscreteSlotCenterPx(lower);
        const upperCenter = this.getDiscreteSlotCenterPx(upper);
        return THREE.MathUtils.lerp(lowerCenter, upperCenter, progress);
    }

    pixelXToWorldX(pixelX, zDepth) {
        if (!this.camera) return 0;
        const viewportWidth = Math.max(1, window.innerWidth || 1);
        const visibleWidth = this.getVisibleWidthAtDepth(zDepth);
        const normalizedX = (pixelX / viewportWidth) - 0.5;
        return normalizedX * visibleWidth;
    }

    getSlotScale(slotIndex, planeWidth = TIMELINE_PLANE_WIDTH, slotZ = 0) {
        // Keep world-size derived from a fixed timeline reference depth.
        // This allows perspective to do its job: farther images appear smaller,
        // closer images appear larger relative to the camera.
        const visibleWidth = this.getVisibleWidthAtDepth(TIMELINE_SCALE_REFERENCE_Z);
        const viewportWidth = Math.max(1, window.innerWidth || 1);
        const unitsPerPixel = visibleWidth / viewportWidth;
        const targetWorldWidth = this.getSlotWidthPx(slotIndex) * unitsPerPixel;
        return Math.max(0.001, targetWorldWidth / Math.max(0.001, planeWidth));
    }

    getViewportAnchorShift(planeWidth = TIMELINE_PLANE_WIDTH, slotZ = 0) {
        if (!this.camera) return 0;
        const viewportWidth = Math.max(1, window.innerWidth || 1);
        const visibleWidth = this.getVisibleWidthAtDepth(slotZ);
        const unitsPerPixel = visibleWidth / viewportWidth;
        const firstScale = this.getSlotScale(0, planeWidth, slotZ);
        return (-visibleWidth / 2) + (TIMELINE_FIRST_IMAGE_LEFT_PADDING_PX * unitsPerPixel) + ((planeWidth * firstScale) / 2);
    }

    pixelYToWorldY(pixelY, zDepth) {
        if (!this.camera) return 0;
        const viewportHeight = Math.max(1, window.innerHeight || 1);
        const fovRad = (this.camera.fov * Math.PI) / 180;
        const distance = Math.max(0.001, Math.abs((this.camera.position?.z ?? 2.5) - zDepth));
        const visibleHeight = 2 * Math.tan(fovRad / 2) * distance;
        return (0.5 - (pixelY / viewportHeight)) * visibleHeight;
    }

    getLayoutSlotWorldY(planes) {
        if (!this.camera || !Array.isArray(planes) || planes.length === 0) return [0, 0, 0];

        const firstPlane = planes[0];
        const viewportHeight = Math.max(1, window.innerHeight || 1);
        const firstSlot = getTimelineLayoutSlot(0);
        const secondSlot = getTimelineLayoutSlot(1);
        const thirdSlot = getTimelineLayoutSlot(2);
        const firstHeightPx = this.getSlotWidthPx(0) * 0.75;
        const secondHeightPx = this.getSlotWidthPx(1) * 0.75;
        const thirdHeightPx = this.getSlotWidthPx(2) * 0.75;

        const firstBottomPx = TIMELINE_FIRST_IMAGE_TOP_PX + firstHeightPx;
        const upshift = TIMELINE_BOTTOM_SLOT_UPSHIFT_PX ?? 20;
        // Diagram layout:
        // - image2 top aligned to image1 bottom (shifted up to prevent metadata overlap)
        // - image3 bottom aligned to image1 bottom (shifted up to prevent metadata overlap)
        const secondCenterPx = firstBottomPx + (secondHeightPx / 2) - upshift;
        const thirdCenterPx = firstBottomPx - (thirdHeightPx / 2) - upshift;
        const firstCenterPx = TIMELINE_FIRST_IMAGE_TOP_PX + (firstHeightPx / 2);

        return [
            this.pixelYToWorldY(firstCenterPx, firstSlot.z),
            this.pixelYToWorldY(secondCenterPx, secondSlot.z),
            this.pixelYToWorldY(thirdCenterPx, thirdSlot.z)
        ];
    }

    getAlternatingRowSlotIndex(index, slotWorldY = []) {
        const fallbackTopIndex = 0;
        const fallbackBottomIndex = 1;
        const rowValues = [0, 1, 2]
            .map((slotIndex) => ({ slotIndex, y: slotWorldY?.[slotIndex] }))
            .filter((entry) => Number.isFinite(entry.y));

        if (rowValues.length < 2) {
            return index % 2 === 0 ? fallbackTopIndex : fallbackBottomIndex;
        }

        const topIndex = rowValues.reduce((best, current) => (current.y > best.y ? current : best)).slotIndex;
        const bottomIndex = rowValues.reduce((best, current) => (current.y < best.y ? current : best)).slotIndex;
        return index % 2 === 0 ? topIndex : bottomIndex;
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
        const width = TIMELINE_PLANE_WIDTH;
        const height = width / aspectRatio;
        
        console.log('TimelineScene: Creating additional timeline images for years:', years);
        
        years.forEach((year, index) => {
            const x = getTimelineAdditionalPlaneX(index);
            const slot = getTimelineLayoutSlot(index + 8);
            const y = slot.y;
            const z = slot.z;
            
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
            const layoutSlotY = this.getLayoutSlotWorldY(this.getInitialSceneImages());
            this.timelinePlanes.forEach((plane, index) => {
                const timelineIndex = index + 8;
                const slot = getTimelineLayoutSlot(index + 8);
                const slotIndex = timelineIndex % 3;
                const rowSlotIndex = this.getAlternatingRowSlotIndex(timelineIndex, layoutSlotY);
                const rowSlot = getTimelineLayoutSlot(rowSlotIndex);
                const planeWidth = plane?.geometry?.parameters?.width ?? TIMELINE_PLANE_WIDTH;
                const slotScale = this.getSlotScale(slotIndex, planeWidth, slot.z);
                const targetCenterPx = this.getInterpolatedSlotCenterPx(timelineIndex);
                plane.visible = true;
                plane.position.set(this.pixelXToWorldX(targetCenterPx, slot.z), layoutSlotY[rowSlotIndex] ?? rowSlot.y, slot.z);
                plane.scale.setScalar(slotScale);
                plane.rotation.set(0, 0, 0);
                plane.material.opacity = 0.9;
            });
            const initialImages = this.getInitialSceneImages();
            initialImages.forEach((image, index) => {
                if (index < 8) {
                    if (!image.userData.originalPosition) {
                        image.userData.originalPosition = image.position.clone();
                        image.userData.originalScale = image.scale.clone();
                    }
                    const slot = getTimelineLayoutSlot(index);
                    const slotIndex = index % 3;
                    const rowSlotIndex = this.getAlternatingRowSlotIndex(index, layoutSlotY);
                    const rowSlot = getTimelineLayoutSlot(rowSlotIndex);
                    const imageWidth = image?.geometry?.parameters?.width ?? TIMELINE_PLANE_WIDTH;
                    const slotScale = this.getSlotScale(slotIndex, imageWidth, slot.z);
                    const targetCenterPx = this.getInterpolatedSlotCenterPx(index);
                    image.visible = true;
                    image.position.set(this.pixelXToWorldX(targetCenterPx, slot.z), layoutSlotY[rowSlotIndex] ?? rowSlot.y, slot.z);
                    image.scale.setScalar(slotScale);
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
        const initialImages = this.getInitialSceneImages();
        const layoutSlotY = this.getLayoutSlotWorldY(initialImages);
        
        // Animate additional timeline planes with subtle floating motion
        this.timelinePlanes.forEach((plane, index) => {
            // Skip floating animation if this plane is currently transitioning or enlarged
            if (plane.userData.isTransitioning || plane.userData.isEnlarged) {
                return;
            }
            
            // Subtle floating animation for non-enlarged planes - maintain horizontal alignment
            const timelineIndex = index + 8;
            const rowSlotIndex = this.getAlternatingRowSlotIndex(timelineIndex, layoutSlotY);
            const rowSlot = getTimelineLayoutSlot(rowSlotIndex);
            plane.position.y = (layoutSlotY[rowSlotIndex] ?? rowSlot.y) + Math.sin(time * 0.001 + index) * 0.02; // Reduced floating amplitude
            
        });
        
        // Also animate initial scene images that have been transitioned to timeline
        initialImages.forEach((image, index) => {
            if (image.userData.isTimelineTransitioned && !image.userData.isEnlarged) {
                // Skip floating animation if image is currently transitioning
                if (image.userData.isTransitioning) {
                    return;
                }
                
                // Apply subtle floating animation to transitioned initial images
                // Keep layered slot placement and only add minimal floating.
                const rowSlotIndex = this.getAlternatingRowSlotIndex(index, layoutSlotY);
                const rowSlot = getTimelineLayoutSlot(rowSlotIndex);
                image.position.y = (layoutSlotY[rowSlotIndex] ?? rowSlot.y) + Math.sin(time * 0.001 + index) * 0.02; // Reduced floating amplitude
                
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
        const layoutSlotY = this.getLayoutSlotWorldY(initialImages);
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
            const timelineIndex = i + 8;
            const slot = getTimelineLayoutSlot(timelineIndex);
            const rowSlotIndex = this.getAlternatingRowSlotIndex(timelineIndex, layoutSlotY);
            const rowSlot = getTimelineLayoutSlot(rowSlotIndex);
            const targetCenterPx = this.getInterpolatedSlotCenterPx(timelineIndex);
            plane.position.set(this.pixelXToWorldX(targetCenterPx, slot.z), layoutSlotY[rowSlotIndex] ?? rowSlot.y, slot.z);
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
                    if (camera) {
                        camera.position.set(0, 0, 8);
                        camera.fov = 30;
                        camera.updateProjectionMatrix();
                        camera.lookAt(0, 0, 0);
                    }
                    finishTransition();
                }
            }
        });

        if (hasInitial) {
            initialImages.forEach((img, i) => {
                if (i >= 8) return;
                const slot = getTimelineLayoutSlot(i);
                const rowSlotIndex = this.getAlternatingRowSlotIndex(i, layoutSlotY);
                const rowSlot = getTimelineLayoutSlot(rowSlotIndex);
                const imageWidth = img?.geometry?.parameters?.width ?? TIMELINE_PLANE_WIDTH;
                const slotScale = this.getSlotScale(i % 3, imageWidth, slot.z);
                const targetCenterPx = this.getInterpolatedSlotCenterPx(i);
                const targetX = this.pixelXToWorldX(targetCenterPx, slot.z);
                gsap.killTweensOf([img.position, img.scale, img.rotation]);
                tl.to(img.position, { x: targetX, y: layoutSlotY[rowSlotIndex] ?? rowSlot.y, z: slot.z, duration, ease }, i * stagger);
                tl.to(img.scale, { x: slotScale, y: slotScale, z: slotScale, duration, ease }, i * stagger);
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
            const slot = getTimelineLayoutSlot(i + 8);
            const planeWidth = plane?.geometry?.parameters?.width ?? TIMELINE_PLANE_WIDTH;
            const slotScale = this.getSlotScale((i + 8) % 3, planeWidth, slot.z);
            tl.to(plane.scale, { x: slotScale, y: slotScale, z: slotScale, duration: planeDuration, ease }, (hasInitial ? 8 * stagger + duration : 0) + i * planeStagger);
            tl.to(plane.material, { opacity: 0.9, duration: planeDuration, ease }, (hasInitial ? 8 * stagger + duration : 0) + i * planeStagger);
            tl.call(() => { plane.userData.isTransitioning = false; }, [], (hasInitial ? 8 * stagger + duration : 0) + i * planeStagger + planeDuration);
        });
    }

    /**
     * Dolly zoom: smoothly move camera toward the first timeline image (at 0,0,0)
     * and land on it. Look-at stays fixed on the first image throughout.
     * Runs when the first image has landed; keeps transition blocked until zoom completes.
     * Lands at (0, 0, 8) to match timeline scene config so the first image is framed.
     */
    runZoomInOntoFirstImage(camera, onComplete) {
        if (!camera) { if (onComplete) onComplete(); return; }
        const firstImageCenter = new THREE.Vector3(0, 0, 0);
        const zoomDuration = 1.2;
        const zoomEase = 'power2.out';
        const targetFov = 30;
        const endDistance = 8;
        const startPos = camera.position.clone();
        const dir = new THREE.Vector3().subVectors(firstImageCenter, startPos);
        if (dir.lengthSq() < 1e-6) dir.set(0, 0, -1);
        dir.normalize();
        const targetPos = new THREE.Vector3().copy(firstImageCenter).addScaledVector(dir, -endDistance);
        targetPos.x = 0;
        targetPos.y = 0;
        targetPos.z = 8;
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
                camera.position.set(0, 0, 8);
                camera.lookAt(firstImageCenter);
                camera.updateProjectionMatrix();
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
