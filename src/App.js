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
            this.titleOverlay.setSubtitle('Scroll to navigate through time');
        } else if (sceneDetail.sceneName === 'initial') {
            this.titleOverlay.setTitle('Initial Scene');
            this.titleOverlay.setSubtitle('Scroll down to explore timeline');
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
        this.timelineScene.update(Date.now());
        
        // Render the scene
        this.sceneManager.render();
    }
} 