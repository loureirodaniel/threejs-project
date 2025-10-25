/**
 * CameraControls - Camera control section for debug panel
 */
import { Section } from '../../components/Section/Section.js';
import { Slider } from '../../components/Slider/Slider.js';
import { Button } from '../../components/Button/Button.js';

export class CameraControls {
    constructor() {
        this.section = null;
        this.controls = {};
        this.defaultValues = {
            cameraX: 0,
            cameraY: 0,
            cameraZ: 8,
            targetY: 0,
            fov: 30
        };
    }

    /**
     * Create the camera controls section
     * @returns {HTMLElement} Section element
     */
    create() {
        this.section = new Section({
            title: 'Timeline Camera',
            isExpanded: false,
            onToggle: (expanded) => this.onToggle(expanded)
        });

        const container = this.section.create();

        // Camera X slider
        this.cameraXSlider = new Slider({
            label: 'Camera X',
            value: this.defaultValues.cameraX,
            min: -5,
            max: 25,
            step: 0.5,
            onChange: (value) => this.onCameraXChange(value)
        });

        // Camera Y slider
        this.cameraYSlider = new Slider({
            label: 'Camera Y',
            value: this.defaultValues.cameraY,
            min: -20,
            max: 20,
            step: 0.5,
            onChange: (value) => this.onCameraYChange(value)
        });

        // Camera Z slider
        this.cameraZSlider = new Slider({
            label: 'Camera Z',
            value: this.defaultValues.cameraZ,
            min: 5,
            max: 20,
            step: 0.5,
            onChange: (value) => this.onCameraZChange(value)
        });

        // Target Y slider
        this.targetYSlider = new Slider({
            label: 'Target Y',
            value: this.defaultValues.targetY,
            min: -10,
            max: 10,
            step: 0.5,
            onChange: (value) => this.onTargetYChange(value)
        });

        // FOV slider
        this.fovSlider = new Slider({
            label: 'FOV',
            value: this.defaultValues.fov,
            min: 30,
            max: 90,
            step: 1,
            onChange: (value) => this.onFovChange(value)
        });

        // Navigation buttons
        this.goToInitialBtn = new Button({
            children: 'Go to Initial',
            variant: 'danger',
            size: 'small',
            onClick: () => this.onGoToInitial()
        });

        this.goToTimelineBtn = new Button({
            children: 'Go to Timeline',
            variant: 'success',
            size: 'small',
            onClick: () => this.onGoToTimeline()
        });

        this.testVibrationBtn = new Button({
            children: 'Test Vibration',
            variant: 'warning',
            size: 'small',
            onClick: () => this.onTestVibration(),
            style: { width: '100%', marginTop: '8px' }
        });

        // Add controls to section
        this.section.addContent(this.cameraXSlider.create());
        this.section.addContent(this.cameraYSlider.create());
        this.section.addContent(this.cameraZSlider.create());
        this.section.addContent(this.targetYSlider.create());
        this.section.addContent(this.fovSlider.create());
        
        // Add buttons container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 8px; margin-top: 10px;';
        buttonContainer.appendChild(this.goToInitialBtn.create());
        buttonContainer.appendChild(this.goToTimelineBtn.create());
        this.section.addContent(buttonContainer);
        this.section.addContent(this.testVibrationBtn.create());

        // Store control references
        this.controls.cameraXSlider = this.cameraXSlider.getSliderElement();
        this.controls.cameraYSlider = this.cameraYSlider.getSliderElement();
        this.controls.cameraZSlider = this.cameraZSlider.getSliderElement();
        this.controls.targetYSlider = this.targetYSlider.getSliderElement();
        this.controls.cameraFovSlider = this.fovSlider.getSliderElement();
        this.controls.cameraXDisplay = this.cameraXSlider.getElement().querySelector('span');
        this.controls.cameraYDisplay = this.cameraYSlider.getElement().querySelector('span');
        this.controls.cameraZDisplay = this.cameraZSlider.getElement().querySelector('span');
        this.controls.targetYDisplay = this.targetYSlider.getElement().querySelector('span');
        this.controls.cameraFovDisplay = this.fovSlider.getElement().querySelector('span');
        this.controls.goToInitialBtn = this.goToInitialBtn.getElement();
        this.controls.goToTimelineBtn = this.goToTimelineBtn.getElement();
        this.controls.testVibrationBtn = this.testVibrationBtn.getElement();

        return container;
    }

    /**
     * Handle section toggle
     * @param {boolean} expanded - Whether section is expanded
     */
    onToggle(expanded) {
        // Handle any section-specific toggle logic
    }

    /**
     * Handle camera X change
     * @param {number} value - New X value
     */
    onCameraXChange(value) {
        this.controls.cameraXDisplay.textContent = value;
        this.emitCameraChange();
    }

    /**
     * Handle camera Y change
     * @param {number} value - New Y value
     */
    onCameraYChange(value) {
        this.controls.cameraYDisplay.textContent = value;
        this.emitCameraChange();
    }

    /**
     * Handle camera Z change
     * @param {number} value - New Z value
     */
    onCameraZChange(value) {
        this.controls.cameraZDisplay.textContent = value;
        this.emitCameraChange();
    }

    /**
     * Handle target Y change
     * @param {number} value - New target Y value
     */
    onTargetYChange(value) {
        this.controls.targetYDisplay.textContent = value;
        this.emitCameraChange();
    }

    /**
     * Handle FOV change
     * @param {number} value - New FOV value
     */
    onFovChange(value) {
        this.controls.cameraFovDisplay.textContent = value;
        this.emitCameraChange();
    }

    /**
     * Handle go to initial scene
     */
    onGoToInitial() {
        window.dispatchEvent(new CustomEvent('cameraNavigation', {
            detail: { action: 'goToInitial' }
        }));
    }

    /**
     * Handle go to timeline scene
     */
    onGoToTimeline() {
        window.dispatchEvent(new CustomEvent('cameraNavigation', {
            detail: { action: 'goToTimeline' }
        }));
    }

    /**
     * Handle test vibration
     */
    onTestVibration() {
        console.log('=== MANUAL VIBRATION TEST ===');
        
        if (navigator.vibrate) {
            console.log('Testing short vibration (10ms)...');
            navigator.vibrate(10);
            
            setTimeout(() => {
                console.log('Testing medium vibration (50ms)...');
                navigator.vibrate(50);
            }, 1000);
            
            setTimeout(() => {
                console.log('Testing long vibration (200ms)...');
                navigator.vibrate(200);
            }, 2000);
            
            setTimeout(() => {
                console.log('Testing pattern vibration [100, 50, 100]...');
                navigator.vibrate([100, 50, 100]);
            }, 3000);
        } else {
            console.log('❌ Vibration API not available');
            alert('Vibration API not supported on this device/browser');
        }
    }

    /**
     * Emit camera change event
     */
    emitCameraChange() {
        window.dispatchEvent(new CustomEvent('cameraChange', {
            detail: {
                cameraX: parseFloat(this.controls.cameraXSlider.value),
                cameraY: parseFloat(this.controls.cameraYSlider.value),
                cameraZ: parseFloat(this.controls.cameraZSlider.value),
                targetY: parseFloat(this.controls.targetYSlider.value),
                fov: parseFloat(this.controls.cameraFovSlider.value)
            }
        }));
    }

    /**
     * Get control references
     * @returns {Object} Control references
     */
    getControls() {
        return this.controls;
    }

    /**
     * Reset to default values
     */
    resetToDefaults() {
        this.cameraXSlider.setValue(this.defaultValues.cameraX);
        this.cameraYSlider.setValue(this.defaultValues.cameraY);
        this.cameraZSlider.setValue(this.defaultValues.cameraZ);
        this.targetYSlider.setValue(this.defaultValues.targetY);
        this.fovSlider.setValue(this.defaultValues.fov);
        
        this.controls.cameraXDisplay.textContent = this.defaultValues.cameraX;
        this.controls.cameraYDisplay.textContent = this.defaultValues.cameraY;
        this.controls.cameraZDisplay.textContent = this.defaultValues.cameraZ;
        this.controls.targetYDisplay.textContent = this.defaultValues.targetY;
        this.controls.cameraFovDisplay.textContent = this.defaultValues.fov;
    }

    /**
     * Update control values
     * @param {Object} values - Values to update
     */
    updateValues(values) {
        if (values.cameraX !== undefined) {
            this.cameraXSlider.setValue(values.cameraX);
            this.controls.cameraXDisplay.textContent = values.cameraX;
        }
        if (values.cameraY !== undefined) {
            this.cameraYSlider.setValue(values.cameraY);
            this.controls.cameraYDisplay.textContent = values.cameraY;
        }
        if (values.cameraZ !== undefined) {
            this.cameraZSlider.setValue(values.cameraZ);
            this.controls.cameraZDisplay.textContent = values.cameraZ;
        }
        if (values.targetY !== undefined) {
            this.targetYSlider.setValue(values.targetY);
            this.controls.targetYDisplay.textContent = values.targetY;
        }
        if (values.fov !== undefined) {
            this.fovSlider.setValue(values.fov);
            this.controls.cameraFovDisplay.textContent = values.fov;
        }
    }

    /**
     * Destroy the section
     */
    destroy() {
        if (this.section) {
            this.section.destroy();
        }
        if (this.cameraXSlider) {
            this.cameraXSlider.destroy();
        }
        if (this.cameraYSlider) {
            this.cameraYSlider.destroy();
        }
        if (this.cameraZSlider) {
            this.cameraZSlider.destroy();
        }
        if (this.targetYSlider) {
            this.targetYSlider.destroy();
        }
        if (this.fovSlider) {
            this.fovSlider.destroy();
        }
        if (this.goToInitialBtn) {
            this.goToInitialBtn.destroy();
        }
        if (this.goToTimelineBtn) {
            this.goToTimelineBtn.destroy();
        }
        if (this.testVibrationBtn) {
            this.testVibrationBtn.destroy();
        }
    }
}
