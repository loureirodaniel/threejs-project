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
        this.backgroundBlurEffect = null;
        this.liquidDistortionEffect = null;
        this.titleOverlay = null;
        this.debugPanel = null;
        this.eventsPanel = null;
        this.timelineNavigation = null;
        this.mouseController = null;
        this.timelineController = null;

        
        this.init();
    }
    
    init() {
        // Make app instance globally accessible for demo scripts
        window.app = this;
        
        // Initialize scene manager first
        this.sceneManager = new SceneManager();
        const scene = this.sceneManager.getScene();
        const camera = this.sceneManager.getCamera();
        
        // Initialize all other components
        this.lighting = new Lighting(scene);
        this.imagePlanes = new ImagePlanes(scene, camera);
        this.timelineScene = new TimelineScene(scene);
        
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
        this.timelineController = new TimelineController(camera, this.sceneManager, this.timelineScene, this.backgroundBlurEffect);

        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start animation loop
        this.animate();
        
        // Show initial scroll hint after a delay
        setTimeout(() => {
            this.showScrollHint();
        }, 2000);
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
        
        // Timeline navigation event
        window.addEventListener('timelineNavigation', (event) => {
            this.onTimelineNavigation(event.detail);
        });
        
        // Sync debug panel event
        window.addEventListener('syncDebugPanel', (event) => {
            this.syncDebugPanel(event.detail);
        });
        
        // Check current scene event (for events panel)
        window.addEventListener('checkCurrentScene', () => {
            if (this.timelineController.getCurrentSceneIndex() === 1) {
                // We're in timeline scene, show the events panel toggle
                if (this.eventsPanel) {
                    this.eventsPanel.toggleButton.style.display = 'flex';
                }
            }
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
        
        // Background blur controls
        controls.backgroundBlurSlider.addEventListener('input', (e) => {
            this.updateBackgroundBlur();
        });
        
        controls.blurOpacitySlider.addEventListener('input', (e) => {
            this.updateBackgroundBlur();
        });
        
        // Blur width controls
        controls.leftBlurWidthSlider.addEventListener('input', (e) => {
            this.updateBackgroundBlur();
        });
        
        controls.rightBlurWidthSlider.addEventListener('input', (e) => {
            this.updateBackgroundBlur();
        });
        
        // Smooth scroll controls
        controls.smoothScrollSensitivitySlider.addEventListener('input', (e) => {
            this.updateSmoothScroll();
        });
        
        controls.smoothScrollFrictionSlider.addEventListener('input', (e) => {
            this.updateSmoothScroll();
        });
        
        // Smooth scroll navigation buttons
        controls.scrollToYearBtn.addEventListener('click', () => {
            this.timelineController.animateToYear(2015, 2); // 2015 corresponds to offset 2
        });
        
        controls.scrollToYearBtn2.addEventListener('click', () => {
            this.timelineController.animateToYear(2019, 14); // 2019 corresponds to offset 14
        });
        
        // Liquid distortion controls
        controls.toggleLiquidDistortionBtn.addEventListener('click', () => {
            this.toggleLiquidDistortion();
        });
        
        controls.distortionStrengthSlider.addEventListener('input', (e) => {
            this.updateLiquidDistortion();
        });
        
        controls.rippleSpeedSlider.addEventListener('input', (e) => {
            this.updateLiquidDistortion();
        });
        
        controls.rippleScaleSlider.addEventListener('input', (e) => {
            this.updateLiquidDistortion();
        });
        
        controls.falloffDistanceSlider.addEventListener('input', (e) => {
            this.updateLiquidDistortion();
        });
        
        controls.noiseScaleSlider.addEventListener('input', (e) => {
            this.updateLiquidDistortion();
        });
        
        controls.noiseStrengthSlider.addEventListener('input', (e) => {
            this.updateLiquidDistortion();
        });
        
        // Initialize timeline camera controls with current values
        this.initializeTimelineCameraControls();
        
        // Add some custom events to the events panel
        this.addCustomEvents();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.onWindowResize();
        });
        
        // Add smooth scroll controls to debug panel
        this.addSmoothScrollControls();
        
        // Add test button for liquid distortion
        this.addLiquidDistortionTest();
    }
    
    updateSpotlightEffect() {
        const controls = this.debugPanel.getControls();
        
        const radius = parseFloat(controls.spotlightRadiusSlider.value);
        const vignetteOpacity = parseFloat(controls.vignetteSlider.value);
        const gridOpacity = parseFloat(controls.gridSlider.value);
        
        // Update displays
        controls.spotlightRadiusDisplay.textContent = radius;
        controls.vignetteOpacityDisplay.textContent = vignetteOpacity;
        controls.gridOpacityDisplay.textContent = gridOpacity;
        
        // Update effects
        this.spotlightEffect.updateSpotlight(radius, vignetteOpacity);
        this.vignetteEffect.setOpacity(vignetteOpacity);
        this.gridEffect.setOpacity(gridOpacity);
    }
    
    updateBackgroundBlur() {
        const controls = this.debugPanel.getControls();
        
        const blurAmount = parseFloat(controls.backgroundBlurSlider.value);
        const blurOpacity = parseFloat(controls.blurOpacitySlider.value);
        const leftBlurWidth = parseFloat(controls.leftBlurWidthSlider.value);
        const rightBlurWidth = parseFloat(controls.rightBlurWidthSlider.value);
        
        // Update displays
        controls.backgroundBlurDisplay.textContent = blurAmount;
        controls.blurOpacityDisplay.textContent = blurOpacity;
        controls.leftBlurWidthDisplay.textContent = leftBlurWidth;
        controls.rightBlurWidthDisplay.textContent = rightBlurWidth;
        
        // Update background blur effect
        if (this.backgroundBlurEffect) {
            this.backgroundBlurEffect.updateBlurAmount(blurAmount);
            this.backgroundBlurEffect.updateBlurOpacity(blurOpacity);
            this.backgroundBlurEffect.updateLeftBlurWidth(leftBlurWidth);
            this.backgroundBlurEffect.updateRightBlurWidth(rightBlurWidth);
        }
    }
    
    updateSmoothScroll() {
        const controls = this.debugPanel.getControls();
        
        const sensitivity = parseFloat(controls.smoothScrollSensitivitySlider.value);
        const friction = parseFloat(controls.smoothScrollFrictionSlider.value);
        
        // Update displays
        controls.smoothScrollSensitivityDisplay.textContent = sensitivity.toFixed(2);
        controls.smoothScrollFrictionDisplay.textContent = friction.toFixed(2);
        
        // Update smooth scroll settings
        if (this.timelineController) {
            this.timelineController.setSmoothScrollSensitivity(sensitivity);
            this.timelineController.setSmoothScrollFriction(friction);
        }
    }
    
    toggleLiquidDistortion() {
        const controls = this.debugPanel.getControls();
        
        console.log('App: Toggle liquid distortion called');
        console.log('App: Effect exists:', !!this.liquidDistortionEffect);
        console.log('App: Effect is active:', this.liquidDistortionEffect?.isActive);
        
        if (this.liquidDistortionEffect.isActive) {
            this.liquidDistortionEffect.deactivate();
            // Deactivate text distortion
            if (this.titleOverlay) {
                this.titleOverlay.deactivateDistortion();
            }
            controls.toggleLiquidDistortionBtn.textContent = 'Enable Liquid Effect';
            controls.toggleLiquidDistortionBtn.style.background = '#00ff88';
            controls.toggleLiquidDistortionBtn.style.color = 'black';
        } else {
            this.liquidDistortionEffect.activate();
            // Activate text distortion
            if (this.titleOverlay) {
                this.titleOverlay.activateDistortion();
            }
            controls.toggleLiquidDistortionBtn.textContent = 'Disable Liquid Effect';
            controls.toggleLiquidDistortionBtn.style.background = '#ff6b6b';
            controls.toggleLiquidDistortionBtn.style.color = 'white';
        }
    }
    
    updateLiquidDistortion() {
        const controls = this.debugPanel.getControls();
        
        const distortionStrength = parseFloat(controls.distortionStrengthSlider.value);
        const rippleSpeed = parseFloat(controls.rippleSpeedSlider.value);
        const rippleScale = parseFloat(controls.rippleScaleSlider.value);
        const falloffDistance = parseFloat(controls.falloffDistanceSlider.value);
        const noiseScale = parseFloat(controls.noiseScaleSlider.value);
        const noiseStrength = parseFloat(controls.noiseStrengthSlider.value);
        
        // Update displays
        controls.distortionStrengthDisplay.textContent = distortionStrength.toFixed(3);
        controls.rippleSpeedDisplay.textContent = rippleSpeed.toFixed(1);
        controls.rippleScaleDisplay.textContent = rippleScale.toFixed(1);
        controls.falloffDistanceDisplay.textContent = falloffDistance.toFixed(2);
        controls.noiseScaleDisplay.textContent = noiseScale.toFixed(1);
        controls.noiseStrengthDisplay.textContent = noiseStrength.toFixed(3);
        
        // Update liquid distortion effect
        if (this.liquidDistortionEffect) {
            this.liquidDistortionEffect.setDistortionStrength(distortionStrength);
            this.liquidDistortionEffect.setRippleSpeed(rippleSpeed);
            this.liquidDistortionEffect.setRippleScale(rippleScale);
            this.liquidDistortionEffect.setFalloffDistance(falloffDistance);
            this.liquidDistortionEffect.setNoiseScale(noiseScale);
            this.liquidDistortionEffect.setNoiseStrength(noiseStrength);
        }
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
        controls.vignetteSlider.value = 1.0;
        controls.gridSlider.value = 0.4;
        this.updateSpotlightEffect();
        
        // Reset background blur
        controls.backgroundBlurSlider.value = 5;
        controls.blurOpacitySlider.value = 0.8;
        controls.leftBlurWidthSlider.value = 4;
        controls.rightBlurWidthSlider.value = 4;
        this.updateBackgroundBlur();
        
        // Reset smooth scroll settings
        controls.smoothScrollSensitivitySlider.value = 0.25;
        controls.smoothScrollFrictionSlider.value = 0.85;
        this.updateSmoothScroll();
        
        // Reset liquid distortion settings
        controls.distortionStrengthSlider.value = 0.02;
        controls.rippleSpeedSlider.value = 2.0;
        controls.rippleScaleSlider.value = 50;
        controls.falloffDistanceSlider.value = 0.3;
        controls.noiseScaleSlider.value = 10;
        controls.noiseStrengthSlider.value = 0.01;
        this.updateLiquidDistortion();
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
            
            // Show scroll hint for initial scene
            this.showScrollHint();
        }
    }
    
    showScrollHint() {
        // Create or update scroll hint
        if (!this.scrollHint) {
            this.scrollHint = document.createElement('div');
            this.scrollHint.innerHTML = '↓ Scroll down to explore timeline';
            this.scrollHint.style.position = 'fixed';
            this.scrollHint.style.bottom = '30px';
            this.scrollHint.style.left = '50%';
            this.scrollHint.style.transform = 'translateX(-50%)';
            this.scrollHint.style.color = 'white';
            this.scrollHint.style.fontSize = '16px';
            this.scrollHint.style.fontWeight = 'bold';
            this.scrollHint.style.textAlign = 'center';
            this.scrollHint.style.zIndex = '1000';
            this.scrollHint.style.opacity = '0';
            this.scrollHint.style.transition = 'opacity 0.5s ease';
            this.scrollHint.style.textShadow = '0 2px 4px rgba(0,0,0,0.8)';
            document.body.appendChild(this.scrollHint);
        }
        
        // Show the hint
        setTimeout(() => {
            this.scrollHint.style.opacity = '1';
        }, 1000);
        
        // Hide hint after 5 seconds
        setTimeout(() => {
            this.scrollHint.style.opacity = '0';
        }, 5000);
    }
    
    hideScrollHint() {
        if (this.scrollHint) {
            this.scrollHint.style.opacity = '0';
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
    
    addCustomEvents() {
        // Add some custom events to make the timeline more interesting
        if (this.eventsPanel) {
            // Add a special event for 2015
            this.eventsPanel.addEvent(2015, {
                title: 'Three.js Project Launch',
                description: 'The beginning of this amazing 3D timeline project that showcases interactive storytelling.',
                category: 'Project'
            });
            
            // Add an event for 2018
            this.eventsPanel.addEvent(2018, {
                title: 'Interactive Timeline Development',
                description: 'Advanced timeline features including smooth animations and immersive experiences.',
                category: 'Development'
            });
            
            // Add an event for 2019
            this.eventsPanel.addEvent(2019, {
                title: 'Events Panel Integration',
                description: 'Successfully integrated a dynamic events panel that updates based on timeline navigation.',
                category: 'Feature'
            });
        }
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
    
    addSmoothScrollControls() {
        // Add smooth scroll year navigation buttons to events panel
        if (this.eventsPanel) {
            // Add smooth scroll navigation events
            this.eventsPanel.addEvent(2010, {
                title: 'Smooth Scroll Demo',
                description: 'Try the smooth scrolling controls in the debug panel to navigate through the timeline.',
                category: 'Demo'
            });
            
            this.eventsPanel.addEvent(2015, {
                title: 'GSAP Smooth Scrolling',
                description: 'Experience fluid, momentum-based scrolling with customizable sensitivity and deceleration.',
                category: 'Feature'
            });
            
            this.eventsPanel.addEvent(2019, {
                title: 'Advanced Timeline Navigation',
                description: 'Use the smooth scroll buttons to quickly jump to specific years in the timeline.',
                category: 'Navigation'
            });
        }
    }
    
    addLiquidDistortionTest() {
        // Create a test button for liquid distortion
        const testButton = document.createElement('button');
        testButton.textContent = 'Test Liquid Effect';
        testButton.style.position = 'fixed';
        testButton.style.top = '100px';
        testButton.style.left = '20px';
        testButton.style.zIndex = '1000';
        testButton.style.background = '#00ff88';
        testButton.style.color = 'black';
        testButton.style.border = 'none';
        testButton.style.padding = '10px 20px';
        testButton.style.borderRadius = '5px';
        testButton.style.cursor = 'pointer';
        testButton.style.fontFamily = 'Arial, sans-serif';
        
        testButton.addEventListener('click', () => {
            console.log('Test button clicked');
            if (this.liquidDistortionEffect) {
                console.log('Effect exists, toggling...');
                this.toggleLiquidDistortion();
            } else {
                console.log('Effect does not exist');
            }
        });
        
        document.body.appendChild(testButton);
    }
    
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        const deltaTime = 0.016; // Approximate 60fps
        
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
        
        // Update liquid distortion effect
        if (this.liquidDistortionEffect) {
            this.liquidDistortionEffect.update(deltaTime);
        }
        
        // Update controls regardless of renderer
        this.sceneManager.updateControls();
        
        // Render the scene with liquid distortion if active
        if (this.liquidDistortionEffect && this.liquidDistortionEffect.isActive) {
            this.liquidDistortionEffect.render();
        } else {
            this.sceneManager.render();
        }
    }
} 