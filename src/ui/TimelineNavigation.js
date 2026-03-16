export class TimelineNavigation {
    constructor() {
        this.currentYear = 2010;
        this.minYear = 2010;
        this.maxYear = 2019;
        this.isVisible = false;
        this.isNavigating = false;
        this.element = null;
        this.yearDisplay = null;
        this.ticksContainer = null;
        this.ticks = [];
        this.previousYearValue = 2010;
        this.showTimeout = null;
        this.lastSceneName = 'initial';
        
        this.init();
    }
    
    init() {
        this.createNavigationElement();
        this.setupEventListeners();
        this.hide();
        
        setTimeout(() => {
            this.hide();
        }, 100);
        
        setTimeout(() => {
            this.hide();
        }, 500);
        
        setTimeout(() => {
            this.hide();
        }, 1000);
        
        setInterval(() => {
            if (this.lastSceneName === 'initial' && this.isVisible) {
                this.hide();
            }
        }, 1000);
    }
    
    createNavigationElement() {
        this.element = document.createElement('div');
        this.element.id = 'timeline-navigation';
        this.element.style.cssText = `
            position: fixed;
            bottom: 40px;
            left: 40px;
            right: 40px;
            height: 60px;
            display: none;
            flex-direction: column;
            justify-content: flex-end;
            z-index: -1;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.4s ease;
        `;

        this.yearDisplay = document.createElement('div');
        this.yearDisplay.style.cssText = `
            font-size: 16px;
            font-weight: 400;
            color: rgba(255, 255, 255, 0.8);
            margin-bottom: 10px;
            font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            letter-spacing: 0.04em;
        `;
        this.yearDisplay.textContent = this.currentYear.toString();

        this.ticksContainer = document.createElement('div');
        this.ticksContainer.style.cssText = `
            display: flex;
            align-items: flex-end;
            gap: 10px;
            height: 28px;
        `;

        this.ticks = [];
        for (let year = this.minYear; year <= this.maxYear; year++) {
            const tick = document.createElement('div');
            const isSelected = year === this.currentYear;
            tick.dataset.year = year;
            this.applyTickStyle(tick, isSelected, year);

            tick.addEventListener('click', () => {
                if (!this.isNavigating) {
                    this.isNavigating = true;
                    this.setYear(year);
                    this.triggerYearNavigation();
                    setTimeout(() => { this.isNavigating = false; }, 1200);
                }
            });

            tick.addEventListener('mouseenter', () => {
                if (year !== this.currentYear) {
                    tick.style.background = 'rgba(255, 255, 255, 0.85)';
                }
            });
            tick.addEventListener('mouseleave', () => {
                if (year !== this.currentYear) {
                    tick.style.background = this.getTickBackground(year);
                }
            });

            this.ticks.push({ year, element: tick });
            this.ticksContainer.appendChild(tick);
        }

        this.element.appendChild(this.yearDisplay);
        this.element.appendChild(this.ticksContainer);
        document.body.appendChild(this.element);
        this.addCSSAnimations();
    }

    getTickHeight(year) {
        const distance = Math.abs(year - this.currentYear);
        const maxHeight = 26;
        const minHeight = 12;
        const totalYears = this.maxYear - this.minYear;
        const t = Math.min(distance / totalYears, 1);
        return Math.round(maxHeight - (maxHeight - minHeight) * t);
    }

    getTickOpacity(year) {
        if (year === this.currentYear) return 1;
        const distance = Math.abs(year - this.currentYear);
        const maxDistance = Math.max(this.currentYear - this.minYear, this.maxYear - this.currentYear) || 1;
        const t = Math.min(distance / maxDistance, 1);
        return Math.max(0.2, 1 - t * 0.8);
    }

    getTickBackground(year) {
        if (year === this.currentYear) return '#0000FF';
        const opacity = this.getTickOpacity(year);
        return `rgba(255, 255, 255, ${opacity})`;
    }

    applyTickStyle(tick, isSelected, year) {
        const height = this.getTickHeight(year);
        const bg = this.getTickBackground(year);
        tick.style.cssText = `
            width: ${isSelected ? '4px' : '2px'};
            height: ${height}px;
            background: ${bg};
            border-radius: 1px;
            cursor: pointer;
            transition: width 0.25s ease, background 0.25s ease, height 0.25s ease, transform 0.25s ease;
            flex-shrink: 0;
        `;
    }

    playStaggerAnimation() {
        const selectedIndex = this.ticks.findIndex(t => t.year === this.currentYear);
        for (const tick of this.ticks) {
            const tickIndex = this.ticks.indexOf(tick);
            const distance = Math.abs(tickIndex - selectedIndex);
            const delay = distance * 35;

            tick.element.style.transition = 'none';
            tick.element.style.transform = 'scaleY(0.5)';

            setTimeout(() => {
                tick.element.style.transition = 'width 0.25s ease, background 0.25s ease, height 0.25s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
                tick.element.style.transform = 'scaleY(1)';
            }, delay);
        }
    }
    
    addCSSAnimations() {
        if (!document.querySelector('#timeline-navigation-styles')) {
            const style = document.createElement('style');
            style.id = 'timeline-navigation-styles';
            style.textContent = `
                @keyframes timelineNavFadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    setupEventListeners() {
        window.addEventListener('timelineYearChange', (event) => {
            this.setYear(event.detail.year);
        });
        
        window.addEventListener('sceneChange', (event) => {
            const sceneName = event?.detail?.sceneName || event?.detail?.scene;
            if (!sceneName) return;

            this.lastSceneName = sceneName;

            if (sceneName === 'timeline') {
                this.scheduleShowAfterImagesLoad();
            } else {
                this.hide();
            }
        });
        
        window.addEventListener('sceneTransitionComplete', (event) => {
            const sceneName = event?.detail?.sceneName || event?.detail?.scene;
            if (!sceneName) return;

            this.lastSceneName = sceneName;

            if (sceneName === 'timeline') {
                this.scheduleShowAfterImagesLoad();
            } else if (sceneName === 'initial') {
                this.hide();
            }
        });
        
        window.addEventListener('timelineImagesLoaded', (event) => {
            if (event.detail.scene === 'timeline') {
                this.lastSceneName = 'timeline';
                this.scheduleShowAfterImagesLoad();
            }
        });
        
        setTimeout(() => {
            const app = window.app;
            if (app && app.timelineController) {
                const currentSceneIndex = app.timelineController.getCurrentSceneIndex();
                if (currentSceneIndex === 0) {
                    this.hide();
                }
            }
        }, 50);
        
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
            
            setTimeout(() => {
                this.isNavigating = false;
            }, 1200);
        }
    }
    
    nextYear() {
        if (this.currentYear < this.maxYear && !this.isNavigating) {
            this.isNavigating = true;
            this.setYear(this.currentYear + 1);
            this.triggerYearNavigation();
            
            setTimeout(() => {
                this.isNavigating = false;
            }, 1200);
        }
    }
    
    setYear(year, animate = true) {
        const changed = this.currentYear !== Math.max(this.minYear, Math.min(this.maxYear, year));
        this.previousYearValue = this.currentYear;
        this.currentYear = Math.max(this.minYear, Math.min(this.maxYear, year));
        this.updateYearDisplay(animate && changed);
    }
    
    updateYearDisplay(animate = false) {
        this.yearDisplay.textContent = this.currentYear.toString();
        for (const tick of this.ticks) {
            const isSelected = tick.year === this.currentYear;
            const height = this.getTickHeight(tick.year);
            const bg = this.getTickBackground(tick.year);
            tick.element.style.width = isSelected ? '4px' : '2px';
            tick.element.style.height = `${height}px`;
            tick.element.style.background = bg;
        }
        if (animate) {
            this.playStaggerAnimation();
        }
    }
    
    triggerYearNavigation() {
        const event = new CustomEvent('timelineNavigation', {
            detail: {
                year: this.currentYear,
                direction: this.currentYear > this.previousYearValue ? 'next' : 'previous'
            }
        });
        window.dispatchEvent(event);
        
        this.triggerHapticFeedback();
    }
    
    triggerHapticFeedback() {
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    }
    
    show() {
        if (this.lastSceneName !== 'timeline') {
            return;
        }

        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
            this.showTimeout = null;
        }
        
        if (this.isVisible) return;
        
        this.isVisible = true;
        this.element.style.display = 'flex';
        this.element.style.opacity = '1';
        this.element.style.zIndex = '1000';
        this.element.style.pointerEvents = 'auto';
        this.element.style.visibility = 'visible';
        this.element.style.animation = 'timelineNavFadeIn 0.4s ease';
    }
    
    hide() {
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
            this.showTimeout = null;
        }
        
        this.isVisible = false;
        
        this.element.style.display = 'none';
        this.element.style.opacity = '0';
        this.element.style.zIndex = '-1';
        this.element.style.pointerEvents = 'none';
        this.element.style.visibility = 'hidden';
        this.element.style.animation = '';
    }
    
    scheduleShowAfterImagesLoad() {
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
        }
        
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
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
            this.showTimeout = null;
        }
        
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}
