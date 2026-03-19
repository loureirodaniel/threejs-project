/**
 * UIManager - Owns timeline UI element visibility.
 *
 * Extracted from RenderSystem so DOM-visibility logic is isolated from
 * the Three.js render loop. RenderSystem calls these methods directly
 * (via its own thin wrappers) so no call-sites outside RenderSystem
 * needed to change.
 *
 * @module ui
 */

class UIManager {
  constructor() {
    /** @type {Array<{el: HTMLElement, opacity: string, visibility: string, pointerEvents: string}>} */
    this.hiddenTimelineUIState = [];
    this.timelineUIHiddenByRenderSystem = false;
  }

  /**
   * Snapshot and hide the set of timeline UI elements so they don't
   * bleed through during fullscreen detail view.
   */
  hideTimelineUI() {
    if (typeof document === 'undefined') return;
    if (this.timelineUIHiddenByRenderSystem) return;

    const selectors = [
      '.timeline-ui-wrapper',
      '.project-title',
      '.year-overlay',
      '#timeline-navigation',
      '#timeline-meta-overlay',
    ];
    const elements = selectors
      .map((selector) => document.querySelector(selector))
      .filter(Boolean);

    this.hiddenTimelineUIState = [];
    elements.forEach((el) => {
      this.hiddenTimelineUIState.push({
        el,
        opacity: el.style.opacity,
        visibility: el.style.visibility,
        pointerEvents: el.style.pointerEvents,
      });
      el.style.opacity = '0';
      el.style.visibility = 'hidden';
      el.style.pointerEvents = 'none';
    });
    this.timelineUIHiddenByRenderSystem = true;
  }

  /**
   * Restore timeline UI elements that were hidden by hideTimelineUI().
   */
  showTimelineUI() {
    if (
      !this.timelineUIHiddenByRenderSystem &&
      (!Array.isArray(this.hiddenTimelineUIState) || this.hiddenTimelineUIState.length === 0)
    ) {
      return;
    }

    this.hiddenTimelineUIState.forEach((item) => {
      const { el, opacity, visibility, pointerEvents } = item;
      if (!el) return;
      el.style.opacity = opacity || '';
      el.style.visibility = visibility || '';
      el.style.pointerEvents = pointerEvents || '';
    });

    this.hiddenTimelineUIState = [];
    this.timelineUIHiddenByRenderSystem = false;
    this.refreshTimelineMetaOverlay();
  }

  /**
   * Remove any body/html overflow or pointer-events locks that were applied
   * when the detail view opened.
   */
  unlockGlobalScrollLock() {
    if (typeof document === 'undefined') return;
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('pointer-events');
    document.documentElement?.style?.removeProperty('overflow');
    document.documentElement?.style?.removeProperty('pointer-events');
  }

  /**
   * Force the events-panel to regenerate its anchored dividers after a
   * detail-view close (cached positions may have been invalidated).
   */
  refreshTimelineMetaOverlay() {
    const eventsPanel = window.app?.eventsPanel;
    if (!eventsPanel) return;
    eventsPanel.lastDividerPositionsKey = '';
    requestAnimationFrame(() => {
      eventsPanel.updateAnchoredLayout?.();
    });
  }
}

export { UIManager };
