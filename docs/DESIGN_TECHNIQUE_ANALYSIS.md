# Design Technique Analysis - Getty, Hatom, and Igloo

This document provides a detailed technical analysis of design techniques, implementation patterns, and architectural decisions from three premium Three.js web experiences.

## Reference Sites

### 1. Getty Provenance Index: Tracing Art
**URL:** https://www.getty.edu/tracingart/

### 2. Hatom
**URL:** https://www.hatom.com/en/

### 3. Igloo
**URL:** https://www.igloo.inc/

---

## Getty Provenance Index: Deep Dive

### Overview
A horizontal, scroll-driven narrative that follows art pieces through time with sophisticated camera choreography and data visualization.

### Key Technical Features

#### 1. Horizontal Scroll-Driven Camera Choreography
**Implementation Pattern:**
```javascript
class GettyScrollChoreography {
  constructor() {
    this.scrollProgress = 0;
    this.scrollDirection = 'horizontal';
    this.sections = [];
    this.camera = null;
    this.timeline = new THREE.Timeline();
  }

  setupHorizontalScroll() {
    // Disable default vertical scroll
    document.body.style.height = '100vh';
    document.body.style.overflow = 'hidden';
    
    // Create horizontal scroll container
    const container = document.querySelector('.horizontal-scroll');
    container.style.width = `${this.totalWidth}px`;
    
    // Listen to wheel events for horizontal scrolling
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.scrollDelta += e.deltaY;
      this.updateCameraFromScroll();
    });
  }

  updateCameraFromScroll() {
    // Convert scroll position to camera path
    const progress = this.scrollDelta / this.totalWidth;
    
    // Camera follows predefined path based on scroll progress
    const cameraPath = this.cameraPaths[this.currentSection];
    const targetPosition = this.interpolatePath(cameraPath, progress);
    
    this.camera.position.lerp(targetPosition, 0.1);
  }
}
```

**Key Characteristics:**
- Scroll position maps directly to timeline position
- Camera follows a predefined path
- Smooth interpolation prevents jitter
- Multiple camera waypoints create cinematic movement

#### 2. Narrative Progression Through Sections
**Section Structure:**
```javascript
class NarrativeSection {
  constructor(config) {
    this.id = config.id;
    this.title = config.title;
    this.scrollStart = config.scrollStart;
    this.scrollEnd = config.scrollEnd;
    this.content = config.content;
    this.cameraPath = config.cameraPath;
    this.animations = config.animations;
  }

  initialize() {
    // Setup timeline for this section
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: this.container,
        start: this.scrollStart,
        end: this.scrollEnd,
        scrub: true,
        pin: true
      }
    });
    
    // Add animations that trigger based on scroll
    timeline.to(this.content, { opacity: 1, duration: 1 });
    timeline.to(this.camera, { ...cameraPath, duration: 2 });
    timeline.to(this.objects, { ...animations, duration: 2 });
  }
}
```

**Progressive Disclosure Pattern:**
- Content appears gradually as scroll progresses
- Text fades in at specific scroll milestones
- Images load progressively
- Objects animate into view based on scroll position

#### 3. Integration of 2D and 3D Content
**Hybrid Rendering Approach:**
```javascript
class HybridRenderer {
  constructor() {
    this.webglRenderer = new THREE.WebGLRenderer({ antialias: true });
    this.htmlContainer = document.querySelector('.html-content');
    this.webglContainer = document.querySelector('.webgl-scene');
  }

  render() {
    // Render 3D scene
    this.webglRenderer.render(this.scene, this.camera);
    
    // Position HTML content based on 3D camera
    const screenPosition = this.getScreenPosition(this.htmlMarker);
    this.htmlContainer.style.transform = `translate(${screenPosition.x}px, ${screenPosition.y}px)`;
    
    // Sync opacity with camera distance
    const distance = this.camera.position.distanceTo(this.htmlMarker.position);
    this.htmlContainer.style.opacity = Math.max(0, 1 - distance / 10);
  }

  getScreenPosition(object) {
    const vector = object.position.clone();
    vector.project(this.camera);
    
    return {
      x: (vector.x * 0.5 + 0.5) * window.innerWidth,
      y: (vector.y * -0.5 + 0.5) * window.innerHeight
    };
  }
}
```

#### 4. Timeline Date Visualization
**Dynamic Timeline Markers:**
```javascript
class TimelineVisualization {
  constructor() {
    this.markers = [];
    this.activeMarker = null;
  }

  createMarker(date, position, description) {
    const marker = {
      year: date,
      position: position,
      description: description,
      mesh: this.createMarkerMesh(date),
      label: this.createLabel(description)
    };
    
    this.markers.push(marker);
    this.scene.add(marker.mesh);
  }

  updateActiveMarker(scrollProgress) {
    // Determine which marker should be active
    const newActiveMarker = this.markers.find(marker => 
      scrollProgress >= marker.scrollStart && 
      scrollProgress <= marker.scrollEnd
    );
    
    if (newActiveMarker !== this.activeMarker) {
      this.animateMarkerTransition(this.activeMarker, newActiveMarker);
      this.activeMarker = newActiveMarker;
    }
  }

  animateMarkerTransition(oldMarker, newMarker) {
    // Fade out old marker
    gsap.to(oldMarker.mesh.material, {
      opacity: 0.3,
      duration: 0.5
    });
    
    // Highlight new marker
    gsap.to(newMarker.mesh.material, {
      opacity: 1,
      scale: 1.2,
      duration: 0.5,
      ease: 'back.out'
    });
  }
}
```

#### 5. Smooth Object Transitions
**Object Animation Patterns:**
```javascript
class ObjectTransitions {
  setupTransitions() {
    // Objects move in sync with camera
    this.objects.forEach(object => {
      const motionPath = object.getMotionPath();
      
      this.timeline.to(object.position, {
        ...motionPath,
        duration: 2,
        ease: 'power2.inOut',
        scrollTrigger: {
          trigger: object.container,
          start: 'top center',
          end: 'bottom center',
          scrub: true
        }
      });
    });
  }

  createParallaxEffect() {
    // Different objects move at different speeds
    this.backgroundObjects.forEach(obj => obj.speed = 0.5);
    this.midgroundObjects.forEach(obj => obj.speed = 1.0);
    this.foregroundObjects.forEach(obj => obj.speed = 1.5);
  }
}
```

### Performance Optimizations
- **Progressive Image Loading:** Images load only when visible
- **Object Pooling:** Reuse 3D objects to reduce memory
- **LOD System:** Lower detail objects at distance
- **Efficient Rendering:** Render only visible objects

---

## Hatom: Deep Dive

### Overview
Sophisticated 3D scene composition with complex animations, custom shaders, and premium visual effects.

### Key Technical Features

#### 1. Custom Shader Effects
**Liquid Morphing Shader:**
```glsl
// Liquid morphing effect using custom shader
uniform float uTime;
uniform float uProgress;
uniform vec3 uColor1;
uniform vec3 uColor2;

void main() {
  vec3 pos = position;
  
  // Noise-based displacement
  float noise = snoise(pos * 10.0 + uTime);
  pos += normal * noise * 0.1;
  
  // Color mixing based on progress
  vec3 color = mix(uColor1, uColor2, uProgress);
  
  gl_FragColor = vec4(color, 1.0);
}
```

**Implementation:**
```javascript
class LiquidMorphEffect {
  constructor() {
    this.geometry = new THREE.PlaneGeometry(2, 2, 100, 100);
    this.customMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uColor1: { value: new THREE.Color(0x0066ff) },
        uColor2: { value: new THREE.Color(0xff00ff) }
      },
      vertexShader: liquidVertexShader,
      fragmentShader: liquidFragmentShader
    });
    
    this.mesh = new THREE.Mesh(this.geometry, this.customMaterial);
  }

  update(time) {
    this.customMaterial.uniforms.uTime.value = time;
  }

  animateProgress(progress) {
    gsap.to(this.customMaterial.uniforms.uProgress, {
      value: progress,
      duration: 2,
      ease: 'power2.inOut'
    });
  }
}
```

#### 2. Advanced Lottie Integration
**Three.js + Lottie Synchronization:**
```javascript
class LottieThreeIntegration {
  constructor() {
    this.lottiePlayer = null;
    this.threeScene = null;
    this.canvas = document.createElement('canvas');
    this.texture = new THREE.CanvasTexture(this.canvas);
  }

  loadLottieAnimation(url) {
    lottie.loadAnimation({
      container: this.canvas,
      renderer: 'canvas',
      loop: true,
      autoplay: true,
      path: url
    }).then((player) => {
      this.lottiePlayer = player;
      this.setupThreeTexture();
    });
  }

  setupThreeTexture() {
    // Update texture every frame
    this.texture.needsUpdate = true;
    
    // Create plane to show Lottie animation in 3D
    const geometry = new THREE.PlaneGeometry(4, 4);
    const material = new THREE.MeshBasicMaterial({ map: this.texture });
    const plane = new THREE.Mesh(geometry, material);
    
    this.scene.add(plane);
  }

  syncWithScroll(scrollProgress) {
    // Control Lottie animation based on scroll
    const frame = Math.floor(scrollProgress * this.lottiePlayer.totalFrames);
    this.lottiePlayer.goToAndStop(frame, true);
  }
}
```

#### 3. Custom Cursor Interactions
**Interactive Cursor System:**
```javascript
class CustomCursorSystem {
  constructor() {
    this.cursor = document.querySelector('.custom-cursor');
    this.hoverTargets = [];
    this.currentTarget = null;
    this.ease = 0.15;
  }

  init() {
    // Hide default cursor
    document.body.style.cursor = 'none';
    
    // Track mouse movement
    document.addEventListener('mousemove', (e) => {
      this.updatePosition(e.clientX, e.clientY);
    });
    
    // Setup hover detection
    this.setupHoverDetection();
  }

  updatePosition(x, y) {
    // Smooth following with easing
    this.cursor.style.left = x + 'px';
    this.cursor.style.top = y + 'px';
  }

  onHover(element) {
    // Scale up cursor
    gsap.to(this.cursor, {
      scale: 2,
      duration: 0.3,
      ease: 'power2.out'
    });
    
    // Change cursor appearance
    this.cursor.classList.add('hover');
  }

  onLeave(element) {
    // Return to normal
    gsap.to(this.cursor, {
      scale: 1,
      duration: 0.3
    });
    
    this.cursor.classList.remove('hover');
  }
}
```

#### 4. Multi-Stage Scene Transitions
**Scene State Machine:**
```javascript
class SceneStateMachine {
  constructor() {
    this.states = {
      INITIAL: 'initial',
      TRANSITIONING: 'transitioning',
      LOADED: 'loaded',
      INTERACTIVE: 'interactive'
    };
    this.currentState = this.states.INITIAL;
  }

  transitionTo(newState, options = {}) {
    if (this.currentState === newState) return;
    
    const timeline = gsap.timeline({
      onComplete: () => {
        this.currentState = newState;
        this.onStateEnter(newState);
      }
    });
    
    // Fade out current scene
    timeline.to(this.currentScene, {
      opacity: 0,
      duration: 1
    });
    
    // Load new scene
    timeline.call(() => {
      this.loadScene(newState);
    });
    
    // Fade in new scene
    timeline.to(this.newScene, {
      opacity: 1,
      duration: 1
    });
  }
}
```

#### 5. Advanced Lighting Setup
**Multi-Light System:**
```javascript
class AdvancedLighting {
  constructor() {
    this.setupEnvironment();
    this.setupKeyLight();
    this.setupRimLight();
    this.setupAccentLights();
  }

  setupEnvironment() {
    // HDRI environment map
    const loader = new THREE.EXRLoader();
    loader.load('environment.exr', (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.encoding = THREE.LinearEncoding;
      this.scene.environment = texture;
    });
  }

  setupKeyLight() {
    // Main directional light with soft shadow
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(5, 10, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 50;
    keyLight.shadow.camera.left = -10;
    keyLight.shadow.camera.right = 10;
    keyLight.shadow.camera.top = 10;
    keyLight.shadow.camera.bottom = -10;
    keyLight.shadow.bias = -0.0001;
    this.scene.add(keyLight);
  }
}
```

### Performance Techniques
- **Occlusion Culling:** Hide objects behind others
- **LOD Optimization:** Multiple detail levels
- **Frustum Culling:** Only render visible objects
- **GPU Acceleration:** Shader-based effects

---

## Igloo: Deep Dive

### Overview
Premium 3D experiences with physically-based rendering, advanced post-processing, and cinematic visual quality.

### Key Technical Features

#### 1. Physically-Based Rendering (PBR)
**PBR Material Implementation:**
```javascript
class PBRMaterialSystem {
  createMaterial(config) {
    const material = new THREE.MeshStandardMaterial({
      // Color and opacity
      color: config.color || 0xffffff,
      opacity: config.opacity || 1,
      transparent: config.transparent || false,
      
      // Metalness and roughness (PBR properties)
      metalness: config.metalness || 0.5,
      roughness: config.roughness || 0.5,
      
      // Maps
      map: config.colorMap,
      normalMap: config.normalMap,
      roughnessMap: config.roughnessMap,
      metalnessMap: config.metalnessMap,
      aoMap: config.aoMap,
      emissiveMap: config.emissiveMap,
      
      // Environment
      envMap: this.scene.environment,
      envMapIntensity: config.envIntensity || 1.0,
      
      // Advanced settings
      flatShading: false,
      vertexColors: false,
      premultipliedAlpha: false
    });
    
    return material;
  }
}
```

**Material Properties Explained:**
- **Metalness (0-1):** How metallic the surface appears
- **Roughness (0-1):** Surface smoothness (0 = mirror, 1 = diffuse)
- **Environment Maps:** Reflections from HDR environment
- **Normal Maps:** Surface detail without geometry
- **Ambient Occlusion:** Realistic shadowing in creases

#### 2. Post-Processing Pipeline
**Comprehensive Effect Stack:**
```javascript
import {
  EffectComposer,
  RenderPass,
  UnrealBloomPass,
  ShaderPass,
  FilmPass,
  ChromaticAberrationPass,
  VignettePass,
  DOFPass
} from 'three/examples/jsm/postprocessing/EffectComposer';

class PostProcessingPipeline {
  constructor(renderer, scene, camera) {
    this.composer = new EffectComposer(renderer);
    
    // 1. Base render pass
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);
    
    // 2. Bloom effect for emissive materials
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.0,   // strength
      0.4,   // radius
      0.85   // threshold
    );
    bloomPass.threshold = 0.85;
    bloomPass.strength = 1.0;
    bloomPass.radius = 0.4;
    this.composer.addPass(bloomPass);
    
    // 3. Chromatic aberration
    const chromaticAberration = new ChromaticAberrationPass();
    chromaticAberration.uniforms['offset'].value = 0.0005;
    this.composer.addPass(chromaticAberration);
    
    // 4. Film grain
    const filmPass = new FilmPass({
      noiseIntensity: 0.35,
      scanlinesIntensity: 0.025,
      scanlinesCount: 648,
      grayscale: false
    });
    this.composer.addPass(filmPass);
    
    // 5. Depth of field
    const dofPass = new DOFPass();
    dofPass.renderToScreen = true;
    this.composer.addPass(dofPass);
    
    // 6. Color grading (custom LUT)
    const colorGradingPass = new ShaderPass(ColorGradingShader);
    colorGradingPass.uniforms.lutTexture.value = this.lutTexture;
    colorGradingPass.uniforms.intensity.value = 1.0;
    this.composer.addPass(colorGradingPass);
    
    // 7. Vignette
    const vignettePass = new VignettePass();
    vignettePass.uniforms['offset'].value = 0.96;
    vignettePass.uniforms['darkness'].value = 1.3;
    this.composer.addPass(vignettePass);
  }

  render() {
    this.composer.render();
  }
}
```

#### 3. HDR Environment Mapping
**HDR Skybox Setup:**
```javascript
class HDREnvironment {
  constructor(renderer) {
    this.renderer = renderer;
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();
    
    this.loadEnvironment();
  }

  async loadEnvironment() {
    const loader = new THREE.EXRLoader(); // or RGBELoader
    
    const texture = await loader.load('skybox.exr');
    texture.mapping = THREE.EquirectangularReflectionMapping;
    
    // Generate environment map with proper encoding
    const envMap = this.pmremGenerator.fromEquirectangular(texture);
    envMap.texture.encoding = THREE.LinearEncoding;
    
    // Set as scene environment
    this.scene.environment = envMap.texture;
    
    // Also use for skybox
    this.createSkybox(texture);
  }

  createSkybox(texture) {
    const geometry = new THREE.SphereGeometry(100, 64, 64);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      toneMapped: false // Important for HDR
    });
    const skybox = new THREE.Mesh(geometry, material);
    this.scene.add(skybox);
  }
}
```

#### 4. Advanced Shadow Techniques
**Soft Shadow Implementation:**
```javascript
class SoftShadowSystem {
  setupShadows() {
    // Directional light with soft shadows
    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(10, 10, 10);
    
    // Configure for soft shadows
    light.shadow.camera.left = -20;
    light.shadow.camera.right = 20;
    light.shadow.camera.top = 20;
    light.shadow.camera.bottom = -20;
    
    light.shadow.mapSize.width = 4096; // High quality
    light.shadow.mapSize.height = 4096;
    
    light.shadow.radius = 10; // Soft shadow radius
    light.shadow.bias = -0.0001;
    
    // Use Percentage-Closer Softening
    light.shadow.normalBias = 0.02;
    
    this.scene.add(light);
    
    // Enable shadows
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
}
```

#### 5. Real-Time Reflections
**Reflection System:**
```javascript
class ReflectionSystem {
  constructor(renderer, scene) {
    this.renderer = renderer;
    this.scene = scene;
    this.reflectionMapSize = 512;
    
    this.setupReflectionMap();
  }

  setupReflectionMap() {
    const rt = new THREE.WebGLCubeRenderTarget(this.reflectionMapSize);
    rt.texture.format = THREE.RGBFormat;
    rt.texture.generateMipmaps = true;
    rt.texture.minFilter = THREE.LinearMipmapLinearFilter;
    
    this.reflectionMap = rt;
  }

  updateReflections(object, camera) {
    // Render scene from object's perspective
    const oldPosition = camera.position.clone();
    
    // Calculate reflection position
    const normal = object.normal.clone();
    const viewDirection = camera.position.clone().sub(object.position).normalize();
    const reflectDirection = viewDirection.reflect(normal);
    
    camera.position.copy(reflectDirection.multiplyScalar(10));
    camera.lookAt(object.position);
    
    // Render to cube map
    this.renderer.setRenderTarget(this.reflectionMap);
    this.renderer.render(this.scene, camera);
    
    // Restore camera
    camera.position.copy(oldPosition);
    
    // Apply to material
    object.material.envMap = this.reflectionMap.texture;
    object.material.needsUpdate = true;
  }
}
```

### Performance Techniques
- **Instance Rendering:** Multiple objects with single draw call
- **Material Sharing:** Reuse materials across objects
- **Texture Compression:** KTX2/BC7 compression for textures
- **LOD System:** Level of detail based on distance
- **Frustum Culling:** Only render visible objects

---

## Common Patterns Across All Sites

### 1. Smooth Scrolling Integration
**Pattern:**
- Horizontal scroll for timeline navigation
- Scroll position drives camera movement
- Smooth interpolation prevents jitter
- Parallax effects create depth

### 2. Progressive Enhancement
**Approach:**
- Start with basic functionality
- Enhance with advanced features
- Graceful degradation for older devices
- Performance budgets maintained

### 3. Narrative Structure
**Common Elements:**
- Clear beginning, middle, end
- Transitional moments between sections
- Visual storytelling through camera movement
- Data visualization when appropriate

### 4. Performance Optimization
**Strategies:**
- Lazy loading of assets
- Object pooling
- Efficient rendering techniques
- Balanced quality and performance

---

## Implementation Recommendations

### For Getty-Style Timeline
1. **Implement horizontal scroll system**
2. **Create camera path system**
3. **Add progressive content disclosure**
4. **Build timeline marker system**
5. **Integrate data visualization**

### For Hatom-Style Effects
1. **Custom shader development**
2. **Lottie integration**
3. **Custom cursor system**
4. **Advanced lighting setup**
5. **Multi-stage transitions**

### For Igloo-Style Quality
1. **PBR material implementation**
2. **Advanced post-processing pipeline**
3. **HDR environment setup**
4. **Soft shadow system**
5. **Real-time reflections**

---

## Technical Stack Recommendations

### Libraries
- **Locomotive Scroll:** Horizontal scroll and parallax
- **GSAP:** Animation and timeline control
- **Three.js:** 3D rendering
- **Post-Processing:** Advanced visual effects
- **GLSL Shaders:** Custom effects

### Tools
- **Blender:** 3D modeling
- **Substance Painter:** PBR textures
- **HDRi Haven:** Environment maps
- **Three.js Editor:** Scene setup

---

## Conclusion

These premium experiences demonstrate that exceptional 3D web experiences require:
1. **Sophisticated camera choreography**
2. **Performance-conscious implementation**
3. **Advanced visual effects**
4. **Smooth user interactions**
5. **Balanced quality and performance**

By studying and implementing these techniques incrementally, you can create a world-class timeline experience that matches the quality of these reference sites.
