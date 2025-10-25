/**
 * Panel - Reusable collapsible panel component
 * @param {Object} props - Component properties
 * @param {string} props.title - Panel title
 * @param {React.ReactNode} props.children - Panel content
 * @param {boolean} props.isCollapsed - Whether panel is collapsed
 * @param {Function} props.onToggle - Toggle handler
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Inline styles
 */
export class Panel {
    constructor(props = {}) {
        this.props = {
            title: '',
            children: null,
            isCollapsed: false,
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
     * Create the panel element
     * @returns {HTMLElement} Panel element
     */
    create() {
        this.element = document.createElement('div');
        this.element.className = this.getClassName();
        Object.assign(this.element.style, this.getDefaultStyles(), this.props.style);

        // Create header
        this.headerElement = document.createElement('div');
        this.headerElement.className = 'panel-header';
        this.headerElement.style.cssText = this.getHeaderStyles();

        // Create title
        const titleElement = document.createElement('h4');
        titleElement.textContent = this.props.title;
        titleElement.style.cssText = this.getTitleStyles();

        // Create toggle button
        this.toggleButton = document.createElement('button');
        this.toggleButton.textContent = this.props.isCollapsed ? '+' : '−';
        this.toggleButton.className = 'panel-toggle';
        this.toggleButton.style.cssText = this.getToggleButtonStyles();

        // Create content container
        this.contentElement = document.createElement('div');
        this.contentElement.className = 'panel-content';
        this.contentElement.style.cssText = this.getContentStyles();

        // Assemble header
        this.headerElement.appendChild(titleElement);
        this.headerElement.appendChild(this.toggleButton);

        // Assemble panel
        this.element.appendChild(this.headerElement);
        this.element.appendChild(this.contentElement);

        // Add content if provided
        if (this.props.children) {
            this.setContent(this.props.children);
        }

        // Add event listeners
        this.setupEventListeners();

        // Set initial state
        this.updateCollapsedState();

        return this.element;
    }

    /**
     * Get CSS class name
     * @returns {string} CSS class name
     */
    getClassName() {
        return `panel ${this.props.className}`.trim();
    }

    /**
     * Get default panel styles
     * @returns {Object} Default styles
     */
    getDefaultStyles() {
        return {
            marginBottom: '15px',
            background: 'rgba(0, 0, 0, 0.8)',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid #333'
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
            padding: 8px 12px;
            background: rgba(0, 0, 0, 0.2);
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
            padding: 10px 12px;
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
     * Toggle panel collapsed state
     */
    toggle() {
        this.props.isCollapsed = !this.props.isCollapsed;
        this.updateCollapsedState();
        this.props.onToggle(this.props.isCollapsed);
    }

    /**
     * Update collapsed state
     */
    updateCollapsedState() {
        if (this.props.isCollapsed) {
            this.contentElement.style.display = 'none';
            this.toggleButton.textContent = '+';
        } else {
            this.contentElement.style.display = 'block';
            this.toggleButton.textContent = '−';
        }
    }

    /**
     * Set panel content
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
     * Add content to panel
     * @param {HTMLElement} element - Element to add
     */
    addContent(element) {
        if (element instanceof HTMLElement) {
            this.contentElement.appendChild(element);
        }
    }

    /**
     * Update panel properties
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
        
        if (newProps.isCollapsed !== undefined) {
            this.updateCollapsedState();
        }
        
        if (newProps.children !== undefined) {
            this.setContent(this.props.children);
        }
    }

    /**
     * Set collapsed state
     * @param {boolean} collapsed - Whether to collapse
     */
    setCollapsed(collapsed) {
        this.props.isCollapsed = collapsed;
        this.updateCollapsedState();
    }

    /**
     * Check if panel is collapsed
     * @returns {boolean} Whether panel is collapsed
     */
    isCollapsed() {
        return this.props.isCollapsed;
    }

    /**
     * Destroy the panel element
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
     * Get the panel element
     * @returns {HTMLElement} Panel element
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
