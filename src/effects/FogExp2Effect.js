import * as THREE from 'three';

/**
 * FogExp2Effect - Enhanced exponential squared fog effect with depth buffer and volumetric rendering
 * Creates realistic cloud-like atmospheric depth with depth-aware lighting
 * Follows project rules for debug controls and performance monitoring
 */
export class FogExp2Effect {
    constructor(scene, renderer, camera, options = {}) {
        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;
        this.fog = null;
        this.isActive = false;
        this.debugControls = {};
        
        // Enhanced fog parameters for cloud-like effect
        this.config = {
            color: new THREE.Color(0x808080), // Subtle grey color
            density: 0.02, // Subtle density for atmospheric effect
            near: 1, // Start distance
            far: 50, // End distance
            enabled: true,
            // New depth buffer parameters
            depthBufferEnabled: true,
            volumetricDensity: 0.015, // Additional volumetric density
            lightScattering: 0.3, // Light scattering factor
            cloudOpacity: 0.4, // Cloud-like opacity variation
            windSpeed: 0.001, // Subtle wind animation
            turbulence: 0.02, // Turbulence for cloud-like movement
            // Lighting interaction
            lightInteraction: true,
            shadowSoftness: 0.5,
            ambientFog: 0.2
        };
        
        // Merge with provided options
        Object.assign(this.config, options);
        
        // Volumetric fog components
        this.volumetricFog = null;
        this.depthMaterial = null;
        this.fogMaterial = null;
        this.noiseTexture = null;
        
        this.init();
    }
    
    init() {
        this.createNoiseTexture();
        // Create fog but don't activate it immediately
        // Fog will be activated when timeline scene is activated via activate() method
        if (this.config.enabled) {
            this.createFog();
            this.createVolumetricFog();
        }
        this.generateDebugControls();
        console.debug('FogExp2Effect: Initialized with enhanced cloud-like fog (not activated yet)');
    }
    
    createNoiseTexture() {
        // Create procedural noise texture for cloud-like variation
        const size = 256;
        const data = new Uint8Array(size * size * 4);
        
        for (let i = 0; i < size * size; i++) {
            const x = (i % size) / size;
            const y = Math.floor(i / size) / size;
            
            // Perlin-like noise for cloud texture
            const noise = this.simplexNoise(x * 4, y * 4) * 0.5 + 0.5;
            const turbulence = this.simplexNoise(x * 8, y * 8) * 0.25 + 0.75;
            
            const value = Math.floor(noise * turbulence * 255);
            data[i * 4] = value;     // R
            data[i * 4 + 1] = value; // G
            data[i * 4 + 2] = value; // B
            data[i * 4 + 3] = 255;   // A
        }
        
        this.noiseTexture = new THREE.DataTexture(data, size, size);
        this.noiseTexture.wrapS = THREE.RepeatWrapping;
        this.noiseTexture.wrapT = THREE.RepeatWrapping;
        this.noiseTexture.needsUpdate = true;
    }
    
    simplexNoise(x, y) {
        // Simplified simplex noise implementation
        const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
        const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
        
        const s = (x + y) * F2;
        const i = Math.floor(x + s);
        const j = Math.floor(y + s);
        
        const t = (i + j) * G2;
        const x0 = x - (i - t);
        const y0 = y - (j - t);
        
        let i1, j1;
        if (x0 > y0) {
            i1 = 1; j1 = 0;
        } else {
            i1 = 0; j1 = 1;
        }
        
        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1.0 + 2.0 * G2;
        const y2 = y0 - 1.0 + 2.0 * G2;
        
        const ii = i & 255;
        const jj = j & 255;
        
        const t0 = 0.5 - x0 * x0 - y0 * y0;
        const t1 = 0.5 - x1 * x1 - y1 * y1;
        const t2 = 0.5 - x2 * x2 - y2 * y2;
        
        let n0, n1, n2;
        
        if (t0 < 0) n0 = 0.0;
        else {
            const gi0 = this.perm[ii + this.perm[jj]] % 12;
            n0 = t0 * t0 * t0 * t0 * (this.grad3[gi0][0] * x0 + this.grad3[gi0][1] * y0);
        }
        
        if (t1 < 0) n1 = 0.0;
        else {
            const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
            n1 = t1 * t1 * t1 * t1 * (this.grad3[gi1][0] * x1 + this.grad3[gi1][1] * y1);
        }
        
        if (t2 < 0) n2 = 0.0;
        else {
            const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;
            n2 = t2 * t2 * t2 * t2 * (this.grad3[gi2][0] * x2 + this.grad3[gi2][1] * y2);
        }
        
        return 70.0 * (n0 + n1 + n2);
    }
    
    // Simplex noise permutation and gradient tables
    perm = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
    
    grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
    
    createFog() {
        // Create enhanced FogExp2 with depth buffer support
        this.fog = new THREE.FogExp2(this.config.color, this.config.density);
        
        // Don't apply fog to scene immediately - it will be activated when needed
        // This prevents the grey background transition on page load
        
        console.debug('FogExp2Effect: Created enhanced fog with color:', this.config.color.getHexString(), 'density:', this.config.density);
    }
    
    createVolumetricFog() {
        if (!this.config.depthBufferEnabled) return;
        
        // Create volumetric fog geometry (large box covering the scene)
        const geometry = new THREE.BoxGeometry(100, 50, 100);
        
        // Create shader material for volumetric fog with depth buffer
        this.fogMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uFogColor: { value: this.config.color },
                uFogDensity: { value: this.config.volumetricDensity },
                uLightScattering: { value: this.config.lightScattering },
                uCloudOpacity: { value: this.config.cloudOpacity },
                uWindSpeed: { value: this.config.windSpeed },
                uTurbulence: { value: this.config.turbulence },
                uNoiseTexture: { value: this.noiseTexture },
                uCameraPosition: { value: new THREE.Vector3(0, 0, 5) }, // Default position
                uLightPosition: { value: new THREE.Vector3(10, 10, 5) },
                uLightColor: { value: new THREE.Color(0xffffff) },
                uLightIntensity: { value: 0.8 },
                uAmbientFog: { value: this.config.ambientFog }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                varying vec3 vLocalPosition;
                varying vec2 vUv;
                
                void main() {
                    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                    vLocalPosition = position;
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform vec3 uFogColor;
                uniform float uFogDensity;
                uniform float uLightScattering;
                uniform float uCloudOpacity;
                uniform float uWindSpeed;
                uniform float uTurbulence;
                uniform sampler2D uNoiseTexture;
                uniform vec3 uCameraPosition;
                uniform vec3 uLightPosition;
                uniform vec3 uLightColor;
                uniform float uLightIntensity;
                uniform float uAmbientFog;
                
                varying vec3 vWorldPosition;
                varying vec3 vLocalPosition;
                varying vec2 vUv;
                
                // Noise function for cloud-like variation
                float noise(vec2 p) {
                    return texture2D(uNoiseTexture, p).r;
                }
                
                // Fractal noise for cloud-like structure
                float fbm(vec2 p) {
                    float value = 0.0;
                    float amplitude = 0.5;
                    float frequency = 1.0;
                    
                    for (int i = 0; i < 4; i++) {
                        value += amplitude * noise(p * frequency);
                        amplitude *= 0.5;
                        frequency *= 2.0;
                    }
                    
                    return value;
                }
                
                // Distance-based fog density
                float getFogDensity(vec3 worldPos) {
                    float distance = length(worldPos - uCameraPosition);
                    float baseDensity = exp(-uFogDensity * distance);
                    
                    // Add cloud-like variation
                    vec2 noiseCoord = worldPos.xz * 0.01 + uTime * uWindSpeed;
                    float cloudNoise = fbm(noiseCoord);
                    
                    // Add turbulence
                    vec2 turbulenceCoord = worldPos.xz * 0.02 + uTime * uWindSpeed * 0.5;
                    float turbulence = fbm(turbulenceCoord) * uTurbulence;
                    
                    // Combine base density with cloud variation
                    float cloudDensity = baseDensity * (0.3 + 0.7 * cloudNoise) + turbulence;
                    
                    return clamp(cloudDensity, 0.0, 1.0);
                }
                
                // Light scattering calculation
                vec3 calculateLightScattering(vec3 worldPos, float density) {
                    vec3 lightDir = normalize(uLightPosition - worldPos);
                    vec3 viewDir = normalize(uCameraPosition - worldPos);
                    
                    // Simple scattering approximation
                    float scattering = pow(max(0.0, dot(lightDir, viewDir)), 2.0);
                    vec3 scatteredLight = uLightColor * uLightIntensity * scattering * uLightScattering;
                    
                    return scatteredLight * density;
                }
                
                void main() {
                    float density = getFogDensity(vWorldPosition);
                    
                    if (density < 0.01) {
                        discard;
                    }
                    
                    // Calculate light scattering
                    vec3 scatteredLight = calculateLightScattering(vWorldPosition, density);
                    
                    // Combine fog color with scattered light
                    vec3 finalColor = mix(uFogColor, scatteredLight, density * uCloudOpacity);
                    
                    // Add ambient fog
                    finalColor += uFogColor * uAmbientFog * density;
                    
                    gl_FragColor = vec4(finalColor, density * uCloudOpacity);
                }
            `,
            transparent: true,
            side: THREE.BackSide,
            depthWrite: false,
            depthTest: true
        });
        
        // Create volumetric fog mesh
        this.volumetricFog = new THREE.Mesh(geometry, this.fogMaterial);
        this.volumetricFog.position.set(0, 25, 0); // Position above the scene
        this.volumetricFog.visible = false; // Hide initially - will be shown when activated
        this.scene.add(this.volumetricFog);
        
        console.debug('FogExp2Effect: Created volumetric fog with depth buffer');
    }
    
    activate() {
        if (!this.fog) {
            this.createFog();
        }
        
        this.scene.fog = this.fog;
        this.isActive = true;
        
        // Activate volumetric fog
        if (this.volumetricFog) {
            this.volumetricFog.visible = true;
        }
        
        console.debug('FogExp2Effect: Activated with volumetric fog');
    }
    
    deactivate() {
        this.scene.fog = null;
        this.isActive = false;
        
        // Deactivate volumetric fog
        if (this.volumetricFog) {
            this.volumetricFog.visible = false;
        }
        
        console.debug('FogExp2Effect: Deactivated');
    }
    
    update(deltaTime) {
        if (!this.isActive || !this.fogMaterial) return;
        
        // Update time uniform for animation
        this.fogMaterial.uniforms.uTime.value += deltaTime * 0.001;
        
        // Update camera position for depth calculations (if camera is available)
        if (this.camera && this.camera.position) {
            this.fogMaterial.uniforms.uCameraPosition.value.copy(this.camera.position);
        }
        
        // Optional: subtle density variation for atmospheric effect
        if (this.config.windSpeed > 0) {
            const windVariation = Math.sin(Date.now() * this.config.windSpeed) * 0.001;
            this.fog.density = this.config.density + windVariation;
        }
    }
    
    /**
     * Generate debug controls following project rules (1-10 range)
     */
    generateDebugControls() {
        this.debugControls = {
            fogEnabled: {
                type: 'toggle',
                value: this.config.enabled,
                label: 'Fog Enabled',
                onChange: (value) => {
                    this.config.enabled = value;
                    if (value) {
                        this.activate();
                    } else {
                        this.deactivate();
                    }
                }
            },
            depthBufferEnabled: {
                type: 'toggle',
                value: this.config.depthBufferEnabled,
                label: 'Depth Buffer Fog',
                onChange: (value) => {
                    this.config.depthBufferEnabled = value;
                    if (value && !this.volumetricFog) {
                        this.createVolumetricFog();
                    } else if (!value && this.volumetricFog) {
                        this.scene.remove(this.volumetricFog);
                        this.volumetricFog = null;
                    }
                }
            },
            fogDensity: {
                type: 'slider',
                min: 1,
                max: 10,
                value: this.normalizeValue(this.config.density, 0.001, 0.1),
                step: 0.1,
                label: 'Fog Density',
                onChange: (value) => {
                    this.config.density = this.denormalizeValue(value, 0.001, 0.1);
                    if (this.fog) {
                        this.fog.density = this.config.density;
                    }
                }
            },
            volumetricDensity: {
                type: 'slider',
                min: 1,
                max: 10,
                value: this.normalizeValue(this.config.volumetricDensity, 0.001, 0.05),
                step: 0.1,
                label: 'Volumetric Density',
                onChange: (value) => {
                    this.config.volumetricDensity = this.denormalizeValue(value, 0.001, 0.05);
                    if (this.fogMaterial) {
                        this.fogMaterial.uniforms.uFogDensity.value = this.config.volumetricDensity;
                    }
                }
            },
            lightScattering: {
                type: 'slider',
                min: 1,
                max: 10,
                value: this.normalizeValue(this.config.lightScattering, 0, 1),
                step: 0.1,
                label: 'Light Scattering',
                onChange: (value) => {
                    this.config.lightScattering = this.denormalizeValue(value, 0, 1);
                    if (this.fogMaterial) {
                        this.fogMaterial.uniforms.uLightScattering.value = this.config.lightScattering;
                    }
                }
            },
            cloudOpacity: {
                type: 'slider',
                min: 1,
                max: 10,
                value: this.normalizeValue(this.config.cloudOpacity, 0, 1),
                step: 0.1,
                label: 'Cloud Opacity',
                onChange: (value) => {
                    this.config.cloudOpacity = this.denormalizeValue(value, 0, 1);
                    if (this.fogMaterial) {
                        this.fogMaterial.uniforms.uCloudOpacity.value = this.config.cloudOpacity;
                    }
                }
            },
            windSpeed: {
                type: 'slider',
                min: 1,
                max: 10,
                value: this.normalizeValue(this.config.windSpeed, 0, 0.01),
                step: 0.1,
                label: 'Wind Speed',
                onChange: (value) => {
                    this.config.windSpeed = this.denormalizeValue(value, 0, 0.01);
                    if (this.fogMaterial) {
                        this.fogMaterial.uniforms.uWindSpeed.value = this.config.windSpeed;
                    }
                }
            },
            turbulence: {
                type: 'slider',
                min: 1,
                max: 10,
                value: this.normalizeValue(this.config.turbulence, 0, 0.1),
                step: 0.1,
                label: 'Turbulence',
                onChange: (value) => {
                    this.config.turbulence = this.denormalizeValue(value, 0, 0.1);
                    if (this.fogMaterial) {
                        this.fogMaterial.uniforms.uTurbulence.value = this.config.turbulence;
                    }
                }
            },
            fogColorR: {
                type: 'slider',
                min: 1,
                max: 10,
                value: this.normalizeValue(this.config.color.r, 0, 1),
                step: 0.1,
                label: 'Fog Color Red',
                onChange: (value) => {
                    this.config.color.r = this.denormalizeValue(value, 0, 1);
                    if (this.fog) {
                        this.fog.color = this.config.color;
                    }
                    if (this.fogMaterial) {
                        this.fogMaterial.uniforms.uFogColor.value = this.config.color;
                    }
                }
            },
            fogColorG: {
                type: 'slider',
                min: 1,
                max: 10,
                value: this.normalizeValue(this.config.color.g, 0, 1),
                step: 0.1,
                label: 'Fog Color Green',
                onChange: (value) => {
                    this.config.color.g = this.denormalizeValue(value, 0, 1);
                    if (this.fog) {
                        this.fog.color = this.config.color;
                    }
                    if (this.fogMaterial) {
                        this.fogMaterial.uniforms.uFogColor.value = this.config.color;
                    }
                }
            },
            fogColorB: {
                type: 'slider',
                min: 1,
                max: 10,
                value: this.normalizeValue(this.config.color.b, 0, 1),
                step: 0.1,
                label: 'Fog Color Blue',
                onChange: (value) => {
                    this.config.color.b = this.denormalizeValue(value, 0, 1);
                    if (this.fog) {
                        this.fog.color = this.config.color;
                    }
                    if (this.fogMaterial) {
                        this.fogMaterial.uniforms.uFogColor.value = this.config.color;
                    }
                }
            },
            fogReset: {
                type: 'button',
                label: 'Reset Fog',
                onClick: () => {
                    this.resetToDefaults();
                }
            }
        };
        
        console.debug('FogExp2Effect: Generated enhanced debug controls');
    }
    
    /**
     * Normalize value to 1-10 range following project rules
     */
    normalizeValue(value, min, max) {
        return Math.max(1, Math.min(10, ((value - min) / (max - min)) * 9 + 1));
    }
    
    /**
     * Denormalize value from 1-10 range back to actual value
     */
    denormalizeValue(normalizedValue, min, max) {
        return min + ((normalizedValue - 1) / 9) * (max - min);
    }
    
    /**
     * Reset fog to default values
     */
    resetToDefaults() {
        this.config.color.setHex(0x808080); // Subtle grey
        this.config.density = 0.02;
        this.config.enabled = true;
        this.config.depthBufferEnabled = true;
        this.config.volumetricDensity = 0.015;
        this.config.lightScattering = 0.3;
        this.config.cloudOpacity = 0.4;
        this.config.windSpeed = 0.001;
        this.config.turbulence = 0.02;
        this.config.lightInteraction = true;
        this.config.shadowSoftness = 0.5;
        this.config.ambientFog = 0.2;
        
        if (this.fog) {
            this.fog.color = this.config.color;
            this.fog.density = this.config.density;
        }
        
        if (this.fogMaterial) {
            this.fogMaterial.uniforms.uFogColor.value = this.config.color;
            this.fogMaterial.uniforms.uFogDensity.value = this.config.volumetricDensity;
            this.fogMaterial.uniforms.uLightScattering.value = this.config.lightScattering;
            this.fogMaterial.uniforms.uCloudOpacity.value = this.config.cloudOpacity;
            this.fogMaterial.uniforms.uWindSpeed.value = this.config.windSpeed;
            this.fogMaterial.uniforms.uTurbulence.value = this.config.turbulence;
            this.fogMaterial.uniforms.uAmbientFog.value = this.config.ambientFog;
        }
        
        // Update debug controls
        this.generateDebugControls();
        
        console.debug('FogExp2Effect: Reset to enhanced defaults');
    }
    
    /**
     * Update lighting interaction for fog
     */
    updateLightingInteraction(lightPosition, lightColor, lightIntensity) {
        if (this.fogMaterial) {
            this.fogMaterial.uniforms.uLightPosition.value.copy(lightPosition);
            this.fogMaterial.uniforms.uLightColor.value = lightColor;
            this.fogMaterial.uniforms.uLightIntensity.value = lightIntensity;
        }
    }
    
    /**
     * Get debug controls for UI integration
     */
    getDebugControls() {
        return this.debugControls;
    }
    
    /**
     * Update fog parameters programmatically
     */
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
        
        if (this.fog) {
            this.fog.color = this.config.color;
            this.fog.density = this.config.density;
        }
        
        // Regenerate debug controls
        this.generateDebugControls();
        
        console.debug('FogExp2Effect: Updated config', newConfig);
    }
    
    /**
     * Get current fog configuration
     */
    getConfig() {
        return { ...this.config };
    }
    
    /**
     * Check if fog is currently active
     */
    isFogActive() {
        return this.isActive && this.scene.fog === this.fog;
    }
    
    /**
     * Cleanup method for proper resource management
     */
    destroy() {
        this.deactivate();
        
        // Clean up volumetric fog
        if (this.volumetricFog) {
            this.scene.remove(this.volumetricFog);
            this.volumetricFog = null;
        }
        
        // Clean up materials
        if (this.fogMaterial) {
            this.fogMaterial.dispose();
            this.fogMaterial = null;
        }
        
        // Clean up textures
        if (this.noiseTexture) {
            this.noiseTexture.dispose();
            this.noiseTexture = null;
        }
        
        this.fog = null;
        this.debugControls = {};
        
        console.debug('FogExp2Effect: Destroyed with cleanup');
    }
}
