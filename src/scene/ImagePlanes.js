import * as THREE from 'three';
import { TIMELINE_PLANE_WIDTH } from '../config/timelineLayout.js';

export class ImagePlanes {
    constructor(scene, camera, imageData) {
        console.log('🖼️ ImagePlanes: Constructor called');
        console.log('  Scene:', scene);
        console.log('  Camera:', camera);
        console.log('  Image data:', imageData);
        console.log('  Image data length:', imageData?.length);

        this.scene = scene;
        this.camera = camera;
        this.planes = [];
        this.textureLoader = new THREE.TextureLoader();
        this.startTime = Date.now();
        this.animationDelay = 300; // 300ms delay between each image
        this.animationDuration = 800; // 800ms for each scale animation
        
        // Fallback image URLs if no external data is provided
        this.defaultImageUrls = [
            'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop', // Mountain landscape
            'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop', // Forest
            'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop', // Ocean waves
            'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop', // City skyline
            'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=800&h=600&fit=crop', // Desert sunset
            'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop', // Sunset over mountains
            'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop', // Alpine lake
            'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&h=600&fit=crop'  // Mountain range
        ];

        this.imageData = Array.isArray(imageData) && imageData.length > 0
            ? imageData
            : this.defaultImageUrls;
        
        this.createImagePlanes();

        console.log(`✅ ImagePlanes: Created ${this.planes.length} image planes`);
        console.log('  Planes:', this.planes.map((p, i) => ({
            index: i,
            position: { x: p.position.x, y: p.position.y, z: p.position.z },
            visible: p.visible
        })));
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
        const width = TIMELINE_PLANE_WIDTH;
        const height = width / aspectRatio;
        
        // Get visible range at Z=0
        const range = this.getVisibleRangeAtZ0();
        
        // Create a grid layout while maintaining randomness
        this.createGridLayout(range, width, height);
    }
    
    createGridLayout(range, width, height) {
        const numImages = this.imageData.length;
        const gridCols = Math.max(4, Math.ceil(Math.sqrt(numImages)));
        const gridRows = Math.ceil(numImages / gridCols);
        
        // Calculate cell dimensions
        const cellWidth = (range.maxX - range.minX) / gridCols;
        const cellHeight = (range.maxY - range.minY) / gridRows;
        
        // Calculate grid start position to center the grid
        const gridWidth = cellWidth * gridCols;
        const gridHeight = cellHeight * gridRows;
        const startX = (range.maxX + range.minX - gridWidth) / 2;
        const startY = (range.maxY + range.minY - gridHeight) / 2;
        
        // Place all images in grid positions with randomness within cells
        this.imageData.forEach((imageItem, index) => {
            const imageUrl = typeof imageItem === 'string'
                ? imageItem
                : imageItem.url || this.defaultImageUrls[index % this.defaultImageUrls.length];
            const year = typeof imageItem === 'object' ? imageItem.year : (2010 + index);
            const row = Math.floor(index / gridCols);
            const col = index % gridCols;

            console.log(`  Creating plane ${index}: year=${year}`);

            const cellCenterX = startX + (col + 0.5) * cellWidth;
            const cellCenterY = startY + (row + 0.5) * cellHeight;
            
            // Add randomness within the cell (±30% of cell size for more variation)
            const randomOffsetX = (Math.random() - 0.5) * cellWidth * 0.6;
            const randomOffsetY = (Math.random() - 0.5) * cellHeight * 0.6;
            
            const finalX = cellCenterX + randomOffsetX;
            const finalY = cellCenterY + randomOffsetY;
            
            // Ensure the image stays within visible bounds
            const clampedX = Math.max(range.minX + width/2, Math.min(range.maxX - width/2, finalX));
            const clampedY = Math.max(range.minY + height/2, Math.min(range.maxY - height/2, finalY));
            
            this.createImagePlane(index, imageUrl, clampedX, clampedY, 0, width, height);
        });
    }
    
    createImagePlane(index, imageUrl, x, y, z, width, height) {
        const texture = this.textureLoader.load(imageUrl);
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
        // Start slightly above final position for smooth animate-in
        const startYOffset = 0.5;
        plane.position.set(x, y + startYOffset, z);
        plane.rotation.set(0, 0, 0);
        
        // Set renderOrder based on index to prevent z-index fighting
        // Higher renderOrder renders on top, so we use index to ensure consistent ordering
        plane.renderOrder = index;
        
        // Set initial scale to 0 for animation
        plane.scale.set(0, 0, 0);
        
        // Add animation data
        plane.userData = {
            animationStartTime: this.startTime + (index * this.animationDelay),
            animationDuration: this.animationDuration,
            targetScale: 1.0,
            targetPosition: { x, y, z },
            startPosition: { x, y: y + startYOffset, z },
            isTransitioning: false // Flag to prevent floating animation conflicts
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
                
                // Smoothly animate position into place (from startOffset to target)
                if (userData.targetPosition && userData.startPosition) {
                    const t = userData.targetPosition;
                    const s = userData.startPosition;
                    plane.position.x = s.x + (t.x - s.x) * easedProgress;
                    plane.position.y = s.y + (t.y - s.y) * easedProgress;
                    plane.position.z = s.z + (t.z - s.z) * easedProgress;
                }
            }
        });
    }

    getPlanes() {
        return this.planes;
    }
    
    hide() {
        this.planes.forEach(plane => {
            plane.visible = false;
        });
    }
    
    show() {
        this.planes.forEach(plane => {
            plane.visible = true;
        });
    }
} 