/**
 * SmoothScrollControls - Smooth scroll control section for debug panel
 */
import { Section } from '../../components/Section/Section.js';
import { Slider } from '../../components/Slider/Slider.js';
import { Button } from '../../components/Button/Button.js';

export class SmoothScrollControls {
    constructor() {
        this.section = null;
        this.controls = {};
        this.defaultValues = {
            sensitivity: 0.25,
            friction: 0.85
        };
    }

    /**
     * Create the smooth scroll controls section
     * @returns {HTMLElement} Section element
     */
    create() {
        this.section = new Section({
            title: 'Smooth Scroll',
            isExpanded: false,
            onToggle: (expanded) => this.onToggle(expanded)
        });

        const container = this.section.create();

        // Sensitivity slider
        this.sensitivitySlider = new Slider({
            label: 'Sensitivity',
            value: this.defaultValues.sensitivity,
            min: 0.1,
            max: 1.0,
            step: 0.05,
            onChange: (value) => this.onSensitivityChange(value)
        });

        // Friction slider
        this.frictionSlider = new Slider({
            label: 'Friction',
            value: this.defaultValues.friction,
            min: 0.7,
            max: 0.95,
            step: 0.01,
            onChange: (value) => this.onFrictionChange(value)
        });

        // Navigation buttons
        this.scrollToYearBtn = new Button({
            children: 'Scroll to 2015',
            variant: 'warning',
            size: 'small',
            onClick: () => this.onScrollToYear(2015, 2)
        });

        this.scrollToYearBtn2 = new Button({
            children: 'Scroll to 2019',
            variant: 'warning',
            size: 'small',
            onClick: () => this.onScrollToYear(2019, 14)
        });

        // Add controls to section
        this.section.addContent(this.sensitivitySlider.create());
        this.section.addContent(this.frictionSlider.create());
        
        // Add buttons container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 8px; margin-top: 10px;';
        buttonContainer.appendChild(this.scrollToYearBtn.create());
        buttonContainer.appendChild(this.scrollToYearBtn2.create());
        this.section.addContent(buttonContainer);

        // Store control references
        this.controls.smoothScrollSensitivitySlider = this.sensitivitySlider.getSliderElement();
        this.controls.smoothScrollFrictionSlider = this.frictionSlider.getSliderElement();
        this.controls.smoothScrollSensitivityDisplay = this.sensitivitySlider.getElement().querySelector('span');
        this.controls.smoothScrollFrictionDisplay = this.frictionSlider.getElement().querySelector('span');
        this.controls.scrollToYearBtn = this.scrollToYearBtn.getElement();
        this.controls.scrollToYearBtn2 = this.scrollToYearBtn2.getElement();

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
     * Handle sensitivity change
     * @param {number} value - New sensitivity value
     */
    onSensitivityChange(value) {
        this.controls.smoothScrollSensitivityDisplay.textContent = value.toFixed(2);
        this.emitSmoothScrollChange();
    }

    /**
     * Handle friction change
     * @param {number} value - New friction value
     */
    onFrictionChange(value) {
        this.controls.smoothScrollFrictionDisplay.textContent = value.toFixed(2);
        this.emitSmoothScrollChange();
    }

    /**
     * Handle scroll to year
     * @param {number} year - Year to scroll to
     * @param {number} offset - Timeline offset
     */
    onScrollToYear(year, offset) {
        window.dispatchEvent(new CustomEvent('smoothScrollNavigation', {
            detail: { year, offset }
        }));
    }

    /**
     * Emit smooth scroll change event
     */
    emitSmoothScrollChange() {
        window.dispatchEvent(new CustomEvent('smoothScrollChange', {
            detail: {
                sensitivity: parseFloat(this.controls.smoothScrollSensitivitySlider.value),
                friction: parseFloat(this.controls.smoothScrollFrictionSlider.value)
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
        this.sensitivitySlider.setValue(this.defaultValues.sensitivity);
        this.frictionSlider.setValue(this.defaultValues.friction);
        
        this.controls.smoothScrollSensitivityDisplay.textContent = this.defaultValues.sensitivity.toFixed(2);
        this.controls.smoothScrollFrictionDisplay.textContent = this.defaultValues.friction.toFixed(2);
    }

    /**
     * Update control values
     * @param {Object} values - Values to update
     */
    updateValues(values) {
        if (values.sensitivity !== undefined) {
            this.sensitivitySlider.setValue(values.sensitivity);
            this.controls.smoothScrollSensitivityDisplay.textContent = values.sensitivity.toFixed(2);
        }
        if (values.friction !== undefined) {
            this.frictionSlider.setValue(values.friction);
            this.controls.smoothScrollFrictionDisplay.textContent = values.friction.toFixed(2);
        }
    }

    /**
     * Destroy the section
     */
    destroy() {
        if (this.section) {
            this.section.destroy();
        }
        if (this.sensitivitySlider) {
            this.sensitivitySlider.destroy();
        }
        if (this.frictionSlider) {
            this.frictionSlider.destroy();
        }
        if (this.scrollToYearBtn) {
            this.scrollToYearBtn.destroy();
        }
        if (this.scrollToYearBtn2) {
            this.scrollToYearBtn2.destroy();
        }
    }
}
