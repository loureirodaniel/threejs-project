/**
 * SmoothScrollController - Lenis + GSAP ScrollTrigger for year-by-year timeline scroll
 * - Perfect year snapping: scroll advances exactly 1 year at a time (2010→2011, never jumping to 2012)
 * - scrub: 1 (1-second catch-up, no momentum)
 * - snap: 1/(N-1) for N years
 * - ScrollTrigger.normalizeScroll(true) for touch
 * - Resize safe: ScrollTrigger.refresh()
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export class SmoothScrollController {
    constructor(timelineController) {
        this.timelineController = timelineController;
        this.isEnabled = true;
        this.lenis = null;
        this.timelineScrollTrigger = null;
        this.snapPositions = [-5.25, -3.75, -2.25, -0.75, 0.75, 2.25, 3.75, 5.25, 6.75, 8.25]; // 10 years: 2010-2019
        this.yearCount = this.snapPositions.length;
        this.scrollSectionHeight = 100; // px per year step
        this.isActive = false;
        this.rafBound = null;
        // Accumulated scroll in current gesture (for very-long-scroll acceleration)
        this.scrollAccumulator = 0;
        this.scrollAccumulatorReset = null;
        this.longScrollThreshold = 550;   // px accumulated → start accelerating
        this.longScrollMultiplier = 1.85; // multiplier when very long scroll

        this.init();
    }

    init() {
        ScrollTrigger.normalizeScroll(true);
        this.onResizeBound = () => this.onResize();
        window.addEventListener('resize', this.onResizeBound);

        // Activate only after camera has finished zooming (sceneTransitionComplete).
        // Deactivate when leaving timeline (sceneChange with sceneName !== 'timeline').
        this.onSceneChangeBound = (e) => this.onSceneChange(e?.detail);
        this.onTransitionCompleteBound = (e) => this.onTransitionComplete(e?.detail);
        window.addEventListener('sceneTransitionComplete', this.onTransitionCompleteBound);
        window.addEventListener('sceneChange', this.onSceneChangeBound);
    }

    onTransitionComplete(detail) {
        if (detail?.sceneName === 'timeline') {
            this.activate();
        }
    }

    onSceneChange(detail) {
        if (detail?.sceneName !== 'timeline') {
            this.deactivate();
        }
    }

    activate() {
        if (this.isActive) return;
        this.isActive = true;

        const wrapper = document.getElementById('lenis-wrapper');
        const content = document.getElementById('lenis-content');
        if (!wrapper || !content) return;

        // Set content height: (yearCount - 1) sections for N years (snap at 0, 1/9, 2/9, ..., 1)
        // ~0.5 viewport per year so short/medium scroll = one year; very long scroll accelerates via virtualScroll
        const sectionHeight = Math.max(120, window.innerHeight * 0.5);
        const totalHeight = (this.yearCount - 1) * sectionHeight;
        content.style.height = totalHeight + 'px';

        // Disable native momentum
        wrapper.style.overflowY = 'scroll';
        wrapper.style.overflowX = 'hidden';
        wrapper.style.webkitOverflowScrolling = 'auto';
        wrapper.style.overscrollBehavior = 'none';

        const wheelMult = 0.92;
        const touchMult = 0.78;
        this.lenis = new Lenis({
            wrapper,
            content,
            eventsTarget: window,
            smoothWheel: true,
            syncTouch: true,
            duration: 0.18,
            lerp: 0.38,
            touchMultiplier: touchMult,
            wheelMultiplier: wheelMult,
            overscroll: false,
            virtualScroll: (data) => this.handleVirtualScroll(data, wheelMult, touchMult)
        });

        const lenisRef = this.lenis;
        ScrollTrigger.scrollerProxy(wrapper, {
            scrollTop(value) {
                if (arguments.length) {
                    lenisRef.scrollTo(value, { immediate: true });
                }
                return lenisRef?.scroll ?? 0;
            }
        });

        this.timelineScrollTrigger = ScrollTrigger.create({
            scroller: wrapper,
            trigger: content,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 2.2,
            snap: {
                snapTo: 1 / (this.yearCount - 1),
                duration: { min: 0.5, max: 0.85 },
                ease: 'sine.inOut',
                directional: true
            },
            onUpdate: (self) => this.onScrollProgress(self.progress)
        });

        this.lenis.on('scroll', () => ScrollTrigger.update());
        this.rafBound = (time) => {
            this.lenis?.raf(time);
        };

        // Sync initial scroll to current timeline position
        const tc = this.timelineController;
        const nearestIndex = this.snapPositions.reduce((best, p, i) =>
            Math.abs(p - (tc.timelineOffset ?? -5.25)) < Math.abs(this.snapPositions[best] - (tc.timelineOffset ?? -5.25)) ? i : best, 0);
        this.setScrollProgress(nearestIndex / (this.yearCount - 1));
    }

    deactivate() {
        if (!this.isActive) return;
        this.isActive = false;
        this.destroyLenis();
    }

    destroyLenis() {
        if (this.scrollAccumulatorReset) {
            clearTimeout(this.scrollAccumulatorReset);
            this.scrollAccumulatorReset = null;
        }
        this.scrollAccumulator = 0;
        if (this.timelineScrollTrigger) {
            this.timelineScrollTrigger.kill();
            this.timelineScrollTrigger = null;
        }
        if (this.lenis) {
            this.lenis.destroy();
            this.lenis = null;
        }
        this.rafBound = null;

        const content = document.getElementById('lenis-content');
        if (content) content.style.height = '1px';
    }

    onScrollProgress(progress) {
        const tc = this.timelineController;
        if (!tc || tc.getCurrentSceneIndex() !== 1) return;

        const index = Math.round(progress * (this.yearCount - 1));
        const clampedIndex = Math.max(0, Math.min(index, this.yearCount - 1));
        const targetOffset = this.snapPositions[clampedIndex];

        tc.timelineOffset = targetOffset;
        if (tc.moveTimelineImages) tc.moveTimelineImages(0);
        if (tc.updateCurrentYear) tc.updateCurrentYear();
        if (tc.syncDebugPanel) tc.syncDebugPanel();
        if (tc.updateTimelineVignette) tc.updateTimelineVignette();
        if (tc.updateCameraLookAtForOriginalX) tc.updateCameraLookAtForOriginalX(targetOffset);
    }

    setScrollProgress(progress) {
        if (!this.lenis) return;
        const limit = this.lenis.limit;
        const targetScroll = Math.max(0, Math.min(limit, progress * limit));
        this.lenis.scrollTo(targetScroll, { immediate: true });
    }

    raf(time) {
        if (this.rafBound) this.rafBound(time);
    }

    onResize() {
        ScrollTrigger.refresh();
    }

    /**
     * Handle scroll via virtualScroll: short/long scroll = one year; very long scroll accelerates.
     * Return false so Lenis does not process the event (we update scroll ourselves).
     */
    handleVirtualScroll(data, wheelMult, touchMult) {
        if (!this.lenis) return true;
        const { deltaY, event } = data;
        const isTouch = event.type.includes('touch');
        const mult = isTouch ? touchMult : wheelMult;

        this.scrollAccumulator += deltaY;
        if (this.scrollAccumulatorReset) clearTimeout(this.scrollAccumulatorReset);
        this.scrollAccumulatorReset = setTimeout(() => {
            this.scrollAccumulator = 0;
            this.scrollAccumulatorReset = null;
        }, 280);

        const acc = Math.abs(this.scrollAccumulator);
        const boost = acc > this.longScrollThreshold ? this.longScrollMultiplier : 1;
        const effectiveDelta = deltaY * mult * boost;
        const limit = this.lenis.limit;
        const next = Math.max(0, Math.min(limit, this.lenis.scroll + effectiveDelta));
        this.lenis.scrollTo(next);
        return false;
    }

    /**
     * Called when wheel event occurs in timeline - feed delta to Lenis
     */
    onWheel(deltaY) {
        if (!this.lenis || !this.isActive) return false;
        const wrapper = document.getElementById('lenis-wrapper');
        if (!wrapper) return false;
        const current = this.lenis.scroll;
        const limit = this.lenis.limit;
        const newScroll = Math.max(0, Math.min(limit, current + deltaY));
        this.lenis.scrollTo(newScroll);
        return true;
    }

    destroy() {
        this.deactivate();
        window.removeEventListener('resize', this.onResizeBound);
        if (this.onTransitionCompleteBound) {
            window.removeEventListener('sceneTransitionComplete', this.onTransitionCompleteBound);
        }
        if (this.onSceneChangeBound) {
            window.removeEventListener('sceneChange', this.onSceneChangeBound);
        }
    }
}
