/**
 * AppEventHandlers - Centralized event handling for the application
 * Separates event handling logic from the main App class
 */
import * as THREE from 'three';

export class AppEventHandlers {
    constructor(app, stateManager, eventBus) {
        this.app = app;
        this.stateManager = stateManager;
        this.eventBus = eventBus;
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        this.setupDebugPanelEvents();
        this.setupSceneEvents();
        this.setupTimelineEvents();
        this.setupWindowEvents();
    }

    /**
     * Setup debug panel related events
     */
    setupDebugPanelEvents() {
        const controls = this.app.debugPanel.getControls();
        
        // Typography controls
        controls.headerSlider.addEventListener('input', (e) => {
            const size = e.target.value;
            this.stateManager.updateEffect('typography', { headerSize: parseInt(size) });
            this.app.titleOverlay.setTitleFontSize(size);
            controls.headerSize.textContent = size;
        });
        
        controls.bodySlider.addEventListener('input', (e) => {
            const size = e.target.value;
            this.stateManager.updateEffect('typography', { bodySize: parseInt(size) });
            this.app.titleOverlay.setSubtitleFontSize(size);
            controls.bodySize.textContent = size;
        });

        // Reset button
        controls.resetBtn.addEventListener('click', () => {
            this.handleResetToDefaults();
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

        // Timeline vignette controls
        controls.timelineVignetteStrengthSlider.addEventListener('input', () => {
            this.updateTimelineVignetteControls();
        });
        controls.timelineVignetteWidthSlider.addEventListener('input', () => {
            this.updateTimelineVignetteControls();
        });

        // Camera controls
        controls.cameraXSlider.addEventListener('input', (e) => {
            this.updateTimelineCamera();
        });
        
        controls.cameraYSlider.addEventListener('input', (e) => {
            this.updateTimelineCamera();
        });
        
        controls.cameraZSlider.addEventListener('input', (e) => {
            this.updateTimelineCamera();
        });
        
        controls.targetXSlider.addEventListener('input', (e) => {
            this.updateTimelineCamera();
        });

        controls.targetYSlider.addEventListener('input', (e) => {
            this.updateTimelineCamera();
        });

        controls.targetZSlider.addEventListener('input', (e) => {
            this.updateTimelineCamera();
        });

        controls.cameraRotXSlider.addEventListener('input', (e) => {
            this.updateTimelineCamera();
        });

        controls.cameraRotYSlider.addEventListener('input', (e) => {
            this.updateTimelineCamera();
        });

        controls.cameraRotZSlider.addEventListener('input', (e) => {
            this.updateTimelineCamera();
        });
        
        controls.cameraFovSlider.addEventListener('input', (e) => {
            this.updateTimelineCamera();
        });

        controls.cameraNearSlider.addEventListener('input', (e) => {
            this.updateTimelineCamera();
        });

        controls.cameraFarSlider.addEventListener('input', (e) => {
            this.updateTimelineCamera();
        });

        controls.cameraZoomSlider.addEventListener('input', (e) => {
            this.updateTimelineCamera();
        });

        // Scene navigation buttons
        controls.goToInitialBtn.addEventListener('click', () => {
            this.app.timelineController.transitionToScene(0);
        });
        
        controls.goToTimelineBtn.addEventListener('click', () => {
            this.app.timelineController.transitionToScene(1);
        });

        // Background blur controls
        controls.backgroundBlurSlider.addEventListener('input', (e) => {
            this.updateBackgroundBlur();
        });
        
        controls.blurOpacitySlider.addEventListener('input', (e) => {
            this.updateBackgroundBlur();
        });
        
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
            this.app.timelineController.animateToYear(2015, 2);
        });
        
        controls.scrollToYearBtn2.addEventListener('click', () => {
            this.app.timelineController.animateToYear(2019, 14);
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
        
        this.syncCameraControlsFromCamera();
    }

    /**
     * Setup scene-related events
     */
    setupSceneEvents() {
        this.eventBus.on('sceneChange', (event) => {
            this.app.onSceneChange(event);
        });
        
        this.eventBus.on('sceneTransitionComplete', (event) => {
            this.app.onSceneTransitionComplete(event);
        });
    }

    /**
     * Setup timeline-related events
     */
    setupTimelineEvents() {
        this.eventBus.on('timelineYearChange', (event) => {
            this.app.onTimelineYearChange(event);
        });
        
        this.eventBus.on('timelineNavigation', (event) => {
            this.app.onTimelineNavigation(event);
        });
        
        this.eventBus.on('syncDebugPanel', (event) => {
            this.app.syncDebugPanel(event);
        });
        
        this.eventBus.on('checkCurrentScene', () => {
            if (this.app.timelineController.getCurrentSceneIndex() === 1) {
                if (this.app.eventsPanel) {
                    this.app.eventsPanel.toggleButton.style.display = 'flex';
                }
            }
        });
    }

    /**
     * Setup window events
     */
    setupWindowEvents() {
        window.addEventListener('resize', () => {
            this.app.onWindowResize();
        });
    }

    /**
     * Update spotlight effect based on current state
     */
    updateSpotlightEffect() {
        const controls = this.app.debugPanel.getControls();
        const state = this.stateManager.getState();
        
        const radius = parseFloat(controls.spotlightRadiusSlider.value);
        const vignetteOpacity = parseFloat(controls.vignetteSlider.value);
        const gridOpacity = parseFloat(controls.gridSlider.value);
        
        // Update state
        this.stateManager.updateEffect('spotlight', {
            radius,
            vignetteOpacity,
            gridOpacity
        });
        
        // Update displays
        controls.spotlightRadiusDisplay.textContent = radius;
        controls.vignetteOpacityDisplay.textContent = vignetteOpacity;
        controls.gridOpacityDisplay.textContent = gridOpacity;
        
        // Update effects
        this.app.spotlightEffect.updateSpotlight(radius, vignetteOpacity);
        this.app.vignetteEffect.setOpacity(vignetteOpacity);
        this.app.gridEffect.setOpacity(gridOpacity);
    }

    /**
     * Update timeline vignette controls
     */
    updateTimelineVignetteControls() {
        const controls = this.app.debugPanel.getControls();
        const strength = parseFloat(controls.timelineVignetteStrengthSlider.value);
        const width = parseFloat(controls.timelineVignetteWidthSlider.value);
        
        controls.timelineVignetteStrengthDisplay.textContent = strength.toFixed(2);
        controls.timelineVignetteWidthDisplay.textContent = width.toFixed(1);
        
        if (this.app.timelineController) {
            this.app.timelineController.timelineVignetteStrength = Math.max(0, Math.min(1, strength));
            this.app.timelineController.timelineVignetteWidth = Math.max(0.1, width);
            this.app.timelineController.updateTimelineVignette();
        }
    }

    /**
     * Update background blur effect
     */
    updateBackgroundBlur() {
        const controls = this.app.debugPanel.getControls();
        
        const blurAmount = parseFloat(controls.backgroundBlurSlider.value);
        const blurOpacity = parseFloat(controls.blurOpacitySlider.value);
        const leftBlurWidth = parseFloat(controls.leftBlurWidthSlider.value);
        const rightBlurWidth = parseFloat(controls.rightBlurWidthSlider.value);
        
        // Update state
        this.stateManager.updateEffect('backgroundBlur', {
            amount: blurAmount,
            opacity: blurOpacity,
            leftWidth: leftBlurWidth,
            rightWidth: rightBlurWidth
        });
        
        // Update displays
        controls.backgroundBlurDisplay.textContent = blurAmount;
        controls.blurOpacityDisplay.textContent = blurOpacity;
        controls.leftBlurWidthDisplay.textContent = leftBlurWidth;
        controls.rightBlurWidthDisplay.textContent = rightBlurWidth;
        
        // Update background blur effect
        if (this.app.backgroundBlurEffect) {
            this.app.backgroundBlurEffect.updateBlurAmount(blurAmount);
            this.app.backgroundBlurEffect.updateBlurOpacity(blurOpacity);
            this.app.backgroundBlurEffect.updateLeftBlurWidth(leftBlurWidth);
            this.app.backgroundBlurEffect.updateRightBlurWidth(rightBlurWidth);
        }
    }

    /**
     * Update smooth scroll settings
     */
    updateSmoothScroll() {
        const controls = this.app.debugPanel.getControls();
        
        const sensitivity = parseFloat(controls.smoothScrollSensitivitySlider.value);
        const friction = parseFloat(controls.smoothScrollFrictionSlider.value);
        
        // Update state
        this.stateManager.setState({
            smoothScroll: { sensitivity, friction }
        });
        
        // Update displays
        controls.smoothScrollSensitivityDisplay.textContent = sensitivity.toFixed(2);
        controls.smoothScrollFrictionDisplay.textContent = friction.toFixed(2);
        
        // Update smooth scroll settings
        if (this.app.timelineController) {
            this.app.timelineController.setSmoothScrollSensitivity(sensitivity);
            this.app.timelineController.setSmoothScrollFriction(friction);
        }
    }

    /**
     * Toggle liquid distortion effect
     */
    toggleLiquidDistortion() {
        const controls = this.app.debugPanel.getControls();
        const state = this.stateManager.getState();
        
        console.log('App: Toggle liquid distortion called');
        console.log('App: Effect exists:', !!this.app.liquidDistortionEffect);
        console.log('App: Effect is active:', this.app.liquidDistortionEffect?.isActive);
        
        const newActiveState = !state.effects.liquid.active;
        
        // Update state
        this.stateManager.updateEffect('liquid', { active: newActiveState });
        
        if (newActiveState) {
            this.app.liquidDistortionEffect.activate();
            controls.toggleLiquidDistortionBtn.textContent = 'Disable Liquid Effect';
            controls.toggleLiquidDistortionBtn.style.background = '#ff6b6b';
            controls.toggleLiquidDistortionBtn.style.color = 'white';
        } else {
            this.app.liquidDistortionEffect.deactivate();
            controls.toggleLiquidDistortionBtn.textContent = 'Enable Liquid Effect';
            controls.toggleLiquidDistortionBtn.style.background = '#00ff88';
            controls.toggleLiquidDistortionBtn.style.color = 'black';
        }
    }

    /**
     * Update liquid distortion settings
     */
    updateLiquidDistortion() {
        const controls = this.app.debugPanel.getControls();
        
        const distortionStrength = parseFloat(controls.distortionStrengthSlider.value);
        const rippleSpeed = parseFloat(controls.rippleSpeedSlider.value);
        const rippleScale = parseFloat(controls.rippleScaleSlider.value);
        const falloffDistance = parseFloat(controls.falloffDistanceSlider.value);
        const noiseScale = parseFloat(controls.noiseScaleSlider.value);
        const noiseStrength = parseFloat(controls.noiseStrengthSlider.value);
        
        // Update state
        this.stateManager.updateEffect('liquid', {
            strength: distortionStrength,
            rippleSpeed,
            rippleScale,
            falloffDistance,
            noiseScale,
            noiseStrength
        });
        
        // Update displays
        controls.distortionStrengthDisplay.textContent = distortionStrength.toFixed(3);
        controls.rippleSpeedDisplay.textContent = rippleSpeed.toFixed(1);
        controls.rippleScaleDisplay.textContent = rippleScale.toFixed(1);
        controls.falloffDistanceDisplay.textContent = falloffDistance.toFixed(2);
        controls.noiseScaleDisplay.textContent = noiseScale.toFixed(1);
        controls.noiseStrengthDisplay.textContent = noiseStrength.toFixed(3);
        
        // Update liquid distortion effect
        if (this.app.liquidDistortionEffect) {
            this.app.liquidDistortionEffect.setDistortionStrength(distortionStrength);
            this.app.liquidDistortionEffect.setRippleSpeed(rippleSpeed);
            this.app.liquidDistortionEffect.setRippleScale(rippleScale);
            this.app.liquidDistortionEffect.setFalloffDistance(falloffDistance);
            this.app.liquidDistortionEffect.setNoiseScale(noiseScale);
            this.app.liquidDistortionEffect.setNoiseStrength(noiseStrength);
        }
    }


    /**
     * Update timeline camera settings
     */
    updateTimelineCamera() {
        const controls = this.app.debugPanel.getControls();
        
        const cameraX = parseFloat(controls.cameraXSlider.value);
        const cameraY = parseFloat(controls.cameraYSlider.value);
        const cameraZ = parseFloat(controls.cameraZSlider.value);
        const targetX = parseFloat(controls.targetXSlider.value);
        const targetY = parseFloat(controls.targetYSlider.value);
        const targetZ = parseFloat(controls.targetZSlider.value);
        const rotX = parseFloat(controls.cameraRotXSlider.value);
        const rotY = parseFloat(controls.cameraRotYSlider.value);
        const rotZ = parseFloat(controls.cameraRotZSlider.value);
        const fov = parseFloat(controls.cameraFovSlider.value);
        const near = parseFloat(controls.cameraNearSlider.value);
        const far = parseFloat(controls.cameraFarSlider.value);
        const zoom = parseFloat(controls.cameraZoomSlider.value);
        const clampedNear = Math.max(0.01, Math.min(near, far - 0.01));
        const clampedFar = Math.max(clampedNear + 0.01, far);
        
        // Update state
        this.stateManager.updateCamera({
            x: cameraX,
            y: cameraY,
            z: cameraZ,
            targetX,
            targetY,
            targetZ,
            rotX,
            rotY,
            rotZ,
            fov,
            near: clampedNear,
            far: clampedFar,
            zoom
        });
        
        // Update displays
        controls.cameraXDisplay.textContent = cameraX.toFixed(1);
        controls.cameraYDisplay.textContent = cameraY.toFixed(1);
        controls.cameraZDisplay.textContent = cameraZ.toFixed(1);
        controls.targetXDisplay.textContent = targetX.toFixed(1);
        controls.targetYDisplay.textContent = targetY.toFixed(1);
        controls.targetZDisplay.textContent = targetZ.toFixed(1);
        controls.cameraRotXDisplay.textContent = rotX.toFixed(0);
        controls.cameraRotYDisplay.textContent = rotY.toFixed(0);
        controls.cameraRotZDisplay.textContent = rotZ.toFixed(0);
        controls.cameraFovDisplay.textContent = fov.toFixed(0);
        controls.cameraNearDisplay.textContent = clampedNear.toFixed(2);
        controls.cameraFarDisplay.textContent = clampedFar.toFixed(0);
        controls.cameraZoomDisplay.textContent = zoom.toFixed(2);
        controls.cameraNearSlider.value = clampedNear;
        controls.cameraFarSlider.value = clampedFar;
        
        // Directly update the camera position and properties
        const camera = this.app.sceneManager.getCamera();
        camera.position.x = cameraX;
        camera.position.y = cameraY;
        camera.position.z = cameraZ;
        camera.fov = fov;
        camera.near = clampedNear;
        camera.far = clampedFar;
        camera.zoom = zoom;
        camera.updateProjectionMatrix();
        
        // Compose orientation from target + user rotation offsets.
        camera.lookAt(new THREE.Vector3(targetX, targetY, targetZ));
        const baseQuaternion = camera.quaternion.clone();
        const rotationOffset = new THREE.Euler(
            THREE.MathUtils.degToRad(rotX),
            THREE.MathUtils.degToRad(rotY),
            THREE.MathUtils.degToRad(rotZ),
            'XYZ'
        );
        const rotationOffsetQuat = new THREE.Quaternion().setFromEuler(rotationOffset);
        camera.quaternion.copy(baseQuaternion).multiply(rotationOffsetQuat);
        
        // Update timeline camera configuration for future transitions
        if (typeof this.app.timelineController.updateTimelineCameraConfig === 'function') {
            this.app.timelineController.updateTimelineCameraConfig({
                position: { x: cameraX, y: cameraY, z: cameraZ },
                target: { x: targetX, y: targetY, z: targetZ },
                rotationOffset: { x: rotX, y: rotY, z: rotZ },
                fov,
                near: clampedNear,
                far: clampedFar,
                zoom
            });
        }
        
        // Update year display if in timeline scene
        if (this.app.timelineController.getCurrentSceneIndex() === 1) {
            this.app.timelineController.updateCurrentYear();
        }
    }

    /**
     * Seed camera debug controls from current camera values.
     */
    syncCameraControlsFromCamera() {
        const controls = this.app.debugPanel.getControls();
        const camera = this.app.sceneManager.getCamera();
        if (!camera || !controls) return;

        const stateCamera = this.stateManager.getState().camera || {};
        controls.cameraXSlider.value = camera.position.x.toFixed(1);
        controls.cameraYSlider.value = camera.position.y.toFixed(1);
        controls.cameraZSlider.value = camera.position.z.toFixed(1);
        controls.targetXSlider.value = (stateCamera.targetX ?? 0).toFixed(1);
        controls.targetYSlider.value = (stateCamera.targetY ?? 0).toFixed(1);
        controls.targetZSlider.value = (stateCamera.targetZ ?? 0).toFixed(1);
        controls.cameraRotXSlider.value = (stateCamera.rotX ?? 0).toFixed(0);
        controls.cameraRotYSlider.value = (stateCamera.rotY ?? 0).toFixed(0);
        controls.cameraRotZSlider.value = (stateCamera.rotZ ?? 0).toFixed(0);
        controls.cameraFovSlider.value = camera.fov.toFixed(0);
        controls.cameraNearSlider.value = camera.near.toFixed(2);
        controls.cameraFarSlider.value = camera.far.toFixed(0);
        controls.cameraZoomSlider.value = camera.zoom.toFixed(2);

        this.updateTimelineCamera();
    }

    /**
     * Handle reset to defaults
     */
    handleResetToDefaults() {
        this.stateManager.resetToDefaults();
        
        const controls = this.app.debugPanel.getControls();
        const state = this.stateManager.getState();
        
        // Reset text sizes
        controls.headerSlider.value = state.typography.headerSize;
        controls.bodySlider.value = state.typography.bodySize;
        this.app.titleOverlay.setTitleFontSize(state.typography.headerSize);
        this.app.titleOverlay.setSubtitleFontSize(state.typography.bodySize);
        controls.headerSize.textContent = state.typography.headerSize;
        controls.bodySize.textContent = state.typography.bodySize;
        
        // Reset spotlight effect
        controls.spotlightRadiusSlider.value = state.effects.spotlight.radius;
        controls.vignetteSlider.value = state.effects.spotlight.vignetteOpacity;
        controls.gridSlider.value = state.effects.spotlight.gridOpacity;
        this.updateSpotlightEffect();
        
        // Reset background blur
        controls.backgroundBlurSlider.value = state.effects.backgroundBlur.amount;
        controls.blurOpacitySlider.value = state.effects.backgroundBlur.opacity;
        controls.leftBlurWidthSlider.value = state.effects.backgroundBlur.leftWidth;
        controls.rightBlurWidthSlider.value = state.effects.backgroundBlur.rightWidth;
        this.updateBackgroundBlur();
        
        // Reset smooth scroll settings
        controls.smoothScrollSensitivitySlider.value = state.smoothScroll.sensitivity;
        controls.smoothScrollFrictionSlider.value = state.smoothScroll.friction;
        this.updateSmoothScroll();
        
        // Reset camera settings
        controls.cameraXSlider.value = state.camera.x;
        controls.cameraYSlider.value = state.camera.y;
        controls.cameraZSlider.value = state.camera.z;
        controls.targetXSlider.value = state.camera.targetX;
        controls.targetYSlider.value = state.camera.targetY;
        controls.targetZSlider.value = state.camera.targetZ;
        controls.cameraRotXSlider.value = state.camera.rotX;
        controls.cameraRotYSlider.value = state.camera.rotY;
        controls.cameraRotZSlider.value = state.camera.rotZ;
        controls.cameraFovSlider.value = state.camera.fov;
        controls.cameraNearSlider.value = state.camera.near;
        controls.cameraFarSlider.value = state.camera.far;
        controls.cameraZoomSlider.value = state.camera.zoom;
        this.updateTimelineCamera();

        // Reset liquid distortion settings
        controls.distortionStrengthSlider.value = state.effects.liquid.strength;
        controls.rippleSpeedSlider.value = state.effects.liquid.rippleSpeed;
        controls.rippleScaleSlider.value = state.effects.liquid.rippleScale;
        controls.falloffDistanceSlider.value = state.effects.liquid.falloffDistance;
        controls.noiseScaleSlider.value = state.effects.liquid.noiseScale;
        controls.noiseStrengthSlider.value = state.effects.liquid.noiseStrength;
        this.updateLiquidDistortion();
        
    }
}
