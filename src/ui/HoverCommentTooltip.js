/**
 * HoverCommentTooltip
 *
 * A floating comment panel that appears at the cursor position when hovering
 * over a timeline image plane. The tooltip follows the cursor smoothly via
 * a RAF-driven lerp, and fades in/out via CSS transition.
 *
 * Usage:
 *   const tooltip = new HoverCommentTooltip();
 *   tooltip.show(clientX, clientY, comments);
 *   tooltip.updatePosition(clientX, clientY);  // called on every mousemove
 *   tooltip.hide();
 *   tooltip.destroy();
 */

const CURSOR_OFFSET_X = 22;
const CURSOR_OFFSET_Y = -8;
const VIEWPORT_MARGIN = 12;
const LERP_FACTOR = 0.15;

const STYLE_ID = 'hover-comment-tooltip-styles';

const DEFAULT_COMMENTS = Object.freeze([
  Object.freeze({ date: '24/06/26', text: 'Comment 1' }),
  Object.freeze({ date: '24/06/26', text: 'Comment 2' }),
  Object.freeze({ date: '24/06/26', text: 'Comment 3' }),
]);

export class HoverCommentTooltip {
  constructor() {
    this._element = null;
    this._listEl = null;
    this._isVisible = false;

    // Current interpolated position (starts at target so the first frame snaps)
    this._curX = 0;
    this._curY = 0;
    this._targetX = 0;
    this._targetY = 0;

    this._rafId = null;

    this._injectStyles();
    this._create();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Show the tooltip at the given cursor position with optional comment data.
   * Each comment item staggers in sequentially via CSS animation.
   * @param {number} clientX
   * @param {number} clientY
   * @param {Array<{date:string,text:string}>} [comments]
   */
  show(clientX, clientY, comments) {
    if (comments) this._setComments(comments);

    // Snap to position instantly on first appearance to avoid sliding in from 0,0
    this._curX = clientX;
    this._curY = clientY;
    this._targetX = clientX;
    this._targetY = clientY;
    this._applyTransform(this._curX, this._curY);

    this._isVisible = true;
    this._element.classList.add('hct--visible');
    this._triggerStagger();
    this._startRaf();
  }

  /**
   * Update the cursor target; the tooltip will lerp to it each frame.
   * @param {number} clientX
   * @param {number} clientY
   */
  updatePosition(clientX, clientY) {
    this._targetX = clientX;
    this._targetY = clientY;
  }

  /** Fade the tooltip out. */
  hide() {
    if (!this._isVisible) return;
    this._isVisible = false;
    this._element.classList.remove('hct--visible');
    this._stopRaf();
  }

  /** Remove the tooltip element from the DOM and clean up. */
  destroy() {
    this._stopRaf();
    if (this._element?.parentNode) {
      this._element.parentNode.removeChild(this._element);
    }
    this._element = null;
    this._listEl = null;
  }

  // ---------------------------------------------------------------------------
  // DOM creation
  // ---------------------------------------------------------------------------

  _create() {
    const el = document.createElement('div');
    el.className = 'hct';
    el.setAttribute('aria-hidden', 'true');

    const inner = document.createElement('div');
    inner.className = 'hct__inner';

    const header = document.createElement('div');
    header.className = 'hct__header';
    header.textContent = 'Comments';

    this._listEl = document.createElement('div');
    this._listEl.className = 'hct__list';
    this._setComments(DEFAULT_COMMENTS);

    inner.appendChild(header);
    inner.appendChild(this._listEl);
    el.appendChild(inner);

    document.body.appendChild(el);
    this._element = el;
  }

  _setComments(comments) {
    if (!this._listEl) return;
    this._listEl.innerHTML = '';
    const items = Array.isArray(comments) && comments.length > 0 ? comments : DEFAULT_COMMENTS;
    items.forEach(({ date, text }) => {
      const item = document.createElement('div');
      // hct__item--in is added later by _triggerStagger; start invisible
      item.className = 'hct__item';

      const dateEl = document.createElement('span');
      dateEl.className = 'hct__date';
      dateEl.textContent = date || '';

      const textEl = document.createElement('span');
      textEl.className = 'hct__text';
      textEl.textContent = text || '';

      item.appendChild(dateEl);
      item.appendChild(textEl);
      this._listEl.appendChild(item);
    });
  }

  // ---------------------------------------------------------------------------
  // Stagger reveal
  // ---------------------------------------------------------------------------

  /**
   * Replay the stagger-in animation on every item.
   * We reset the animation by toggling the class so the keyframe fires again
   * even if the tooltip was recently visible.
   */
  _triggerStagger() {
    if (!this._listEl) return;
    const STAGGER_MS = 60;
    const items = this._listEl.querySelectorAll('.hct__item');
    items.forEach((item, i) => {
      // Force animation restart by briefly removing and re-adding the class
      item.classList.remove('hct__item--in');
      // eslint-disable-next-line no-void
      void item.offsetWidth; // trigger reflow so the browser registers the removal
      item.style.animationDelay = `${i * STAGGER_MS}ms`;
      item.classList.add('hct__item--in');
    });
  }

  // ---------------------------------------------------------------------------
  // RAF loop – smooth follow
  // ---------------------------------------------------------------------------

  _startRaf() {
    if (this._rafId !== null) return;
    const tick = () => {
      if (!this._isVisible) {
        this._rafId = null;
        return;
      }
      this._curX += (this._targetX - this._curX) * LERP_FACTOR;
      this._curY += (this._targetY - this._curY) * LERP_FACTOR;
      this._applyTransform(this._curX, this._curY);
      this._rafId = requestAnimationFrame(tick);
    };
    this._rafId = requestAnimationFrame(tick);
  }

  _stopRaf() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Positioning
  // ---------------------------------------------------------------------------

  _applyTransform(x, y) {
    if (!this._element) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = this._element.offsetWidth || 200;
    const h = this._element.offsetHeight || 120;

    let posX = x + CURSOR_OFFSET_X;
    let posY = y + CURSOR_OFFSET_Y;

    // Flip to the left if it would overflow the right edge
    if (posX + w > vw - VIEWPORT_MARGIN) {
      posX = x - w - CURSOR_OFFSET_X;
    }
    // Flip down if it would overflow the top
    if (posY < VIEWPORT_MARGIN) {
      posY = y + CURSOR_OFFSET_X;
    }
    // Clamp bottom overflow
    if (posY + h > vh - VIEWPORT_MARGIN) {
      posY = vh - h - VIEWPORT_MARGIN;
    }
    // Hard left clamp
    if (posX < VIEWPORT_MARGIN) posX = VIEWPORT_MARGIN;

    this._element.style.transform = `translate(${Math.round(posX)}px, ${Math.round(posY)}px)`;
  }

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

  _injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes hct-item-in {
        from {
          opacity: 0;
          transform: translateY(6px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .hct {
        position: fixed;
        top: 0;
        left: 0;
        pointer-events: none;
        z-index: 9998;
        opacity: 0;
        transition: opacity 0.18s ease;
        will-change: transform, opacity;
      }

      .hct.hct--visible {
        opacity: 1;
      }

      .hct__inner {
        background: rgba(8, 8, 10, 0.82);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border: 1px solid rgba(255, 255, 255, 0.10);
        border-radius: 8px;
        padding: 10px 14px 12px;
        min-width: 170px;
        max-width: 230px;
        box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
      }

      .hct__header {
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.35);
        margin-bottom: 8px;
        font-family: inherit;
      }

      .hct__item {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 6px 0;
        border-top: 1px solid rgba(255, 255, 255, 0.07);
        opacity: 0;
      }

      .hct__item:first-child {
        border-top: none;
        padding-top: 0;
      }

      .hct__item.hct__item--in {
        animation: hct-item-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
      }

      .hct__date {
        font-size: 9px;
        color: rgba(255, 255, 255, 0.32);
        font-family: inherit;
        line-height: 1;
      }

      .hct__text {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.80);
        line-height: 1.45;
        font-family: inherit;
      }
    `;
    document.head.appendChild(style);
  }
}
