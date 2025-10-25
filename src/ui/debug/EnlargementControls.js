/**
 * EnlargementControls - Image enlargement control section for debug panel
 */
import { Section } from '../../components/Section/Section.js';
import { Slider } from '../../components/Slider/Slider.js';

export class EnlargementControls {
    constructor() {
        this.section = null;
        this.controls = {};
        this.defaultValues = {
            backgroundBlur: 5,
            blurOpacity: 0.8,
            leftBlurWidth: 4,
            rightBlurWidth: 4
        };
    }

    /**
     * Create the enlargement controls section
     * @returns {HTMLElement} Section element
     */
    create() {
        this.section = new Section({
            title: 'Image Enlargement',
            isExpanded: false,
            onToggle: (expanded) => this.onToggle(expanded)
        });

        const container = this.section.create();

        // Background blur slider
        this.backgroundBlurSlider = new Slider({
            label: 'Background Blur',
            value: this.defaultValues.backgroundBlur,
            min: 0,
            max: 20,
            step: 0.5,
            onChange: (value) => this.onBackgroundBlurChange(value)
        });

        // Blur opacity slider
        this.blurOpacitySlider = new Slider({
            label: 'Blur Opacity',
            value: this.defaultValues.blurOpacity,
            min: 0.1,
            max: 1.0,
            step: 0.1,
            onChange: (value) => this.onBlurOpacityChange(value)
        });

        // Left blur width slider
        this.leftBlurWidthSlider = new Slider({
            label: 'Left Blur Width',
            value: this.defaultValues.leftBlurWidth,
            min: 0,
            max: 50,
            step: 0.5,
            onChange: (value) => this.onLeftBlurWidthChange(value)
        });

        // Right blur width slider
        this.rightBlurWidthSlider = new Slider({
            label: 'Right Blur Width',
            value: this.defaultValues.rightBlurWidth,
            min: 0,
            max: 50,
            step: 0.5,
            onChange: (value) => this.onRightBlurWidthChange(value)
        });

        // Add sliders to section
        this.section.addContent(this.backgroundBlurSlider.create());
        this.section.addContent(this.blurOpacitySlider.create());
        this.section.addContent(this.leftBlurWidthSlider.create());
        this.section.addContent(this.rightBlurWidthSlider.create());

        // Store control references
        this.controls.backgroundBlurSlider = this.backgroundBlurSlider.getSliderElement();
        this.controls.blurOpacitySlider = this.blurOpacitySlider.getSliderElement();
        this.controls.leftBlurWidthSlider = this.leftBlurWidthSlider.getSliderElement();
        this.controls.rightBlurWidthSlider = this.rightBlurWidthSlider.getSliderElement();
        this.controls.backgroundBlurDisplay = this.backgroundBlurSlider.getElement().querySelector('span');
        this.controls.blurOpacityDisplay = this.blurOpacitySlider.getElement().querySelector('span');
        this.controls.leftBlurWidthDisplay = this.leftBlurWidthSlider.getElement().querySelector('span');
        this.controls.rightBlurWidthDisplay = this.rightBlurWidthSlider.getElement().querySelector('span');

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
     * Handle background blur change
     * @param {number} value - New blur value
     */
    onBackgroundBlurChange(value) {
        this.controls.backgroundBlurDisplay.textContent = value;
        this.emitEnlargementChange();
    }

    /**
     * Handle blur opacity change
     * @param {number} value - New opacity value
     */
    onBlurOpacityChange(value) {
        this.controls.blurOpacityDisplay.textContent = value;
        this.emitEnlargementChange();
    }

    /**
     * Handle left blur width change
     * @param {number} value - New left width value
     */
    onLeftBlurWidthChange(value) {
        this.controls.leftBlurWidthDisplay.textContent = value;
        this.emitEnlargementChange();
    }

    /**
     * Handle right blur width change
     * @param {number} value - New right width value
     */
    onRightBlurWidthChange(value) {
        this.controls.rightBlurWidthDisplay.textContent = value;
        this.emitEnlargementChange();
    }

    /**
     * Emit enlargement change event
     */
    emitEnlargementChange() {
        window.dispatchEvent(new CustomEvent('enlargementChange', {
            detail: {
                backgroundBlur: parseFloat(this.controls.backgroundBlurSlider.value),
                blurOpacity: parseFloat(this.controls.blurOpacitySlider.value),
                leftBlurWidth: parseFloat(this.controls.leftBlurWidthSlider.value),
                rightBlurWidth: parseFloat(this.controls.rightBlurWidthSlider.value)
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
        this.backgroundBlurSlider.setValue(this.defaultValues.backgroundBlur);
        this.blurOpacitySlider.setValue(this.defaultValues.blurOpacity);
        this.leftBlurWidthSlider.setValue(this.defaultValues.leftBlurWidth);
        this.rightBlurWidthSlider.setValue(this.defaultValues.rightBlurWidth);
        
        this.controls.backgroundBlurDisplay.textContent = this.defaultValues.backgroundBlur;
        this.controls.blurOpacityDisplay.textContent = this.defaultValues.blurOpacity;
        this.controls.leftBlurWidthDisplay.textContent = this.defaultValues.leftBlurWidth;
        this.controls.rightBlurWidthDisplay.textContent = this.defaultValues.rightBlurWidth;
    }

    /**
     * Update control values
     * @param {Object} values - Values to update
     */
    updateValues(values) {
        if (values.backgroundBlur !== undefined) {
            this.backgroundBlurSlider.setValue(values.backgroundBlur);
            this.controls.backgroundBlurDisplay.textContent = values.backgroundBlur;
        }
        if (values.blurOpacity !== undefined) {
            this.blurOpacitySlider.setValue(values.blurOpacity);
            this.controls.blurOpacityDisplay.textContent = values.blurOpacity;
        }
        if (values.leftBlurWidth !== undefined) {
            this.leftBlurWidthSlider.setValue(values.leftBlurWidth);
            this.controls.leftBlurWidthDisplay.textContent = values.leftBlurWidth;
        }
        if (values.rightBlurWidth !== undefined) {
            this.rightBlurWidthSlider.setValue(values.rightBlurWidth);
            this.controls.rightBlurWidthDisplay.textContent = values.rightBlurWidth;
        }
    }

    /**
     * Destroy the section
     */
    destroy() {
        if (this.section) {
            this.section.destroy();
        }
        if (this.backgroundBlurSlider) {
            this.backgroundBlurSlider.destroy();
        }
        if (this.blurOpacitySlider) {
            this.blurOpacitySlider.destroy();
        }
        if (this.leftBlurWidthSlider) {
            this.leftBlurWidthSlider.destroy();
        }
        if (this.rightBlurWidthSlider) {
            this.rightBlurWidthSlider.destroy();
        }
    }
}
