import * as THREE from 'three';

export class Lighting {
    constructor(scene) {
        this.scene = scene;
        this.ambientLight = null;
        this.directionalLight = null;
        
        this.init();
    }
    
    init() {
        // Ambient lighting
        this.ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(this.ambientLight);
        
        // Directional lighting
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.directionalLight.position.set(10, 10, 5);
        this.directionalLight.castShadow = true;
        
        // Shadow settings
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 50;
        this.directionalLight.shadow.camera.left = -25;
        this.directionalLight.shadow.camera.right = 25;
        this.directionalLight.shadow.camera.top = 25;
        this.directionalLight.shadow.camera.bottom = -25;
        this.directionalLight.shadow.bias = -0.0001;
        
        this.scene.add(this.directionalLight);
    }
    
    getAmbientLight() {
        return this.ambientLight;
    }
    
    getDirectionalLight() {
        return this.directionalLight;
    }
    
    // Method to adjust lighting intensity
    setAmbientIntensity(intensity) {
        this.ambientLight.intensity = intensity;
    }
    
    setDirectionalIntensity(intensity) {
        this.directionalLight.intensity = intensity;
    }
} 