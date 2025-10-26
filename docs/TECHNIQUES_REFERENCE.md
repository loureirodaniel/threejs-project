# Advanced Techniques Reference

This document outlines advanced techniques from premium web experiences to inform and inspire the Three.js Timeline project implementation.

## Reference Projects

### Getty Tracing Art
**URL**: https://www.getty.edu/tracingart/

**Key Techniques**:
- Sophisticated scroll-driven narrative with complex choreography
- Seamless blend of 3D and 2D content
- Data visualization integrated into 3D scenes
- Network graphs, timeline animations
- Multi-stage story progression with state management
- Scroll-based scene transitions
- Smooth camera choreography tied to scroll progress
- Staggered animations triggered by scroll position
- Dynamic content loading based on viewport

### Hatom
**URL**: https://www.hatom.com/en/

**Key Techniques**:
- 5-stage transformation sequence (griffin evolution)
- Custom cursor interactions
- Sound/audio integration
- Liquid animations
- Lottie integration with Three.js
- Complex menu systems
- Multi-phase scene transformations
- Custom rendering passes
- Morphing geometries
- Particle systems

### Igloo
**URL**: https://www.igloo.inc/

**Key Techniques**:
- Premium quality materials and lighting
- Advanced post-processing effects
- Smooth transitions between scenes
- Physically-based rendering (PBR)
- Advanced lighting setups
- Real-time reflections and refractions
- Depth of field effects
- Motion blur
- Color grading
- HDR rendering

## Core Techniques

### 1. Scroll-Driven Choreography

**Current Implementation**: Basic smooth scrolling via `SmoothScrollController.js`
```javascript
// Current: src/controls/SmoothScrollController.js
class SmoothScrollController {
    handleSmoothTimelineScroll(delta) {
        // Apply smooth scrolling with subtle friction
        this.applySmoothScroll(delta);
    }
}
```

**Enhanced Approach (Getty style)**:
- Multi-phase scroll progress tracking (0-100% through each section)
- Scene state machines tied to scroll percentage
- Scroll triggers for staggered animations
- Layered parallax effects
- Scroll-based camera choreography
- Intersection observer for content sections

**Implementation Recommendations**:
```javascript
class ScrollChoreography {
    constructor() {
        this.sections = [];
        this.currentSection = 0;
        this.scrollProgress = 0;
    }
    
    registerSection(config) {
        // Track scroll progress through each section
        // Define keyframe animations
        // Set up state transitions
    }
    
    onScroll(scrollY) {
        const progress = this.calculateProgress(scrollY);
        this.updateChoreography(progress);
    }
    
    updateChoreography(progress) {
        // Update multiple elements based on scroll progress
        // Synchronize animations across elements
        // Trigger events at specific milestones
    }
}
```

### 2. Locomotive Scroll Integration

**Benefits**:
- Smooth, momentum-based scrolling
- Horizontal/vertical hybrid scrolling
- Scroll-linked animations
- Parallax effects
- Data attribute-driven animations

**Integration Approach**:
```javascript
import LocomotiveScroll from 'locomotive-scroll';

class LocomotiveScrollController {
    constructor() {
        this.scroll = new LocomotiveScroll({
            el: document.querySelector('[data-scroll-container]'),
            smooth: true,
            smoothMobile: false,
            scrollbarContainer: document.querySelector('[data-scrollbar]'),
            direction: 'horizontal', // For timeline
            touchMultiplier: 2
        });
        
        this.setupScrollListeners();
    }
    
    setupScrollListeners() {
        // Sync Three.js camera with scroll position
        this.scroll.on('scroll', (obj) => {
            const progress = obj.scroll.current / obj.scroll.limit;
            this.updateCameraFromScroll(progress);
        });
    }
}
```

### 3. Advanced Camera Choreography

**Current Implementation**: Basic camera transitions via `TimelineController.js`

**Enhanced Approach**:
- Path-based camera animation
- Camera look-at targets
- FOV adjustments for dramatic effect
- Multi-stage camera movements
- Easing curves for natural motion

```javascript
class CameraChoreography {
    constructor(camera) {
        this.camera = camera;
        this.paths = new Map();
    }
    
    registerPath(name, keyframes) {
        // Define camera path with keyframes
        this.paths.set(name, keyframes);
    }
    
    animateAlongPath(pathName, duration, easing) {
        const path = this.paths.get(pathName);
        const tl = gsap.timeline();
        
        path.forEach((keyframe, i) => {
            if (i === 0) return;
            
            tl.to(this.camera.position, {
                x: keyframe.position.x,
                y: keyframe.position.y,
                z: keyframe.position.z,
                duration: keyframe.duration || duration / path.length,
                ease: easing
            }, i * duration / path.length);
            
            if (keyframe.lookAt) {
                tl.to(this.camera.lookAt, {
                    x: keyframe.lookAt.x,
                    y: keyframe.lookAt.y,
                    z: keyframe.lookAt.z,
                    duration: keyframe.duration || duration / path.length,
                    ease: easing
                }, '<');
            }
            
            if (keyframe.fov) {
                tl.to(this.camera, {
                    fov: keyframe.fov,
                    duration: keyframe.duration || duration / path.length,
                    onUpdate: () => this.camera.updateProjectionMatrix(),
                    ease: easing
                }, '<');
            }
        });
    }
}
```

### 4. Advanced Post-Processing

**Current Implementation**: Basic effects via `LiquidDistortionEffect.js`, `SpotlightEffect.js`, `VignetteEffect.js`

**Enhanced Approach (Igloo style)**:
- Render passes for different effects
- Depth buffer access for depth effects
- Bloom effects for emissive materials
- Chromatic aberration
- Film grain
- Color grading (LUT)
- Depth of field
- Motion blur

```javascript
import { 
    EffectComposer, 
    RenderPass, 
    ShaderPass,
    UnrealBloomPass,
    FilmPass,
    VignetteShader,
    DOFMipMapShader
} from 'three/examples/jsm/postprocessing';

class AdvancedPostProcessing {
    constructor(renderer, scene, camera) {
        this.composer = new EffectComposer(renderer);
        
        // Base render pass
        const renderPass = new RenderPass(scene, camera);
        this.composer.addPass(renderPass);
        
        // Bloom effect
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5, // Strength
            0.4, // Radius
            0.85  // Threshold
        );
        this.composer.addPass(bloomPass);
        
        // Film grain
        const filmPass = new FilmPass(
            0.35,  // Noise intensity
            0.025, // Scanline intensity
            648,   // Scanline count
            0      // Grayscale
        );
        this.composer.addPass(filmPass);
        
        // Vignette
        const vignettePass = new ShaderPass(VignetteShader);
        vignettePass.uniforms['offset'].value = 0.96;
        vignettePass.uniforms['darkness'].value = 1.3;
        this.composer.addPass(vignettePass);
        
        // Output pass
        this.composer.addPass(new OutputPass());
    }
    
    render() {
        this.composer.render();
    }
}
```

### 5. Scene State Management

**Current Implementation**: Basic state via `AppStateManager.js`

**Enhanced Approach**:
- Finite state machine for scene states
- State transition animations
- State persistence
- State validation
- State rollback capabilities

```javascript
class SceneStateManager {
    constructor() {
        this.states = {
            INITIAL: 'initial',
            INTRO: 'intro',
            TIMELINE: 'timeline',
            IMAGE_VIEW: 'imageView',
            TRANSITIONING: 'transitioning'
        };
        
        this.currentState = this.states.INITIAL;
        this.stateHistory = [];
    }
    
    transitionTo(newState, options = {}) {
        if (this.canTransitionTo(newState)) {
            this.stateHistory.push(this.currentState);
            const previousState = this.currentState;
            this.currentState = newState;
            
            this.onStateChange(previousState, newState);
            
            if (options.animation) {
                this.animateTransition(previousState, newState, options.animation);
            }
        }
    }
    
    canTransitionTo(newState) {
        const validTransitions = {
            [this.states.INITIAL]: [this.states.INTRO, this.states.TIMELINE],
            [this.states.INTRO]: [this.states.TIMELINE],
            [this.states.TIMELINE]: [this.states.IMAGE_VIEW, this.states.INITIAL],
            [this.states.IMAGE_VIEW]: [this.states.TIMELINE]
        };
        
        return validTransitions[this.currentState]?.includes(newState) || false;
    }
    
    onStateChange(from, to) {
        // Emit state change events
        // Update UI
        // Trigger appropriate animations
    }
}
```

### 6. Advanced Material & Lighting

**Enhanced Approach (Igloo style)**:
- Physically Based Rendering (PBR)
- HDR environment maps
- IES light profiles
- Real-time shadows with soft edges
- Multiple light types (Area, Point, Directional, Spot)
- Light baking for performance
- Dynamic material properties

```javascript
class AdvancedLighting {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        
        this.setupEnvironmentLighting();
        this.setupMainLighting();
        this.setupAccentLighting();
    }
    
    setupEnvironmentLighting() {
        // HDR Environment map
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        const envMap = pmremGenerator.fromScene(this.createSkybox()).texture;
        this.scene.environment = envMap;
        
        // Ambient occlusion
        this.scene.fog = new THREE.FogExp2(0x000000, 0.0008);
    }
    
    setupMainLighting() {
        // Key light (main directional)
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
        keyLight.position.set(5, 10, 5);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 2048;
        keyLight.shadow.mapSize.height = 2048;
        this.scene.add(keyLight);
        
        // Fill light (softer, ambient)
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-5, 2, -5);
        this.scene.add(fillLight);
    }
    
    setupAccentLighting() {
        // Rim light
        const rimLight = new THREE.DirectionalLight(0x0066ff, 0.5);
        rimLight.position.set(0, 0, -10);
        this.scene.add(rimLight);
        
        // Accent spotlight
        const accentLight = new THREE.SpotLight(0xff6600, 1.0);
        accentLight.position.set(0, 10, 0);
        accentLight.angle = Math.PI / 6;
        accentLight.penumbra = 0.3;
        this.scene.add(accentLight);
    }
}
```

### 7. Audio Integration

**Enhanced Approach (Hatom style)**:
- Spatial audio using Web Audio API
- Audio-driven visualizations
- Sync audio to animations
- Audio-reactive shaders
- Sound effects for interactions

```javascript
class AudioController {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.sourceNode = null;
        this.analyserNode = null;
        this.frequencyData = null;
    }
    
    async loadAudio(url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    }
    
    play() {
        this.sourceNode = this.audioContext.createBufferSource();
        this.sourceNode.buffer = this.audioBuffer;
        this.sourceNode.connect(this.analyserNode);
        this.analyserNode.connect(this.audioContext.destination);
        this.sourceNode.start();
    }
    
    update() {
        if (this.analyserNode) {
            this.analyserNode.getByteFrequencyData(this.frequencyData);
            // Use frequency data to drive visual effects
        }
    }
}
```

### 8. Advanced Timeline Visualization

**Enhanced Approach**:
- Network graphs for relationships (Getty style)
- Data visualization in 3D space
- Interactive nodes
- Animated connections
- Timeline scrubbing
- Milestone markers
- Progress indicators

```javascript
class TimelineVisualization {
    constructor(scene) {
        this.scene = scene;
        this.nodes = [];
        this.connections = [];
        this.currentYear = 2015;
    }
    
    createNetworkGraph(data) {
        data.forEach(item => {
            const node = this.createNode(item);
            this.nodes.push(node);
            this.scene.add(node);
        });
        
        // Create connections between related items
        this.createConnections();
    }
    
    createNode(data) {
        const geometry = new THREE.SphereGeometry(0.1, 16, 16);
        const material = new THREE.MeshBasicMaterial({ 
            color: data.color || 0xffffff 
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            data.x || 0,
            data.y || 0,
            data.z || 0
        );
        mesh.userData = data;
        return mesh;
    }
    
    animateToYear(year, duration = 2) {
        const targetNode = this.nodes.find(n => n.userData.year === year);
        if (targetNode) {
            gsap.to(this.camera.position, {
                x: targetNode.position.x,
                y: targetNode.position.y + 2,
                z: targetNode.position.z + 3,
                duration: duration,
                ease: 'power2.inOut'
            });
            
            gsap.to(this.camera.lookAt, {
                x: targetNode.position.x,
                y: targetNode.position.y,
                z: targetNode.position.z,
                duration: duration,
                ease: 'power2.inOut'
            });
        }
    }
}
```

### 9. Performance Optimization

**Techniques**:
- Level of Detail (LOD) for models
- Frustum culling
- Instanced rendering
- Texture atlasing
- Geometry merging
- Occlusion culling
- Progressive loading
- Garbage collection management

```javascript
class PerformanceOptimizer {
    constructor() {
        this.lodManager = new THREE.LOD();
        this.instancedMeshes = new Map();
    }
    
    createLODModel() {
        const lod = new THREE.LOD();
        
        // High detail (close)
        lod.addLevel(this.createHighDetail(), 0);
        
        // Medium detail
        lod.addLevel(this.createMediumDetail(), 10);
        
        // Low detail (far)
        lod.addLevel(this.createLowDetail(), 30);
        
        return lod;
    }
    
    createInstancedMesh(geometry, material, count) {
        const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
        const matrix = new THREE.Matrix4();
        
        for (let i = 0; i < count; i++) {
            matrix.setPosition(
                Math.random() * 10,
                Math.random() * 10,
                Math.random() * 10
            );
            instancedMesh.setMatrixAt(i, matrix);
        }
        
        return instancedMesh;
    }
    
    updateVisibility(camera) {
        // Frustum culling
        const frustum = new THREE.Frustum();
        frustum.setFromProjectionMatrix(
            new THREE.Matrix4().multiplyMatrices(
                camera.projectionMatrix,
                camera.matrixWorldInverse
            )
        );
        
        // Update LOD
        this.lodManager.update(camera);
    }
}
```

## Implementation Roadmap

### Phase 1: Foundation (Current)
- ✅ Basic Three.js setup
- ✅ Smooth scroll controller
- ✅ Basic camera system
- ✅ Timeline scene
- ✅ Image planes

### Phase 2: Enhanced Scrolling (Priority 1)
- [ ] Implement Locomotive Scroll or equivalent
- [ ] Multi-phase scroll choreography
- [ ] Scroll-triggered animations
- [ ] Parallax effects
- [ ] Intersection observers

### Phase 3: Advanced Camera (Priority 2)
- [ ] Path-based camera animation
- [ ] Multi-stage camera movements
- [ ] FOV adjustments
- [ ] Camera choreography system
- [ ] Look-at targets

### Phase 4: Post-Processing (Priority 2)
- [ ] Bloom effects
- [ ] Film grain
- [ ] Chromatic aberration
- [ ] Depth of field
- [ ] Motion blur
- [ ] Color grading

### Phase 5: Advanced Materials (Priority 3)
- [ ] PBR materials
- [ ] HDR environment maps
- [ ] Advanced lighting setups
- [ ] Real-time shadows
- [ ] Dynamic materials

### Phase 6: Audio Integration (Priority 3)
- [ ] Web Audio API integration
- [ ] Audio-reactive effects
- [ ] Spatial audio
- [ ] Sound effects

### Phase 7: Data Visualization (Priority 4)
- [ ] Network graphs
- [ ] 3D data visualization
- [ ] Interactive nodes
- [ ] Animated connections

## Resources

### Libraries
- **Locomotive Scroll**: https://locomotive.ca/
- **GSAP**: https://greensock.com/
- **Three.js**: https://threejs.org/
- **Post-Processing**: three/examples/jsm/postprocessing

### References
- Getty Tracing Art: https://www.getty.edu/tracingart/
- Hatom: https://www.hatom.com/en/
- Igloo: https://www.igloo.inc/

## Conclusion

This document serves as a reference for implementing advanced techniques seen in premium web experiences. The techniques are organized by priority and can be implemented incrementally to enhance the Timeline project gradually.
