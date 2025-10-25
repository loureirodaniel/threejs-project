/**
 * Button - Reusable button component
 * @param {Object} props - Component properties
 * @param {React.ReactNode} props.children - Button content
 * @param {string} props.variant - Button variant (primary, secondary, danger, success)
 * @param {string} props.size - Button size (small, medium, large)
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.disabled - Whether button is disabled
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Inline styles
 */
export class Button {
    constructor(props = {}) {
        this.props = {
            variant: 'primary',
            size: 'medium',
            disabled: false,
            className: '',
            style: {},
            ...props
        };
        this.element = null;
    }

    /**
     * Create the button element
     * @returns {HTMLElement} Button element
     */
    create() {
        this.element = document.createElement('button');
        this.element.className = this.getClassName();
        this.element.textContent = this.props.children || '';
        this.element.disabled = this.props.disabled;
        
        // Apply inline styles
        Object.assign(this.element.style, this.getDefaultStyles(), this.props.style);
        
        // Add click handler
        if (this.props.onClick) {
            this.element.addEventListener('click', this.props.onClick);
        }
        
        return this.element;
    }

    /**
     * Get CSS class name based on props
     * @returns {string} CSS class name
     */
    getClassName() {
        const baseClass = 'btn';
        const variantClass = `btn-${this.props.variant}`;
        const sizeClass = `btn-${this.props.size}`;
        const disabledClass = this.props.disabled ? 'btn-disabled' : '';
        
        return [baseClass, variantClass, sizeClass, disabledClass, this.props.className]
            .filter(Boolean)
            .join(' ');
    }

    /**
     * Get default styles based on variant and size
     * @returns {Object} Default styles
     */
    getDefaultStyles() {
        const baseStyles = {
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            outline: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            userSelect: 'none'
        };

        const variantStyles = {
            primary: {
                backgroundColor: '#00ff88',
                color: 'black',
                border: '1px solid #00ff88'
            },
            secondary: {
                backgroundColor: '#333',
                color: 'white',
                border: '1px solid #555'
            },
            danger: {
                backgroundColor: '#ff6b6b',
                color: 'white',
                border: '1px solid #ff6b6b'
            },
            success: {
                backgroundColor: '#4ecdc4',
                color: 'white',
                border: '1px solid #4ecdc4'
            },
            warning: {
                backgroundColor: '#ffd93d',
                color: 'black',
                border: '1px solid #ffd93d'
            }
        };

        const sizeStyles = {
            small: {
                padding: '4px 8px',
                fontSize: '12px',
                minHeight: '24px'
            },
            medium: {
                padding: '8px 16px',
                fontSize: '14px',
                minHeight: '32px'
            },
            large: {
                padding: '12px 24px',
                fontSize: '16px',
                minHeight: '40px'
            }
        };

        const disabledStyles = this.props.disabled ? {
            opacity: '0.6',
            cursor: 'not-allowed',
            backgroundColor: '#666',
            color: '#999',
            border: '1px solid #666'
        } : {};

        return {
            ...baseStyles,
            ...variantStyles[this.props.variant],
            ...sizeStyles[this.props.size],
            ...disabledStyles
        };
    }

    /**
     * Update button properties
     * @param {Object} newProps - New properties
     */
    update(newProps) {
        this.props = { ...this.props, ...newProps };
        if (this.element) {
            this.element.className = this.getClassName();
            this.element.textContent = this.props.children || '';
            this.element.disabled = this.props.disabled;
            Object.assign(this.element.style, this.getDefaultStyles(), this.props.style);
        }
    }

    /**
     * Destroy the button element
     */
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
    }

    /**
     * Get the button element
     * @returns {HTMLElement} Button element
     */
    getElement() {
        return this.element;
    }
}
