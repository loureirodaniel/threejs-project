/**
 * Section - Reusable collapsible section component
 * @param {Object} props - Component properties
 * @param {string} props.title - Section title
 * @param {React.ReactNode} props.children - Section content
 * @param {boolean} props.isExpanded - Whether section is expanded
 * @param {Function} props.onToggle - Toggle handler
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Inline styles
 */
export class Section {
    constructor(props = {}) {
        this.props = {
            title: '',
            children: null,
            isExpanded: false,
            onToggle: () => {},
            className: '',
            style: {},
            ...props
        };
        this.element = null;
        this.headerElement = null;
        this.contentElement = null;
        this.toggleButton = null;
    }

    /**
     * Create the section element
     * @returns {HTMLElement} Section element
     */
    create() {
        this.element = document.createElement('div');
        this.element.className = this.getClassName();
        Object.assign(this.element.style, this.getDefaultStyles(), this.props.style);

        // Create header
        this.headerElement = document.createElement('div');
        this.headerElement.className = 'section-header';
        this.headerElement.style.cssText = this.getHeaderStyles();

        // Create title
        const titleElement = document.createElement('h4');
        titleElement.textContent = this.props.title;
        titleElement.style.cssText = this.getTitleStyles();

        // Create toggle button
        this.toggleButton = document.createElement('button');
        this.toggleButton.textContent = this.props.isExpanded ? '−' : '+';
        this.toggleButton.className = 'section-toggle';
        this.toggleButton.style.cssText = this.getToggleButtonStyles();

        // Create content container
        this.contentElement = document.createElement('div');
        this.contentElement.className = 'section-content';
        this.contentElement.id = `${this.props.title.toLowerCase().replace(/\s+/g, '-')}-content`;
        this.contentElement.style.cssText = this.getContentStyles();

        // Assemble header
        this.headerElement.appendChild(titleElement);
        this.headerElement.appendChild(this.toggleButton);

        // Assemble section
        this.element.appendChild(this.headerElement);
        this.element.appendChild(this.contentElement);

        // Add content if provided
        if (this.props.children) {
            this.setContent(this.props.children);
        }

        // Add event listeners
        this.setupEventListeners();

        // Set initial state
        this.updateExpandedState();

        return this.element;
    }

    /**
     * Get CSS class name
     * @returns {string} CSS class name
     */
    getClassName() {
        return `debug-section ${this.props.className}`.trim();
    }

    /**
     * Get default section styles
     * @returns {Object} Default styles
     */
    getDefaultStyles() {
        return {
            marginBottom: '15px'
        };
    }

    /**
     * Get header styles
     * @returns {string} Header styles
     */
    getHeaderStyles() {
        return `
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            padding: 8px 0;
            border-bottom: 1px solid #333;
            user-select: none;
        `;
    }

    /**
     * Get title styles
     * @returns {string} Title styles
     */
    getTitleStyles() {
        return `
            margin: 0;
            color: #00ff88;
            font-size: 14px;
            font-weight: 600;
        `;
    }

    /**
     * Get toggle button styles
     * @returns {string} Toggle button styles
     */
    getToggleButtonStyles() {
        return `
            background: #333;
            color: white;
            border: 1px solid #555;
            padding: 2px 6px;
            border-radius: 3px;
            cursor: pointer;
            font-family: inherit;
            font-size: 10px;
            min-width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
    }

    /**
     * Get content styles
     * @returns {string} Content styles
     */
    getContentStyles() {
        return `
            padding-top: 10px;
            transition: all 0.3s ease;
            overflow: hidden;
        `;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Toggle on button click
        this.toggleButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Toggle on header click
        this.headerElement.addEventListener('click', () => {
            this.toggle();
        });
    }

    /**
     * Toggle section expanded state
     */
    toggle() {
        this.props.isExpanded = !this.props.isExpanded;
        this.updateExpandedState();
        this.props.onToggle(this.props.isExpanded);
    }

    /**
     * Update expanded state
     */
    updateExpandedState() {
        if (this.props.isExpanded) {
            this.contentElement.style.display = 'block';
            this.contentElement.style.height = 'auto';
            this.contentElement.style.opacity = '1';
            this.toggleButton.textContent = '−';
        } else {
            this.contentElement.style.display = 'none';
            this.contentElement.style.height = '0';
            this.contentElement.style.opacity = '0';
            this.toggleButton.textContent = '+';
        }
    }

    /**
     * Set section content
     * @param {HTMLElement|string} content - Content to set
     */
    setContent(content) {
        this.contentElement.innerHTML = '';
        if (typeof content === 'string') {
            this.contentElement.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            this.contentElement.appendChild(content);
        }
    }

    /**
     * Add content to section
     * @param {HTMLElement} element - Element to add
     */
    addContent(element) {
        if (element instanceof HTMLElement) {
            this.contentElement.appendChild(element);
        }
    }

    /**
     * Update section properties
     * @param {Object} newProps - New properties
     */
    update(newProps) {
        this.props = { ...this.props, ...newProps };
        
        if (newProps.title !== undefined) {
            const titleElement = this.headerElement.querySelector('h4');
            if (titleElement) {
                titleElement.textContent = this.props.title;
            }
        }
        
        if (newProps.isExpanded !== undefined) {
            this.updateExpandedState();
        }
        
        if (newProps.children !== undefined) {
            this.setContent(this.props.children);
        }
    }

    /**
     * Set expanded state
     * @param {boolean} expanded - Whether to expand
     */
    setExpanded(expanded) {
        this.props.isExpanded = expanded;
        this.updateExpandedState();
    }

    /**
     * Check if section is expanded
     * @returns {boolean} Whether section is expanded
     */
    isExpanded() {
        return this.props.isExpanded;
    }

    /**
     * Destroy the section element
     */
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
        this.headerElement = null;
        this.contentElement = null;
        this.toggleButton = null;
    }

    /**
     * Get the section element
     * @returns {HTMLElement} Section element
     */
    getElement() {
        return this.element;
    }

    /**
     * Get the content element
     * @returns {HTMLElement} Content element
     */
    getContentElement() {
        return this.contentElement;
    }
}
