/**
 * SpotlightControls - Spotlight effect control section for debug panel
 */
import { Section } from '../../components/Section/Section.js';
import { Slider } from '../../components/Slider/Slider.js';

export class SpotlightControls {
    constructor() {
        this.section = null;
        this.controls = {};
        this.defaultValues = {
            radius: 2,
            vignetteOpacity: 1.0,
            gridOpacity: 0.4,
            timelineVignetteStrength: 0.60,
            timelineVignetteWidth: 4.0
        };
    }

    /**
     * Create the spotlight controls section
     * @returns {HTMLElement} Section element
     */
    create() {
        this.section = new Section({
            title: 'Spotlight Effect',
            isExpanded: false,
            onToggle: (expanded) => this.onToggle(expanded)
        });

        const container = this.section.create();

        // Spotlight radius slider
        this.radiusSlider = new Slider({
            label: 'Spotlight Radius',
            value: this.defaultValues.radius,
            min: 0.5,
            max: 5,
            step: 0.1,
            onChange: (value) => this.onRadiusChange(value)
        });

        // Vignette opacity slider
        this.vignetteSlider = new Slider({
            label: 'Vignette Opacity',
            value: this.defaultValues.vignetteOpacity,
            min: 0.5,
            max: 1.0,
            step: 0.1,
            onChange: (value) => this.onVignetteChange(value)
        });

        // Timeline vignette strength slider
        this.timelineVignetteStrengthSlider = new Slider({
            label: 'Timeline Vignette Strength',
            value: this.defaultValues.timelineVignetteStrength,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: (value) => this.onTimelineVignetteStrengthChange(value)
        });

        // Timeline vignette width slider
        this.timelineVignetteWidthSlider = new Slider({
            label: 'Timeline Vignette Width',
            value: this.defaultValues.timelineVignetteWidth,
            min: 1,
            max: 10,
            step: 0.1,
            onChange: (value) => this.onTimelineVignetteWidthChange(value)
        });

        // Grid opacity slider
        this.gridSlider = new Slider({
            label: 'Grid Opacity',
            value: this.defaultValues.gridOpacity,
            min: 0.1,
            max: 1.0,
            step: 0.1,
            onChange: (value) => this.onGridChange(value)
        });

        // Add sliders to section
        this.section.addContent(this.radiusSlider.create());
        this.section.addContent(this.vignetteSlider.create());
        this.section.addContent(this.timelineVignetteStrengthSlider.create());
        this.section.addContent(this.timelineVignetteWidthSlider.create());
        this.section.addContent(this.gridSlider.create());

        // Store control references
        this.controls.spotlightRadiusSlider = this.radiusSlider.getSliderElement();
        this.controls.vignetteSlider = this.vignetteSlider.getSliderElement();
        this.controls.gridSlider = this.gridSlider.getSliderElement();
        this.controls.timelineVignetteStrengthSlider = this.timelineVignetteStrengthSlider.getSliderElement();
        this.controls.timelineVignetteWidthSlider = this.timelineVignetteWidthSlider.getSliderElement();
        this.controls.spotlightRadiusDisplay = this.radiusSlider.getElement().querySelector('span');
        this.controls.vignetteOpacityDisplay = this.vignetteSlider.getElement().querySelector('span');
        this.controls.gridOpacityDisplay = this.gridSlider.getElement().querySelector('span');
        this.controls.timelineVignetteStrengthDisplay = this.timelineVignetteStrengthSlider.getElement().querySelector('span');
        this.controls.timelineVignetteWidthDisplay = this.timelineVignetteWidthSlider.getElement().querySelector('span');

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
     * Handle radius change
     * @param {number} value - New radius value
     */
    onRadiusChange(value) {
        this.controls.spotlightRadiusDisplay.textContent = value;
        this.emitSpotlightChange();
    }

    /**
     * Handle vignette change
     * @param {number} value - New vignette opacity
     */
    onVignetteChange(value) {
        this.controls.vignetteOpacityDisplay.textContent = value;
        this.emitSpotlightChange();
    }

    /**
     * Handle grid change
     * @param {number} value - New grid opacity
     */
    onGridChange(value) {
        this.controls.gridOpacityDisplay.textContent = value;
        this.emitSpotlightChange();
    }

    /**
     * Handle timeline vignette strength change
     * @param {number} value - New strength value
     */
    onTimelineVignetteStrengthChange(value) {
        this.controls.timelineVignetteStrengthDisplay.textContent = value.toFixed(2);
        this.emitTimelineVignetteChange();
    }

    /**
     * Handle timeline vignette width change
     * @param {number} value - New width value
     */
    onTimelineVignetteWidthChange(value) {
        this.controls.timelineVignetteWidthDisplay.textContent = value.toFixed(1);
        this.emitTimelineVignetteChange();
    }

    /**
     * Emit spotlight change event
     */
    emitSpotlightChange() {
        window.dispatchEvent(new CustomEvent('spotlightChange', {
            detail: {
                radius: parseFloat(this.controls.spotlightRadiusSlider.value),
                vignetteOpacity: parseFloat(this.controls.vignetteSlider.value),
                gridOpacity: parseFloat(this.controls.gridSlider.value)
            }
        }));
    }

    /**
     * Emit timeline vignette change event
     */
    emitTimelineVignetteChange() {
        window.dispatchEvent(new CustomEvent('timelineVignetteChange', {
            detail: {
                strength: parseFloat(this.controls.timelineVignetteStrengthSlider.value),
                width: parseFloat(this.controls.timelineVignetteWidthSlider.value)
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
        this.radiusSlider.setValue(this.defaultValues.radius);
        this.vignetteSlider.setValue(this.defaultValues.vignetteOpacity);
        this.gridSlider.setValue(this.defaultValues.gridOpacity);
        this.timelineVignetteStrengthSlider.setValue(this.defaultValues.timelineVignetteStrength);
        this.timelineVignetteWidthSlider.setValue(this.defaultValues.timelineVignetteWidth);
        
        this.controls.spotlightRadiusDisplay.textContent = this.defaultValues.radius;
        this.controls.vignetteOpacityDisplay.textContent = this.defaultValues.vignetteOpacity;
        this.controls.gridOpacityDisplay.textContent = this.defaultValues.gridOpacity;
        this.controls.timelineVignetteStrengthDisplay.textContent = this.defaultValues.timelineVignetteStrength.toFixed(2);
        this.controls.timelineVignetteWidthDisplay.textContent = this.defaultValues.timelineVignetteWidth.toFixed(1);
    }

    /**
     * Update control values
     * @param {Object} values - Values to update
     */
    updateValues(values) {
        if (values.radius !== undefined) {
            this.radiusSlider.setValue(values.radius);
            this.controls.spotlightRadiusDisplay.textContent = values.radius;
        }
        if (values.vignetteOpacity !== undefined) {
            this.vignetteSlider.setValue(values.vignetteOpacity);
            this.controls.vignetteOpacityDisplay.textContent = values.vignetteOpacity;
        }
        if (values.gridOpacity !== undefined) {
            this.gridSlider.setValue(values.gridOpacity);
            this.controls.gridOpacityDisplay.textContent = values.gridOpacity;
        }
        if (values.timelineVignetteStrength !== undefined) {
            this.timelineVignetteStrengthSlider.setValue(values.timelineVignetteStrength);
            this.controls.timelineVignetteStrengthDisplay.textContent = values.timelineVignetteStrength.toFixed(2);
        }
        if (values.timelineVignetteWidth !== undefined) {
            this.timelineVignetteWidthSlider.setValue(values.timelineVignetteWidth);
            this.controls.timelineVignetteWidthDisplay.textContent = values.timelineVignetteWidth.toFixed(1);
        }
    }

    /**
     * Destroy the section
     */
    destroy() {
        if (this.section) {
            this.section.destroy();
        }
        if (this.radiusSlider) {
            this.radiusSlider.destroy();
        }
        if (this.vignetteSlider) {
            this.vignetteSlider.destroy();
        }
        if (this.gridSlider) {
            this.gridSlider.destroy();
        }
        if (this.timelineVignetteStrengthSlider) {
            this.timelineVignetteStrengthSlider.destroy();
        }
        if (this.timelineVignetteWidthSlider) {
            this.timelineVignetteWidthSlider.destroy();
        }
    }
}
