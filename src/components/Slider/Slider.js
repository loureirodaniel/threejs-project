/**
 * Slider - Reusable slider component
 * @param {Object} props - Component properties
 * @param {number} props.value - Current value
 * @param {number} props.min - Minimum value
 * @param {number} props.max - Maximum value
 * @param {number} props.step - Step value
 * @param {Function} props.onChange - Change handler
 * @param {string} props.label - Label text
 * @param {string|number} props.displayValue - Value to display
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Inline styles
 */
export class Slider {
    constructor(props = {}) {
        this.props = {
            value: 0,
            min: 0,
            max: 100,
            step: 1,
            onChange: () => {},
            label: '',
            displayValue: null,
            className: '',
            style: {},
            ...props
        };
        this.element = null;
        this.labelElement = null;
        this.sliderElement = null;
        this.displayElement = null;
    }

    /**
     * Create the slider element
     * @returns {HTMLElement} Slider container element
     */
    create() {
        this.element = document.createElement('div');
        this.element.className = this.getClassName();
        Object.assign(this.element.style, this.getDefaultStyles(), this.props.style);

        // Create label
        this.labelElement = document.createElement('label');
        this.labelElement.textContent = this.props.label;
        this.labelElement.style.cssText = this.getLabelStyles();

        // Create slider input
        this.sliderElement = document.createElement('input');
        this.sliderElement.type = 'range';
        this.sliderElement.value = this.props.value;
        this.sliderElement.min = this.props.min;
        this.sliderElement.max = this.props.max;
        this.sliderElement.step = this.props.step;
        this.sliderElement.style.cssText = this.getSliderStyles();

        // Create display element
        this.displayElement = document.createElement('span');
        this.displayElement.textContent = this.props.displayValue !== null ? this.props.displayValue : this.props.value;
        this.displayElement.style.cssText = this.getDisplayStyles();

        // Update label to include display value
        this.updateLabel();

        // Add change handler
        this.sliderElement.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.props.onChange(value);
            this.updateDisplay(value);
        });

        // Assemble the component
        this.element.appendChild(this.labelElement);
        this.element.appendChild(this.sliderElement);

        return this.element;
    }

    /**
     * Get CSS class name
     * @returns {string} CSS class name
     */
    getClassName() {
        return `slider-container ${this.props.className}`.trim();
    }

    /**
     * Get default container styles
     * @returns {Object} Default styles
     */
    getDefaultStyles() {
        return {
            marginBottom: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
        };
    }

    /**
     * Get label styles
     * @returns {string} Label styles
     */
    getLabelStyles() {
        return `
            display: block;
            margin-bottom: 5px;
            color: white;
            font-size: 14px;
            font-weight: 500;
        `;
    }

    /**
     * Get slider styles
     * @returns {string} Slider styles
     */
    getSliderStyles() {
        return `
            width: 100%;
            height: 6px;
            border-radius: 3px;
            background: #333;
            outline: none;
            -webkit-appearance: none;
            appearance: none;
            cursor: pointer;
        `;
    }

    /**
     * Get display styles
     * @returns {string} Display styles
     */
    getDisplayStyles() {
        return `
            color: #00ff88;
            font-weight: bold;
            font-size: 12px;
            margin-left: 8px;
        `;
    }

    /**
     * Update the label with current value
     */
    updateLabel() {
        const displayValue = this.props.displayValue !== null ? this.props.displayValue : this.props.value;
        this.labelElement.textContent = `${this.props.label}: ${displayValue}`;
    }

    /**
     * Update the display value
     * @param {number} value - New value
     */
    updateDisplay(value) {
        if (this.displayElement) {
            this.displayElement.textContent = value;
        }
        this.updateLabel();
    }

    /**
     * Update slider properties
     * @param {Object} newProps - New properties
     */
    update(newProps) {
        this.props = { ...this.props, ...newProps };
        
        if (this.sliderElement) {
            this.sliderElement.value = this.props.value;
            this.sliderElement.min = this.props.min;
            this.sliderElement.max = this.props.max;
            this.sliderElement.step = this.props.step;
        }
        
        this.updateDisplay(this.props.value);
    }

    /**
     * Set the slider value
     * @param {number} value - New value
     */
    setValue(value) {
        this.props.value = value;
        if (this.sliderElement) {
            this.sliderElement.value = value;
        }
        this.updateDisplay(value);
    }

    /**
     * Get the current value
     * @returns {number} Current value
     */
    getValue() {
        return this.props.value;
    }

    /**
     * Destroy the slider element
     */
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
        this.labelElement = null;
        this.sliderElement = null;
        this.displayElement = null;
    }

    /**
     * Get the slider container element
     * @returns {HTMLElement} Slider container element
     */
    getElement() {
        return this.element;
    }

    /**
     * Get the slider input element
     * @returns {HTMLInputElement} Slider input element
     */
    getSliderElement() {
        return this.sliderElement;
    }
}
