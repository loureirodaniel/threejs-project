/**
 * FogControls - Fog effect control section for debug panel
 * Follows project rules for debug controls with 1-10 range
 */
import { Section } from '../../components/Section/Section.js';
import { Slider } from '../../components/Slider/Slider.js';

export class FogControls {
    constructor() {
        this.section = null;
        this.controls = {};
        this.defaultValues = {
            enabled: true,
            density: 5, // Normalized value (1-10 range)
            colorR: 5, // Normalized value for grey color
            colorG: 5,
            colorB: 5
        };
    }

    /**
     * Create the fog controls section
     * @returns {HTMLElement} Section element
     */
    create() {
        this.section = new Section({
            title: 'Fog Effect',
            isExpanded: false,
            onToggle: (expanded) => this.onToggle(expanded)
        });

        const container = this.section.create();

        // Fog enabled toggle
        this.enabledToggle = document.createElement('div');
        this.enabledToggle.className = 'debug-control';
        this.enabledToggle.innerHTML = `
            <label class="debug-label">Fog Enabled</label>
            <input type="checkbox" id="fog-enabled" ${this.defaultValues.enabled ? 'checked' : ''}>
        `;
        this.enabledToggle.querySelector('#fog-enabled').addEventListener('change', (e) => {
            this.onEnabledChange(e.target.checked);
        });
        container.appendChild(this.enabledToggle);

        // Fog density slider (1-10 range)
        this.densitySlider = new Slider({
            label: 'Fog Density',
            value: this.defaultValues.density,
            min: 1,
            max: 10,
            step: 0.1,
            onChange: (value) => this.onDensityChange(value)
        });
        container.appendChild(this.densitySlider.create());

        // Fog color R slider (1-10 range)
        this.colorRSlider = new Slider({
            label: 'Fog Color Red',
            value: this.defaultValues.colorR,
            min: 1,
            max: 10,
            step: 0.1,
            onChange: (value) => this.onColorRChange(value)
        });
        container.appendChild(this.colorRSlider.create());

        // Fog color G slider (1-10 range)
        this.colorGSlider = new Slider({
            label: 'Fog Color Green',
            value: this.defaultValues.colorG,
            min: 1,
            max: 10,
            step: 0.1,
            onChange: (value) => this.onColorGChange(value)
        });
        container.appendChild(this.colorGSlider.create());

        // Fog color B slider (1-10 range)
        this.colorBSlider = new Slider({
            label: 'Fog Color Blue',
            value: this.defaultValues.colorB,
            min: 1,
            max: 10,
            step: 0.1,
            onChange: (value) => this.onColorBChange(value)
        });
        container.appendChild(this.colorBSlider.create());

        // Reset button
        this.resetButton = document.createElement('button');
        this.resetButton.className = 'debug-button';
        this.resetButton.textContent = 'Reset Fog';
        this.resetButton.addEventListener('click', () => this.onReset());
        container.appendChild(this.resetButton);

        return container;
    }

    /**
     * Handle section toggle
     */
    onToggle(expanded) {
        console.debug('FogControls: Section toggled', expanded);
    }

    /**
     * Handle fog enabled toggle
     */
    onEnabledChange(enabled) {
        this.defaultValues.enabled = enabled;
        console.debug('FogControls: Fog enabled changed to', enabled);
        
        // Emit event for external handling
        window.dispatchEvent(new CustomEvent('fogEnabledChanged', {
            detail: { enabled }
        }));
    }

    /**
     * Handle fog density change (1-10 range)
     */
    onDensityChange(value) {
        this.defaultValues.density = value;
        console.debug('FogControls: Fog density changed to', value);
        
        // Emit event for external handling
        window.dispatchEvent(new CustomEvent('fogDensityChanged', {
            detail: { density: value }
        }));
    }

    /**
     * Handle fog color R change (1-10 range)
     */
    onColorRChange(value) {
        this.defaultValues.colorR = value;
        console.debug('FogControls: Fog color R changed to', value);
        
        // Emit event for external handling
        window.dispatchEvent(new CustomEvent('fogColorChanged', {
            detail: { 
                color: {
                    r: this.defaultValues.colorR,
                    g: this.defaultValues.colorG,
                    b: this.defaultValues.colorB
                }
            }
        }));
    }

    /**
     * Handle fog color G change (1-10 range)
     */
    onColorGChange(value) {
        this.defaultValues.colorG = value;
        console.debug('FogControls: Fog color G changed to', value);
        
        // Emit event for external handling
        window.dispatchEvent(new CustomEvent('fogColorChanged', {
            detail: { 
                color: {
                    r: this.defaultValues.colorR,
                    g: this.defaultValues.colorG,
                    b: this.defaultValues.colorB
                }
            }
        }));
    }

    /**
     * Handle fog color B change (1-10 range)
     */
    onColorBChange(value) {
        this.defaultValues.colorB = value;
        console.debug('FogControls: Fog color B changed to', value);
        
        // Emit event for external handling
        window.dispatchEvent(new CustomEvent('fogColorChanged', {
            detail: { 
                color: {
                    r: this.defaultValues.colorR,
                    g: this.defaultValues.colorG,
                    b: this.defaultValues.colorB
                }
            }
        }));
    }

    /**
     * Handle reset button click
     */
    onReset() {
        console.debug('FogControls: Reset button clicked');
        
        // Reset to default values
        this.defaultValues.enabled = true;
        this.defaultValues.density = 5;
        this.defaultValues.colorR = 5;
        this.defaultValues.colorG = 5;
        this.defaultValues.colorB = 5;
        
        // Update UI controls
        this.enabledToggle.querySelector('#fog-enabled').checked = this.defaultValues.enabled;
        this.densitySlider.setValue(this.defaultValues.density);
        this.colorRSlider.setValue(this.defaultValues.colorR);
        this.colorGSlider.setValue(this.defaultValues.colorG);
        this.colorBSlider.setValue(this.defaultValues.colorB);
        
        // Emit reset event
        window.dispatchEvent(new CustomEvent('fogReset', {
            detail: { values: this.defaultValues }
        }));
    }

    /**
     * Update control values externally
     */
    updateValues(values) {
        if (values.enabled !== undefined) {
            this.defaultValues.enabled = values.enabled;
            this.enabledToggle.querySelector('#fog-enabled').checked = values.enabled;
        }
        
        if (values.density !== undefined) {
            this.defaultValues.density = values.density;
            this.densitySlider.setValue(values.density);
        }
        
        if (values.colorR !== undefined) {
            this.defaultValues.colorR = values.colorR;
            this.colorRSlider.setValue(values.colorR);
        }
        
        if (values.colorG !== undefined) {
            this.defaultValues.colorG = values.colorG;
            this.colorGSlider.setValue(values.colorG);
        }
        
        if (values.colorB !== undefined) {
            this.defaultValues.colorB = values.colorB;
            this.colorBSlider.setValue(values.colorB);
        }
    }

    /**
     * Get current control values
     */
    getValues() {
        return { ...this.defaultValues };
    }

    /**
     * Destroy the controls
     */
    destroy() {
        if (this.section) {
            this.section.destroy();
            this.section = null;
        }
        
        this.controls = {};
        console.debug('FogControls: Destroyed');
    }
}
