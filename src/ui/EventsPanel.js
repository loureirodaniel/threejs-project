/**
 * EventsPanel (TimelineColumnManager)
 *
 * Manages the full set of TimelineColumn instances – one per 3D plane.
 * On every year change it activates the three visible columns (focused year
 * + two neighbours) and deactivates the rest. A single RAF loop calls each
 * active column's updateLayout() so the metadata cards track the 3D planes.
 *
 * Phase 2 additions: subscribes to RenderSystem hover/click events via the
 * timelineEventBus and forwards them to the correct TimelineColumn instance.
 */

import { TimelineColumn } from './TimelineColumn.js';
import { getSceneMargins } from '../timeline-v2/utils/TimelineConstants.js';
import { timelineEventBus } from '../timeline-v2/core/EventBus.js';
import { HoverCommentTooltip } from './HoverCommentTooltip.js';

export class EventsPanel {
  constructor(imageData = []) {
    this.imageData = Array.isArray(imageData) ? imageData : [];
    this.currentYear = 2010;
    this.minYear = 2010;
    this.maxYear = 2019;
    this.isVisible = false;
    this.rafId = null;

    /** @type {TimelineColumn[]} One column per timeline plane */
    this.columns = [];

    this.panel = null;
    this.dividerLayer = null;
    this.lastDividerPositionsKey = '';

    // Phase 2 – event bus unsubscribe handles
    this._busUnsubs = [];

    /** @type {HoverCommentTooltip|null} Cursor-following comment tooltip */
    this._hoverTooltip = null;

    /** True while the user is scrolling or the camera is pulling back */
    this._isScrolling = false;
    this._scrollEndTimer = null;

    this.boundOnYearChange = this.onYearChange.bind(this);
    this.boundOnSceneChange = this.onSceneChange.bind(this);
    this.boundOnTransitionComplete = this.onTransitionComplete.bind(this);

    this.init();
  }

  init() {
    this.createPanel();
    this.injectStyles();
    this._hoverTooltip = new HoverCommentTooltip();
    this.setupEventListeners();
    this.updateEvents(this.currentYear);
    this.hide();
  }

  // ---------------------------------------------------------------------------
  // Panel / column creation
  // ---------------------------------------------------------------------------

  createPanel() {
    this.panel = document.createElement('div');
    this.panel.id = 'timeline-meta-overlay';
    this.panel.setAttribute('aria-hidden', 'true');

    this.dividerLayer = document.createElement('div');
    this.dividerLayer.className = 'timeline-meta-divider-layer';
    this.panel.appendChild(this.dividerLayer);

    document.body.appendChild(this.panel);

    // Build columns now if planes are already available; otherwise they will be
    // created lazily the first time updateEvents() is called.
    this._ensureColumns();
  }

  /**
   * Build one TimelineColumn per plane. Safe to call multiple times – skips
   * if the column count already matches the plane count.
   * @returns {boolean} true when columns are ready
   */
  _ensureColumns() {
    const planes = window.app?.imagePlanes?.planes;
    if (!Array.isArray(planes) || planes.length === 0) return false;
    if (this.columns.length === planes.length) return true;

    // Destroy stale columns before rebuilding
    this.columns.forEach((col) => col.destroy());

    this.columns = planes.map((plane, index) =>
      new TimelineColumn({
        panel: this.panel,
        plane,
        index,
        // Ghost year is rendered only for the primary column via CSS.
        includeGhostAndComments: true,
      })
    );

    return true;
  }

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

  injectStyles() {
    if (document.getElementById('timeline-meta-overlay-styles')) return;

    const style = document.createElement('style');
    style.id = 'timeline-meta-overlay-styles';
    style.textContent = `
      #timeline-meta-overlay {
        position: fixed;
        inset: 0;
        z-index: 130;
        --timeline-divider-one: 42vw;
        --timeline-divider-two: 69vw;
        pointer-events: none;
        opacity: 0;
        visibility: hidden;
        transition: opacity 240ms ease;
        font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: rgba(255, 255, 255, 0.96);
      }

      body.timeline-meta-active #timeline-meta-overlay {
        opacity: 1;
        visibility: visible;
      }

      body.detail-view-open #timeline-meta-overlay {
        opacity: 0 !important;
        visibility: hidden !important;
      }

      body.timeline-scrolling-active #timeline-meta-overlay .timeline-meta-comments-container,
      body.timeline-scrolling-active #timeline-meta-overlay .timeline-meta-year,
      body.timeline-scrolling-active #timeline-meta-overlay .timeline-meta-title,
      body.timeline-scrolling-active #timeline-meta-overlay .timeline-meta-description {
        opacity: 0 !important;
        visibility: hidden !important;
        display: none !important;
      }

      body.timeline-scrolling-active #timeline-meta-overlay .timeline-meta-card {
        border-top-color: transparent !important;
      }

      #timeline-meta-overlay .timeline-meta-divider {
        position: absolute;
        top: 8px;
        bottom: 8px;
        width: 1px;
        background: rgba(244, 244, 244, 0.12);
      }

      #timeline-meta-overlay .timeline-meta-divider-layer {
        position: absolute;
        inset: 0;
      }

      #timeline-meta-overlay .timeline-meta-header {
        position: absolute;
        top: 22px;
        left: calc(var(--timeline-divider-one) + 16px);
        font-size: 24px;
        font-weight: 300;
        letter-spacing: 0.01em;
      }

      #timeline-meta-overlay .timeline-meta-card {
        position: fixed;
        background: transparent;
        border-top: none;
        padding: 8px 10px 10px;
        box-sizing: border-box;
        overflow: hidden;
        transition: transform 0.25s ease, opacity 0.25s ease;
      }

      #timeline-meta-overlay .timeline-meta-content {
        position: relative;
      }

      #timeline-meta-overlay .timeline-meta-card-primary {
        min-height: 150px;
      }

      #timeline-meta-overlay .timeline-meta-year {
        font-size: clamp(12px, 0.95vw, 14px);
        color: rgba(255, 255, 255, 0.52);
        line-height: 1;
        margin-bottom: 7px;
        transition: opacity 0.2s ease;
      }

      #timeline-meta-overlay .timeline-meta-text-stack {
        margin-top: 10px;
      }

      #timeline-meta-overlay .timeline-meta-title {
        margin: 0;
        font-weight: 300;
        letter-spacing: -0.01em;
        font-size: clamp(22px, 1.7vw, 35px);
        transition: opacity 0.2s ease, transform 0.25s ease;
      }

      #timeline-meta-overlay .timeline-meta-description {
        margin: 8px 0 0;
        color: rgba(255, 255, 255, 0.74);
        font-size: clamp(14px, 1vw, 18px);
        line-height: 1.32;
        max-width: 90%;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
        transition: opacity 0.2s ease;
      }

      #timeline-meta-overlay .timeline-meta-card-secondary .timeline-meta-title,
      #timeline-meta-overlay .timeline-meta-card-tertiary .timeline-meta-title {
        font-size: clamp(18px, 1.4vw, 28px);
      }

      #timeline-meta-overlay .timeline-meta-card-secondary .timeline-meta-description,
      #timeline-meta-overlay .timeline-meta-card-tertiary .timeline-meta-description {
        font-size: clamp(13px, 0.92vw, 16px);
        -webkit-line-clamp: 2;
      }

      #timeline-meta-overlay .timeline-meta-ghost-year {
        position: absolute;
        left: -6px;
        top: 44%;
        transform: translateY(-50%);
        font-size: clamp(96px, 15vw, 260px);
        line-height: 0.9;
        letter-spacing: -0.04em;
        color: rgba(255, 255, 255, 0.045);
        font-weight: 200;
      }

      #timeline-meta-overlay .timeline-meta-comments {
        position: relative;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 6px;
      }

      #timeline-meta-overlay .timeline-meta-comments-container {
        margin-top: max(8.5vh, 68px);
        background: rgba(214, 214, 214, 0.16);
        padding: 12px;
        box-sizing: border-box;
      }

      #timeline-meta-overlay .timeline-meta-comment-date {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.46);
      }

      #timeline-meta-overlay .timeline-meta-comment-text {
        margin-top: 4px;
        font-size: clamp(17px, 1.45vw, 30px);
        font-weight: 300;
      }

      /* Hide ghost year and comments on non-primary variants (all columns have
         these DOM nodes but only primary should render them visually). */
      #timeline-meta-overlay .timeline-meta-card-secondary .timeline-meta-ghost-year,
      #timeline-meta-overlay .timeline-meta-card-tertiary .timeline-meta-ghost-year,
      #timeline-meta-overlay .timeline-meta-card-secondary .timeline-meta-comments-container,
      #timeline-meta-overlay .timeline-meta-card-tertiary .timeline-meta-comments-container {
        display: none;
      }

      /* ── Phase 2: hover state ─────────────────────────────────────────── */
      #timeline-meta-overlay .timeline-meta-card.timeline-column--hovered .timeline-meta-title {
        opacity: 1;
        transform: translateY(-2px);
      }

      #timeline-meta-overlay .timeline-meta-card.timeline-column--hovered .timeline-meta-year {
        opacity: 1;
        color: rgba(255, 255, 255, 0.72);
      }

      #timeline-meta-overlay .timeline-meta-card.timeline-column--hovered .timeline-meta-description {
        opacity: 1;
      }

      /* ── Phase 2: focus / click state ────────────────────────────────── */
      #timeline-meta-overlay .timeline-meta-card.timeline-column--focused .timeline-meta-title {
        opacity: 1;
        transform: translateY(-3px);
      }

      #timeline-meta-overlay .timeline-meta-card.timeline-column--focused .timeline-meta-year {
        color: rgba(255, 255, 255, 0.9);
      }

      /* ── Non-primary cards: text hidden by default ───────────────────── */
      #timeline-meta-overlay .timeline-meta-card-secondary .timeline-meta-year,
      #timeline-meta-overlay .timeline-meta-card-tertiary .timeline-meta-year {
        opacity: 0;
        transform: translateY(-10px);
        transition: opacity 0.28s ease 0s, transform 0.28s ease 0s;
      }

      #timeline-meta-overlay .timeline-meta-card-secondary .timeline-meta-title,
      #timeline-meta-overlay .timeline-meta-card-tertiary .timeline-meta-title {
        opacity: 0;
        transform: translateY(-10px);
        transition: opacity 0.28s ease 0s, transform 0.28s ease 0s;
      }

      #timeline-meta-overlay .timeline-meta-card-secondary .timeline-meta-description,
      #timeline-meta-overlay .timeline-meta-card-tertiary .timeline-meta-description {
        opacity: 0;
        transform: translateY(-10px);
        transition: opacity 0.28s ease 0s, transform 0.28s ease 0s;
      }

      /* ── Stagger reveal on hover (year → title → description) ───────── */
      #timeline-meta-overlay .timeline-meta-card-secondary.timeline-column--hovered .timeline-meta-year,
      #timeline-meta-overlay .timeline-meta-card-tertiary.timeline-column--hovered .timeline-meta-year {
        opacity: 1;
        transform: translateY(0);
        transition: opacity 0.28s ease 0s, transform 0.28s ease 0s;
      }

      #timeline-meta-overlay .timeline-meta-card-secondary.timeline-column--hovered .timeline-meta-title,
      #timeline-meta-overlay .timeline-meta-card-tertiary.timeline-column--hovered .timeline-meta-title {
        opacity: 1;
        transform: translateY(-2px);
        transition: opacity 0.28s ease 0.07s, transform 0.28s ease 0.07s;
      }

      #timeline-meta-overlay .timeline-meta-card-secondary.timeline-column--hovered .timeline-meta-description,
      #timeline-meta-overlay .timeline-meta-card-tertiary.timeline-column--hovered .timeline-meta-description {
        opacity: 1;
        transform: translateY(0);
        transition: opacity 0.28s ease 0.14s, transform 0.28s ease 0.14s;
      }

      @media (max-width: 980px) {
        #timeline-meta-overlay .timeline-meta-divider {
          display: none;
        }

        #timeline-meta-overlay .timeline-meta-header {
          top: 16px;
          left: 18px;
          font-size: 18px;
        }

        #timeline-meta-overlay .timeline-meta-comments {
          margin-top: 40px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  // ---------------------------------------------------------------------------
  // Event listeners
  // ---------------------------------------------------------------------------

  setupEventListeners() {
    window.addEventListener('timelineYearChange', this.boundOnYearChange);
    window.addEventListener('sceneChange', this.boundOnSceneChange);
    window.addEventListener('sceneTransitionComplete', this.boundOnTransitionComplete);

    // Phase 2 – RenderSystem hover broadcast
    this._busUnsubs.push(
      timelineEventBus.on('timeline:plane:hover', ({ planeIndex, isHovered }) => {
        const col = this.columns[planeIndex];
        if (col) col.onHoverChange(isHovered);
      })
    );

    // Hide tooltip while scrolling or during camera pull-back; re-enable after
    // scroll activity settles (300 ms of silence).
    const markScrolling = () => {
      this._isScrolling = true;
      this._hoverTooltip?.hide();
      clearTimeout(this._scrollEndTimer);
      this._scrollEndTimer = setTimeout(() => {
        this._isScrolling = false;
      }, 300);
    };
    this._busUnsubs.push(
      timelineEventBus.on('timeline:scroll', markScrolling),
      timelineEventBus.on('timeline:drag:start', markScrolling)
    );

    // Cursor-following comment tooltip
    this._busUnsubs.push(
      timelineEventBus.on('timeline:plane:cursor', ({ clientX, clientY, isHovered }) => {
        if (!this._hoverTooltip) return;
        if (isHovered && !this._isScrolling) {
          if (!this._hoverTooltip._isVisible) {
            this._hoverTooltip.show(clientX, clientY);
          } else {
            this._hoverTooltip.updatePosition(clientX, clientY);
          }
        } else {
          this._hoverTooltip.hide();
        }
      })
    );

    // Phase 2 – RenderSystem click broadcast
    this._busUnsubs.push(
      timelineEventBus.on('timeline:plane:click', ({ planeIndex }) => {
        this.columns.forEach((col) => col.onFocusChange(false));
        if (Number.isFinite(planeIndex) && this.columns[planeIndex]) {
          this.columns[planeIndex].onFocusChange(true);
        }
      })
    );

    // Phase 2 – detail view closed → clear all focus
    this._busUnsubs.push(
      timelineEventBus.on('timeline:plane:focus:clear', () => {
        this.columns.forEach((col) => col.onFocusChange(false));
      })
    );
  }

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  setImageData(imageData = []) {
    this.imageData = Array.isArray(imageData) ? imageData : [];
    this.updateEvents(this.currentYear);
  }

  // ---------------------------------------------------------------------------
  // Year / scene event handlers
  // ---------------------------------------------------------------------------

  onYearChange(event) {
    const year = event?.detail?.year;
    if (typeof year === 'number') {
      this.updateEvents(Math.max(this.minYear, Math.min(this.maxYear, Math.round(year))));
    }
  }

  onSceneChange(event) {
    const sceneName = event?.detail?.sceneName;
    if (sceneName === 'timeline') {
      this.show();
      this.updateEvents(this.currentYear);
    } else if (sceneName === 'initial') {
      this.hide();
    }
  }

  onTransitionComplete(event) {
    const sceneName = event?.detail?.sceneName;
    if (sceneName === 'timeline') {
      this.show();
      this.updateEvents(this.currentYear);
    }
  }

  // ---------------------------------------------------------------------------
  // Content helpers
  // ---------------------------------------------------------------------------

  getCardDataForYear(year) {
    const byYear = this.imageData.filter((item) => Number(item.year) === Number(year));
    if (byYear.length > 0) {
      return byYear.sort((a, b) => (a.order || 0) - (b.order || 0))[0];
    }
    return { year, title: 'Event name', description: '' };
  }

  // ---------------------------------------------------------------------------
  // Column activation
  // ---------------------------------------------------------------------------

  /**
   * Activate up to three columns (focused year + two neighbours) and
   * deactivate everything else. Updates content for all active columns.
   * @param {number} year - The currently focused year
   */
  updateEvents(year) {
    this.currentYear = year;

    if (!this._ensureColumns()) {
      // Planes not ready yet – retry on next RAF tick
      return;
    }

    const focusedIndex = this.currentYear - this.minYear;

    // Determine the three active indices; no duplicates, no out-of-range
    const candidateIndices = [focusedIndex, focusedIndex + 1, focusedIndex + 2];
    const activeIndices = [...new Set(
      candidateIndices.filter((i) => i >= 0 && i < this.columns.length)
    )];

    // Deactivate all columns first
    this.columns.forEach((col) => col.setActive(false));

    // Activate the visible ones with the correct variant and content
    activeIndices.forEach((colIndex, position) => {
      const col = this.columns[colIndex];
      const displayYear = this.minYear + colIndex;
      const entry = this.getCardDataForYear(displayYear);

      const variant = position === 0 ? 'primary' : position === 1 ? 'secondary' : 'tertiary';
      col.setVariant(variant);
      col.setActive(true);
      col.setContent({
        year: displayYear,
        title: entry.title,
        description: entry.description,
        ghostYear: position === 0 ? displayYear : undefined
      });
    });

    this.updateAnchoredLayout();
  }

  // ---------------------------------------------------------------------------
  // Layout (RAF loop)
  // ---------------------------------------------------------------------------

  /**
   * Reproject all active columns and update divider lines.
   * Called every animation frame while the panel is visible.
   */
  updateAnchoredLayout() {
    if (!this.isVisible) return;

    const camera = window.app?.camera;
    if (!camera) return;

    if (!this._ensureColumns()) return;

    const viewportWidth = Math.max(1, window.innerWidth || 1);
    const viewportHeight = Math.max(1, window.innerHeight || 1);

    const focusedIndex = this.currentYear - this.minYear;

    // Update layout for each active column
    let primaryBounds = null;
    let secondaryBounds = null;
    let tertiaryBounds = null;

    this.columns.forEach((col, index) => {
      if (!col.isActive) return;
      const position = index - focusedIndex; // 0 = primary, 1 = secondary, 2 = tertiary
      const isPrimary = position === 0;
      const bounds = col.updateLayout(camera, viewportWidth, viewportHeight, isPrimary);
      if (position === 0) primaryBounds = bounds;
      else if (position === 1) secondaryBounds = bounds;
      else if (position === 2) tertiaryBounds = bounds;
    });

    this.updateColumnGuides(viewportWidth, primaryBounds, secondaryBounds, tertiaryBounds, camera, viewportHeight);
  }

  // ---------------------------------------------------------------------------
  // Divider lines
  // ---------------------------------------------------------------------------

  /**
   * Lightweight divider-only sync called every Three.js frame from RenderSystem.
   * Reads plane bounds directly (no card layout, no getBoundingClientRect) so it
   * can be called in the same RAF as updateImagePositions without causing a
   * double forced-layout that would misplace the second image's metadata card.
   */
  syncDividers() {
    if (!this.isVisible) return;
    const camera = window.app?.camera;
    if (!camera || !this._ensureColumns()) return;

    const viewportWidth = Math.max(1, window.innerWidth || 1);
    const viewportHeight = Math.max(1, window.innerHeight || 1);
    const focusedIndex = this.currentYear - this.minYear;

    let primaryBounds = null;
    let secondaryBounds = null;
    let tertiaryBounds = null;

    this.columns.forEach((col, index) => {
      if (!col.isActive) return;
      const position = index - focusedIndex;
      const bounds = col.getPlaneBounds(camera, viewportWidth, viewportHeight);
      if (!bounds) return;
      if (position === 0) primaryBounds = bounds;
      else if (position === 1) secondaryBounds = bounds;
      else if (position === 2) tertiaryBounds = bounds;
    });

    this.updateColumnGuides(viewportWidth, primaryBounds, secondaryBounds, tertiaryBounds, camera, viewportHeight);
  }

  /**
   * Compute vertical divider positions from all visible plane bounds and
   * update the CSS custom properties and divider DOM nodes.
   */
  updateColumnGuides(viewportWidth, primaryBounds, secondaryBounds, tertiaryBounds, camera, viewportHeight) {
    if (!this.panel || !Number.isFinite(viewportWidth) || viewportWidth <= 0) return;

    const fallbackDividerOne = Math.round(viewportWidth * 0.42);
    const fallbackDividerTwo = Math.round(viewportWidth * 0.69);
    const dividerOnePx = primaryBounds?.right ?? fallbackDividerOne;
    const dividerTwoSource = secondaryBounds?.right ?? tertiaryBounds?.left ?? fallbackDividerTwo;
    const dividerTwoPx = Math.max(dividerOnePx + 1, Math.round(dividerTwoSource));

    this.panel.style.setProperty('--timeline-divider-one', `${dividerOnePx}px`);
    this.panel.style.setProperty('--timeline-divider-two', `${dividerTwoPx}px`);

    if (!this.dividerLayer) return;

    // Collect bounds for ALL columns (not just active) to draw column-boundary dividers
    const allBoundsEntries = this.columns
      .map((col, index) => ({ bounds: col.getPlaneBounds(camera, viewportWidth, viewportHeight), index }))
      .filter((entry) => Boolean(entry.bounds));

    const visibleBoundsByIndex = new Map(
      allBoundsEntries.map(({ bounds, index }) => [index, bounds])
    );

    // Sub-pixel helper: round to 0.5px so dividers track the image at 0.5px
    // granularity rather than integer steps, keeping them in sync with the
    // smooth Three.js scale/position animation every frame.
    const snap = (v) => Math.round(v * 2) / 2;

    const dividerPositions = allBoundsEntries
      .flatMap(({ bounds, index }) => {
        const positions = [];

        // Cluster boundary divider: align to left edge of 4th, 7th, … card
        if (index > 0 && (index % 3) === 0) {
          positions.push(snap(bounds.left));
        }

        // Suppress right edge of cluster-tail when the next cluster starts on-screen
        const isClusterTail = (index % 3) === 2;
        if (isClusterTail) {
          const nextBounds = visibleBoundsByIndex.get(index + 1);
          const nextLeftPx = Number.isFinite(nextBounds?.left) ? snap(nextBounds.left) : null;
          const nextBoundaryOnScreen = Number.isFinite(nextLeftPx) && nextLeftPx > 0 && nextLeftPx < viewportWidth;
          if (!nextBoundaryOnScreen) {
            positions.push(snap(bounds.right));
          }
          return positions;
        }

        positions.push(snap(bounds.right));
        return positions;
      })
      .filter((x) => Number.isFinite(x) && x > 0 && x < viewportWidth)
      .sort((a, b) => a - b)
      .filter((x, i, arr) => i === 0 || Math.abs(x - arr[i - 1]) > 1);

    const key = dividerPositions.join(',');
    if (key === this.lastDividerPositionsKey) return;
    this.lastDividerPositionsKey = key;

    // Reuse existing divider elements when the count stays the same to avoid
    // layout thrash; only rebuild the DOM when the count changes.
    const existing = this.dividerLayer.children;
    if (existing.length === dividerPositions.length) {
      dividerPositions.forEach((x, i) => {
        existing[i].style.left = `${x}px`;
      });
    } else {
      this.dividerLayer.replaceChildren();
      const fragment = document.createDocumentFragment();
      dividerPositions.forEach((x) => {
        const divider = document.createElement('div');
        divider.className = 'timeline-meta-divider';
        divider.style.left = `${x}px`;
        fragment.appendChild(divider);
      });
      this.dividerLayer.appendChild(fragment);
    }
  }

  // ---------------------------------------------------------------------------
  // RAF tracking
  // ---------------------------------------------------------------------------

  startTracking() {
    if (this.rafId) return;
    const loop = () => {
      if (!this.isVisible) {
        this.rafId = null;
        return;
      }
      this.updateAnchoredLayout();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stopTracking() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Show / hide
  // ---------------------------------------------------------------------------

  show() {
    if (this.isVisible) return;
    this.isVisible = true;
    this.panel?.setAttribute('aria-hidden', 'false');
    document.body.classList.add('timeline-meta-active');
    this.startTracking();
  }

  hide() {
    this.isVisible = false;
    this.panel?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('timeline-meta-active');
    this.stopTracking();
    this._hoverTooltip?.hide();
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  destroy() {
    window.removeEventListener('timelineYearChange', this.boundOnYearChange);
    window.removeEventListener('sceneChange', this.boundOnSceneChange);
    window.removeEventListener('sceneTransitionComplete', this.boundOnTransitionComplete);

    this._busUnsubs.forEach((unsub) => unsub());
    this._busUnsubs = [];

    clearTimeout(this._scrollEndTimer);
    this._scrollEndTimer = null;

    this._hoverTooltip?.destroy();
    this._hoverTooltip = null;

    this.hide();
    this.columns.forEach((col) => col.destroy());
    this.columns = [];

    if (this.panel?.parentNode) {
      this.panel.parentNode.removeChild(this.panel);
    }
  }
}
