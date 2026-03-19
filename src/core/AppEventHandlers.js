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

        // Glitch controls
        controls.glitchNavPeakSlider.addEventListener('input', () => {
            this.updateGlitchControls();
        });
        controls.glitchScrollPeakSlider.addEventListener('input', () => {
            this.updateGlitchControls();
        });
        controls.glitchLerpSlider.addEventListener('input', () => {
            this.updateGlitchControls();
        });
        controls.glitchDecaySlider.addEventListener('input', () => {
            this.updateGlitchControls();
        });
        controls.glitchTimeStepSlider.addEventListener('input', () => {
            this.updateGlitchControls();
        });

        // Dream effect controls
        controls.dreamEnabledCheckbox.addEventListener('change', () => {
            this.updateDreamEffectControls();
        });
        controls.toggleDreamFogBtn.addEventListener('click', () => {
            this.toggleDreamFogEffect();
        });
        controls.dreamBloomStrengthSlider.addEventListener('input', () => {
            this.updateDreamEffectControls();
        });
        controls.dreamBloomRadiusSlider.addEventListener('input', () => {
            this.updateDreamEffectControls();
        });
        controls.dreamBloomThresholdSlider.addEventListener('input', () => {
            this.updateDreamEffectControls();
        });
        controls.dreamFogDensitySlider.addEventListener('input', () => {
            this.updateDreamEffectControls();
        });
        controls.dreamFogIntensitySlider.addEventListener('input', () => {
            this.updateDreamEffectControls();
        });
        controls.dreamFogNoiseScaleSlider.addEventListener('input', () => {
            this.updateDreamEffectControls();
        });
        controls.dreamFogNoiseSpeedSlider.addEventListener('input', () => {
            this.updateDreamEffectControls();
        });
        controls.dreamFogColorPicker.addEventListener('input', () => {
            this.updateDreamEffectControls();
        });
        controls.dreamClickBoostSlider.addEventListener('input', () => {
            this.updateDreamEffectControls();
        });
        controls.dreamDecayDurationSlider.addEventListener('input', () => {
            this.updateDreamEffectControls();
        });
        
        this.syncCameraControlsFromCamera();
        this.updateGlitchControls();
        this.updateDreamEffectControls();
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
                if (this.app.eventsPanel?.toggleButton) {
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
     * Update glitch controls
     */
    updateGlitchControls() {
        const controls = this.app.debugPanel.getControls();

        const navPeak = parseFloat(controls.glitchNavPeakSlider.value);
        const scrollPeak = parseFloat(controls.glitchScrollPeakSlider.value);
        const lerp = parseFloat(controls.glitchLerpSlider.value);
        const decay = parseFloat(controls.glitchDecaySlider.value);
        const timeStep = parseFloat(controls.glitchTimeStepSlider.value);

        this.stateManager.updateEffect('glitch', {
            navPeak,
            scrollPeak,
            lerp,
            decay,
            timeStep
        });

        controls.glitchNavPeakDisplay.textContent = navPeak.toFixed(2);
        controls.glitchScrollPeakDisplay.textContent = scrollPeak.toFixed(2);
        controls.glitchLerpDisplay.textContent = lerp.toFixed(2);
        controls.glitchDecayDisplay.textContent = decay.toFixed(2);
        controls.glitchTimeStepDisplay.textContent = timeStep.toFixed(3);

        if (this.app.glitchController?.setConfig) {
            this.app.glitchController.setConfig({ navPeak, scrollPeak, lerp, decay });
        }
        if (this.app.timelineController?.renderSystem?.setGlitchTimeStep) {
            this.app.timelineController.renderSystem.setGlitchTimeStep(timeStep);
        }
    }

    /**
     * Update dream click effect controls
     */
    updateDreamEffectControls() {
        const controls = this.app.debugPanel.getControls();

        const enabled = Boolean(controls.dreamEnabledCheckbox.checked);
        const fogEnabled = controls.toggleDreamFogBtn.dataset.enabled !== 'false';
        const bloomStrength = parseFloat(controls.dreamBloomStrengthSlider.value);
        const bloomRadius = parseFloat(controls.dreamBloomRadiusSlider.value);
        const bloomThreshold = parseFloat(controls.dreamBloomThresholdSlider.value);
        const fogDensity = parseFloat(controls.dreamFogDensitySlider.value);
        const fogIntensity = parseFloat(controls.dreamFogIntensitySlider.value);
        const fogNoiseScale = parseFloat(controls.dreamFogNoiseScaleSlider.value);
        const fogNoiseSpeed = parseFloat(controls.dreamFogNoiseSpeedSlider.value);
        const fogColor = controls.dreamFogColorPicker.value;
        const clickBoost = parseFloat(controls.dreamClickBoostSlider.value);
        const decayDuration = parseFloat(controls.dreamDecayDurationSlider.value);

        this.stateManager.updateEffect('dream', {
            enabled,
            fogEnabled,
            bloomStrength,
            bloomRadius,
            bloomThreshold,
            fogDensity,
            fogIntensity,
            fogNoiseScale,
            fogNoiseSpeed,
            fogColor,
            clickBoost,
            decayDuration
        });

        controls.dreamBloomStrengthDisplay.textContent = bloomStrength.toFixed(2);
        controls.dreamBloomRadiusDisplay.textContent = bloomRadius.toFixed(2);
        controls.dreamBloomThresholdDisplay.textContent = bloomThreshold.toFixed(2);
        controls.dreamFogDensityDisplay.textContent = fogDensity.toFixed(2);
        controls.dreamFogIntensityDisplay.textContent = fogIntensity.toFixed(2);
        controls.dreamFogNoiseScaleDisplay.textContent = fogNoiseScale.toFixed(2);
        controls.dreamFogNoiseSpeedDisplay.textContent = fogNoiseSpeed.toFixed(2);
        controls.dreamClickBoostDisplay.textContent = clickBoost.toFixed(2);
        controls.dreamDecayDurationDisplay.textContent = `${decayDuration.toFixed(2)}s`;

        const renderSystem = this.app.timelineController?.renderSystem;
        if (renderSystem?.setDreamEffectSettings) {
            renderSystem.setDreamEffectSettings({
                enabled,
                fogEnabled,
                bloomStrength,
                bloomRadius,
                bloomThreshold,
                fogDensity,
                fogIntensity,
                fogNoiseScale,
                fogNoiseSpeed,
                fogColor,
                clickBoost,
                decayDuration
            });
        }
    }

    toggleDreamFogEffect() {
        const controls = this.app.debugPanel.getControls();
        const currentEnabled = controls.toggleDreamFogBtn.dataset.enabled !== 'false';
        controls.toggleDreamFogBtn.dataset.enabled = currentEnabled ? 'false' : 'true';
        this.updateDreamFogButtonAppearance();
        this.updateDreamEffectControls();
    }

    updateDreamFogButtonAppearance() {
        const controls = this.app.debugPanel.getControls();
        const fogEnabled = controls.toggleDreamFogBtn.dataset.enabled !== 'false';

        if (fogEnabled) {
            controls.toggleDreamFogBtn.textContent = 'Disable Fog Effect';
            controls.toggleDreamFogBtn.style.background = '#4ecdc4';
            controls.toggleDreamFogBtn.style.color = 'black';
        } else {
            controls.toggleDreamFogBtn.textContent = 'Enable Fog Effect';
            controls.toggleDreamFogBtn.style.background = '#666';
            controls.toggleDreamFogBtn.style.color = 'white';
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

        // Reset glitch settings
        controls.glitchNavPeakSlider.value = state.effects.glitch.navPeak;
        controls.glitchScrollPeakSlider.value = state.effects.glitch.scrollPeak;
        controls.glitchLerpSlider.value = state.effects.glitch.lerp;
        controls.glitchDecaySlider.value = state.effects.glitch.decay;
        controls.glitchTimeStepSlider.value = state.effects.glitch.timeStep;
        this.updateGlitchControls();

        // Reset dream effect settings
        controls.dreamEnabledCheckbox.checked = state.effects.dream.enabled;
        controls.toggleDreamFogBtn.dataset.enabled = state.effects.dream.fogEnabled ? 'true' : 'false';
        this.updateDreamFogButtonAppearance();
        controls.dreamBloomStrengthSlider.value = state.effects.dream.bloomStrength;
        controls.dreamBloomRadiusSlider.value = state.effects.dream.bloomRadius;
        controls.dreamBloomThresholdSlider.value = state.effects.dream.bloomThreshold;
        controls.dreamFogDensitySlider.value = state.effects.dream.fogDensity;
        controls.dreamFogIntensitySlider.value = state.effects.dream.fogIntensity;
        controls.dreamFogNoiseScaleSlider.value = state.effects.dream.fogNoiseScale;
        controls.dreamFogNoiseSpeedSlider.value = state.effects.dream.fogNoiseSpeed;
        controls.dreamFogColorPicker.value = state.effects.dream.fogColor;
        controls.dreamClickBoostSlider.value = state.effects.dream.clickBoost;
        controls.dreamDecayDurationSlider.value = state.effects.dream.decayDuration;
        this.updateDreamEffectControls();
        
    }
}
