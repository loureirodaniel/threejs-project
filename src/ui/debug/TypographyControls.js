/**
 * TypographyControls - Typography control section for debug panel
 */
import { Section } from '../../components/Section/Section.js';
import { Slider } from '../../components/Slider/Slider.js';

export class TypographyControls {
    constructor() {
        this.section = null;
        this.controls = {};
        this.defaultValues = {
            headerSize: 48,
            bodySize: 24
        };
    }

    /**
     * Create the typography controls section
     * @returns {HTMLElement} Section element
     */
    create() {
        this.section = new Section({
            title: 'Typography',
            isExpanded: false,
            onToggle: (expanded) => this.onToggle(expanded)
        });

        const container = this.section.create();

        // Header size slider
        this.headerSlider = new Slider({
            label: 'Header Font Size',
            value: this.defaultValues.headerSize,
            min: 20,
            max: 80,
            step: 1,
            onChange: (value) => this.onHeaderSizeChange(value)
        });

        // Body size slider
        this.bodySlider = new Slider({
            label: 'Body Font Size',
            value: this.defaultValues.bodySize,
            min: 12,
            max: 40,
            step: 1,
            onChange: (value) => this.onBodySizeChange(value)
        });

        // Add sliders to section
        this.section.addContent(this.headerSlider.create());
        this.section.addContent(this.bodySlider.create());

        // Store control references
        this.controls.headerSlider = this.headerSlider.getSliderElement();
        this.controls.bodySlider = this.bodySlider.getSliderElement();
        this.controls.headerSize = this.headerSlider.getElement().querySelector('span');
        this.controls.bodySize = this.bodySlider.getElement().querySelector('span');

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
     * Handle header size change
     * @param {number} value - New header size
     */
    onHeaderSizeChange(value) {
        this.controls.headerSize.textContent = value;
        // Emit event for external handling
        window.dispatchEvent(new CustomEvent('typographyChange', {
            detail: { type: 'headerSize', value }
        }));
    }

    /**
     * Handle body size change
     * @param {number} value - New body size
     */
    onBodySizeChange(value) {
        this.controls.bodySize.textContent = value;
        // Emit event for external handling
        window.dispatchEvent(new CustomEvent('typographyChange', {
            detail: { type: 'bodySize', value }
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
        this.headerSlider.setValue(this.defaultValues.headerSize);
        this.bodySlider.setValue(this.defaultValues.bodySize);
        this.controls.headerSize.textContent = this.defaultValues.headerSize;
        this.controls.bodySize.textContent = this.defaultValues.bodySize;
    }

    /**
     * Update control values
     * @param {Object} values - Values to update
     */
    updateValues(values) {
        if (values.headerSize !== undefined) {
            this.headerSlider.setValue(values.headerSize);
            this.controls.headerSize.textContent = values.headerSize;
        }
        if (values.bodySize !== undefined) {
            this.bodySlider.setValue(values.bodySize);
            this.controls.bodySize.textContent = values.bodySize;
        }
    }

    /**
     * Destroy the section
     */
    destroy() {
        if (this.section) {
            this.section.destroy();
        }
        if (this.headerSlider) {
            this.headerSlider.destroy();
        }
        if (this.bodySlider) {
            this.bodySlider.destroy();
        }
    }
}
