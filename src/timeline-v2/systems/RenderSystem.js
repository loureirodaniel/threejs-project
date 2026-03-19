/**
 * RenderSystem - Handles ALL visual updates for timeline
 *
 * Replaces:
 * - TimelineImageManager.js
 * - TimelineEffects.js
 * - Parts of TimelineScene.js
 *
 * Responsibilities:
 * 1. Update image positions based on timelineOffset
 * 2. Apply vignette effect (opacity + scale)
 * 3. Manage visibility culling (hide off-screen images)
 * 4. Handle image enlargement animations
 * 5. Coordinate with effects (liquid distortion, blur)
 *
 * @module timeline-v2/systems
 */

import * as THREE from 'three';
import { gsap } from 'gsap';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RippleAnimation } from './RippleAnimation.js';
import * as TimelineUtils from '../utils/TimelineUtils.js';
import { EFFECTS_CONFIG, SCENE_CONFIG, TIMELINE_CONFIG, TIMELINE_LAYOUT_CONFIG, IMAGE_ASPECT_RATIO, SLOT_1_WIDTH_PX, SLOT_1_HEIGHT_PX, SLOT_1_TOP_PX, getTimelineLayoutSlot, getSceneMargins } from '../utils/TimelineConstants.js';
import { GlitchShader } from '../../shaders/GlitchShader.js';
import { UIManager } from '../../ui/UIManager.js';
import { LayoutEngine } from '../utils/LayoutEngine.js';

const DreamFogShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uIntensity: { value: 0.12 },
    uDensity: { value: 0.08 },
    uNoiseScale: { value: 1.8 },
    uNoiseSpeed: { value: 0.12 },
    uBoost: { value: 0 },
    uFogColor: { value: new THREE.Color(0xc9d6ff) },
    uResolution: { value: new THREE.Vector2(1, 1) }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uIntensity;
    uniform float uDensity;
    uniform float uNoiseScale;
    uniform float uNoiseSpeed;
    uniform float uBoost;
    uniform vec3 uFogColor;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float valueNoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      float a = hash(i + vec2(0.0, 0.0));
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    void main() {
      vec4 base = texture2D(tDiffuse, vUv);
      vec2 centered = vUv - 0.5;
      float radial = 1.0 - smoothstep(0.2, 0.85, length(centered));
      float vertical = smoothstep(0.0, 1.0, 1.0 - vUv.y);
      float animatedNoise = valueNoise(vUv * max(uNoiseScale, 0.001) + vec2(uTime * uNoiseSpeed, uTime * uNoiseSpeed * 0.6));
      float fogShape = (vertical * 0.7 + radial * 0.3);
      float fogAmount = max(0.0, uDensity * fogShape * (0.75 + animatedNoise * 0.5));
      float dreamBoost = 1.0 + (uBoost * 1.4);
      float fogMix = clamp(fogAmount * uIntensity * dreamBoost, 0.0, 0.75);
      vec3 dreamColor = mix(base.rgb, uFogColor, fogMix);
      gl_FragColor = vec4(dreamColor, base.a);
    }
  `
};

class RenderSystem {
  constructor(state, eventBus, timelineScene, effects = {}) {
    this.state = state;
    this.eventBus = eventBus;
    this.timelineScene = timelineScene;
    this.effects = effects; // { vignetteEffect, backgroundBlurEffect }

    // Render state
    this.lastVignetteUpdate = 0;
    this.vignetteUpdateThrottle = 16; // ~60fps

    // Image enlargement state
    this.enlargedImage = null;
    this.originalImageState = null;
    this.enlargeAnimation = null;

    // One reusable raycaster + vector (avoid allocations on each click)
    this.raycaster = new THREE.Raycaster();
    this.mouseNDC = new THREE.Vector2();
    this._hoveredPlane = null;
    this._onMouseMove = this._onMouseMove.bind(this);
    this.paused = false;
    this.uiManager = new UIManager();
    this.layoutEngine = new LayoutEngine();
    // imageDetailController is set by TimelineController after construction
    this.imageDetailController = null;
    this._glitchTimeStep = 0.016;
    this._dreamEffectConfig = {
      enabled: true,
      fogEnabled: true,
      bloomStrength: 0.22,
      bloomRadius: 0.48,
      bloomThreshold: 0.76,
      fogDensity: 0.08,
      fogIntensity: 0.14,
      fogNoiseScale: 1.8,
      fogNoiseSpeed: 0.12,
      fogColor: '#c9d6ff',
      clickBoost: 0.55,
      decayDuration: 1.8
    };
    this._dreamBoost = 0;
    this._dreamTargetBoost = 0;
    this._dreamLastFrameTime = 0;
    const app = typeof window !== 'undefined' ? (window.app || {}) : {};
    this.camera = app.camera;

    // Initialize expand animation system
    this.rippleAnimation = new RippleAnimation(
      this.camera,
      () => this.renderer || window.app?.renderer,
      () => this.scene || window.app?.scene
    );

    this.unsubscribeFns = [];
    this.init();
  }

  init() {
    // Subscribe to state changes
    this.unsubscribeFns.push(
      this.state.subscribe('timelineOffset', this.onOffsetChange.bind(this)),
      this.state.subscribe('isImageEnlarged', this.onImageEnlargedChange.bind(this)),
      this.state.subscribe('isDragging', this.onDraggingChange.bind(this))
    );

    // Subscribe to events owned by RenderSystem
    this.unsubscribeFns.push(
      this.eventBus.on('timeline:snap:complete', this.onSnapComplete.bind(this)),
      this.eventBus.on('timeline:pause', () => {
        this.paused = true;
        console.log('⏸️ Timeline rendering paused');
      }),
      this.eventBus.on('timeline:resume', () => {
        this.paused = false;
        this.fadeOutDreamEffect();
        // stopDetailRenderLoop is now owned by ImageDetailController which also
        // listens for timeline:resume; RenderSystem only handles its own paused flag.
        this.showTimelineUI();
        console.log('👁️ Title and year visible again');
        console.log('▶️ Timeline rendering resumed');
      })
    );
    // timeline:click and timeline:image:close are handled by ImageDetailController

    window.addEventListener('mousemove', this._onMouseMove, { passive: true });

    console.log('RenderSystem initialized');
  }

  /**
   * Main render update - called every frame
   */
  update(deltaTime) {
    this.imagePlanes = this.imagePlanes || window.app?.imagePlanes;

    // CRITICAL: Restore fullscreen planes if they've been moved
    this.imagePlanes?.planes?.forEach(plane => {
      if (plane.userData.isFullscreen && plane.userData.isFrozen) {
        const targetScale = plane.userData.fullscreenScale;
        const targetPosition = plane.userData.fullscreenPosition;
        
        if (targetScale && targetPosition) {
          // Check if plane has been moved from fullscreen
          const scaleDiff = Math.abs(plane.scale.x - targetScale.x);
          const posDiff = Math.abs(plane.position.x - targetPosition.x);
          
          if (scaleDiff > 0.01 || posDiff > 0.01) {
            console.warn('🚨 Fullscreen plane was moved! Restoring...', {
              currentScale: plane.scale.x.toFixed(2),
              targetScale: targetScale.x.toFixed(2),
              currentPos: plane.position.x.toFixed(2),
              targetPos: targetPosition.x.toFixed(2)
            });
            
            // Force restore fullscreen transform
            plane.scale.copy(targetScale);
            plane.position.copy(targetPosition);
          }
        }
      }
    });

    if (this.paused) {
      // Still render the fullscreen plane when paused
      this.render();
      return; // Skip timeline updates but NOT rendering
    }
    void deltaTime;

    const { timelineOffset, currentSceneIndex } = this.state.getState();

    // Only update if on timeline scene
    if (currentSceneIndex !== 1) return;

    // Update image positions based on offset
    this.updateImagePositions(timelineOffset, deltaTime);

    // Drive only the column-guide dividers from the Three.js RAF so they always
    // read freshly-updated plane positions/scales. Card text layout (which calls
    // getBoundingClientRect) stays in the EventsPanel's own RAF to avoid a
    // double forced-layout cycle that would misplace the second image's card.
    window.app?.eventsPanel?.syncDividers?.();

    // Update vignette (throttled)
    const now = Date.now();
    if (now - this.lastVignetteUpdate >= this.vignetteUpdateThrottle) {
      this.updateVignette(timelineOffset);
      this.lastVignetteUpdate = now;
    }
  }

  render() {
    this.renderer = this.renderer || window.app?.renderer;
    this.scene = this.scene || window.app?.scene;
    this.camera = this.camera || window.app?.camera;
    this.imagePlanes = this.imagePlanes || window.app?.imagePlanes;

    if (!this.renderer || !this.scene || !this.camera) {
      console.error('❌ Missing renderer/scene/camera:', {
        renderer: !!this.renderer,
        scene: !!this.scene,
        camera: !!this.camera
      });
      return;
    }

    // Init composer once all three are ready
    if (!this._composer && this.renderer && this.scene && this.camera) {
      this.initComposer(this.renderer, this.scene, this.camera);
    }

    const _animatingPlane = this.imageDetailController?.currentAnimatingPlane;
    const fullscreenPlane = _animatingPlane?.userData?.isFullscreen
      ? _animatingPlane
      : null;

    if (fullscreenPlane) {
      fullscreenPlane.visible = true;
      fullscreenPlane.renderOrder = 10000;
      fullscreenPlane.frustumCulled = false;

      if (fullscreenPlane.material) {
        fullscreenPlane.material.opacity = 1.0;
        fullscreenPlane.material.transparent = true;
        fullscreenPlane.material.depthTest = false;
        fullscreenPlane.material.depthWrite = false;
      }

      this.renderer.setClearColor(0x000000, 1);
    } else {
      this.renderer.setClearColor(0x000000, 0);
    }

    if (this._composer) {
      this.updateDreamEffectState();
      this._glitchPass.uniforms.uTime.value += this._glitchTimeStep;
      this.updateGlitchFocusMask();
      this._composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  updateDreamEffectState() {
    const now = performance.now();
    if (!this._dreamLastFrameTime) {
      this._dreamLastFrameTime = now;
    }
    const deltaSeconds = Math.max(0.001, (now - this._dreamLastFrameTime) / 1000);
    this._dreamLastFrameTime = now;

    const decayDuration = Math.max(0.1, this._dreamEffectConfig.decayDuration || 1.8);
    const decayStep = deltaSeconds / decayDuration;
    this._dreamTargetBoost = Math.max(0, this._dreamTargetBoost - decayStep);
    this._dreamBoost = THREE.MathUtils.lerp(this._dreamBoost, this._dreamTargetBoost, Math.min(1, deltaSeconds * 7));

    if (this._bloomPass) {
      this._bloomPass.strength = this._dreamEffectConfig.enabled
        ? this._dreamEffectConfig.bloomStrength + (this._dreamBoost * this._dreamEffectConfig.clickBoost)
        : 0;
    }

    if (this._dreamFogPass?.uniforms) {
      this._dreamFogPass.uniforms.uTime.value += deltaSeconds;
      this._dreamFogPass.uniforms.uBoost.value = this._dreamEffectConfig.enabled ? this._dreamBoost : 0;
      this._dreamFogPass.uniforms.uIntensity.value = (this._dreamEffectConfig.enabled && this._dreamEffectConfig.fogEnabled)
        ? this._dreamEffectConfig.fogIntensity
        : 0;
    }
  }

  initComposer(renderer, scene, camera) {
    if (this._composer) return; // already initialized
    this._composer = new EffectComposer(renderer);
    this._renderPass = new RenderPass(scene, camera);
    this._composer.addPass(this._renderPass);
    this._bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this._dreamEffectConfig.bloomStrength,
      this._dreamEffectConfig.bloomRadius,
      this._dreamEffectConfig.bloomThreshold
    );
    this._composer.addPass(this._bloomPass);
    this._dreamFogPass = new ShaderPass(DreamFogShader);
    this._dreamFogPass.uniforms.uDensity.value = this._dreamEffectConfig.fogDensity;
    this._dreamFogPass.uniforms.uIntensity.value = this._dreamEffectConfig.fogIntensity;
    this._dreamFogPass.uniforms.uNoiseScale.value = this._dreamEffectConfig.fogNoiseScale;
    this._dreamFogPass.uniforms.uNoiseSpeed.value = this._dreamEffectConfig.fogNoiseSpeed;
    this._dreamFogPass.uniforms.uFogColor.value.set(this._dreamEffectConfig.fogColor);
    this._dreamFogPass.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    this._composer.addPass(this._dreamFogPass);
    this._glitchPass = new ShaderPass(GlitchShader);
    this._glitchPass.uniforms.uGlitchIntensity.value = 0;
    this._glitchPass.uniforms.uResolution.value.x = window.innerWidth;
    this._glitchPass.uniforms.uResolution.value.y = window.innerHeight;
    this._composer.addPass(this._glitchPass);
    this._composer.setSize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', () => {
      this._composer?.setSize(window.innerWidth, window.innerHeight);
      if (this._bloomPass?.setSize) {
        this._bloomPass.setSize(window.innerWidth, window.innerHeight);
      }
      if (this._dreamFogPass?.uniforms?.uResolution?.value) {
        this._dreamFogPass.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
      }
      if (this._glitchPass?.uniforms?.uResolution?.value) {
        this._glitchPass.uniforms.uResolution.value.x = window.innerWidth;
        this._glitchPass.uniforms.uResolution.value.y = window.innerHeight;
      }
    });
  }

  setGlitchIntensity(value) {
    if (this._glitchPass) {
      this._glitchPass.uniforms.uGlitchIntensity.value = Math.max(0, Math.min(1, value));
    }
  }

  /**
   * Compute the screen-space UV bounding box of the focused (centered) image
   * and upload it to the glitch shader so that region is protected from glitch.
   */
  updateGlitchFocusMask() {
    if (!this._glitchPass) return;

    const camera = this.camera || window.app?.camera;
    const allPlanes = window.app?.imagePlanes?.planes;
    if (!camera || !allPlanes || allPlanes.length === 0) {
      this._glitchPass.uniforms.uFocusRect.value = { x: -1, y: -1, z: -1, w: -1 };
      return;
    }

    // Find the plane closest to center X (the focused image)
    let closestPlane = null;
    let closestDist = Infinity;
    for (const plane of allPlanes) {
      if (!plane.visible) continue;
      if (plane.userData?.isFullscreen) continue;
      const dist = Math.abs(plane.position.x);
      if (dist < closestDist) {
        closestDist = dist;
        closestPlane = plane;
      }
    }

    if (!closestPlane) {
      this._glitchPass.uniforms.uFocusRect.value = { x: -1, y: -1, z: -1, w: -1 };
      return;
    }

    // Project the plane's four corners into NDC, then convert to UV (0–1).
    const geom = closestPlane.geometry;
    const halfW = (geom?.parameters?.width ?? 2.5) / 2;
    const halfH = (geom?.parameters?.height ?? (2.5 * (IMAGE_ASPECT_RATIO || 1.5))) / 2;

    const corners = [
      new THREE.Vector3(-halfW, -halfH, 0),
      new THREE.Vector3( halfW, -halfH, 0),
      new THREE.Vector3( halfW,  halfH, 0),
      new THREE.Vector3(-halfW,  halfH, 0)
    ];

    let minU = 1, maxU = 0, minV = 1, maxV = 0;
    closestPlane.updateMatrixWorld(true);

    for (const corner of corners) {
      const world = corner.applyMatrix4(closestPlane.matrixWorld);
      const ndc = world.project(camera);
      const u = (ndc.x * 0.5) + 0.5;
      const v = (ndc.y * 0.5) + 0.5;
      minU = Math.min(minU, u);
      maxU = Math.max(maxU, u);
      minV = Math.min(minV, v);
      maxV = Math.max(maxV, v);
    }

    this._glitchPass.uniforms.uFocusRect.value = { x: minU, y: minV, z: maxU, w: maxV };
  }

  setGlitchTimeStep(value) {
    if (Number.isFinite(value)) {
      this._glitchTimeStep = Math.max(0.001, Math.min(0.1, value));
    }
  }

  setDreamEffectEnabled(enabled) {
    this._dreamEffectConfig.enabled = Boolean(enabled);
    if (!this._dreamEffectConfig.enabled) {
      this._dreamBoost = 0;
      this._dreamTargetBoost = 0;
    }
  }

  setDreamBloomSettings({ strength, radius, threshold } = {}) {
    if (Number.isFinite(strength)) {
      this._dreamEffectConfig.bloomStrength = Math.max(0, Math.min(2, strength));
    }
    if (Number.isFinite(radius)) {
      this._dreamEffectConfig.bloomRadius = Math.max(0, Math.min(1, radius));
    }
    if (Number.isFinite(threshold)) {
      this._dreamEffectConfig.bloomThreshold = Math.max(0, Math.min(1.5, threshold));
    }
    if (this._bloomPass) {
      this._bloomPass.radius = this._dreamEffectConfig.bloomRadius;
      this._bloomPass.threshold = this._dreamEffectConfig.bloomThreshold;
      this._bloomPass.strength = this._dreamEffectConfig.enabled ? this._dreamEffectConfig.bloomStrength : 0;
    }
  }

  setDreamFogSettings({ enabled, density, intensity, noiseScale, noiseSpeed, color } = {}) {
    if (typeof enabled === 'boolean') {
      this._dreamEffectConfig.fogEnabled = enabled;
    }
    if (Number.isFinite(density)) {
      this._dreamEffectConfig.fogDensity = Math.max(0, Math.min(1, density));
    }
    if (Number.isFinite(intensity)) {
      this._dreamEffectConfig.fogIntensity = Math.max(0, Math.min(1, intensity));
    }
    if (Number.isFinite(noiseScale)) {
      this._dreamEffectConfig.fogNoiseScale = Math.max(0.1, Math.min(8, noiseScale));
    }
    if (Number.isFinite(noiseSpeed)) {
      this._dreamEffectConfig.fogNoiseSpeed = Math.max(0, Math.min(2, noiseSpeed));
    }
    if (typeof color === 'string' && color.length > 0) {
      this._dreamEffectConfig.fogColor = color;
    }
    if (this._dreamFogPass?.uniforms) {
      this._dreamFogPass.uniforms.uDensity.value = this._dreamEffectConfig.fogDensity;
      this._dreamFogPass.uniforms.uIntensity.value = (this._dreamEffectConfig.enabled && this._dreamEffectConfig.fogEnabled)
        ? this._dreamEffectConfig.fogIntensity
        : 0;
      this._dreamFogPass.uniforms.uNoiseScale.value = this._dreamEffectConfig.fogNoiseScale;
      this._dreamFogPass.uniforms.uNoiseSpeed.value = this._dreamEffectConfig.fogNoiseSpeed;
      this._dreamFogPass.uniforms.uFogColor.value.set(this._dreamEffectConfig.fogColor);
    }
  }

  setDreamTriggerSettings({ clickBoost, decayDuration } = {}) {
    if (Number.isFinite(clickBoost)) {
      this._dreamEffectConfig.clickBoost = Math.max(0, Math.min(1.5, clickBoost));
    }
    if (Number.isFinite(decayDuration)) {
      this._dreamEffectConfig.decayDuration = Math.max(0.1, Math.min(6, decayDuration));
    }
  }

  setDreamEffectSettings(config = {}) {
    this.setDreamEffectEnabled(config.enabled ?? this._dreamEffectConfig.enabled);
    this.setDreamBloomSettings({
      strength: config.bloomStrength,
      radius: config.bloomRadius,
      threshold: config.bloomThreshold
    });
    this.setDreamFogSettings({
      enabled: config.fogEnabled,
      density: config.fogDensity,
      intensity: config.fogIntensity,
      noiseScale: config.fogNoiseScale,
      noiseSpeed: config.fogNoiseSpeed,
      color: config.fogColor
    });
    this.setDreamTriggerSettings({
      clickBoost: config.clickBoost,
      decayDuration: config.decayDuration
    });
  }

  triggerDreamEffect() {
    if (!this._dreamEffectConfig.enabled) return;
    this._dreamTargetBoost = Math.min(1, this._dreamTargetBoost + this._dreamEffectConfig.clickBoost);
    this._dreamBoost = Math.max(this._dreamBoost, this._dreamTargetBoost * 0.6);
  }

  fadeOutDreamEffect() {
    this._dreamTargetBoost = 0;
  }

  /** @deprecated delegate to ImageDetailController */
  startDetailRenderLoop() {
    this.imageDetailController?.startDetailRenderLoop();
  }

  /** @deprecated delegate to ImageDetailController */
  stopDetailRenderLoop() {
    this.imageDetailController?.stopDetailRenderLoop();
  }

  /**
   * Get timeline plane arrays used by this system.
   * @returns {{timelinePlanes: Array, transitionedPlanes: Array, allPlanes: Array}}
   */
  getPlaneCollections() {
    const allPlanes = window.app?.imagePlanes?.planes || [];
    // All planes are treated as a flat sequence — no split between
    // transitionedPlanes and timelinePlanes anymore.
    return {
      timelinePlanes: [],
      transitionedPlanes: allPlanes,
      allPlanes
    };
  }

  // ─── Layout methods — delegate to LayoutEngine ───────────────────────────────

  getViewportAnchorShift(allPlanes)                  { return this.layoutEngine.getViewportAnchorShift(allPlanes); }
  getVisibleWidthAtDepth(zDepth)                     { return this.layoutEngine.getVisibleWidthAtDepth(zDepth); }
  getSlotWidthPercentage(slotIndex)                  { return this.layoutEngine.getSlotWidthPercentage(slotIndex); }
  getConfiguredSlotWidthsPx()                        { return this.layoutEngine.getConfiguredSlotWidthsPx(); }
  getBaseSlotWidthPx(slotIndex)                      { return this.layoutEngine.getBaseSlotWidthPx(slotIndex); }
  getViewportResponsiveScaleFactor()                 { return this.layoutEngine.getViewportResponsiveScaleFactor(); }
  getSlotWidthPx(slotIndex)                          { return this.layoutEngine.getSlotWidthPx(slotIndex); }
  getColumnMetrics()                                 { return this.layoutEngine.getColumnMetrics(); }
  getDiscreteSlotCenterPx(relativeIndex)             { return this.layoutEngine.getDiscreteSlotCenterPx(relativeIndex); }
  getInterpolatedSlotCenterPx(relativeIndex)         { return this.layoutEngine.getInterpolatedSlotCenterPx(relativeIndex); }
  pixelXToWorldX(pixelX, zDepth)                     { return this.layoutEngine.pixelXToWorldX(pixelX, zDepth); }
  getSlotScaleForIndex(index, plane)                 { return this.layoutEngine.getSlotScaleForIndex(index, plane); }
  getDistanceScaleMultiplier(worldX)                 { return this.layoutEngine.getDistanceScaleMultiplier(worldX); }
  getSequenceScaleMultiplier(relativeIndex)          { return this.layoutEngine.getSequenceScaleMultiplier(relativeIndex); }
  getSlotYScaleCorrection(slotIndex)                 { return this.layoutEngine.getSlotYScaleCorrection(slotIndex); }
  getSlotIndexFromRelativeIndex(relativeIndex)       { return this.layoutEngine.getSlotIndexFromRelativeIndex(relativeIndex); }
  getAlternatingRowSlotIndex(index, slotWorldY = []) { return this.layoutEngine.getAlternatingRowSlotIndex(index, slotWorldY); }
  pixelYToWorldY(pixelY, zDepth, camera)             { return this.layoutEngine.pixelYToWorldY(pixelY, zDepth, camera); }
  getLayoutSlotWorldY(allPlanes)                     { return this.layoutEngine.getLayoutSlotWorldY(allPlanes); }

  /**
   * Update all image positions based on timeline offset.
   * Uses smooth interpolation between layout slot states (scale & z-depth)
   * and Lenis-style temporal lerping for a staggered, buttery transition.
   *
   * @param {number} offset - Current timeline offset
   * @param {number} [deltaTime] - Frame delta in seconds. When omitted or 0,
   *   positions/scales snap immediately (used during restoration).
   */
  updateImagePositions(offset, deltaTime) {
    const safeOffset = Number.isFinite(offset) ? offset : 0;
    const allPlanes = window.app?.imagePlanes?.planes || [];
    const dt = Number.isFinite(deltaTime) && deltaTime > 0 ? deltaTime : 0;

    const spacing = this.state.get('calculatedSpacing') || 1.8;
    const firstPosition = TIMELINE_CONFIG.FIRST_POSITION || -4.5;
    const progress = (safeOffset - firstPosition) / Math.max(0.0001, spacing);
    const cullDistance = 15;
    const slotWorldY = this.getLayoutSlotWorldY(allPlanes);

    const scaleLerpSpeed = EFFECTS_CONFIG.SCALE_LERP_SPEED ?? 6.0;
    const lerpFactor = dt > 0 ? (1 - Math.exp(-scaleLerpSpeed * dt)) : 1.0;

    // Pre-pass A: stamp every plane with its array index so push-source detection
    // is always reliable, regardless of how `planes` is accessed.
    for (let i = 0; i < allPlanes.length; i++) {
      if (allPlanes[i]) allPlanes[i].userData._timelineIndex = i;
    }

    // Pre-pass B: compute a fresh _hoverMult for every plane using the CURRENT
    // GSAP _hoverProgress tick (rather than last frame's stamped value).
    // This ensures pushSources below — and therefore each plane's pushX offset —
    // are derived from the same animation frame as the scale, eliminating the
    // 1-frame lag that caused the divider to trail behind the image right edge.
    for (let i = 0; i < allPlanes.length; i++) {
      const plane = allPlanes[i];
      if (!plane || plane.userData?.isFrozen || plane.userData?.animatingFromFullscreen || plane.userData?.isTransitioning) continue;
      const hovProgress = plane.userData._hoverProgress ?? 0;
      const prevSx = plane.userData._smoothScale || 1;
      if (hovProgress > 0.001 && prevSx > 0) {
        const mult = this._computeHoverScaleMultiplier(plane, prevSx);
        plane.userData._hoverMult = 1.0 + (mult - 1.0) * hovProgress;
      } else {
        plane.userData._hoverMult = 1.0;
      }
    }

    // Collect ALL planes that are currently expanding or collapsing as push sources.
    // Using multiple sources simultaneously prevents the jag when hover transitions
    // from plane A to plane A+1: A's collapsing push and A+1's expanding push both
    // contribute smoothly instead of A's contribution being dropped the moment
    // _hoveredPlane switches, causing A+1 to snap left before its own growth kicks in.
    // pushSources now uses the freshly-computed _hoverMult values from pre-pass B.
    const pushSources = [];
    for (let i = 0; i < allPlanes.length; i++) {
      const p = allPlanes[i];
      if (!p || !p.geometry?.parameters?.width) continue;
      const pMult = p.userData._hoverMult ?? 1;
      if (pMult <= 1.001) continue;
      const pSx = p.userData._smoothScale || 1;
      const pExtra = pSx * p.geometry.parameters.width * (pMult - 1.0);
      const pZ = p.userData._smoothZ ?? p.position.z ?? 0;
      const pVisW = Math.max(0.001, this.getVisibleWidthAtDepth(pZ));
      pushSources.push({ index: i, extraWorld: pExtra, visW: pVisW });
    }

    allPlanes.forEach((plane, index) => {
      if (!plane) return;
      if (plane.userData?.isFrozen || plane.userData?.animatingFromFullscreen || plane.userData?.isTransitioning) return;

      const relativeIndex = index - progress;
      const rowSlotIndex = this.getAlternatingRowSlotIndex(index, slotWorldY);
      const rowSlot = getTimelineLayoutSlot(rowSlotIndex);

      // Smoothstep interpolation between adjacent slot states so scale and
      // z-depth transition continuously instead of jumping at slot boundaries.
      const lowerRel = Math.floor(relativeIndex);
      const upperRel = lowerRel + 1;
      const fraction = relativeIndex - lowerRel;
      const smoothFraction = fraction * fraction * (3 - 2 * fraction);

      const lowerSlotIdx = ((lowerRel % 3) + 3) % 3;
      const upperSlotIdx = ((upperRel % 3) + 3) % 3;

      const lowerSlot = getTimelineLayoutSlot(lowerSlotIdx);
      const upperSlot = getTimelineLayoutSlot(upperSlotIdx);

      const interpScale = THREE.MathUtils.lerp(
        this.getSlotScaleForIndex(lowerSlotIdx, plane),
        this.getSlotScaleForIndex(upperSlotIdx, plane),
        smoothFraction
      );
      const interpZ = THREE.MathUtils.lerp(lowerSlot.z, upperSlot.z, smoothFraction);
      const interpYCorrection = THREE.MathUtils.lerp(
        this.getSlotYScaleCorrection(lowerSlotIdx),
        this.getSlotYScaleCorrection(upperSlotIdx),
        smoothFraction
      );

      // Temporal smoothing (frame-rate independent) for staggered feel
      if (plane.userData._smoothScale == null) plane.userData._smoothScale = interpScale;
      if (plane.userData._smoothZ == null) plane.userData._smoothZ = interpZ;
      if (plane.userData._smoothYCorrection == null) plane.userData._smoothYCorrection = interpYCorrection;

      plane.userData._smoothScale = THREE.MathUtils.lerp(plane.userData._smoothScale, interpScale, lerpFactor);
      plane.userData._smoothZ = THREE.MathUtils.lerp(plane.userData._smoothZ, interpZ, lerpFactor);
      plane.userData._smoothYCorrection = THREE.MathUtils.lerp(plane.userData._smoothYCorrection, interpYCorrection, lerpFactor);

      const targetCenterPx = this.getInterpolatedSlotCenterPx(relativeIndex);
      const targetWorldX = this.pixelXToWorldX(targetCenterPx, plane.userData._smoothZ, this.camera);

      // Push-right: accumulate contributions from every active push source.
      // Each source keeps its own left edge fixed (contributes extraWorld/2 to itself)
      // and pushes planes to its right by the full extra width (z-depth corrected).
      // Summing all sources lets a collapsing plane (A) and an expanding plane (A+1)
      // blend their forces simultaneously, eliminating the leftward snap when hover
      // transitions between adjacent images.
      const planeIdx = plane.userData._timelineIndex ?? index;
      let pushX = 0;
      if (pushSources.length > 0) {
        const targetZ = plane.userData._smoothZ ?? plane.position.z ?? 0;
        const targetVisW = Math.max(0.001, this.getVisibleWidthAtDepth(targetZ));
        for (const src of pushSources) {
          if (planeIdx === src.index) {
            // This plane is the source — shift right by half extra to keep left edge fixed.
            pushX += src.extraWorld / 2;
          } else if (planeIdx > src.index) {
            // Plane is right of this source — full z-corrected push.
            pushX += src.extraWorld * (targetVisW / src.visW);
          }
          // planeIdx < src.index → source never pushes planes to its left.
        }
      }

      plane.position.x = targetWorldX + pushX;
      plane.position.y = slotWorldY[rowSlotIndex] ?? rowSlot.y;
      plane.position.z = plane.userData._smoothZ;
      const sx = plane.userData._smoothScale;

      // GSAP-driven hover scale: _hoverProgress (0→1) is animated by _triggerHoverAnimation.
      // Left edge stays fixed because pushX shifts the plane right by half the extra width.
      const hovProgress = plane.userData._hoverProgress ?? 0;
      let hoverMult = 1.0;
      if (hovProgress > 0.001) {
        hoverMult = 1.0 + (this._computeHoverScaleMultiplier(plane, sx) - 1.0) * hovProgress;
      }
      plane.userData._hoverMult = hoverMult;
      const finalSx = sx * hoverMult;

      plane.scale.set(finalSx, finalSx * plane.userData._smoothYCorrection, finalSx);
      plane.visible = Math.abs(plane.position.x) < cullDistance;
    });
  }

  /**
   * Update vignette effect - highlight center, dim sides.
   * @param {number} _offset - Current timeline offset (kept for API parity)
   */
  updateVignette(_offset) {
    const { allPlanes } = this.getPlaneCollections();
    if (allPlanes.length === 0) return;

    const centerX = 0;
    const focusWidth = EFFECTS_CONFIG.VIGNETTE_FOCUS_WIDTH ?? EFFECTS_CONFIG.VIGNETTE_WIDTH ?? 2.0;
    const falloffWidth = EFFECTS_CONFIG.VIGNETTE_FALLOFF_WIDTH ?? 4.0;
    const minOpacity = EFFECTS_CONFIG.VIGNETTE_MIN_OPACITY ?? (1 - (EFFECTS_CONFIG.VIGNETTE_STRENGTH ?? 0.7));

    allPlanes.forEach((plane, index) => {
      if (!plane || !plane.visible || !plane.material) return;
      if (plane.userData?.isFrozen && plane.userData?.isFullscreen) return;

      const distance = Math.abs(plane.position.x - centerX);

      // Opacity falloff by distance from center
      let opacity;
      if (distance < focusWidth) {
        opacity = 1.0;
      } else {
        const fadeDistance = distance - focusWidth;
        const fadeFactor = Math.min(1.0, fadeDistance / Math.max(0.001, falloffWidth));
        opacity = 1.0 - fadeFactor * (1.0 - minOpacity);
      }

      plane.material.opacity = opacity;
      plane.material.transparent = true;
      plane.material.needsUpdate = true;

      // Scale is enforced in updateImagePositions (slot width + distance falloff).
    });
  }

  /**
   * Detect which timeline plane (if any) the mouse is over using raycasting.
   * Updates this._hoveredPlane so updateImagePositions can apply the hover scale.
   * @param {MouseEvent} event
   */
  _onMouseMove(event) {
    const camera = this.camera || window.app?.camera;
    if (!camera) return;

    if (this.state.get('currentSceneIndex') !== 1 || this.paused) {
      if (this._hoveredPlane) this._hoveredPlane = null;
      return;
    }

    const allPlanes = window.app?.imagePlanes?.planes || [];
    if (!allPlanes.length) return;

    const normalizedX = (event.clientX / window.innerWidth) * 2 - 1;
    const normalizedY = -(event.clientY / window.innerHeight) * 2 + 1;
    this.mouseNDC.set(normalizedX, normalizedY);
    this.raycaster.setFromCamera(this.mouseNDC, camera);

    const visiblePlanes = allPlanes.filter(p => p && p.visible && !p.userData?.isFrozen && !p.userData?.isTransitioning);
    const intersects = this.raycaster.intersectObjects(visiblePlanes, false);

    const newHovered = intersects.length > 0 ? intersects[0].object : null;
    if (newHovered !== this._hoveredPlane) {
      this._triggerHoverAnimation(this._hoveredPlane, newHovered);
      this._hoveredPlane = newHovered;
    }
  }

  /**
   * Fire GSAP tweens when the hovered plane changes.
   * - Hovered plane: _hoverProgress 0→1 over 1.5 s (power2.out) — controls left-to-right expansion.
   * - Neighbours: _pushWeight 0→1 with stagger delay based on distance so near planes react first.
   * - Un-hover collapses everything back smoothly.
   * @param {THREE.Mesh|null} oldPlane  Previously hovered plane (may be null)
   * @param {THREE.Mesh|null} newPlane  Newly hovered plane (may be null)
   */
  _triggerHoverAnimation(oldPlane, newPlane) {
    const allPlanes = window.app?.imagePlanes?.planes || [];

    // Stamp timeline indices so pushSourceIndex detection is reliable.
    allPlanes.forEach((p, i) => { if (p) p.userData._timelineIndex = i; });

    // ── Un-hover old plane ──────────────────────────────────────────────────
    if (oldPlane && oldPlane !== newPlane) {
      if (oldPlane.userData._hoverProgress == null) oldPlane.userData._hoverProgress = 1;
      gsap.killTweensOf(oldPlane.userData, '_hoverProgress');
      gsap.to(oldPlane.userData, {
        _hoverProgress: 0,
        duration: 0.85,
        ease: 'power2.inOut',
      });

      // Notify column components so they can update their CSS hover state
      const oldIndex = oldPlane.userData._timelineIndex;
      if (Number.isFinite(oldIndex)) {
        this.eventBus.emit('timeline:plane:hover', { planeIndex: oldIndex, isHovered: false });
      }
    }

    // ── Hover new plane ─────────────────────────────────────────────────────
    if (newPlane) {
      if (newPlane.userData._hoverProgress == null) newPlane.userData._hoverProgress = 0;
      gsap.killTweensOf(newPlane.userData, '_hoverProgress');
      gsap.to(newPlane.userData, {
        _hoverProgress: 1,
        duration: 1.5,
        ease: 'power2.out',
      });

      // Notify column components so they can update their CSS hover state
      const newIndex = newPlane.userData._timelineIndex;
      if (Number.isFinite(newIndex)) {
        this.eventBus.emit('timeline:plane:hover', { planeIndex: newIndex, isHovered: true });
      }
    }

    // Neighbours track pushExtraWorld directly (computed from _hoverMult each frame),
    // so they move in perfect sync with the hovered plane — no per-plane delay needed.
  }

  /**
   * Compute the scale multiplier needed to make a plane reach 65% of viewport
   * height, respecting the scene top/bottom margins.
   * @param {THREE.Mesh} plane
   * @param {number} baseSx - Current base scale of the plane
   * @returns {number} Multiplier to apply on top of baseSx
   */
  _computeHoverScaleMultiplier(plane, baseSx) {
    const camera = this.camera || window.app?.camera;
    if (!camera || !baseSx || !plane.geometry?.parameters?.width) return 1.0;

    const vh = Math.max(1, window.innerHeight);
    const vw = Math.max(1, window.innerWidth);
    const margins = getSceneMargins();
    const availableHeight = vh - margins.top - margins.bottom;
    // Cap at 50% of viewport; never exceed the padded area so the image stays
    // inside the top and bottom margins at all times.
    const expandedHeightPx = Math.min(0.50 * vh, availableHeight);
    // IMAGE_ASPECT_RATIO = height/width, so width = height / aspectRatio
    const expandedWidthPx = expandedHeightPx / IMAGE_ASPECT_RATIO;

    const zDepth = plane.userData._smoothZ ?? plane.position.z;
    const visibleWidth = this.getVisibleWidthAtDepth(zDepth);
    const unitsPerPixel = visibleWidth / vw;
    const targetWorldWidth = expandedWidthPx * unitsPerPixel;

    const geometryWidth = plane.geometry.parameters.width;
    const expandedScale = targetWorldWidth / Math.max(0.001, geometryWidth);

    return expandedScale / Math.max(0.001, baseSx);
  }

  /**
   * Handle timeline offset state updates.
   * @param {{newValue: number}} payload
   */
  onOffsetChange({ newValue }) {
    // Calculate current year based on dynamic spacing
    const currentOffset = this.state.get('timelineOffset');
    const calculatedSpacing = this.state.get('calculatedSpacing') || 1.8;
    const firstPosition = TIMELINE_CONFIG.FIRST_POSITION || -4.5;
    const startYear = 2010;
    const yearCount = TIMELINE_CONFIG.YEAR_COUNT || 10;

    // Calculate which year we're closest to
    const relativeOffset = currentOffset - firstPosition;
    const yearIndex = Math.round(relativeOffset / calculatedSpacing);
    const clampedIndex = Math.max(0, Math.min(yearIndex, yearCount - 1));
    const currentYear = startYear + clampedIndex;

    // Update state if year changed
    const previousYear = this.state.get('currentYear');
    if (currentYear !== previousYear) {
      this.state.setState({ currentYear });
      this.eventBus.emit('timeline:year:change', {
        year: currentYear,
        offset: currentOffset
      });
      console.log(`📅 Year changed to ${currentYear} (index ${clampedIndex})`);
    }
  }

  /**
   * Handle image enlarged state change.
   * @param {{newValue: boolean}} payload
   */
  onImageEnlargedChange({ newValue }) {
    if (!newValue) {
      this.effects.backgroundBlurEffect?.deactivate?.();
    }
  }

  /**
   * Handle dragging state change.
   * @param {{newValue: boolean}} payload
   */
  onDraggingChange({ newValue }) {
  }

  // ─── Backward-compat wrappers ─────────────────────────────────────────────
  // These methods are called by ImageDetailPage.js and internal code that
  // predates ImageDetailController.  They stay here so external call-sites
  // do not break; all logic lives in ImageDetailController.

  /**
   * Getter mirrors ImageDetailController.hiddenPlanes so ImageDetailPage.js
   * can still read/write renderSystem.hiddenPlanes.
   */
  get hiddenPlanes() { return this.imageDetailController?.hiddenPlanes; }
  set hiddenPlanes(v) { if (this.imageDetailController) this.imageDetailController.hiddenPlanes = v; }

  handleCloseButton() { this.imageDetailController?.handleCloseButton(); }
  closeDetailView(plane) { this.imageDetailController?.closeDetailView(plane); }

  // All image-click / detail / restore logic now lives in ImageDetailController.
  // Backward-compat wrappers (handleCloseButton, closeDetailView, hiddenPlanes)
  // are above this comment.

  /** @deprecated dead code — will be removed after validation */
  _deadOnTimelineClick(data) {
    console.log('🖱️ CLICK at screen:', data.clientX, data.clientY);
    
    try {
      const app = window.app;
      if (!app || !app.imagePlanes || !app.camera) {
        console.error('❌ Missing components');
        return;
      }
      
      const imagePlanes = app.imagePlanes;
      this.imagePlanes = imagePlanes;
      const planes = imagePlanes.planes || imagePlanes.getPlanes();
      const imageData = imagePlanes.imageData;
      const camera = app.camera;
      const detailPage = app.timelineController?.imageDetailPage;
      
      if (!planes || !imageData || !camera || !detailPage) {
        console.error('❌ Missing required data');
        return;
      }
      
      console.log(`✅ Checking ${planes.length} planes`);
      
      // Convert each plane's 3D position to screen coordinates
      const screenPositions = planes.map((plane, index) => {
        const vector = plane.position.clone();
        vector.project(camera);
        
        const widthHalf = window.innerWidth / 2;
        const heightHalf = window.innerHeight / 2;
        
        const screenX = (vector.x * widthHalf) + widthHalf;
        const screenY = -(vector.y * heightHalf) + heightHalf;
        
        // Calculate distance from click to plane center
        const distance = Math.sqrt(
          Math.pow(screenX - data.clientX, 2) + 
          Math.pow(screenY - data.clientY, 2)
        );
        
        return {
          index,
          plane,
          screenX,
          screenY,
          distance,
          imageData: imageData[index]
        };
      }).filter(Boolean);
      
      const clickRadius = Math.min(window.innerWidth, window.innerHeight) * 0.2; // 20% of shortest viewport dimension
      console.log(`🎯 Click radius: ${clickRadius.toFixed(0)}px, checking ${screenPositions.length} planes`);

      // Find closest plane within click radius
      const closest = screenPositions
        .filter(p => p.distance < clickRadius)
        .sort((a, b) => a.distance - b.distance)[0];
      
      if (closest) {
        console.log(`✅ Clicked image ${closest.index} (${closest.distance.toFixed(0)}px away)`);
        console.log(`   Image year: ${closest.imageData.year}`);
        this.triggerDreamEffect();

        // Notify column components so they can apply their CSS focus state
        this.eventBus.emit('timeline:plane:click', { planeIndex: closest.index });
        
        // Get current centered image index from state
        const currentIndex = this.state.get('currentImageIndex') || 0;
        const clickedIndex = closest.index;
        
        console.log(`📍 Current centered image: ${currentIndex}, clicked: ${clickedIndex}`);

        const startSeamlessHandoff = () => {
          const animatingPlane = closest.plane;
          const imageDataForDetail = closest.imageData;
          // Hide timeline overlay/dividers immediately so they do not bleed through
          // while the clicked image animates toward fullscreen.
          document.body.classList.add('detail-view-open', 'is-fullscreen');
          // FIRST: Pause systems so we store a clean, settled state.
          this.pauseTimelineSystems();

          requestAnimationFrame(() => {
            this.physicsSystem = app.timelineController?.physicsSystem || this.physicsSystem;

            // === SAVE TIMELINE STATE FOR RESTORATION ===
            console.log('💾 ========== SAVING TIMELINE STATE ==========');

            this.savedTimelineState = {
              physicsOffset: this.physicsSystem?.currentOffset || 0,
              physicsVelocity: this.physicsSystem?.velocity || 0,
              physicsEnabled: this.physicsSystem?.scrollEnabled !== false,
              cameraPosition: this.camera.position.clone(),
              cameraRotation: this.camera.rotation.clone(),
              planesState: this.imagePlanes.planes.map((plane, index) => ({
                index,
                position: plane.position.clone(),
                scale: plane.scale.clone(),
                rotation: plane.rotation.clone(),
                visible: plane.visible,
                renderOrder: plane.renderOrder,
                inScene: !!plane.parent
              }))
            };

            console.log('💾 SAVED:', {
              offset: this.savedTimelineState.physicsOffset.toFixed(2),
              planes: this.savedTimelineState.planesState.length,
              visible: this.savedTimelineState.planesState.filter((p) => p.visible).length
            });

            // Disable TitleScrollAnimation to prevent interference
            if (window.app?.timelineController?.titleScrollAnimation) {
              window.app.timelineController.titleScrollAnimation.disable?.();
              console.log('📝 TitleScrollAnimation disabled');
            }

            // THEN: Store complete timeline state for restoration
            this.timelineStateBeforeDetail = {
              cameraPosition: camera.position.clone(),
              cameraRotation: camera.rotation.clone(),
              physicsOffset: this.physicsSystem?.currentOffset || 0,
              physicsVelocity: 0,
              allPlanesState: this.imagePlanes?.planes?.map((p) => ({
                position: p.position.clone(),
                scale: p.scale.clone(),
                visible: p.visible,
                userData: { ...p.userData }
              }))
            };

            console.log('💾 Stored CLEAN timeline state', {
              cameraPos: this.timelineStateBeforeDetail.cameraPosition,
              physicsOffset: this.timelineStateBeforeDetail.physicsOffset,
              planesCount: this.timelineStateBeforeDetail.allPlanesState?.length
            });

            // STEP 1: Preload detail page (invisible) BEFORE animation starts
            console.log('🔧 Step 1: Preloading detail page');
            detailPage.open({
              plane: animatingPlane,
              imageData: imageDataForDetail,
              preload: true // Sets up DOM but keeps invisible
            });

            // STEP 2: Start 3D plane animation
            console.log('🎬 Step 2: Starting 3D plane animation');
            this.currentAnimatingPlane = animatingPlane;
            this.currentImageData = imageDataForDetail;

            const event = data;
            // Store click position
            const clickPos = { x: event.clientX, y: event.clientY };
            console.log('🖱️ Click position:', { x: event.clientX, y: event.clientY });

            // Store original transforms for restoration later
            animatingPlane.userData.originalScale = animatingPlane.scale.clone();
            animatingPlane.userData.originalPosition = animatingPlane.position.clone();

            console.log('💾 Stored original transforms:', {
              scale: animatingPlane.userData.originalScale,
              position: animatingPlane.userData.originalPosition
            });

            // NEW: Disable physics system to prevent interference
            if (this.physicsSystem) {
              this.physicsSystem.scrollEnabled = false;
              console.log('🔒 Physics system DISABLED for fullscreen animation');
            }

            // Start ripple animation
            this.rippleAnimation.animateToFullscreen(animatingPlane, clickPos, () => {
            console.log('🌊 Ripple animation complete, showing detail page');
            
            // PAUSE ENTIRE TIMELINE
            if (window.app?.timelineController) {
              window.app.timelineController.pauseTimeline();

              // Freeze camera
              if (window.app.timelineController.cameraSystem) {
                window.app.timelineController.cameraSystem.freezeCamera();
              }
            }

            // Disable canvas interactions
            if (window.app) {
              window.app.disableCanvasInteraction();
            }
            
            // Store hidden planes for restoration
            this.hiddenPlanes = [];
            this.fullscreenPlane = animatingPlane;  // Store reference

            // Remove all OTHER planes from scene (NOT the fullscreen one!)
            this.imagePlanes.planes.forEach(p => {
              if (p.uuid !== animatingPlane.uuid) {
                // Remove from scene completely
                if (p.parent) {
                  p.parent.remove(p);
                  this.hiddenPlanes.push(p);
                }
              } else {
                p.visible = true;
                p.renderOrder = 9999;
                console.log('👁️ Fullscreen plane render order:', p.renderOrder);
              }
            });

            // CRITICAL: Force render the fullscreen plane
            console.log('🔄 Forcing render after animation complete');
            this.render();

            // Start continuous rendering while detail page is open
            this.startDetailRenderLoop();

            // Save complete timeline configuration
            console.log('💾 ========== SAVING TIMELINE STATE ==========');

            this.savedTimelineConfig = {
              // Physics state
              physicsOffset: this.physicsSystem?.currentOffset || 0,
              physicsVelocity: this.physicsSystem?.velocity || 0,
              centeredImageIndex: this.physicsSystem?.centeredImageIndex || 0,

              // Camera state
              cameraPosition: this.camera.position.clone(),
              cameraRotation: this.camera.rotation.clone(),

              // EXACT plane positions and states
              planesConfig: this.imagePlanes?.planes?.map((p, i) => ({
                index: i,
                position: p.position.clone(),
                scale: p.scale.clone(),
                rotation: p.rotation.clone(),
                visible: p.visible,
                renderOrder: p.renderOrder,
                userData: { ...p.userData }
              })),

              // Timeline spacing configuration
              imageSpacing: this.physicsSystem?.imageSpacing || 4.5,
              scrollOffset: this.physicsSystem?.scrollOffset || 0
            };

            console.log('💾 SAVED CONFIG:', {
              physicsOffset: this.savedTimelineConfig.physicsOffset.toFixed(2),
              centeredImage: this.savedTimelineConfig.centeredImageIndex,
              plane0Pos: this.savedTimelineConfig.planesConfig?.[0]?.position?.x?.toFixed?.(2),
              plane1Pos: this.savedTimelineConfig.planesConfig?.[1]?.position?.x?.toFixed?.(2),
              plane2Pos: this.savedTimelineConfig.planesConfig?.[2]?.position?.x?.toFixed?.(2)
            });

            console.log('💾 ========================================');
            
            // Show detail page
            detailPage.open({
              plane: animatingPlane,
              imageData: this.currentImageData,
              reveal: true,
              showImageOnly: false,
              onDOMImageReady: () => {
                // Hide WebGL plane once DOM image takes over
                console.log('🔄 Hiding WebGL plane, DOM image taking over');
                animatingPlane.visible = false;
              }
            });
            this.hideTimelineUI();
            console.log('🙈 Title and year hidden via CSS class');
            console.log('📋 Body classes:', document.body.className);
            console.log('🎨 Using safe CSS-only approach');

            // Check if elements are actually hidden
            setTimeout(() => {
              const title = document.querySelector('h1');
              const year = document.querySelector('[class*="year"]');

              console.log('🔍 Title element:', {
                exists: !!title,
                text: title?.textContent.substring(0, 30),
                opacity: title ? window.getComputedStyle(title).opacity : 'N/A',
                visibility: title ? window.getComputedStyle(title).visibility : 'N/A'
              });

              console.log('🔍 Year element:', {
                exists: !!year,
                opacity: year ? window.getComputedStyle(year).opacity : 'N/A',
                visibility: year ? window.getComputedStyle(year).visibility : 'N/A'
              });
            }, 100);

            // Verify canvas is visible
            const canvas = this.renderer?.domElement;
            if (canvas) {
              console.log('🎨 Canvas state after detail opens:', {
                display: canvas.style.display || 'not set',
                visibility: canvas.style.visibility || 'not set',
                opacity: canvas.style.opacity || 'not set',
                width: canvas.width,
                height: canvas.height,
                inDOM: document.body.contains(canvas)
              });
              
              // Force canvas to be visible
              canvas.style.display = '';
              canvas.style.visibility = 'visible';
              canvas.style.opacity = '1';
              
              console.log('✅ Forced canvas to visible state');
            }
            });
          });

          // Optional: Listen for animation progress to hide plane earlier (more seamless)
          // Add this inside the animation timeline in ImageExpandAnimation.js
        };
        
        // Check if we need to snap to this image first
        if (clickedIndex !== currentIndex) {
          console.log(`📹 Image ${clickedIndex} is not centered, snapping camera first...`);
          
          // Calculate target offset for this image
          const calculatedSpacing = this.state.get('calculatedSpacing') || 4.194;
          const firstPosition = -4.5;
          const targetOffset = firstPosition + (clickedIndex * calculatedSpacing);
          
          console.log(`📹 Snapping to offset ${targetOffset.toFixed(2)}`);
          
          // Get PhysicsSystem for camera movement
          const physicsSystem = app.timelineController?.physicsSystem;
          
          if (physicsSystem && physicsSystem.snapToOffset) {
            // Snap camera to clicked image
            physicsSystem.snapToOffset(targetOffset, clickedIndex);
            
            // Wait 200ms for camera to reach image, then open detail page
            setTimeout(() => {
              console.log(`⏰ Camera snap complete, opening detail page for ${closest.imageData.year}`);
              startSeamlessHandoff();
            }, 500);
          } else {
            console.warn('⚠️ PhysicsSystem not available, opening without snap');
            startSeamlessHandoff();
          }
        } else {
          // Image is already centered, open immediately
          console.log(`✅ Image ${clickedIndex} is already centered, opening immediately`);
          startSeamlessHandoff();
        }
      } else {
        console.log('❌ No image within 150px of click');
        
        // Show distances for debugging
        const sorted = screenPositions.sort((a, b) => a.distance - b.distance);
        console.log('Closest 3 images:', sorted.slice(0, 3).map(p => ({
          index: p.index,
          year: p.imageData.year,
          distance: p.distance.toFixed(0) + 'px',
          screenPos: `(${p.screenX.toFixed(0)}, ${p.screenY.toFixed(0)})`
        })));
      }
      
    } catch (error) {
      console.error('❌ Error in onTimelineClick:', error);
    }
  }

  /**
   * Handle close request from InputSystem/UI.
   */
  _removedOnImageClose() {
    if (this.suppressNextImageCloseEvent) {
      this.suppressNextImageCloseEvent = false;
      return;
    }
    if (this.isHandlingImageClose) {
      return;
    }
    this.isHandlingImageClose = true;
    this.imagePlanes = this.imagePlanes || window.app?.imagePlanes;

    // Clear column focus state when detail view closes
    this.eventBus.emit('timeline:plane:focus:clear', {});

    console.log('🔴 ========== CLOSING DETAIL ==========');
    this.fadeOutDreamEffect();

    const fullscreenPlane =
      this.currentAnimatingPlane ||
      this.imagePlanes?.planes?.find((p) => p.userData.isFullscreen);

    if (!fullscreenPlane) {
      console.error('❌ No fullscreen plane');
      if (this.savedTimelineState) {
        console.log('🔄 No fullscreen plane; running direct restoration fallback');
        this.restoreCompleteTimelineState();
      }
      this.isHandlingImageClose = false;
      this.suppressNextImageCloseEvent = true;
      this.eventBus.emit('timeline:image:close');
      return;
    }

    const detailOverlay =
      document.querySelector('.detail-overlay') ||
      document.querySelector('.image-detail-page');

    if (detailOverlay) {
      detailOverlay.style.opacity = '0';
      detailOverlay.style.pointerEvents = 'none';
      setTimeout(() => {
        detailOverlay.style.display = 'none';
      }, 300);
    }
    this.unlockGlobalScrollLock();

    console.log('🌊 Starting reverse animation');

    this.rippleAnimation.animateFromFullscreen(fullscreenPlane, () => {
      console.log('✅ Reverse animation complete');
      this.currentAnimatingPlane = null;
      this.currentImageData = null;
      this.restoreCompleteTimelineState();
      this.isHandlingImageClose = false;
      this.suppressNextImageCloseEvent = true;
      this.eventBus.emit('timeline:image:close');
    });
  }

  _removedCloseDetailView(plane) {
    if (plane && !plane.userData?.isFullscreen) {
      console.log('⚠️ No fullscreen plane to close');
      return;
    }
    this._removedOnImageClose();
  }

  _removedHandleCloseButton() {
    this._removedOnImageClose();
  }

  _removedHandleDetailClose() {
    this._removedOnImageClose();
  }

  _removedRestoreExactTimelineConfig() {
    console.log('🔄 ========== RESTORING EXACT TIMELINE ==========');

    // Remove ALL classes that might hide UI
    document.body.classList.remove('detail-view-open');
    document.body.classList.remove('is-fullscreen');
    document.body.classList.remove('detail-active');
    console.log('🎨 Removed detail classes from body');
    console.log('  Remaining body classes:', document.body.className);

    // Force remove any inline styles on body
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('pointer-events');

    if (!this.savedTimelineConfig) {
      console.error('❌ NO SAVED TIMELINE CONFIG');
      return;
    }

    const config = this.savedTimelineConfig;
    this.physicsSystem = window.app?.timelineController?.physicsSystem || this.physicsSystem;
    this.inputSystem = window.app?.timelineController?.inputSystem || this.inputSystem;
    this.cameraSystem = window.app?.timelineController?.cameraSystem || this.cameraSystem;
    this.animationChoreographer = window.app?.timelineController?.animationChoreographer || this.animationChoreographer;

    console.log('📊 Restoring from config:', {
      physicsOffset: config.physicsOffset.toFixed(2),
      centeredImage: config.centeredImageIndex,
      planesCount: config.planesConfig.length
    });

    // STEP 1: Restore camera
    if (this.camera && config.cameraPosition && config.cameraRotation) {
      console.log('📷 Step 1: Restoring camera');
      this.camera.position.copy(config.cameraPosition);
      this.camera.rotation.copy(config.cameraRotation);
      this.camera.updateMatrixWorld(true);
    }

    // STEP 2: Restore physics system
    console.log('⚙️ Step 2: Restoring physics system');
    if (this.physicsSystem) {
      // CRITICAL: Disable physics first to prevent overrides
      this.physicsSystem.enabled = false;
      this.physicsSystem.scrollEnabled = false;
      this.physicsSystem.isBeingRestored = true;

      // Restore exact values
      this.physicsSystem.currentOffset = config.physicsOffset;
      this.physicsSystem.targetOffset = config.physicsOffset;
      this.physicsSystem.velocity = 0;
      this.physicsSystem.centeredImageIndex = config.centeredImageIndex;
      this.physicsSystem.imageSpacing = config.imageSpacing;

      // Keep state store aligned with restored offset/index
      this.state.setState({
        timelineOffset: config.physicsOffset,
        currentSnapIndex: config.centeredImageIndex,
        targetOffset: config.physicsOffset,
        scrollVelocity: 0
      });

      console.log('  Physics offset:', this.physicsSystem.currentOffset.toFixed(2));
      console.log('  Centered image:', this.physicsSystem.centeredImageIndex);
    }

    const cameraSystem = window.app?.timelineController?.cameraSystem;
    if (cameraSystem) {
      const restoredOffset = config.physicsOffset;
      cameraSystem.lookAtTarget.set(-restoredOffset, 0, 0);
      cameraSystem.lookAtCurrent.set(-restoredOffset, 0, 0);
      cameraSystem.camera.lookAt(cameraSystem.lookAtCurrent);
      cameraSystem.camera.updateMatrixWorld(true);
      console.log('📷 Camera lookAt synced to offset:', restoredOffset);
    }

    // STEP 3: Restore ALL planes - AGGRESSIVE approach
    console.log('🖼️ Step 3: Making ALL planes visible (aggressive)');

    const totalPlanes = this.imagePlanes?.planes?.length || 0;
    console.log(`  Total planes in scene: ${totalPlanes}`);

    this.imagePlanes?.planes?.forEach((plane, index) => {
      const savedPlane = config.planesConfig?.[index];

      // Restore position from saved state if available
      if (savedPlane) {
        plane.position.copy(savedPlane.position);
        plane.scale.copy(savedPlane.scale);
      }

      // FORCE visible - no exceptions
      plane.visible = true;
      plane.renderOrder = index;

      // Ensure material is opaque
      if (plane.material) {
        plane.material.opacity = 1;
        plane.material.transparent = true;
        plane.material.needsUpdate = true;
      }

      // Clean up fullscreen userData
      plane.userData.isFullscreen = false;
      plane.userData.isFrozen = false;
      delete plane.userData.animatingToFullscreen;
      delete plane.userData.animatingFromFullscreen;

      plane.updateMatrixWorld(true);

      console.log(`  ✓ Plane ${index}: pos=(${plane.position.x.toFixed(1)}, ${plane.position.y.toFixed(1)}), visible=true`);
    });

    // Count visible planes
    const visibleCount = this.imagePlanes?.planes?.filter((p) => p.visible).length || 0;
    console.log(`  📊 Total visible planes: ${visibleCount}/${totalPlanes}`);

    if (visibleCount < totalPlanes) {
      console.error(`  ⚠️ WARNING: Only ${visibleCount} of ${totalPlanes} planes are visible!`);
    }

    // STEP 4: Force render to show restored state
    console.log('🎨 Step 4: Forcing render');
    requestAnimationFrame(() => {
      if (this.renderer && this.scene) {
        this.renderer.render(this.scene, this.camera);
        console.log('  ✓ Rendered restored state');
      }

      // STEP 5: Re-enable systems
      setTimeout(() => {
        if (this.physicsSystem) {
          this.physicsSystem.isBeingRestored = false;
          this.physicsSystem.enabled = true;
          this.physicsSystem.scrollEnabled = true;
          console.log('⚙️ Step 5: Physics re-enabled');
        }

        // Re-enable other systems
        if (this.inputSystem) {
          this.inputSystem.enabled = true;
        }
        if (this.cameraSystem?.unfreeze) {
          this.cameraSystem.unfreeze();
        } else if (this.cameraSystem?.unfreezeCamera) {
          this.cameraSystem.unfreezeCamera();
        }
        if (this.animationChoreographer) {
          this.animationChoreographer.enabled = true;
        }

        // Re-enable canvas interaction and stop detail render loop
        const canvas = this.renderer?.domElement;
        if (canvas) {
          canvas.style.pointerEvents = 'auto';
        }
        if (window.app?.enableCanvasInteraction) {
          window.app.enableCanvasInteraction();
        }
        this.stopContinuousRender();

        console.log('✅ All systems re-enabled');

        // STEP 6: Restore "Three.js Project" title at top
        console.log('📝 Step 6: Restoring title to top');

        // Try multiple selectors
        const title =
          document.querySelector('.title-overlay') ||
          document.querySelector('.title-div') ||
          document.querySelector('.timeline-title') ||
          document.querySelector('.project-title') ||
          document.querySelector('h1');

        if (title) {
          console.log('  Found title element:', title.className || title.tagName);
          console.log('  Current text:', title.textContent?.substring(0, 30));

          // Force title to top with !important
          title.style.cssText = `
            position: fixed !important;
            top: 32px !important;
            left: 50% !important;
            transform: translateX(-50%) scale(0.8) !important;
            opacity: 1 !important;
            visibility: visible !important;
            display: block !important;
            pointer-events: none !important;
            z-index: 100 !important;
          `;

          // Also trigger TitleScrollAnimation to move it to top
          if (window.app?.timelineController?.titleScrollAnimation) {
            const titleAnim = window.app.timelineController.titleScrollAnimation;
            if (titleAnim.isAtTop === false) {
              console.log('  Triggering TitleScrollAnimation to move to top');
              titleAnim.moveToTop();
            }
          }

          console.log('  ✓ Title positioned at top');
        } else {
          console.error('  ❌ Title element NOT FOUND');
          console.log('  Available h1 elements:', document.querySelectorAll('h1').length);
          console.log(
            '  Available title classes:',
            Array.from(document.querySelectorAll('[class*="title"]')).map((el) => el.className)
          );
        }

        // STEP 7: Show timeline navigation
        console.log('🧭 Step 7: Showing timeline navigation');
        const timelineNav = document.querySelector('#timeline-navigation, .timeline-navigation');

        if (timelineNav) {
          timelineNav.style.display = 'flex';
          timelineNav.style.opacity = '1';
          timelineNav.style.visibility = 'visible';
          timelineNav.style.pointerEvents = 'auto';

          console.log('  ✓ Navigation visible');
        } else {
          console.warn('  ⚠️ Timeline navigation not found');
        }

        // Emit event for other components
        if (window.EventBus?.emit) {
          window.EventBus.emit('timeline:restored');
        } else if (this.eventBus?.emit) {
          this.eventBus.emit('timeline:restored', {});
        }

        // STEP 8: Restore year display
        console.log('📅 Step 8: Restoring year display');

        const yearDisplay =
          document.querySelector('.year-display') ||
          document.querySelector('.timeline-year') ||
          document.querySelector('[class*="year"]');

        if (yearDisplay) {
          console.log('  Found year element:', yearDisplay.className);

          yearDisplay.style.cssText = `
            opacity: 1 !important;
            visibility: visible !important;
            display: block !important;
            pointer-events: auto !important;
          `;

          console.log('  ✓ Year display visible');
        } else {
          console.error('  ❌ Year display NOT FOUND');
          console.log(
            '  Searching for year elements:',
            Array.from(document.querySelectorAll('[class*="year"]')).map((el) => ({
              class: el.className,
              text: el.textContent?.substring(0, 20)
            }))
          );
        }
      }, 100); // Small delay to let positions settle
    });

    // Clean up
    this.savedTimelineConfig = null;

    console.log('✅ ========== TIMELINE FULLY RESTORED ==========');

    // DIAGNOSTIC: Check what's still hidden
    setTimeout(() => {
      console.log('🔍 ========== VISIBILITY CHECK ==========');

      // Check planes
      const allPlanes = this.imagePlanes?.planes || [];
      const visiblePlanes = allPlanes.filter((p) => p.visible);
      const hiddenPlanes = allPlanes.filter((p) => !p.visible);

      console.log(`📊 Planes: ${visiblePlanes.length} visible, ${hiddenPlanes.length} hidden`);
      if (hiddenPlanes.length > 0) {
        console.log(
          '  Hidden plane indices:',
          hiddenPlanes.map((p) => allPlanes.indexOf(p))
        );
      }

      // Check title
      const title =
        document.querySelector('h1') ||
        document.querySelector('[class*="title"]');
      if (title) {
        const styles = window.getComputedStyle(title);
        console.log('📝 Title state:', {
          exists: true,
          text: title.textContent?.substring(0, 30),
          display: styles.display,
          opacity: styles.opacity,
          visibility: styles.visibility,
          top: styles.top
        });
      } else {
        console.error('❌ Title element not found in DOM');
      }

      // Check year
      const year = document.querySelector('[class*="year"]');
      if (year) {
        const styles = window.getComputedStyle(year);
        console.log('📅 Year state:', {
          exists: true,
          text: year.textContent?.substring(0, 20),
          display: styles.display,
          opacity: styles.opacity,
          visibility: styles.visibility
        });
      } else {
        console.error('❌ Year element not found in DOM');
      }

      console.log('🔍 ====================================');
    }, 1000);

    // NUCLEAR OPTION: Force everything visible
    setTimeout(() => {
      console.log('🔥 FORCING VISIBILITY (nuclear option)');

      // Force all planes
      this.imagePlanes?.planes?.forEach((p, i) => {
        p.visible = true;
        if (p.material) {
          p.material.opacity = 1;
          p.material.transparent = true;
        }
        console.log(`  Plane ${i}: FORCED visible`);
      });

      // Force title
      const title =
        document.querySelector('.timeline-title') ||
        document.querySelector('h1');
      if (title) {
        title.style.cssText = `
          position: fixed !important;
          top: 32px !important;
          left: 50% !important;
          transform: translateX(-50%) scale(0.8) !important;
          opacity: 1 !important;
          visibility: visible !important;
          display: block !important;
        `;
        console.log('  Title: FORCED visible');
      }

      // Force render
      if (this.renderer && this.scene) {
        this.renderer.render(this.scene, this.camera);
        console.log('  Forced final render');
      }

      console.log('✅ Everything forced visible with !important');
    }, 500);

    // NUCLEAR OPTION: Force everything visible over multiple frames
    const forceVisibility = (attempt = 1) => {
      if (attempt > 3) return; // Max 3 attempts

      console.log(`🔥 Force visibility attempt ${attempt}/3`);

      // Force all planes
      this.imagePlanes?.planes?.forEach((p) => {
        p.visible = true;
        if (p.material) {
          p.material.opacity = 1;
        }
      });

      // Force title
      const title =
        document.querySelector('.title-overlay') ||
        document.querySelector('h1');
      if (title) {
        title.style.display = 'block';
        title.style.opacity = '1';
        title.style.visibility = 'visible';
      }

      // Force year
      const year = document.querySelector('[class*="year"]');
      if (year) {
        year.style.display = 'block';
        year.style.opacity = '1';
        year.style.visibility = 'visible';
      }

      // Force render
      if (this.renderer && this.scene) {
        this.renderer.render(this.scene, this.camera);
      }

      // Try again next frame
      requestAnimationFrame(() => forceVisibility(attempt + 1));
    };

    // Start forcing
    setTimeout(() => forceVisibility(), 200);
  }

  _removedRestoreCompleteTimelineState() {
    console.log('🔄 ========== RESTORING TIMELINE ==========');

    if (!this.savedTimelineState) {
      console.error('❌ NO SAVED STATE');
      return;
    }

    const state = this.savedTimelineState;
    this.unlockGlobalScrollLock();

    // Remove hiding classes
    document.body.classList.remove('detail-view-open', 'is-fullscreen');
    this.state.setState({ isImageEnlarged: false, enlargedImageId: null });
    this.effects.backgroundBlurEffect?.deactivate?.();
    // TimelineController.resumeTimeline() does not emit timeline:resume,
    // so restore timeline UI explicitly on detail close.
    this.showTimelineUI();

    // Re-add hidden planes to scene FIRST
    if (this.hiddenPlanes) {
      this.hiddenPlanes.forEach(p => {
        if (p && !p.parent && this.scene) {
          this.scene.add(p);
        }
        if (p) {
          p.visible = true;
          p.userData.isFullscreen = false;
          p.userData.isFrozen = false;
        }
      });
      this.hiddenPlanes = [];
    }

    // Restore physics offset into state
    const offset = this.state.get('timelineOffset');
    this.updateImagePositions(offset);

    // Restore camera
    console.log('📷 Restoring camera');
    this.camera.position.copy(state.cameraPosition);
    this.camera.rotation.copy(state.cameraRotation);
    this.camera.updateMatrixWorld(true);

    // Restore physics
    console.log('⚙️ Restoring physics');
    if (this.physicsSystem) {
      this.physicsSystem.scrollEnabled = false;
      this.physicsSystem.currentOffset = state.physicsOffset;
      this.physicsSystem.targetOffset = state.physicsOffset;
      this.physicsSystem.velocity = 0;
    }

    // Restore ALL planes
    console.log('🖼️ Restoring ALL planes');
    let restored = 0;

    this.imagePlanes.planes.forEach((plane, index) => {
      const saved = state.planesState[index];
      if (saved) {
        plane.scale.copy(saved.scale);
        plane.rotation.copy(saved.rotation);
        restored++;
      }

      plane.visible = true;
      plane.renderOrder = index;

      if (!plane.parent && this.scene) this.scene.add(plane);
      if (plane.material) {
        plane.material.opacity = 1;
        plane.material.needsUpdate = true;
      }

      plane.userData.isFullscreen = false;
      plane.userData.isFrozen = false;
      plane.updateMatrixWorld(true);
    });

    // Force immediate position update with restored offset
    this.updateImagePositions(state.physicsOffset);
    const cameraSystem = window.app?.timelineController?.cameraSystem;
    if (cameraSystem) {
      const restoredOffset = state.physicsOffset;
      cameraSystem.lookAtTarget.set(-restoredOffset, 0, 0);
      cameraSystem.lookAtCurrent.set(-restoredOffset, 0, 0);
      cameraSystem.camera.lookAt(cameraSystem.lookAtCurrent);
      cameraSystem.camera.updateMatrixWorld(true);
      console.log('📷 Camera lookAt synced to offset:', restoredOffset);
    }

    console.log(`  ✓ ${restored}/${this.imagePlanes.planes.length} planes`);

    // Restore title - FORCE to top and disable scroll animation
    console.log('📝 Restoring title (forcing to top)');

    // First, disable TitleScrollAnimation if it exists
    let titleAnimation = null;
    if (window.app?.timelineController?.titleScrollAnimation) {
      titleAnimation = window.app.timelineController.titleScrollAnimation;
      titleAnimation.disable?.();
      console.log('  Disabled TitleScrollAnimation');
    }

    const titleSelectors = ['.title-overlay', '.title-div', '.project-title', '.timeline-title', 'h1'];
    let title = null;
    for (const selector of titleSelectors) {
      title = document.querySelector(selector);
      if (title) {
        console.log(`  Found: ${selector}`);
        break;
      }
    }

    if (title) {
      // Force title to top position
      title.style.cssText = `
        position: fixed !important;
        top: 32px !important;
        left: 50% !important;
        transform: translateX(-50%) scale(0.8) !important;
        opacity: 1 !important;
        visibility: visible !important;
        display: block !important;
        z-index: 100 !important;
        pointer-events: none !important;
      `;

      // Force parent containers visible
      let parent = title.parentElement;
      while (parent && parent !== document.body) {
        parent.style.opacity = '1';
        parent.style.visibility = 'visible';
        parent = parent.parentElement;
      }

      console.log('  ✓ Title forced to top');

      // Re-enable TitleScrollAnimation AFTER positioning, and reset to top state
      setTimeout(() => {
        if (titleAnimation) {
          // Reset animation to "already at top" state
          titleAnimation.isAtTop = true;
          titleAnimation.hasScrolled = false;

          // Re-enable
          titleAnimation.enable?.();
          console.log('  ✓ TitleScrollAnimation re-enabled and reset');
        }
      }, 500);
    } else {
      console.error('  ❌ Title NOT FOUND');
    }

    console.log('RESTORING YEAR OVERLAY');
    const bigYearElement = document.querySelector('.year-overlay');
    if (!bigYearElement) {
      console.error('Year overlay NOT FOUND');
      return;
    }

    // Calculate current year from restored state
    const calculatedSpacing = this.state?.get?.('calculatedSpacing') ?? 4.194;
    const firstPosition = 0;
    const startYear = 2010;
    const yearCount = 10;
    const relativeOffset = state.physicsOffset - firstPosition;
    const yearIndex = Math.round(relativeOffset / calculatedSpacing);
    const clampedIndex = Math.max(0, Math.min(yearIndex, yearCount - 1));
    const currentYear = startYear + clampedIndex;

    // Restore element through YearOverlay API to keep ticker DOM intact.
    const yearOverlay = window.app?.yearOverlay;
    if (yearOverlay) {
      yearOverlay.setYear(currentYear);
      yearOverlay.show();
    } else {
      // Fallback if overlay instance is unavailable.
      const firstSlot = bigYearElement.querySelector('.year-overlay-slot');
      if (firstSlot) {
        firstSlot.textContent = currentYear.toString();
      }
    }
    bigYearElement.classList.remove('hidden', 'fade-out', 'detail-active');
    bigYearElement.style.opacity = '1';
    bigYearElement.style.visibility = 'visible';
    bigYearElement.style.display = 'block';
    bigYearElement.style.pointerEvents = 'none';
    let parent = bigYearElement.parentElement;
    while (parent && parent !== document.body) {
      parent.style.opacity = '1';
      parent.style.visibility = 'visible';
      parent = parent.parentElement;
    }
    yearOverlay?.positionBelowActiveImage?.();
    console.log(`Year overlay restored to ${currentYear}`);

    // === STEP 6: Restore Navigation ===
    const nav = document.querySelector('#timeline-navigation, .timeline-navigation');
    if (nav) {
      nav.style.display = 'flex';
      nav.style.opacity = '1';
      nav.style.visibility = 'visible';
      nav.style.pointerEvents = 'auto';
      console.log('🧭 Navigation visible');
    }

    // Restore year display
    console.log('📅 Restoring year (aggressive)');
    const yearSelectors = ['.year-display', '.timeline-year', '.current-year', '[class*="year"]', '.timeline-navigation .year'];
    let yearDisplay = null;
    for (const selector of yearSelectors) {
      yearDisplay = document.querySelector(selector);
      if (yearDisplay) break;
    }
    if (yearDisplay) {
      yearDisplay.style.cssText = 'opacity: 1 !important; visibility: visible !important; display: block !important;';
      let parent = yearDisplay.parentElement;
      while (parent && parent !== document.body) {
        parent.style.opacity = '1';
        parent.style.visibility = 'visible';
        parent = parent.parentElement;
      }
      console.log('  ✓ Year visible');
    } else {
      console.error('  ❌ Year NOT FOUND');
    }

    // Force render
    requestAnimationFrame(() => {
      if (this.renderer && this.scene) {
        this.renderer.render(this.scene, this.camera);
      }

      setTimeout(() => {
        console.log('▶️ Re-enabling systems');
        if (this.physicsSystem) {
          this.physicsSystem.scrollEnabled = true;
          this.physicsSystem.enabled = true;
          this.physicsSystem.paused = false;
          delete this.physicsSystem.isBeingRestored;
          console.log('  ✓ Physics enabled:', this.physicsSystem.scrollEnabled);
        }
        if (this.state) {
          this.state.setState({ isImageEnlarged: false, isDragging: false });
        }
        if (window.app?.timelineController) {
          window.app.timelineController.resumeTimeline?.();
          this.eventBus.emit('timeline:resume', {});
          this.paused = false;
          window.app.timelineController.cameraSystem?.unfreezeCamera?.();
          if (window.app.timelineController.inputSystem) {
            window.app.timelineController.inputSystem.enabled = true;
            window.app.timelineController.inputSystem.wheelCooldownMs = 0;
            console.log('  ✓ InputSystem enabled');
          }
        }
        if (window.app) {
          window.app.enableCanvasInteraction?.();
        }
        const canvas = document.querySelector('canvas');
        if (canvas) {
          canvas.style.pointerEvents = 'auto';
          canvas.style.touchAction = 'none';
          canvas.focus?.();
          console.log('  ✓ Canvas events enabled and focused');
        }

        for (let i = 0; i < 3; i++) {
          requestAnimationFrame(() => {
            if (this.renderer && this.scene) {
              this.renderer.render(this.scene, this.camera);
            }
          });
        }

        console.log('✅ All systems enabled');
      }, 100);
    });

    this.savedTimelineState = null;

    setTimeout(() => {
      console.log('🔍 POST-RESTORATION CHECK:');
      const t = document.querySelector('h1');
      const y = document.querySelector('[class*="year"]');
      console.log('  Title:', t ? window.getComputedStyle(t).display : 'NOT FOUND');
      console.log('  Year:', y ? window.getComputedStyle(y).display : 'NOT FOUND');
      console.log('  Physics scrollEnabled:', this.physicsSystem?.scrollEnabled);
      console.log('  Input enabled:', window.app?.timelineController?.inputSystem?.enabled);
    }, 1000);
    console.log('✅ ========== RESTORATION COMPLETE ==========');
  }

  _removedRestoreTimelineState() {
    this._removedRestoreCompleteTimelineState();
  }

  pauseTimelineSystems() {
    // Delegate to TimelineController (the orchestrator) via event bus.
    // TimelineController.pauseTimeline() owns all sibling-system references.
    this.eventBus.emit('systems:pause', {});
  }

  resumeTimelineSystems() {
    // Delegate to TimelineController via event bus.
    // TimelineController.resumeTimeline() re-enables systems and emits timeline:resume.
    this.eventBus.emit('systems:resume', {});
  }

  stopContinuousRender() {
    this.imageDetailController?.stopDetailRenderLoop();
  }

  /**
   * Handle snap complete - force vignette update.
   * @param {object} payload
   */
  onSnapComplete({ offset }) {
    this.updateVignette(offset);
  }

  /** Hide timeline UI elements (delegates to UIManager). */
  hideTimelineUI() {
    this.uiManager.hideTimelineUI();
  }

  /** Restore timeline UI elements hidden by hideTimelineUI() (delegates to UIManager). */
  showTimelineUI() {
    this.uiManager.showTimelineUI();
  }

  /** Remove body/html scroll locks (delegates to UIManager). */
  unlockGlobalScrollLock() {
    this.uiManager.unlockGlobalScrollLock();
  }

  /** Force the events-panel to regenerate dividers (delegates to UIManager). */
  refreshTimelineMetaOverlay() {
    this.uiManager.refreshTimelineMetaOverlay();
  }

  /**
   * Clean up
   */
  dispose() {
    if (this.enlargeAnimation) {
      this.enlargeAnimation.kill();
      this.enlargeAnimation = null;
    }

    // Remove any in-flight tweens from plane scales and hover userData
    const { allPlanes } = this.getPlaneCollections();
    for (const plane of allPlanes) {
      if (plane?.scale) {
        gsap.killTweensOf(plane.scale);
      }
      if (plane?.userData) {
        gsap.killTweensOf(plane.userData, '_hoverProgress');
      }
    }

    for (const unsubscribe of this.unsubscribeFns) {
      try {
        unsubscribe();
      } catch (err) {
        console.warn('RenderSystem unsubscribe failed:', err);
      }
    }
    this.unsubscribeFns = [];

    this.enlargedImage = null;
    this.originalImageState = null;
    if (this.onHidePlaneForDetailPage) {
      window.removeEventListener('hidePlaneForDetailPage', this.onHidePlaneForDetailPage);
      this.onHidePlaneForDetailPage = null;
    }
    if (this.onImageExpandHandoff) {
      window.removeEventListener('imageExpandHandoff', this.onImageExpandHandoff);
      this.onImageExpandHandoff = null;
    }
    if (this.handleKeydown) {
      window.removeEventListener('keydown', this.handleKeydown);
    }
    if (this._onMouseMove) {
      window.removeEventListener('mousemove', this._onMouseMove);
    }
    this._hoveredPlane = null;
    this.showTimelineUI();
    this.rippleAnimation = null;
    this.timelineScene = null;
    this.effects = null;

    console.log('RenderSystem disposed');
  }
}

export { RenderSystem };
