import * as THREE from 'three';

export class SpotlightEffect {
    constructor(scene) {
        this.scene = scene;
        this.spotlight = null;
        this.spotlightRadius = 2;
        this.spotlightSegments = 64;
        
        this.init();
    }
    
    init() {
        // Create a gradient texture for the spotlight with blur on edges
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Create radial gradient for blur effect
        const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)'); // Completely transparent center
        gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0)'); // Still transparent
        gradient.addColorStop(1, 'rgba(0, 0, 0, 1.0)'); // Completely opaque edge matching vignette

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);

        const spotlightTexture = new THREE.CanvasTexture(canvas);
        const spotlightGeometry = new THREE.CircleGeometry(this.spotlightRadius, this.spotlightSegments);
        const spotlightMaterial = new THREE.MeshBasicMaterial({ 
            map: spotlightTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        this.spotlight = new THREE.Mesh(spotlightGeometry, spotlightMaterial);
        this.spotlight.position.z = -0.8; // Position between vignette and camera
        this.scene.add(this.spotlight);
    }
    
    updateSpotlight(radius, blur, vignetteOpacity) {
        // Update spotlight radius
        this.spotlight.geometry.dispose();
        this.spotlight.geometry = new THREE.CircleGeometry(radius, this.spotlightSegments);
        
        // Update gradient texture
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(blur, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, `rgba(0, 0, 0, ${vignetteOpacity})`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);
        
        this.spotlight.material.map.dispose();
        this.spotlight.material.map = new THREE.CanvasTexture(canvas);
        this.spotlight.material.needsUpdate = true;
    }
    
    setPosition(x, y) {
        this.spotlight.position.x = x;
        this.spotlight.position.y = y;
    }
    
    getSpotlight() {
        return this.spotlight;
    }
    
    hide() {
        if (this.spotlight) {
            this.spotlight.visible = false;
        }
    }
    
    show() {
        if (this.spotlight) {
            this.spotlight.visible = true;
        }
    }
} 