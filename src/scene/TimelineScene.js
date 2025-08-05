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
        // Timeline image URLs - first 5 are the same as initial scene, plus 5 new ones
        this.imageUrls = [
            // Same 5 images from initial scene
            'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop', // Mountain landscape
            'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop', // Forest
            'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop', // Ocean waves
            'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop', // City skyline
            'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=800&h=600&fit=crop', // Desert sunset
            // 5 new images for timeline
            'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop', // Mountain landscape
            'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop', // Forest
            'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop', // Ocean waves
            'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop', // City skyline
            'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=800&h=600&fit=crop'  // Desert sunset
        ];
        
        // Create 10 timeline image planes (2010-2020)
        const years = ['2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019'];
        const aspectRatio = 4/3;
        const width = 1.5;
        const height = width / aspectRatio;
        
        years.forEach((year, index) => {
            const x = (index * 2) - 2; // Start at -4 (2010) to move first image closer to left, spacing 2 units apart
            const y = 0;
            const z = 0;
            
            this.createTimelinePlane(index, x, y, z, width, height, year);
        });
    }
    
    createTimelinePlane(index, x, y, z, width, height, year) {
        const texture = this.textureLoader.load(this.imageUrls[index % this.imageUrls.length]);
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
        
        // Delay image animation to wait for text animation
        setTimeout(() => {
            this.animateIn();
        }, 1200); // 1.0s text animation + 0.2s delay
    }
    
    deactivate() {
        this.isActive = false;
        this.timelineGroup.visible = false;
        
        // Reset all planes
        this.timelinePlanes.forEach((plane, index) => {
            plane.position.copy(plane.userData.originalPosition);
            plane.scale.setScalar(0);
            plane.material.opacity = 0.9;
        });
    }
    
    animateIn() {
        // Staggered animation for timeline planes with longer delay
        this.timelinePlanes.forEach((plane, index) => {
            setTimeout(() => {
                this.animatePlaneIn(plane);
            }, index * 200); // Increased delay between planes
        });
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
        
        // Animate timeline planes with subtle floating motion
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
                // Normal floating animation for non-enlarged planes
                plane.position.y = plane.userData.originalPosition.y + Math.sin(time * 0.001 + index) * 0.05;
                
                // Billboard effect: only rotate around Y-axis to face camera
                const direction = new THREE.Vector3();
                direction.subVectors(camera.position, plane.position);
                direction.y = 0; // Keep Y component at 0 to maintain upright orientation
                
                if (direction.length() > 0.001) {
                    direction.normalize();
                    const angle = Math.atan2(direction.x, direction.z);
                    plane.rotation.y = angle;
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
} 