export class TimelineNavigation {
    constructor() {
        this.currentYear = 2010;
        this.minYear = 2010;
        this.maxYear = 2019;
        this.isVisible = false;
        this.isNavigating = false; // Prevent rapid navigation
        this.element = null;
        this.yearDisplay = null;
        this.prevButton = null;
        this.nextButton = null;
        this.yearIndicator = null;
        this.previousYearValue = 2010; // Track previous year for direction detection
        this.showTimeout = null; // Timeout for delayed show
        this.lastSceneName = 'initial';
        
        this.init();
    }
    
    init() {
        this.createNavigationElement();
        this.setupEventListeners();
        this.hide(); // Initially hidden
        
        // Multiple safeguards to ensure it's hidden on app start
        setTimeout(() => {
            this.hide();
            console.log('TimelineNavigation: Forcing hide on app start (100ms)');
        }, 100);
        
        setTimeout(() => {
            this.hide();
            console.log('TimelineNavigation: Forcing hide on app start (500ms)');
        }, 500);
        
        setTimeout(() => {
            this.hide();
            console.log('TimelineNavigation: Forcing hide on app start (1000ms)');
        }, 1000);
        
        // Continuous monitoring to ensure it stays hidden in initial scene
        // (use event-driven scene state, because controller index can lag briefly)
        setInterval(() => {
            if (this.lastSceneName === 'initial' && this.isVisible) {
                console.log('TimelineNavigation: Detected visible in initial scene, forcing hide');
                this.hide();
            }
        }, 1000);
    }
    
    createNavigationElement() {
        // Create main container
        this.element = document.createElement('div');
        this.element.id = 'timeline-navigation';
        this.element.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(100%);
            width: 400px;
            height: 80px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 20px;
            display: none;
            align-items: center;
            justify-content: center;
            gap: 20px;
            z-index: -1;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            box-shadow: 
                0 8px 32px rgba(0, 0, 0, 0.3),
                inset 0 1px 0 rgba(255, 255, 255, 0.2),
                inset 0 -1px 0 rgba(0, 0, 0, 0.1);
            overflow: hidden;
            opacity: 0;
            pointer-events: none;
        `;
        
        // Add liquid glass effect overlay
        this.glassOverlay = document.createElement('div');
        this.glassOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(
                135deg,
                rgba(255, 255, 255, 0.1) 0%,
                rgba(255, 255, 255, 0.05) 50%,
                rgba(255, 255, 255, 0.1) 100%
            );
            pointer-events: none;
            border-radius: 20px;
            animation: liquidGlass 3s ease-in-out infinite;
        `;
        
        // Create previous button
        this.prevButton = document.createElement('button');
        this.prevButton.innerHTML = '‹';
        this.prevButton.style.cssText = `
            width: 50px;
            height: 50px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border-radius: 50%;
            font-size: 24px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(10px);
            box-shadow: 
                0 4px 16px rgba(0, 0, 0, 0.2),
                inset 0 1px 0 rgba(255, 255, 255, 0.2);
            position: relative;
            z-index: 2;
        `;
        
        // Create year display
        this.yearDisplay = document.createElement('div');
        this.yearDisplay.style.cssText = `
            font-size: 32px;
            font-weight: bold;
            color: white;
            text-align: center;
            min-width: 120px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
            position: relative;
            z-index: 2;
        `;
        
        // Create year range display
        this.yearRangeDisplay = document.createElement('div');
        this.yearRangeDisplay.style.cssText = `
            font-size: 14px;
            color: rgba(255, 255, 255, 0.7);
            text-align: center;
            position: absolute;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            position: relative;
            z-index: 2;
        `;
        
        // Create next button
        this.nextButton = document.createElement('button');
        this.nextButton.innerHTML = '›';
        this.nextButton.style.cssText = this.prevButton.style.cssText;
        
        // Create year indicator (progress bar)
        this.yearIndicator = document.createElement('div');
        this.yearIndicator.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            height: 3px;
            background: linear-gradient(90deg, #4CAF50, #2196F3);
            transition: width 0.3s ease;
            border-radius: 0 0 0 20px;
            box-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
            position: relative;
            z-index: 2;
        `;
        
        // Add hover effects
        this.addHoverEffects();
        
        // Assemble the component
        this.element.appendChild(this.glassOverlay);
        this.element.appendChild(this.prevButton);
        this.element.appendChild(this.yearDisplay);
        this.element.appendChild(this.nextButton);
        this.element.appendChild(this.yearRangeDisplay);
        this.element.appendChild(this.yearIndicator);
        
        // Add to document
        document.body.appendChild(this.element);
        
        // Add CSS animations
        this.addCSSAnimations();
        
        // Update initial state
        this.updateYearDisplay();
        this.updateButtonStates();
        this.updateYearIndicator();
    }
    
    addCSSAnimations() {
        // Add slideUp animation if it doesn't exist
        if (!document.querySelector('#timeline-navigation-styles')) {
            const style = document.createElement('style');
            style.id = 'timeline-navigation-styles';
            style.textContent = `
                @keyframes slideUp {
                    from {
                        transform: translateX(-50%) translateY(100%);
                    }
                    to {
                        transform: translateX(-50%) translateY(0);
                    }
                }
                
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }
                
                #timeline-navigation button:active {
                    transform: scale(0.95);
                }
                
                #timeline-navigation {
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                }
                
                @keyframes liquidGlass {
                    0%, 100% {
                        background: linear-gradient(
                            135deg,
                            rgba(255, 255, 255, 0.1) 0%,
                            rgba(255, 255, 255, 0.05) 50%,
                            rgba(255, 255, 255, 0.1) 100%
                        );
                    }
                    50% {
                        background: linear-gradient(
                            135deg,
                            rgba(255, 255, 255, 0.15) 0%,
                            rgba(255, 255, 255, 0.08) 50%,
                            rgba(255, 255, 255, 0.15) 100%
                        );
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    addHoverEffects() {
        // Previous button hover effects
        this.prevButton.addEventListener('mouseenter', () => {
            if (!this.prevButton.disabled) {
                this.prevButton.style.background = 'rgba(255, 255, 255, 0.2)';
                this.prevButton.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                this.prevButton.style.transform = 'scale(1.1)';
                this.prevButton.style.boxShadow = `
                    0 6px 20px rgba(0, 0, 0, 0.3),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3)
                `;
            }
        });
        
        this.prevButton.addEventListener('mouseleave', () => {
            this.prevButton.style.background = 'rgba(255, 255, 255, 0.1)';
            this.prevButton.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            this.prevButton.style.transform = 'scale(1)';
            this.prevButton.style.boxShadow = `
                0 4px 16px rgba(0, 0, 0, 0.2),
                inset 0 1px 0 rgba(255, 255, 255, 0.2)
            `;
        });
        
        // Next button hover effects
        this.nextButton.addEventListener('mouseenter', () => {
            if (!this.nextButton.disabled) {
                this.nextButton.style.background = 'rgba(255, 255, 255, 0.2)';
                this.nextButton.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                this.nextButton.style.transform = 'scale(1.1)';
                this.nextButton.style.boxShadow = `
                    0 6px 20px rgba(0, 0, 0, 0.3),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3)
                `;
            }
        });
        
        this.nextButton.addEventListener('mouseleave', () => {
            this.nextButton.style.background = 'rgba(255, 255, 255, 0.1)';
            this.nextButton.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            this.nextButton.style.transform = 'scale(1)';
            this.nextButton.style.boxShadow = `
                0 4px 16px rgba(0, 0, 0, 0.2),
                inset 0 1px 0 rgba(255, 255, 255, 0.2)
            `;
        });
        
        // Add click feedback
        this.prevButton.addEventListener('mousedown', () => {
            if (!this.prevButton.disabled) {
                this.prevButton.style.transform = 'scale(0.95)';
            }
        });
        
        this.prevButton.addEventListener('mouseup', () => {
            if (!this.prevButton.disabled) {
                this.prevButton.style.transform = 'scale(1.1)';
            }
        });
        
        this.nextButton.addEventListener('mousedown', () => {
            if (!this.nextButton.disabled) {
                this.nextButton.style.transform = 'scale(0.95)';
            }
        });
        
        this.nextButton.addEventListener('mouseup', () => {
            if (!this.nextButton.disabled) {
                this.nextButton.style.transform = 'scale(1.1)';
            }
        });
    }
    
    setupEventListeners() {
        // Previous button click
        this.prevButton.addEventListener('click', () => {
            this.previousYear();
        });
        
        // Next button click
        this.nextButton.addEventListener('click', () => {
            this.nextYear();
        });
        
        // Listen for timeline year changes from the controller
        window.addEventListener('timelineYearChange', (event) => {
            this.setYear(event.detail.year);
        });
        
        // Listen for scene changes to show/hide navigation
        window.addEventListener('sceneChange', (event) => {
            const sceneName = event?.detail?.sceneName || event?.detail?.scene;
            if (!sceneName) return;

            this.lastSceneName = sceneName;
            console.log('TimelineNavigation: Scene change detected:', sceneName);

            if (sceneName === 'timeline') {
                // Show after 1s when timeline scene becomes active
                this.scheduleShowAfterImagesLoad();
            } else {
                this.hide();
            }
        });
        
        // Listen for scene transition completion
        window.addEventListener('sceneTransitionComplete', (event) => {
            const sceneName = event?.detail?.sceneName || event?.detail?.scene;
            if (!sceneName) return;

            this.lastSceneName = sceneName;

            if (sceneName === 'timeline') {
                // Ensure delayed show also runs when transition fully completes
                this.scheduleShowAfterImagesLoad();
            } else if (sceneName === 'initial') {
                this.hide();
            }
        });
        
        // Listen for timeline images loaded event
        window.addEventListener('timelineImagesLoaded', (event) => {
            if (event.detail.scene === 'timeline') {
                this.lastSceneName = 'timeline';
                // Keep timing consistent: appear 1s after timeline is active
                this.scheduleShowAfterImagesLoad();
            }
        });
        
        // Immediately check if we're in initial scene and hide if so
        setTimeout(() => {
            // Check if we're in initial scene (scene index 0)
            const app = window.app;
            if (app && app.timelineController) {
                const currentSceneIndex = app.timelineController.getCurrentSceneIndex();
                if (currentSceneIndex === 0) {
                    console.log('TimelineNavigation: Detected initial scene, forcing hide');
                    this.hide();
                }
            }
        }, 50);
        
        // Keyboard navigation
        document.addEventListener('keydown', (event) => {
            if (!this.isVisible) return;
            
            switch (event.key) {
                case 'ArrowLeft':
                    event.preventDefault();
                    this.previousYear();
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    this.nextYear();
                    break;
            }
        });
    }
    
    previousYear() {
        if (this.currentYear > this.minYear && !this.isNavigating) {
            this.isNavigating = true;
            this.setYear(this.currentYear - 1);
            this.triggerYearNavigation();
            
            // Prevent rapid clicking
            setTimeout(() => {
                this.isNavigating = false;
            }, 1200); // Match animation duration
        }
    }
    
    nextYear() {
        if (this.currentYear < this.maxYear && !this.isNavigating) {
            this.isNavigating = true;
            this.setYear(this.currentYear + 1);
            this.triggerYearNavigation();
            
            // Prevent rapid clicking
            setTimeout(() => {
                this.isNavigating = false;
            }, 1200); // Match animation duration
        }
    }
    
    setYear(year) {
        this.previousYearValue = this.currentYear;
        this.currentYear = Math.max(this.minYear, Math.min(this.maxYear, year));
        this.updateYearDisplay();
        this.updateButtonStates();
        this.updateYearIndicator();
    }
    
    updateYearDisplay() {
        this.yearDisplay.textContent = this.currentYear.toString();
        this.yearRangeDisplay.textContent = `${this.minYear} - ${this.maxYear}`;
    }
    
    updateButtonStates() {
        // Update previous button state
        if (this.currentYear <= this.minYear || this.isNavigating) {
            this.prevButton.disabled = true;
            this.prevButton.style.opacity = '0.3';
            this.prevButton.style.cursor = 'not-allowed';
        } else {
            this.prevButton.disabled = false;
            this.prevButton.style.opacity = '1';
            this.prevButton.style.cursor = 'pointer';
        }
        
        // Update next button state
        if (this.currentYear >= this.maxYear || this.isNavigating) {
            this.nextButton.disabled = true;
            this.nextButton.style.opacity = '0.3';
            this.nextButton.style.cursor = 'not-allowed';
        } else {
            this.nextButton.disabled = false;
            this.nextButton.style.opacity = '1';
            this.nextButton.style.cursor = 'pointer';
        }
    }
    
    updateYearIndicator() {
        const progress = (this.currentYear - this.minYear) / (this.maxYear - this.minYear);
        this.yearIndicator.style.width = `${progress * 100}%`;
    }
    
    triggerYearNavigation() {
        // Dispatch custom event for timeline controller to handle
        const event = new CustomEvent('timelineNavigation', {
            detail: {
                year: this.currentYear,
                direction: this.currentYear > this.previousYearValue ? 'next' : 'previous'
            }
        });
        window.dispatchEvent(event);
        
        // Add haptic feedback
        this.triggerHapticFeedback();
    }
    
    triggerHapticFeedback() {
        // Simple haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    }
    
    show() {
        // Most reliable scene source for this component is transition events
        if (this.lastSceneName !== 'timeline') {
            return;
        }

        // Clear any pending timeout since we're showing now
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
            this.showTimeout = null;
        }
        
        if (this.isVisible) return;
        
        console.log('TimelineNavigation: Showing navigation');
        this.isVisible = true;
        this.element.style.display = 'flex';
        this.element.style.opacity = '1';
        this.element.style.zIndex = '1000';
        this.element.style.pointerEvents = 'auto';
        this.element.style.visibility = 'visible';
        this.element.style.transform = 'translateX(-50%) translateY(0)';
        
        // Add entrance animation
        this.element.style.animation = 'slideUp 0.3s ease';
    }
    
    hide() {
        // Clear any pending show timeout
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
            this.showTimeout = null;
        }
        
        console.log('TimelineNavigation: Hiding navigation');
        this.isVisible = false;
        
        // Force hide with multiple CSS properties
        this.element.style.display = 'none';
        this.element.style.opacity = '0';
        this.element.style.zIndex = '-1';
        this.element.style.pointerEvents = 'none';
        this.element.style.visibility = 'hidden';
        this.element.style.transform = 'translateX(-50%) translateY(100%)';
        this.element.style.animation = '';
    }
    
    scheduleShowAfterImagesLoad() {
        // Clear any existing timeout to avoid duplicate delayed shows
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
        }
        
        // Show 1s after entering timeline scene.
        // This removes dependency on user scroll to trigger visibility.
        this.showTimeout = setTimeout(() => {
            this.show();
        }, 1000);
    }
    
    isNavigationVisible() {
        return this.isVisible;
    }
    
    getCurrentYear() {
        return this.currentYear;
    }
    
    destroy() {
        // Clear any pending timeouts
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
            this.showTimeout = null;
        }
        
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
} 
