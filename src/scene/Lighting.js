import * as THREE from 'three';

export class Lighting {
    constructor(scene) {
        this.scene = scene;
        this.ambientLight = null;
        this.directionalLight = null;
        this.fogLight = null; // Additional light for fog interaction
        
        this.init();
    }
    
    init() {
        // Ambient lighting - enhanced for fog interaction
        this.ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(this.ambientLight);
        
        // Directional lighting - enhanced for fog scattering
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.directionalLight.position.set(10, 10, 5);
        this.directionalLight.castShadow = true;
        
        // Enhanced shadow settings for fog interaction
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
        
        // Additional fog-specific light for enhanced scattering
        this.fogLight = new THREE.PointLight(0xffffff, 0.3, 30);
        this.fogLight.position.set(0, 5, 0);
        this.scene.add(this.fogLight);
    }
    
    getAmbientLight() {
        return this.ambientLight;
    }
    
    getDirectionalLight() {
        return this.directionalLight;
    }
    
    getFogLight() {
        return this.fogLight;
    }
    
    // Method to adjust lighting intensity
    setAmbientIntensity(intensity) {
        this.ambientLight.intensity = intensity;
    }
    
    setDirectionalIntensity(intensity) {
        this.directionalLight.intensity = intensity;
    }
    
    setFogLightIntensity(intensity) {
        this.fogLight.intensity = intensity;
    }
    
    // Method to update fog lighting interaction
    updateFogLighting(fogEffect) {
        if (fogEffect && fogEffect.updateLightingInteraction) {
            fogEffect.updateLightingInteraction(
                this.directionalLight.position,
                this.directionalLight.color,
                this.directionalLight.intensity
            );
        }
    }
    
    // Method to enhance lighting for fog scenes
    enhanceForFog() {
        // Increase ambient light slightly for better fog visibility
        this.ambientLight.intensity = 0.7;
        
        // Enhance directional light for better scattering
        this.directionalLight.intensity = 1.0;
        
        // Position fog light for optimal scattering
        this.fogLight.position.set(0, 8, 0);
        this.fogLight.intensity = 0.4;
    }
    
    // Method to reset lighting for non-fog scenes
    resetForNormal() {
        this.ambientLight.intensity = 0.6;
        this.directionalLight.intensity = 0.8;
        this.fogLight.intensity = 0.3;
    }
} 