import * as THREE from 'three';

export class ImagePlanes {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.planes = [];
        this.textureLoader = new THREE.TextureLoader();
        this.startTime = Date.now();
        this.animationDelay = 300; // 300ms delay between each image
        this.animationDuration = 800; // 800ms for each scale animation
        
        // Realistic photography URLs (using Unsplash for high-quality images)
        this.imageUrls = [
            'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop', // Mountain landscape
            'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop', // Forest
            'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop', // Ocean waves
            'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop', // City skyline
            'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=800&h=600&fit=crop'  // Desert sunset
        ];
        
        this.createImagePlanes();
    }
    
    // Calculate visible X/Y range at Z=0 for the camera
    getVisibleRangeAtZ0() {
        const cam = this.camera;
        const z = cam.position.z;
        const fov = cam.fov * (Math.PI / 180); // vertical fov in radians
        const height = 2 * Math.tan(fov / 2) * Math.abs(z); // visible height at Z=0
        const width = height * cam.aspect; // visible width at Z=0
        return {
            minX: -width / 2,
            maxX: width / 2,
            minY: -height / 2,
            maxY: height / 2
        };
    }

    createImagePlanes() {
        const aspectRatio = 4/3;
        const width = 2;
        const height = width / aspectRatio;
        const placedRects = [];
        const maxAttempts = 100;
        // Get visible range at Z=0
        const range = this.getVisibleRangeAtZ0();
        for (let i = 0; i < 5; i++) {
            let attempts = 0;
            let position = null;
            let rect = null;
            while (attempts < maxAttempts) {
                // Only place so the whole image is visible
                const minX = range.minX + width / 2;
                const maxX = range.maxX - width / 2;
                const minY = range.minY + height / 2;
                const maxY = range.maxY - height / 2;
                const randomX = Math.random() * (maxX - minX) + minX;
                const randomY = Math.random() * (maxY - minY) + minY;
                rect = {
                    left: randomX - width / 2,
                    right: randomX + width / 2,
                    top: randomY + height / 2,
                    bottom: randomY - height / 2
                };
                // Check for overlap
                const overlaps = placedRects.some(r =>
                    !(rect.right < r.left || rect.left > r.right || rect.top < r.bottom || rect.bottom > r.top)
                );
                if (!overlaps) {
                    position = { x: randomX, y: randomY };
                    placedRects.push(rect);
                    break;
                }
                attempts++;
            }
            if (position) {
                this.createImagePlane(i, position.x, position.y, 0, width, height);
            } else {
                // If we can't find a non-overlapping spot, just skip this plane
                console.warn(`Could not place plane ${i + 1} without overlap after ${maxAttempts} attempts.`);
            }
        }
    }
    
    createImagePlane(index, x, y, z, width, height) {
        const texture = this.textureLoader.load(this.imageUrls[index]);
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
        
        // Add animation data
        plane.userData = {
            animationStartTime: this.startTime + (index * this.animationDelay),
            animationDuration: this.animationDuration,
            targetScale: 1.0
        };
        
        this.planes.push(plane);
        this.scene.add(plane);
    }
    
    animate(time) {
        this.planes.forEach((plane) => {
            const userData = plane.userData;
            const elapsed = time - userData.animationStartTime;
            
            if (elapsed >= 0) {
                const progress = Math.min(elapsed / userData.animationDuration, 1);
                
                // Apply damping with easeOutCubic for smooth animation
                const easedProgress = 1 - Math.pow(1 - progress, 3);
                const scale = easedProgress * userData.targetScale;
                
                plane.scale.set(scale, scale, scale);
            }
        });
    }

    getPlanes() {
        return this.planes;
    }
} 