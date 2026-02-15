/**
 * YearOverlay - Single year at top-left (Geist Thin). Margins per Figma (Fortec).
 * Ticker: new number animates from the bottom upwards when the year changes.
 * Shown only after the timeline transition completes and images are in place.
 */
const YEAR_SIZE_PX = 300; // larger per design
const FONT_WEIGHT = 100; // Geist Thin
const SLOT_HEIGHT_PX = 360; // viewport height for one line (accommodates larger font)
const YEAR_TOP_PX = 65;
const YEAR_RIGHT_PX = 356;
const YEAR_BOTTOM_PX = 278;
const TICKER_DURATION_MS = 400;
const TICKER_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)';
const SHOW_DELAY_MS = 400; // Show year after images have fallen into position

export class YearOverlay {
    constructor(minYear = 2010, maxYear = 2019) {
        this.minYear = minYear;
        this.maxYear = maxYear;
        this.currentYear = minYear;
        this.container = null;
        this.viewport = null;
        this.strip = null;
        this.slot0 = null;
        this.slot1 = null;
        this.activeSlot = 0;
        this.isAnimating = false;
        this.showDelayId = null;
        this.boundOnYearChange = this.onYearChange.bind(this);
        this.boundOnSceneChange = this.onSceneChange.bind(this);
        this.boundOnTransitionComplete = this.onTransitionComplete.bind(this);
        this.boundOnTickerEnd = this.onTickerTransitionEnd.bind(this);
        this.init();
    }

    init() {
        this.container = document.createElement('div');
        this.container.id = 'year-overlay';
        this.container.className = 'year-display';
        this.container.setAttribute('aria-hidden', 'true');
        this.container.style.cssText = `
            position: fixed;
            top: ${YEAR_TOP_PX}px;
            left: 24px;
            right: ${YEAR_RIGHT_PX}px;
            margin-bottom: ${YEAR_BOTTOM_PX}px;
            z-index: 1001;
            pointer-events: none;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s ease;
        `;

        this.viewport = document.createElement('div');
        this.viewport.style.cssText = `
            height: ${SLOT_HEIGHT_PX}px;
            overflow: hidden;
        `;

        this.strip = document.createElement('div');
        this.strip.style.cssText = `
            position: relative;
            height: ${SLOT_HEIGHT_PX * 2}px;
            transition: transform ${TICKER_DURATION_MS}ms ${TICKER_EASING};
        `;

        const slotStyle = `
            height: ${SLOT_HEIGHT_PX}px;
            display: flex;
            align-items: center;
            font-family: 'Geist', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: ${YEAR_SIZE_PX}px;
            font-weight: ${FONT_WEIGHT};
            line-height: 1;
            white-space: nowrap;
            color: #ffffff;
            text-shadow: 0 2px 8px rgba(0,0,0,0.4);
            -webkit-text-stroke: 1px rgba(255,255,255,0.9);
        `;

        this.slot0 = document.createElement('div');
        this.slot0.className = 'year-overlay-slot';
        this.slot0.style.cssText = slotStyle;
        this.slot0.textContent = String(this.minYear);

        this.slot1 = document.createElement('div');
        this.slot1.className = 'year-overlay-slot';
        this.slot1.style.cssText = slotStyle;
        this.slot1.textContent = '';

        this.strip.appendChild(this.slot0);
        this.strip.appendChild(this.slot1);
        this.viewport.appendChild(this.strip);
        this.container.appendChild(this.viewport);
        document.body.appendChild(this.container);

        this.strip.addEventListener('transitionend', this.boundOnTickerEnd);

        window.addEventListener('timelineYearChange', this.boundOnYearChange);
        window.addEventListener('sceneChange', this.boundOnSceneChange);
        window.addEventListener('sceneTransitionComplete', this.boundOnTransitionComplete);
    }

    onSceneChange(event) {
        const detail = event?.detail;
        if (detail?.sceneName === 'timeline') {
            // Don't show here – wait for sceneTransitionComplete (after images fall)
        } else if (detail?.sceneName === 'initial') {
            this.cancelShowDelay();
            this.hide();
        }
    }

    onTransitionComplete(event) {
        const detail = event?.detail;
        if (detail?.sceneName === 'timeline') {
            const year = typeof window.app?.timelineController?.getCurrentYear === 'function'
                ? window.app.timelineController.getCurrentYear()
                : this.minYear;
            this.setYear(year);
            this.cancelShowDelay();
            this.showDelayId = setTimeout(() => {
                this.showDelayId = null;
                this.show();
            }, SHOW_DELAY_MS);
        }
    }

    cancelShowDelay() {
        if (this.showDelayId) {
            clearTimeout(this.showDelayId);
            this.showDelayId = null;
        }
    }

    onYearChange(event) {
        const year = event?.detail?.year;
        if (typeof year === 'number' && year >= this.minYear && year <= this.maxYear) {
            this.setYear(year);
        }
    }

    onTickerTransitionEnd(event) {
        if (event.target !== this.strip || !this.isAnimating) return;
        this.isAnimating = false;
        this.strip.style.transition = 'none';
        this.strip.style.transform = 'translateY(0)';
        this.slot0.textContent = String(this.currentYear);
        this.activeSlot = 0;
        void this.strip.offsetHeight;
        this.strip.style.transition = '';
    }

    setYear(year) {
        if (year === this.currentYear) return;

        this.currentYear = year;

        const nextSlot = 1 - this.activeSlot;
        const nextSlotEl = nextSlot === 0 ? this.slot0 : this.slot1;
        nextSlotEl.textContent = String(year);

        this.isAnimating = true;
        // Move strip so the new year (in nextSlot) slides up from below into view
        this.strip.style.transform = `translateY(-${nextSlot * SLOT_HEIGHT_PX}px)`;
    }

    show() {
        this.container.style.visibility = 'visible';
        this.container.style.opacity = '1';
    }

    hide() {
        this.container.style.opacity = '0';
        setTimeout(() => {
            this.container.style.visibility = 'hidden';
        }, 300);
    }

    destroy() {
        this.cancelShowDelay();
        this.strip.removeEventListener('transitionend', this.boundOnTickerEnd);
        window.removeEventListener('timelineYearChange', this.boundOnYearChange);
        window.removeEventListener('sceneChange', this.boundOnSceneChange);
        window.removeEventListener('sceneTransitionComplete', this.boundOnTransitionComplete);
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
