/**
 * LiquidDistortionControls - Liquid distortion control section for debug panel
 */
import { Section } from '../../components/Section/Section.js';
import { Slider } from '../../components/Slider/Slider.js';
import { Button } from '../../components/Button/Button.js';

export class LiquidDistortionControls {
    constructor() {
        this.section = null;
        this.controls = {};
        this.defaultValues = {
            active: false,
            strength: 0.02,
            rippleSpeed: 2.0,
            rippleScale: 50,
            falloffDistance: 0.3,
            noiseScale: 10,
            noiseStrength: 0.01
        };
    }

    /**
     * Create the liquid distortion controls section
     * @returns {HTMLElement} Section element
     */
    create() {
        this.section = new Section({
            title: 'Liquid Distortion',
            isExpanded: false,
            onToggle: (expanded) => this.onToggle(expanded)
        });

        const container = this.section.create();

        // Toggle button
        this.toggleBtn = new Button({
            children: 'Enable Liquid Effect',
            variant: 'primary',
            size: 'medium',
            onClick: () => this.onToggleEffect(),
            style: { width: '100%', marginBottom: '10px' }
        });

        // Distortion strength slider
        this.strengthSlider = new Slider({
            label: 'Distortion Strength',
            value: this.defaultValues.strength,
            min: 0.001,
            max: 0.1,
            step: 0.001,
            onChange: (value) => this.onStrengthChange(value)
        });

        // Ripple speed slider
        this.rippleSpeedSlider = new Slider({
            label: 'Ripple Speed',
            value: this.defaultValues.rippleSpeed,
            min: 0.5,
            max: 5.0,
            step: 0.1,
            onChange: (value) => this.onRippleSpeedChange(value)
        });

        // Ripple scale slider
        this.rippleScaleSlider = new Slider({
            label: 'Ripple Scale',
            value: this.defaultValues.rippleScale,
            min: 10,
            max: 100,
            step: 1,
            onChange: (value) => this.onRippleScaleChange(value)
        });

        // Falloff distance slider
        this.falloffDistanceSlider = new Slider({
            label: 'Falloff Distance',
            value: this.defaultValues.falloffDistance,
            min: 0.1,
            max: 1.0,
            step: 0.05,
            onChange: (value) => this.onFalloffDistanceChange(value)
        });

        // Noise scale slider
        this.noiseScaleSlider = new Slider({
            label: 'Noise Scale',
            value: this.defaultValues.noiseScale,
            min: 1,
            max: 20,
            step: 0.5,
            onChange: (value) => this.onNoiseScaleChange(value)
        });

        // Noise strength slider
        this.noiseStrengthSlider = new Slider({
            label: 'Noise Strength',
            value: this.defaultValues.noiseStrength,
            min: 0.001,
            max: 0.05,
            step: 0.001,
            onChange: (value) => this.onNoiseStrengthChange(value)
        });

        // Add controls to section
        this.section.addContent(this.toggleBtn.create());
        this.section.addContent(this.strengthSlider.create());
        this.section.addContent(this.rippleSpeedSlider.create());
        this.section.addContent(this.rippleScaleSlider.create());
        this.section.addContent(this.falloffDistanceSlider.create());
        this.section.addContent(this.noiseScaleSlider.create());
        this.section.addContent(this.noiseStrengthSlider.create());

        // Store control references
        this.controls.toggleLiquidDistortionBtn = this.toggleBtn.getElement();
        this.controls.distortionStrengthSlider = this.strengthSlider.getSliderElement();
        this.controls.rippleSpeedSlider = this.rippleSpeedSlider.getSliderElement();
        this.controls.rippleScaleSlider = this.rippleScaleSlider.getSliderElement();
        this.controls.falloffDistanceSlider = this.falloffDistanceSlider.getSliderElement();
        this.controls.noiseScaleSlider = this.noiseScaleSlider.getSliderElement();
        this.controls.noiseStrengthSlider = this.noiseStrengthSlider.getSliderElement();
        this.controls.distortionStrengthDisplay = this.strengthSlider.getElement().querySelector('span');
        this.controls.rippleSpeedDisplay = this.rippleSpeedSlider.getElement().querySelector('span');
        this.controls.rippleScaleDisplay = this.rippleScaleSlider.getElement().querySelector('span');
        this.controls.falloffDistanceDisplay = this.falloffDistanceSlider.getElement().querySelector('span');
        this.controls.noiseScaleDisplay = this.noiseScaleSlider.getElement().querySelector('span');
        this.controls.noiseStrengthDisplay = this.noiseStrengthSlider.getElement().querySelector('span');

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
     * Handle effect toggle
     */
    onToggleEffect() {
        this.defaultValues.active = !this.defaultValues.active;
        
        if (this.defaultValues.active) {
            this.toggleBtn.update({
                children: 'Disable Liquid Effect',
                variant: 'danger'
            });
        } else {
            this.toggleBtn.update({
                children: 'Enable Liquid Effect',
                variant: 'primary'
            });
        }
        
        this.emitToggleEvent();
    }

    /**
     * Handle strength change
     * @param {number} value - New strength value
     */
    onStrengthChange(value) {
        this.controls.distortionStrengthDisplay.textContent = value.toFixed(3);
        this.emitDistortionChange();
    }

    /**
     * Handle ripple speed change
     * @param {number} value - New ripple speed value
     */
    onRippleSpeedChange(value) {
        this.controls.rippleSpeedDisplay.textContent = value.toFixed(1);
        this.emitDistortionChange();
    }

    /**
     * Handle ripple scale change
     * @param {number} value - New ripple scale value
     */
    onRippleScaleChange(value) {
        this.controls.rippleScaleDisplay.textContent = value.toFixed(1);
        this.emitDistortionChange();
    }

    /**
     * Handle falloff distance change
     * @param {number} value - New falloff distance value
     */
    onFalloffDistanceChange(value) {
        this.controls.falloffDistanceDisplay.textContent = value.toFixed(2);
        this.emitDistortionChange();
    }

    /**
     * Handle noise scale change
     * @param {number} value - New noise scale value
     */
    onNoiseScaleChange(value) {
        this.controls.noiseScaleDisplay.textContent = value.toFixed(1);
        this.emitDistortionChange();
    }

    /**
     * Handle noise strength change
     * @param {number} value - New noise strength value
     */
    onNoiseStrengthChange(value) {
        this.controls.noiseStrengthDisplay.textContent = value.toFixed(3);
        this.emitDistortionChange();
    }

    /**
     * Emit toggle event
     */
    emitToggleEvent() {
        window.dispatchEvent(new CustomEvent('liquidDistortionToggle', {
            detail: { active: this.defaultValues.active }
        }));
    }

    /**
     * Emit distortion change event
     */
    emitDistortionChange() {
        window.dispatchEvent(new CustomEvent('liquidDistortionChange', {
            detail: {
                strength: parseFloat(this.controls.distortionStrengthSlider.value),
                rippleSpeed: parseFloat(this.controls.rippleSpeedSlider.value),
                rippleScale: parseFloat(this.controls.rippleScaleSlider.value),
                falloffDistance: parseFloat(this.controls.falloffDistanceSlider.value),
                noiseScale: parseFloat(this.controls.noiseScaleSlider.value),
                noiseStrength: parseFloat(this.controls.noiseStrengthSlider.value)
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
        this.strengthSlider.setValue(this.defaultValues.strength);
        this.rippleSpeedSlider.setValue(this.defaultValues.rippleSpeed);
        this.rippleScaleSlider.setValue(this.defaultValues.rippleScale);
        this.falloffDistanceSlider.setValue(this.defaultValues.falloffDistance);
        this.noiseScaleSlider.setValue(this.defaultValues.noiseScale);
        this.noiseStrengthSlider.setValue(this.defaultValues.noiseStrength);
        
        this.controls.distortionStrengthDisplay.textContent = this.defaultValues.strength.toFixed(3);
        this.controls.rippleSpeedDisplay.textContent = this.defaultValues.rippleSpeed.toFixed(1);
        this.controls.rippleScaleDisplay.textContent = this.defaultValues.rippleScale.toFixed(1);
        this.controls.falloffDistanceDisplay.textContent = this.defaultValues.falloffDistance.toFixed(2);
        this.controls.noiseScaleDisplay.textContent = this.defaultValues.noiseScale.toFixed(1);
        this.controls.noiseStrengthDisplay.textContent = this.defaultValues.noiseStrength.toFixed(3);
    }

    /**
     * Update control values
     * @param {Object} values - Values to update
     */
    updateValues(values) {
        if (values.strength !== undefined) {
            this.strengthSlider.setValue(values.strength);
            this.controls.distortionStrengthDisplay.textContent = values.strength.toFixed(3);
        }
        if (values.rippleSpeed !== undefined) {
            this.rippleSpeedSlider.setValue(values.rippleSpeed);
            this.controls.rippleSpeedDisplay.textContent = values.rippleSpeed.toFixed(1);
        }
        if (values.rippleScale !== undefined) {
            this.rippleScaleSlider.setValue(values.rippleScale);
            this.controls.rippleScaleDisplay.textContent = values.rippleScale.toFixed(1);
        }
        if (values.falloffDistance !== undefined) {
            this.falloffDistanceSlider.setValue(values.falloffDistance);
            this.controls.falloffDistanceDisplay.textContent = values.falloffDistance.toFixed(2);
        }
        if (values.noiseScale !== undefined) {
            this.noiseScaleSlider.setValue(values.noiseScale);
            this.controls.noiseScaleDisplay.textContent = values.noiseScale.toFixed(1);
        }
        if (values.noiseStrength !== undefined) {
            this.noiseStrengthSlider.setValue(values.noiseStrength);
            this.controls.noiseStrengthDisplay.textContent = values.noiseStrength.toFixed(3);
        }
    }

    /**
     * Destroy the section
     */
    destroy() {
        if (this.section) {
            this.section.destroy();
        }
        if (this.toggleBtn) {
            this.toggleBtn.destroy();
        }
        if (this.strengthSlider) {
            this.strengthSlider.destroy();
        }
        if (this.rippleSpeedSlider) {
            this.rippleSpeedSlider.destroy();
        }
        if (this.rippleScaleSlider) {
            this.rippleScaleSlider.destroy();
        }
        if (this.falloffDistanceSlider) {
            this.falloffDistanceSlider.destroy();
        }
        if (this.noiseScaleSlider) {
            this.noiseScaleSlider.destroy();
        }
        if (this.noiseStrengthSlider) {
            this.noiseStrengthSlider.destroy();
        }
    }
}
