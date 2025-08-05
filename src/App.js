import { SceneManager } from './scene/SceneManager.js';
import { Lighting } from './scene/Lighting.js';
import { ImagePlanes } from './scene/ImagePlanes.js';
import { GridEffect } from './effects/GridEffect.js';
import { VignetteEffect } from './effects/VignetteEffect.js';
import { SpotlightEffect } from './effects/SpotlightEffect.js';
import { TitleOverlay } from './ui/TitleOverlay.js';
import { DebugPanel } from './ui/DebugPanel.js';
import { MouseController } from './controls/MouseController.js';

export class App {
    constructor() {
        this.sceneManager = null;
        this.lighting = null;
        this.imagePlanes = null;
        this.gridEffect = null;
        this.vignetteEffect = null;
        this.spotlightEffect = null;
        this.titleOverlay = null;
        this.debugPanel = null;
        this.mouseController = null;
        
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
        this.gridEffect = new GridEffect(scene);
        this.vignetteEffect = new VignetteEffect(scene);
        this.spotlightEffect = new SpotlightEffect(scene);
        this.titleOverlay = new TitleOverlay();
        this.debugPanel = new DebugPanel();
        this.mouseController = new MouseController(camera);
        
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
    
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        // Update spotlight position based on mouse
        const worldPos = this.mouseController.getWorldPosition();
        this.spotlightEffect.setPosition(worldPos.x, worldPos.y);
        
        // Animate image planes
        this.imagePlanes.animate(Date.now());
        
        // Render the scene
        this.sceneManager.render();
    }
} 