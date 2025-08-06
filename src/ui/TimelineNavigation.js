export class TimelineNavigation {
    constructor() {
        this.currentYear = 2010;
        this.minYear = 2010;
        this.maxYear = 2019;
        this.isVisible = false;
        this.element = null;
        this.yearDisplay = null;
        this.prevButton = null;
        this.nextButton = null;
        this.yearIndicator = null;
        this.previousYearValue = 2010; // Track previous year for direction detection
        
        this.init();
    }
    
    init() {
        this.createNavigationElement();
        this.setupEventListeners();
        this.hide(); // Initially hidden
    }
    
    createNavigationElement() {
        // Create main container
        this.element = document.createElement('div');
        this.element.id = 'timeline-navigation';
        this.element.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 80px;
            background: linear-gradient(to top, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.7));
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            z-index: 1000;
            transform: translateY(100%);
            transition: transform 0.3s ease;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        `;
        
        // Create previous button
        this.prevButton = document.createElement('button');
        this.prevButton.innerHTML = '‹';
        this.prevButton.style.cssText = `
            width: 50px;
            height: 50px;
            border: 2px solid rgba(255, 255, 255, 0.3);
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
        `;
        
        // Add hover effects
        this.addHoverEffects();
        
        // Assemble the component
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
                        transform: translateY(100%);
                    }
                    to {
                        transform: translateY(0);
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
            }
        });
        
        this.prevButton.addEventListener('mouseleave', () => {
            this.prevButton.style.background = 'rgba(255, 255, 255, 0.1)';
            this.prevButton.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            this.prevButton.style.transform = 'scale(1)';
        });
        
        // Next button hover effects
        this.nextButton.addEventListener('mouseenter', () => {
            if (!this.nextButton.disabled) {
                this.nextButton.style.background = 'rgba(255, 255, 255, 0.2)';
                this.nextButton.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                this.nextButton.style.transform = 'scale(1.1)';
            }
        });
        
        this.nextButton.addEventListener('mouseleave', () => {
            this.nextButton.style.background = 'rgba(255, 255, 255, 0.1)';
            this.nextButton.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            this.nextButton.style.transform = 'scale(1)';
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
            if (event.detail.sceneName === 'timeline') {
                this.show();
            } else {
                this.hide();
            }
        });
        
        // Listen for scene transition completion
        window.addEventListener('sceneTransitionComplete', (event) => {
            if (event.detail.sceneName === 'timeline') {
                this.show();
            }
        });
        
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
        if (this.currentYear > this.minYear) {
            this.setYear(this.currentYear - 1);
            this.triggerYearNavigation();
        }
    }
    
    nextYear() {
        if (this.currentYear < this.maxYear) {
            this.setYear(this.currentYear + 1);
            this.triggerYearNavigation();
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
        if (this.currentYear <= this.minYear) {
            this.prevButton.disabled = true;
            this.prevButton.style.opacity = '0.3';
            this.prevButton.style.cursor = 'not-allowed';
        } else {
            this.prevButton.disabled = false;
            this.prevButton.style.opacity = '1';
            this.prevButton.style.cursor = 'pointer';
        }
        
        // Update next button state
        if (this.currentYear >= this.maxYear) {
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
        if (this.isVisible) return;
        
        this.isVisible = true;
        this.element.style.transform = 'translateY(0)';
        
        // Add entrance animation
        this.element.style.animation = 'slideUp 0.3s ease';
    }
    
    hide() {
        if (!this.isVisible) return;
        
        this.isVisible = false;
        this.element.style.transform = 'translateY(100%)';
        this.element.style.animation = '';
    }
    
    isNavigationVisible() {
        return this.isVisible;
    }
    
    getCurrentYear() {
        return this.currentYear;
    }
    
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
} 