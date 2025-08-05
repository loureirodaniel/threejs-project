import * as THREE from 'three';
import { SceneManager } from './scene/SceneManager.js';
import { Lighting } from './scene/Lighting.js';
import { ImagePlanes } from './scene/ImagePlanes.js';
import { TimelineScene } from './scene/TimelineScene.js';
import { GridEffect } from './effects/GridEffect.js';
import { VignetteEffect } from './effects/VignetteEffect.js';
import { SpotlightEffect } from './effects/SpotlightEffect.js';
import { TitleOverlay } from './ui/TitleOverlay.js';
import { DebugPanel } from './ui/DebugPanel.js';
import { MouseController } from './controls/MouseController.js';
import { TimelineController } from './controls/TimelineController.js';

export class App {
    constructor() {
        this.sceneManager = null;
        this.lighting = null;
        this.imagePlanes = null;
        this.timelineScene = null;
        this.gridEffect = null;
        this.vignetteEffect = null;
        this.spotlightEffect = null;
        this.titleOverlay = null;
        this.debugPanel = null;
        this.mouseController = null;
        this.timelineController = null;
        
        this.init();
    }
    
    init() {
        // Initialize scene manager first
        this.sceneManager = new SceneManager();
        const scene = this.sceneManager.getScene();
        const camera = this.sceneManager.getCamera();
        
        // Initialize all other components
        this.lighting = new Lighting(scene);
        this.imagePlanes = new ImagePlanes(scene, camera);
        this.timelineScene = new TimelineScene(scene);
        this.gridEffect = new GridEffect(scene);
        this.vignetteEffect = new VignetteEffect(scene);
        this.spotlightEffect = new SpotlightEffect(scene);
        this.titleOverlay = new TitleOverlay();
        this.debugPanel = new DebugPanel();
        this.mouseController = new MouseController(camera);
        this.timelineController = new TimelineController(camera, this.sceneManager);
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start animation loop
        this.animate();
    }
    
    setupEventListeners() {
        const controls = this.debugPanel.getControls();
        
        // Text size controls
        controls.headerSlider.addEventListener('input', (e) => {
            const size = e.target.value;
            this.titleOverlay.setTitleFontSize(size);
            controls.headerSize.textContent = size;
        });
        
        controls.bodySlider.addEventListener('input', (e) => {
            const size = e.target.value;
            this.titleOverlay.setSubtitleFontSize(size);
            controls.bodySize.textContent = size;
        });
        
        // Reset button
        controls.resetBtn.addEventListener('click', () => {
            this.resetToDefaults();
        });
        
        // Spotlight effect controls
        controls.spotlightRadiusSlider.addEventListener('input', () => {
            this.updateSpotlightEffect();
        });
        
        controls.blurSlider.addEventListener('input', () => {
            this.updateSpotlightEffect();
        });
        
        controls.vignetteSlider.addEventListener('input', () => {
            this.updateSpotlightEffect();
        });
        
        controls.gridSlider.addEventListener('input', () => {
            this.updateSpotlightEffect();
        });
        
        // Timeline scene transition events
        window.addEventListener('sceneChange', (event) => {
            this.onSceneChange(event.detail);
        });
        
        window.addEventListener('sceneTransitionComplete', (event) => {
            this.onSceneTransitionComplete(event.detail);
        });
        
        // Timeline year change event
        window.addEventListener('timelineYearChange', (event) => {
            this.onTimelineYearChange(event.detail);
        });
        
        // Sync debug panel event
        window.addEventListener('syncDebugPanel', (event) => {
            this.syncDebugPanel(event.detail);
        });
        
        // Timeline camera controls
        controls.cameraXSlider.addEventListener('input', (e) => {
            this.updateTimelineCamera();
        });
        
        controls.cameraYSlider.addEventListener('input', (e) => {
            this.updateTimelineCamera();
        });
        
        controls.cameraZSlider.addEventListener('input', (e) => {
            this.updateTimelineCamera();
        });
        
        controls.targetYSlider.addEventListener('input', (e) => {
            this.updateTimelineCamera();
        });
        
        controls.cameraFovSlider.addEventListener('input', (e) => {
            this.updateTimelineCamera();
        });
        
        // Scene navigation buttons
        controls.goToInitialBtn.addEventListener('click', () => {
            this.timelineController.transitionToScene(0);
        });
        
        controls.goToTimelineBtn.addEventListener('click', () => {
            this.timelineController.transitionToScene(1);
        });
        
        // Initialize timeline camera controls with current values
        this.initializeTimelineCameraControls();
    }
    
    updateSpotlightEffect() {
        const controls = this.debugPanel.getControls();
        
        const radius = parseFloat(controls.spotlightRadiusSlider.value);
        const blur = parseFloat(controls.blurSlider.value);
        const vignetteOpacity = parseFloat(controls.vignetteSlider.value);
        const gridOpacity = parseFloat(controls.gridSlider.value);
        
        // Update displays
        controls.spotlightRadiusDisplay.textContent = radius;
        controls.blurAmountDisplay.textContent = blur;
        controls.vignetteOpacityDisplay.textContent = vignetteOpacity;
        controls.gridOpacityDisplay.textContent = gridOpacity;
        
        // Update effects
        this.spotlightEffect.updateSpotlight(radius, blur, vignetteOpacity);
        this.vignetteEffect.setOpacity(vignetteOpacity);
        this.gridEffect.setOpacity(gridOpacity);
    }
    
    resetToDefaults() {
        const controls = this.debugPanel.getControls();
        
        // Reset text sizes
        controls.headerSlider.value = 48;
        controls.bodySlider.value = 24;
        this.titleOverlay.setTitleFontSize(48);
        this.titleOverlay.setSubtitleFontSize(24);
        controls.headerSize.textContent = '48';
        controls.bodySize.textContent = '24';
        
        // Reset spotlight effect
        controls.spotlightRadiusSlider.value = 2;
        controls.blurSlider.value = 0.6;
        controls.vignetteSlider.value = 1.0;
        controls.gridSlider.value = 0.4;
        this.updateSpotlightEffect();
    }
    
    onSceneChange(sceneDetail) {
        console.log(`Scene changing to: ${sceneDetail.sceneName}`);
        
        if (sceneDetail.sceneName === 'timeline') {
            // Activate timeline scene
            this.timelineScene.activate();
            
            // Hide initial scene elements
            this.imagePlanes.hide();
            this.spotlightEffect.hide();
        } else if (sceneDetail.sceneName === 'initial') {
            // Deactivate timeline scene
            this.timelineScene.deactivate();
            
            // Show initial scene elements
            this.imagePlanes.show();
            this.spotlightEffect.show();
        }
    }
    
    onSceneTransitionComplete(sceneDetail) {
        console.log(`Scene transition complete: ${sceneDetail.sceneName}`);
        
        // Update UI based on current scene
        if (sceneDetail.sceneName === 'timeline') {
            this.titleOverlay.setTitle('Timeline Scene');
            this.titleOverlay.setSubtitle('Scroll horizontally to navigate through time');
            // Initialize year display
            this.onTimelineYearChange({ year: this.timelineController.getCurrentYear() });
        } else if (sceneDetail.sceneName === 'initial') {
            this.titleOverlay.setTitle('Initial Scene');
            this.titleOverlay.setSubtitle('Scroll down to explore timeline');
        }
    }
    
    onTimelineYearChange(yearDetail) {
        if (this.timelineController.getCurrentSceneIndex() === 1) {
            this.titleOverlay.setTitle(`Timeline - ${yearDetail.year}`);
            this.titleOverlay.setSubtitle('Scroll horizontally to navigate through time');
        }
    }
    
    syncDebugPanel(cameraData) {
        const controls = this.debugPanel.getControls();
        
        // Update slider values without triggering events
        controls.cameraXSlider.value = cameraData.cameraX;
        controls.cameraYSlider.value = cameraData.cameraY;
        controls.cameraZSlider.value = cameraData.cameraZ;
        controls.targetYSlider.value = cameraData.targetY;
        controls.cameraFovSlider.value = cameraData.fov;
        
        // Update displays
        controls.cameraXDisplay.textContent = cameraData.cameraX.toFixed(1);
        controls.cameraYDisplay.textContent = cameraData.cameraY.toFixed(1);
        controls.cameraZDisplay.textContent = cameraData.cameraZ.toFixed(1);
        controls.targetYDisplay.textContent = cameraData.targetY.toFixed(1);
        controls.cameraFovDisplay.textContent = cameraData.fov.toFixed(0);
    }
    
    updateTimelineCamera() {
        const controls = this.debugPanel.getControls();
        
        const cameraX = parseFloat(controls.cameraXSlider.value);
        const cameraY = parseFloat(controls.cameraYSlider.value);
        const cameraZ = parseFloat(controls.cameraZSlider.value);
        const targetY = parseFloat(controls.targetYSlider.value);
        const fov = parseFloat(controls.cameraFovSlider.value);
        
        // Update displays
        controls.cameraXDisplay.textContent = cameraX;
        controls.cameraYDisplay.textContent = cameraY;
        controls.cameraZDisplay.textContent = cameraZ;
        controls.targetYDisplay.textContent = targetY;
        controls.cameraFovDisplay.textContent = fov;
        
        // Directly update the camera position and properties
        const camera = this.sceneManager.getCamera();
        camera.position.x = cameraX;
        camera.position.y = cameraY;
        camera.position.z = cameraZ;
        camera.fov = fov;
        camera.updateProjectionMatrix();
        
        // Update camera target
        camera.lookAt(new THREE.Vector3(cameraX, targetY, 0));
        
        // Update timeline camera configuration for future transitions
        this.timelineController.updateTimelineCameraConfig({
            position: { x: cameraX, y: cameraY, z: cameraZ },
            target: { x: cameraX, y: targetY, z: 0 },
            fov: fov
        });
        
        // Update year display if in timeline scene
        if (this.timelineController.getCurrentSceneIndex() === 1) {
            this.timelineController.updateCurrentYear();
        }
    }
    
    initializeTimelineCameraControls() {
        const controls = this.debugPanel.getControls();
        
        // Get current timeline camera configuration
        const timelineConfig = this.timelineController.sceneConfigs[1];
        
        if (timelineConfig) {
            // Set slider values
            controls.cameraXSlider.value = timelineConfig.position.x;
            controls.cameraYSlider.value = timelineConfig.position.y;
            controls.cameraZSlider.value = timelineConfig.position.z;
            controls.targetYSlider.value = timelineConfig.target.y;
            controls.cameraFovSlider.value = timelineConfig.fov;
            
            // Update displays
            controls.cameraXDisplay.textContent = timelineConfig.position.x;
            controls.cameraYDisplay.textContent = timelineConfig.position.y;
            controls.cameraZDisplay.textContent = timelineConfig.position.z;
            controls.targetYDisplay.textContent = timelineConfig.target.y;
            controls.cameraFovDisplay.textContent = timelineConfig.fov;
        }
    }
    
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        // Update timeline controller
        this.timelineController.update();
        
        // Update spotlight position based on mouse (only in initial scene)
        if (this.timelineController.getCurrentSceneIndex() === 0) {
            const worldPos = this.mouseController.getWorldPosition();
            this.spotlightEffect.setPosition(worldPos.x, worldPos.y);
        }
        
        // Animate image planes (only in initial scene)
        if (this.timelineController.getCurrentSceneIndex() === 0) {
            this.imagePlanes.animate(Date.now());
        }
        
        // Update timeline scene
        this.timelineScene.update(Date.now(), this.sceneManager.getCamera());
        
        // Render the scene
        this.sceneManager.render();
    }
} 