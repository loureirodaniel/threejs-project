import * as THREE from 'three';
import { SceneManager } from './scene/SceneManager.js';
import { Lighting } from './scene/Lighting.js';
import { ImagePlanes } from './scene/ImagePlanes.js';
import { TimelineScene } from './scene/TimelineScene.js';
import { GridEffect } from './effects/GridEffect.js';
import { VignetteEffect } from './effects/VignetteEffect.js';
import { SpotlightEffect } from './effects/SpotlightEffect.js';
import { BackgroundBlurEffect } from './effects/BackgroundBlurEffect.js';
import { LiquidDistortionEffect } from './effects/LiquidDistortionEffect.js';
import { TitleOverlay } from './ui/TitleOverlay.js';
import { DebugPanel } from './ui/DebugPanel.js';
import { EventsPanel } from './ui/EventsPanel.js';
import { TimelineNavigation } from './ui/TimelineNavigation.js';
import { YearOverlay } from './ui/YearOverlay.js';
import { MouseController } from './controls/MouseController.js';
import { TimelineController } from './timeline-v2/core/TimelineController.js';
import { AppStateManager } from './core/AppStateManager.js';
import { eventBus } from './core/EventBus.js';
import { AppEventHandlers } from './core/AppEventHandlers.js';
import { AppIntroSequence } from './core/AppIntroSequence.js';
import { CommentManager } from './features/comments/CommentManager.js';
import { CommentStorage } from './features/comments/CommentStorage.js';
import { CommentModeration } from './features/comments/CommentModeration.js';
import { CommentUI } from './features/comments/CommentUI.js';
import { dataService } from './services/DataService.js';


export class App {
    constructor(container) {
        this.container = container;

        // Core modules
        this.stateManager = new AppStateManager();
        this.eventBus = eventBus;
        this.eventHandlers = null;
        this.introSequence = null;
        
        // Scene components
        this.sceneManager = null;
        this.lighting = null;
        this.imagePlanes = null;
        this.timelineScene = null;
        
        // Effects
        this.gridEffect = null;
        this.vignetteEffect = null;
        this.spotlightEffect = null;
        this.backgroundBlurEffect = null;
        this.liquidDistortionEffect = null;
        
        // UI components
        this.titleOverlay = null;
        this.debugPanel = null;
        this.eventsPanel = null;
        this.timelineNavigation = null;
        this.yearOverlay = null;
        this.timelineUIWrapper = null;
        
        // Controllers
        this.mouseController = null;
        this.timelineController = null;
        this.imageData = null;
        this.lastFrameTime = 0;
        this.isCanvasInteractionDisabled = false;

        // Comment system
        this.commentStorage = null;
        this.commentModeration = null;
        this.commentManager = null;
        this.commentUI = null;
        this.dataService = dataService;
        
        this.init()
            .then(() => console.log('✅ App initialized successfully'))
            .catch(error => console.error('❌ App initialization failed:', error));
    }
    
    async init() {
        try {
        // Make app instance globally accessible for demo scripts
        window.app = this;
        
        // Initialize core modules
        this.eventHandlers = new AppEventHandlers(this, this.stateManager, this.eventBus);
        this.introSequence = new AppIntroSequence(this);

        // Initialize scene manager first
        this.sceneManager = new SceneManager();
        const scene = this.sceneManager.getScene();
        const camera = this.sceneManager.getCamera();
        const renderer = this.sceneManager.getRenderer();
        this.renderer = renderer;

        // Set canvas z-index BELOW detail view
        this.renderer.domElement.style.position = 'fixed';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.zIndex = '0';
        this.renderer.domElement.style.width = '100vw';
        this.renderer.domElement.style.height = '100vh';
        this.renderer.domElement.style.pointerEvents = 'auto';

        console.log('🎨 WebGL canvas z-index set to 50');

        // Fetch timeline data
        console.log('📥 Loading timeline data...');
        const imageData = await dataService.getTimelineImages();
        console.log(`✅ Loaded ${imageData.length} images`);
        this.imageData = imageData;

        const yearRange = await dataService.getYearRange();
        console.log(`📅 Timeline covers ${yearRange.minYear} - ${yearRange.maxYear} (${yearRange.totalYears} years)`);
        
        // Initialize all other components
        this.lighting = new Lighting(scene);
        const initialScene = this.sceneManager.initialScene?.scene || scene;
        this.imagePlanes = new ImagePlanes(initialScene, camera, imageData);

        // Expose to window for debugging and NEW controller access
        window.app = window.app || {};
        window.app.imagePlanes = this.imagePlanes;
        window.app.camera = camera;
        window.app.renderer = renderer;
        window.app.scene = scene;
        window.app.sceneManager = this.sceneManager;
        window.app.timelineController = this.timelineController;
        window.app.imageData = this.imageData;
        window.app.dataService = this.dataService;

        console.log('✅ App exposed to window.app for debugging');
        this.timelineScene = new TimelineScene(scene, renderer, camera, imageData);
        
        // Connect initial scene images to timeline scene for transitions
        this.timelineScene.setInitialSceneImages(this.imagePlanes.getPlanes());
        
        this.gridEffect = new GridEffect(scene);
        this.vignetteEffect = new VignetteEffect(scene);
        this.spotlightEffect = new SpotlightEffect(scene);
        this.backgroundBlurEffect = new BackgroundBlurEffect(scene, camera, this.sceneManager.getRenderer());
        this.liquidDistortionEffect = new LiquidDistortionEffect(scene, camera, this.sceneManager.getRenderer());
        this.titleOverlay = new TitleOverlay();
        this.debugPanel = new DebugPanel();
        this.eventsPanel = new EventsPanel();
        this.timelineNavigation = new TimelineNavigation();
        this.yearOverlay = new YearOverlay(yearRange.minYear, yearRange.maxYear);
        this.setupTimelineUIWrapper();
        
        // Ensure timeline navigation is hidden on app start (initial scene)
        setTimeout(() => {
            console.log('App: Forcing timeline navigation to hide on app start (200ms)');
            this.timelineNavigation.hide();
        }, 200);
        
        setTimeout(() => {
            console.log('App: Forcing timeline navigation to hide on app start (500ms)');
            this.timelineNavigation.hide();
        }, 500);
        
        setTimeout(() => {
            console.log('App: Forcing timeline navigation to hide on app start (1000ms)');
            this.timelineNavigation.hide();
        }, 1000);
        
        this.mouseController = new MouseController(camera);
        console.log('🆕 Using NEW timeline controller (v2 architecture)');
        this.timelineController = new TimelineController(
            camera,
            this.sceneManager,
            this.timelineScene,
            {
                vignetteEffect: this.vignetteEffect,
                liquidDistortionEffect: this.liquidDistortionEffect,
                backgroundBlurEffect: this.backgroundBlurEffect
            }
        );
        window.app.timelineController = this.timelineController;

        // Wire title animation completion so scrolling is enabled only after text animation
        this.titleOverlay.setOnTextAnimationComplete(() => this.introSequence.onTextAnimationComplete());

        // Initialize comment system
        this.commentStorage = new CommentStorage();
        this.commentModeration = new CommentModeration();
        this.commentManager = new CommentManager(this.stateManager, this.eventBus, this.commentStorage, this.commentModeration);
        this.commentUI = new CommentUI(scene, camera, this.commentManager, this.eventBus);

        // Play a short intro dolly/arc before enabling interactions
        this.introSequence.playIntro();
        
        // Setup event listeners
        this.eventHandlers.setupEventListeners();
        
        // Start animation loop
        this.animate();
        // Scroll hint is shown when intro text animation completes (see introSequence.onTextAnimationComplete)
        
        // Optional: preload for smoother image display (non-blocking)
        // dataService.preloadImages().catch(err => console.warn('Image preload failed:', err));
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            this.showErrorMessage('Failed to load timeline. Please refresh the page.');
            throw error;
        }
    }
    
    
    
    
    onSceneChange(sceneDetail) {
        console.log(`Scene changing to: ${sceneDetail.sceneName}`);
        
        if (sceneDetail.sceneName === 'timeline') {
            // Don't hide initial scene images immediately - let the transition handle it
            // The timeline scene will handle the image layout transition
            
            // Hide spotlight effect
            this.spotlightEffect.hide();
            
            // Hide scroll hint
            this.hideScrollHint();
            
            // Animate title to top-left corner
            this.titleOverlay.animateToTopLeft();
            
            // Show year overlay (focused year top-left, 220px; prev/next 42px)
            if (this.yearOverlay) {
                this.yearOverlay.show();
                this.yearOverlay.setYear(this.timelineController.getCurrentYear());
            }
        } else if (sceneDetail.sceneName === 'initial') {
            // Deactivate timeline scene
            this.timelineScene.deactivate();
            
            // Show initial scene elements
            this.imagePlanes.show();
            this.spotlightEffect.show();
            
            // Animate title back to center
            this.titleOverlay.animateToCenter();
            
            // Ensure timeline navigation is hidden in initial scene
            if (this.timelineNavigation) {
                this.timelineNavigation.hide();
            }
            
            if (this.yearOverlay) {
                this.yearOverlay.hide();
            }
            
            // Show scroll hint for initial scene
            this.showScrollHint();
        }
    }
    
    showScrollHint() {
        this.introSequence.showScrollHint();
    }
    
    hideScrollHint() {
        this.introSequence.hideScrollHint();
    }
    
    // Comment system methods
    async showCommentsForEvent(eventId) {
        if (!this.commentUI || !this.commentManager) return;
        
        try {
            // Get event position from timeline scene
            const eventPosition = this.timelineScene.getEventPosition(eventId);
            if (eventPosition) {
                await this.commentUI.showCommentsForEvent(eventId, eventPosition);
            }
        } catch (error) {
            console.error('Failed to show comments:', error);
        }
    }
    
    hideComments() {
        if (this.commentUI) {
            this.commentUI.hideComments();
        }
    }
    
    async addCommentToEvent(eventId, commentData) {
        if (!this.commentManager) return null;
        
        try {
            return await this.commentManager.addComment(eventId, commentData);
        } catch (error) {
            console.error('Failed to add comment:', error);
            return null;
        }
    }
    
    onSceneTransitionComplete(sceneDetail) {
        console.log(`Scene transition complete: ${sceneDetail.sceneName}`);
        
        // Update UI based on current scene
        if (sceneDetail.sceneName === 'timeline') {
            this.titleOverlay.setTitle('Timeline Scene');
            this.titleOverlay.setSubtitle('Scroll horizontally to navigate through time');
            this.onTimelineYearChange({ detail: { year: this.timelineController.getCurrentYear() } });
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
    
    onTimelineNavigation(navigationDetail) {
        if (this.timelineController.getCurrentSceneIndex() === 1) {
            // Calculate the target position based on the year
            const year = navigationDetail.year;
            const yearIndex = year - 2010; // 2010 is index 0
            const targetOffset = (yearIndex * 2) - 4; // Convert to timeline offset
            
            console.log(`Navigation: Moving to year ${year}, target offset ${targetOffset}`);
            
            // Animate the timeline to the target position with smooth easing
            this.timelineController.animateToYear(year, targetOffset);
        }
    }
    
    syncDebugPanel(cameraData) {
        const controls = this.debugPanel.getControls();
        
        // Update slider values without triggering events
        controls.cameraXSlider.value = cameraData.cameraX;
        controls.cameraYSlider.value = cameraData.cameraY;
        controls.cameraZSlider.value = cameraData.cameraZ;
        controls.targetXSlider.value = cameraData.targetX ?? cameraData.cameraX ?? 0;
        controls.targetYSlider.value = cameraData.targetY;
        controls.targetZSlider.value = cameraData.targetZ ?? 0;
        controls.cameraRotXSlider.value = cameraData.rotX ?? 0;
        controls.cameraRotYSlider.value = cameraData.rotY ?? 0;
        controls.cameraRotZSlider.value = cameraData.rotZ ?? 0;
        controls.cameraFovSlider.value = cameraData.fov;
        controls.cameraNearSlider.value = cameraData.near ?? controls.cameraNearSlider.value;
        controls.cameraFarSlider.value = cameraData.far ?? controls.cameraFarSlider.value;
        controls.cameraZoomSlider.value = cameraData.zoom ?? controls.cameraZoomSlider.value;
        
        // Update displays
        controls.cameraXDisplay.textContent = cameraData.cameraX.toFixed(1);
        controls.cameraYDisplay.textContent = cameraData.cameraY.toFixed(1);
        controls.cameraZDisplay.textContent = cameraData.cameraZ.toFixed(1);
        controls.targetXDisplay.textContent = (cameraData.targetX ?? cameraData.cameraX ?? 0).toFixed(1);
        controls.targetYDisplay.textContent = cameraData.targetY.toFixed(1);
        controls.targetZDisplay.textContent = (cameraData.targetZ ?? 0).toFixed(1);
        controls.cameraRotXDisplay.textContent = (cameraData.rotX ?? 0).toFixed(0);
        controls.cameraRotYDisplay.textContent = (cameraData.rotY ?? 0).toFixed(0);
        controls.cameraRotZDisplay.textContent = (cameraData.rotZ ?? 0).toFixed(0);
        controls.cameraFovDisplay.textContent = cameraData.fov.toFixed(0);
        controls.cameraNearDisplay.textContent = (cameraData.near ?? 0.1).toFixed(2);
        controls.cameraFarDisplay.textContent = (cameraData.far ?? 1000).toFixed(0);
        controls.cameraZoomDisplay.textContent = (cameraData.zoom ?? 1).toFixed(2);
    }
    

    
    onWindowResize() {
        // Update background blur effect on window resize
        if (this.backgroundBlurEffect) {
            this.backgroundBlurEffect.onWindowResize();
        }
        
        // Update liquid distortion effect on window resize
        if (this.liquidDistortionEffect) {
            this.liquidDistortionEffect.onWindowResize();
        }
    }

    setupTimelineUIWrapper() {
        if (typeof document === 'undefined') return;

        let wrapper = document.querySelector('.timeline-ui-wrapper');
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.className = 'timeline-ui-wrapper';
            document.body.appendChild(wrapper);
        }

        const titleElement = this.titleOverlay?.getTitleDiv?.();
        const yearElement = this.yearOverlay?.container || document.getElementById('year-overlay');

        if (titleElement && titleElement.parentNode !== wrapper) {
            wrapper.appendChild(titleElement);
        }

        if (yearElement && yearElement.parentNode !== wrapper) {
            wrapper.appendChild(yearElement);
        }

        this.timelineUIWrapper = wrapper;
    }

    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 20px 40px;
            border-radius: 8px;
            font-size: 18px;
            z-index: 10000;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
    }

    // Method to disable WebGL canvas interactions
    disableCanvasInteraction() {
        // Remove logging to prevent spam
        if (this.renderer && this.renderer.domElement) {
            this.renderer.domElement.style.pointerEvents = 'none';
            this.renderer.domElement.style.userSelect = 'none';
        }
    }

    // Method to enable WebGL canvas interactions
    enableCanvasInteraction() {
        // Remove logging to prevent spam
        if (this.renderer && this.renderer.domElement) {
            this.renderer.domElement.style.pointerEvents = 'auto';
            this.renderer.domElement.style.userSelect = 'auto';
            this.renderer.domElement.style.touchAction = 'auto';
        }
    }
    
    animate = (timestamp) => {
        requestAnimationFrame(this.animate);

        const currentTimestamp = typeof timestamp === 'number' ? timestamp : performance.now();

        // Calculate deltaTime in seconds
        if (this.lastFrameTime === 0) {
            this.lastFrameTime = currentTimestamp;
        }
        const deltaTime = Math.min((currentTimestamp - this.lastFrameTime) / 1000, 0.1); // Cap at 100ms
        this.lastFrameTime = currentTimestamp;

        // Update timeline controller with deltaTime
        if (this.timelineController && this.timelineController.update) {
            this.timelineController.update(deltaTime, currentTimestamp);
        }

        // Disable canvas interaction while fullscreen/detail view is open
        if (this.timelineController?.imageDetailPage?.isOpen) {
            this.disableCanvasInteraction();
        } else {
            this.enableCanvasInteraction();
        }
        
        // Update spotlight position based on mouse (only in initial scene)
        if (this.timelineController.getCurrentSceneIndex() === 0) {
            const worldPos = this.mouseController.getWorldPosition();
            this.spotlightEffect.setPosition(worldPos.x, worldPos.y);
        }
        
        // Animate image planes (only in initial scene)
        if (this.timelineController.getCurrentSceneIndex() === 0) {
            this.imagePlanes.animate(currentTimestamp);
        }
        
        // Update timeline scene
        this.timelineScene.update(currentTimestamp, this.sceneManager.getCamera());
        
        // Update liquid distortion effect
        if (this.liquidDistortionEffect) {
            this.liquidDistortionEffect.update(deltaTime);
        }
        
        // Update controls regardless of renderer
        this.sceneManager.updateControls();
        
        // ALWAYS render
        if (this.timelineController && this.timelineController.renderSystem) {
            this.timelineController.renderSystem.render();
        } else if (this.liquidDistortionEffect && this.liquidDistortionEffect.isActive) {
            this.liquidDistortionEffect.render();
        } else {
            this.sceneManager.render();
        }
    }
} 