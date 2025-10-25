/**
 * DebugPanelRefactored - Refactored debug panel using reusable components
 * Separates the debug panel into smaller, focused modules
 */
import { gsap } from 'gsap';
import { Button } from '../components/Button/Button.js';
import { Slider } from '../components/Slider/Slider.js';
import { Section } from '../components/Section/Section.js';
import { TypographyControls } from './debug/TypographyControls.js';
import { SpotlightControls } from './debug/SpotlightControls.js';
import { CameraControls } from './debug/CameraControls.js';
import { EnlargementControls } from './debug/EnlargementControls.js';
import { SmoothScrollControls } from './debug/SmoothScrollControls.js';
import { LiquidDistortionControls } from './debug/LiquidDistortionControls.js';

export class DebugPanelRefactored {
    constructor() {
        this.debugPanel = null;
        this.controls = {};
        this.isCollapsed = false;
        this.sections = {};
        this.sectionStates = {
            typography: false,
            spotlight: false,
            camera: false,
            enlargement: false,
            smoothScroll: false,
            liquidDistortion: false
        };
        
        this.init();
    }
    
    init() {
        this.createDebugPanel();
        this.setupSections();
        this.setupControls();
        this.animateIn();
    }

    /**
     * Create the main debug panel
     */
    createDebugPanel() {
        this.debugPanel = document.createElement('div');
        this.debugPanel.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 8px;
            font-family: Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
            min-width: 250px;
            z-index: 1001;
        `;

        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        `;

        const title = document.createElement('h3');
        title.textContent = 'Debug Panel';
        title.style.cssText = `
            margin: 0;
            color: #00ff88;
        `;

        const toggleBtn = new Button({
            children: '−',
            variant: 'secondary',
            size: 'small',
            onClick: () => this.togglePanel()
        });

        header.appendChild(title);
        header.appendChild(toggleBtn.create());
        this.debugPanel.appendChild(header);

        // Create content container
        this.contentContainer = document.createElement('div');
        this.contentContainer.id = 'debugPanelContent';
        this.debugPanel.appendChild(this.contentContainer);

        document.body.appendChild(this.debugPanel);
    }

    /**
     * Setup all sections
     */
    setupSections() {
        // Typography section
        this.sections.typography = new TypographyControls();
        this.contentContainer.appendChild(this.sections.typography.create());

        // Spotlight section
        this.sections.spotlight = new SpotlightControls();
        this.contentContainer.appendChild(this.sections.spotlight.create());

        // Camera section
        this.sections.camera = new CameraControls();
        this.contentContainer.appendChild(this.sections.camera.create());

        // Enlargement section
        this.sections.enlargement = new EnlargementControls();
        this.contentContainer.appendChild(this.sections.enlargement.create());

        // Smooth scroll section
        this.sections.smoothScroll = new SmoothScrollControls();
        this.contentContainer.appendChild(this.sections.smoothScroll.create());

        // Liquid distortion section
        this.sections.liquidDistortion = new LiquidDistortionControls();
        this.contentContainer.appendChild(this.sections.liquidDistortion.create());

        // Reset button
        const resetBtn = new Button({
            children: 'Reset to Default',
            variant: 'primary',
            size: 'medium',
            onClick: () => this.resetToDefaults(),
            style: { width: '100%', marginTop: '10px' }
        });
        this.contentContainer.appendChild(resetBtn.create());
    }

    /**
     * Setup control references
     */
    setupControls() {
        // Collect all controls from sections
        this.controls = {
            ...this.sections.typography.getControls(),
            ...this.sections.spotlight.getControls(),
            ...this.sections.camera.getControls(),
            ...this.sections.enlargement.getControls(),
            ...this.sections.smoothScroll.getControls(),
            ...this.sections.liquidDistortion.getControls()
        };
    }

    /**
     * Animate panel appearance
     */
    animateIn() {
        this.debugPanel.style.opacity = '0';
        this.debugPanel.style.transform = 'translateX(20px)';

        gsap.to(this.debugPanel, {
            opacity: 1,
            x: 0,
            duration: 0.8,
            ease: "power2.out",
            delay: 0.8
        });
    }

    /**
     * Toggle panel collapsed state
     */
    togglePanel() {
        this.isCollapsed = !this.isCollapsed;
        
        if (this.isCollapsed) {
            gsap.to(this.contentContainer, {
                height: 0,
                opacity: 0,
                duration: 0.3,
                ease: "power2.out",
                onComplete: () => {
                    this.contentContainer.style.overflow = 'hidden';
                }
            });
        } else {
            this.contentContainer.style.overflow = 'visible';
            gsap.to(this.contentContainer, {
                height: 'auto',
                opacity: 1,
                duration: 0.3,
                ease: "power2.out"
            });
        }
    }

    /**
     * Get all controls
     * @returns {Object} All controls
     */
    getControls() {
        return this.controls;
    }

    /**
     * Get debug panel element
     * @returns {HTMLElement} Debug panel element
     */
    getDebugPanel() {
        return this.debugPanel;
    }

    /**
     * Update display value
     * @param {string} id - Control ID
     * @param {string|number} value - Value to display
     */
    updateDisplay(id, value) {
        if (this.controls[id]) {
            this.controls[id].textContent = value;
        }
    }

    /**
     * Reset all controls to defaults
     */
    resetToDefaults() {
        // Reset each section
        Object.values(this.sections).forEach(section => {
            if (section.resetToDefaults) {
                section.resetToDefaults();
            }
        });
    }

    /**
     * Destroy the debug panel
     */
    destroy() {
        if (this.debugPanel && this.debugPanel.parentNode) {
            this.debugPanel.parentNode.removeChild(this.debugPanel);
        }
        
        // Destroy all sections
        Object.values(this.sections).forEach(section => {
            if (section.destroy) {
                section.destroy();
            }
        });
        
        this.debugPanel = null;
        this.controls = {};
        this.sections = {};
    }
}
