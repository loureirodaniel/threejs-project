import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

export class LiquidDistortionEffect {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.composer = null;
        this.liquidPass = null;
        this.isActive = false;
        this.mousePosition = new THREE.Vector2(0, 0);
        this.mouseVelocity = new THREE.Vector2(0, 0);
        this.lastMousePosition = new THREE.Vector2(0, 0);
        this.time = 0;
        
        // Effect parameters
        this.distortionStrength = 0.02;
        this.rippleSpeed = 2.0;
        this.rippleScale = 50.0;
        this.falloffDistance = 0.3;
        this.noiseScale = 10.0;
        this.noiseStrength = 0.01;
        
        this.init();
    }
    
    init() {
        console.log('LiquidDistortionEffect: Initializing...');
        
        // Create effect composer
        this.composer = new EffectComposer(this.renderer);
        console.log('LiquidDistortionEffect: Composer created');
        
        // Add render pass
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);
        console.log('LiquidDistortionEffect: Render pass added');
        
        // Create liquid distortion pass
        this.createLiquidPass();
        console.log('LiquidDistortionEffect: Liquid pass created');
        
        // Setup mouse tracking
        this.setupMouseTracking();
        console.log('LiquidDistortionEffect: Mouse tracking setup complete');
        
        console.log('LiquidDistortionEffect: Initialization complete');
    }
    
    createLiquidPass() {
        // Vertex shader
        const vertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;
        
        // Fragment shader with liquid distortion
        const fragmentShader = `
            uniform sampler2D tDiffuse;
            uniform vec2 uMouse;
            uniform vec2 uMouseVelocity;
            uniform float uTime;
            uniform float uDistortionStrength;
            uniform float uRippleSpeed;
            uniform float uRippleScale;
            uniform float uFalloffDistance;
            uniform float uNoiseScale;
            uniform float uNoiseStrength;
            uniform vec2 uResolution;
            
            varying vec2 vUv;
            
            // Noise function for organic distortion
            float noise(vec2 p) {
                return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
            }
            
            // Smooth noise
            float smoothNoise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                
                float a = noise(i);
                float b = noise(i + vec2(1.0, 0.0));
                float c = noise(i + vec2(0.0, 1.0));
                float d = noise(i + vec2(1.0, 1.0));
                
                return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }
            
            // Fractal noise
            float fractalNoise(vec2 p) {
                float value = 0.0;
                float amplitude = 0.5;
                float frequency = 1.0;
                
                for(int i = 0; i < 4; i++) {
                    value += amplitude * smoothNoise(p * frequency);
                    amplitude *= 0.5;
                    frequency *= 2.0;
                }
                
                return value;
            }
            
            void main() {
                vec2 uv = vUv;
                vec2 mouse = uMouse;
                vec2 mouseVelocity = uMouseVelocity;
                
                // Calculate distance from current pixel to mouse position
                float distance = length(uv - mouse);
                
                // Create ripple effect
                float ripple = sin(distance * uRippleScale - uTime * uRippleSpeed) * exp(-distance / uFalloffDistance);
                
                // Create swirling effect based on mouse velocity
                vec2 swirl = vec2(
                    -mouseVelocity.y * 0.1,
                    mouseVelocity.x * 0.1
                ) * exp(-distance / uFalloffDistance);
                
                // Add noise for organic distortion
                vec2 noiseOffset = vec2(
                    fractalNoise(uv * uNoiseScale + uTime * 0.5) - 0.5,
                    fractalNoise(uv * uNoiseScale + uTime * 0.3 + 100.0) - 0.5
                ) * uNoiseStrength;
                
                // Combine all distortion effects
                vec2 distortion = (ripple * uDistortionStrength + swirl + noiseOffset) * exp(-distance / uFalloffDistance);
                
                // Apply distortion to UV coordinates
                vec2 distortedUv = uv + distortion;
                
                // Sample the texture with distorted coordinates
                vec4 color = texture2D(tDiffuse, distortedUv);
                
                // Add subtle color shift based on distortion
                float distortionMagnitude = length(distortion);
                color.rgb += distortionMagnitude * 0.1 * vec3(0.1, 0.2, 0.3);
                
                gl_FragColor = color;
            }
        `;
        
        // Create shader material
        const liquidMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                uMouse: { value: new THREE.Vector2(0.5, 0.5) },
                uMouseVelocity: { value: new THREE.Vector2(0, 0) },
                uTime: { value: 0 },
                uDistortionStrength: { value: this.distortionStrength },
                uRippleSpeed: { value: this.rippleSpeed },
                uRippleScale: { value: this.rippleScale },
                uFalloffDistance: { value: this.falloffDistance },
                uNoiseScale: { value: this.noiseScale },
                uNoiseStrength: { value: this.noiseStrength },
                uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader
        });
        
        // Check for shader compilation errors
        if (liquidMaterial.error) {
            console.error('LiquidDistortionEffect: Shader compilation error:', liquidMaterial.error);
        } else {
            console.log('LiquidDistortionEffect: Shader material created successfully');
        }
        
        // Create shader pass
        this.liquidPass = new ShaderPass(liquidMaterial);
        this.composer.addPass(this.liquidPass);
    }
    
    setupMouseTracking() {
        // Track mouse movement
        document.addEventListener('mousemove', (event) => {
            // Convert mouse position to normalized coordinates (0-1)
            this.mousePosition.x = event.clientX / window.innerWidth;
            this.mousePosition.y = 1.0 - (event.clientY / window.innerHeight); // Flip Y coordinate
            
            // Calculate mouse velocity
            this.mouseVelocity.x = this.mousePosition.x - this.lastMousePosition.x;
            this.mouseVelocity.y = this.mousePosition.y - this.lastMousePosition.y;
            
            this.lastMousePosition.copy(this.mousePosition);
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.onWindowResize();
        });
    }
    
    onWindowResize() {
        if (this.composer) {
            this.composer.setSize(window.innerWidth, window.innerHeight);
        }
        if (this.liquidPass && this.liquidPass.uniforms.uResolution) {
            this.liquidPass.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
        }
    }
    
    update(deltaTime) {
        if (!this.isActive || !this.liquidPass) return;
        
        this.time += deltaTime;
        
        // Update shader uniforms
        this.liquidPass.uniforms.uMouse.value.copy(this.mousePosition);
        this.liquidPass.uniforms.uMouseVelocity.value.copy(this.mouseVelocity);
        this.liquidPass.uniforms.uTime.value = this.time;
        
        // Decay mouse velocity for smooth effect
        this.mouseVelocity.multiplyScalar(0.95);
    }
    
    render() {
        if (this.isActive && this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    activate() {
        this.isActive = true;
        console.log('LiquidDistortionEffect: Activated');
        console.log('LiquidDistortionEffect: Composer exists:', !!this.composer);
        console.log('LiquidDistortionEffect: Liquid pass exists:', !!this.liquidPass);
    }
    
    deactivate() {
        this.isActive = false;
        console.log('LiquidDistortionEffect: Deactivated');
    }
    
    // Parameter controls
    setDistortionStrength(strength) {
        this.distortionStrength = strength;
        if (this.liquidPass) {
            this.liquidPass.uniforms.uDistortionStrength.value = strength;
        }
    }
    
    setRippleSpeed(speed) {
        this.rippleSpeed = speed;
        if (this.liquidPass) {
            this.liquidPass.uniforms.uRippleSpeed.value = speed;
        }
    }
    
    setRippleScale(scale) {
        this.rippleScale = scale;
        if (this.liquidPass) {
            this.liquidPass.uniforms.uRippleScale.value = scale;
        }
    }
    
    setFalloffDistance(distance) {
        this.falloffDistance = distance;
        if (this.liquidPass) {
            this.liquidPass.uniforms.uFalloffDistance.value = distance;
        }
    }
    
    setNoiseScale(scale) {
        this.noiseScale = scale;
        if (this.liquidPass) {
            this.liquidPass.uniforms.uNoiseScale.value = scale;
        }
    }
    
    setNoiseStrength(strength) {
        this.noiseStrength = strength;
        if (this.liquidPass) {
            this.liquidPass.uniforms.uNoiseStrength.value = strength;
        }
    }
    
    // Get current parameters
    getParameters() {
        return {
            distortionStrength: this.distortionStrength,
            rippleSpeed: this.rippleSpeed,
            rippleScale: this.rippleScale,
            falloffDistance: this.falloffDistance,
            noiseScale: this.noiseScale,
            noiseStrength: this.noiseStrength
        };
    }
    
    // Set all parameters at once
    setParameters(params) {
        if (params.distortionStrength !== undefined) this.setDistortionStrength(params.distortionStrength);
        if (params.rippleSpeed !== undefined) this.setRippleSpeed(params.rippleSpeed);
        if (params.rippleScale !== undefined) this.setRippleScale(params.rippleScale);
        if (params.falloffDistance !== undefined) this.setFalloffDistance(params.falloffDistance);
        if (params.noiseScale !== undefined) this.setNoiseScale(params.noiseScale);
        if (params.noiseStrength !== undefined) this.setNoiseStrength(params.noiseStrength);
    }
} 