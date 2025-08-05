import * as THREE from 'three';

export class VignetteEffect {
    constructor(scene) {
        this.scene = scene;
        this.vignette = null;
        this.gridSize = 50;
        
        this.init();
    }
    
    init() {
        // Create vignette effect that covers the entire scene
        const vignetteGeometry = new THREE.PlaneGeometry(this.gridSize * 2, this.gridSize * 2);
        const vignetteMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            transparent: true,
            opacity: 1.0 // Completely opaque to hide the grid by default
        });
        this.vignette = new THREE.Mesh(vignetteGeometry, vignetteMaterial);
        this.vignette.position.z = -1; // Position between grid and camera
        this.scene.add(this.vignette);
    }
    
    setOpacity(opacity) {
        this.vignette.material.opacity = opacity;
    }
    
    getOpacity() {
        return this.vignette.material.opacity;
    }
    
    getVignette() {
        return this.vignette;
    }
} 