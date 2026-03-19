/**
 * TimelineColumn - Single column component that owns both a Three.js plane
 * reference and its DOM metadata card (year, title, description, comments).
 *
 * Each column is independently responsible for:
 * - Layout: positioning its metadata card below the 3D plane's screen projection
 * - Content: rendering year, title, description for one timeline entry
 * - State: hover and focus states with CSS class toggling
 *
 * The column manager (EventsPanel) creates one TimelineColumn per plane and
 * activates/deactivates them based on the current focused year.
 *
 * @module ui
 */

import { TimelineMetaBox } from './TimelineMetaBox.js';
import { SCENE_CONFIG, IMAGE_ASPECT_RATIO, getSceneMargins } from '../timeline-v2/utils/TimelineConstants.js';

const META_BOX_OFFSET_PX = 10;
const META_VIEWPORT_MARGIN_PX = 12;

// ---------------------------------------------------------------------------
// Shared projection utilities (same math as EventsPanel, scoped here so each
// column can compute its own layout without reaching into the manager)
// ---------------------------------------------------------------------------

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function projectToScreen(position, camera, viewportWidth, viewportHeight) {
  const projected = position.clone().project(camera);
  return {
    x: (projected.x * 0.5 + 0.5) * viewportWidth,
    y: (-projected.y * 0.5 + 0.5) * viewportHeight
  };
}

function resolveTimelineReferenceZ(camera) {
  const cameraSystem = window.app?.timelineController?.cameraSystem;
  if (typeof cameraSystem?.getTimelineDefaultZ === 'function') {
    const z = cameraSystem.getTimelineDefaultZ();
    if (Number.isFinite(z)) return z;
  }
  const configuredZ = SCENE_CONFIG?.timeline?.position?.z;
  if (Number.isFinite(configuredZ)) return configuredZ;
  return Number.isFinite(camera?.position?.z) ? camera.position.z : 2.5;
}

function planePixelSize(plane, camera, viewportHeight, useTimelineReferenceDistance = true) {
  const geometryWidth = plane?.geometry?.parameters?.width ?? 2.5;
  const geometryHeight = plane?.geometry?.parameters?.height ?? (geometryWidth * IMAGE_ASPECT_RATIO);
  const scaleX = plane?.scale?.x ?? 1;
  const scaleY = plane?.scale?.y ?? 1;
  const worldWidth = geometryWidth * scaleX;
  const worldHeight = geometryHeight * scaleY;

  const cameraZ = useTimelineReferenceDistance
    ? resolveTimelineReferenceZ(camera)
    : (Number.isFinite(camera?.position?.z) ? camera.position.z : resolveTimelineReferenceZ(camera));
  const distance = Math.max(0.001, Math.abs(cameraZ - (plane.position?.z ?? 0)));
  const fovRad = ((camera.fov || 30) * Math.PI) / 180;
  const visibleHeight = 2 * Math.tan(fovRad / 2) * distance;
  const pixelsPerUnit = viewportHeight / visibleHeight;

  return {
    width: Math.max(1, worldWidth * pixelsPerUnit),
    height: Math.max(1, worldHeight * pixelsPerUnit)
  };
}

// ---------------------------------------------------------------------------
// TimelineColumn
// ---------------------------------------------------------------------------

export class TimelineColumn {
  /**
   * @param {object} options
   * @param {HTMLElement} options.panel - The overlay panel container (#timeline-meta-overlay)
   * @param {THREE.Mesh|null} options.plane - Corresponding Three.js mesh (may be set later)
   * @param {number} options.index - Zero-based position in the planes array
   * @param {'primary'|'secondary'|'tertiary'} [options.variant='tertiary']
   * @param {boolean} [options.includeGhostAndComments=false]
   * @param {Array<{date:string,text:string}>} [options.comments=[]]
   */
  constructor({
    panel,
    plane = null,
    index,
    variant = 'tertiary',
    includeGhostAndComments = false,
    comments = []
  } = {}) {
    this.panel = panel;
    this.plane = plane;
    this.index = index;
    this.variant = variant;

    this.isActive = false;
    this.isHovered = false;
    this.isFocused = false;

    this.metaBox = new TimelineMetaBox({ variant, includeGhostAndComments, comments });
    this.panel.appendChild(this.metaBox.getElement());

    // Start hidden – the manager activates columns as needed
    this.metaBox.setLayout({ visible: false });
  }

  // ---------------------------------------------------------------------------
  // Content
  // ---------------------------------------------------------------------------

  /**
   * Update the text content displayed in this column's metadata card.
   * @param {{ year?: number|string, title?: string, description?: string, ghostYear?: number|string }} data
   */
  setContent({ year, title, description, ghostYear } = {}) {
    this.metaBox.setContent({ year, title, description, ghostYear });
  }

  // ---------------------------------------------------------------------------
  // Variant
  // ---------------------------------------------------------------------------

  /**
   * Swap the visual variant (primary / secondary / tertiary) by updating the
   * CSS class on the card element so styles apply immediately.
   * Ghost year and comments are visible only on 'primary' (controlled by CSS).
   * @param {'primary'|'secondary'|'tertiary'} variant
   */
  setVariant(variant) {
    if (variant === this.variant) return;
    const el = this.metaBox.getElement();
    el.classList.remove(`timeline-meta-card-${this.variant}`);
    el.classList.add(`timeline-meta-card-${variant}`);
    this.variant = variant;
  }

  // ---------------------------------------------------------------------------
  // Active / visible
  // ---------------------------------------------------------------------------

  /**
   * Activate or deactivate this column.
   * Inactive columns have their metadata card hidden.
   * @param {boolean} active
   */
  setActive(active) {
    this.isActive = Boolean(active);
    if (!this.isActive) {
      this.metaBox.setLayout({ visible: false });
    }
  }

  // ---------------------------------------------------------------------------
  // Phase 2 – hover & focus state (driven by RenderSystem events)
  // ---------------------------------------------------------------------------

  /**
   * Called by the column manager when RenderSystem signals a hover change on
   * the plane that belongs to this column.
   * Applies / removes the CSS class used for text hover animations.
   * @param {boolean} isHovered
   */
  onHoverChange(isHovered) {
    if (this.isHovered === isHovered) return;
    this.isHovered = isHovered;
    this.metaBox.getElement().classList.toggle('timeline-column--hovered', isHovered);
  }

  /**
   * Called by the column manager when this column's plane is clicked (focus
   * enters) or when the detail view closes (focus leaves).
   * @param {boolean} isFocused
   */
  onFocusChange(isFocused) {
    if (this.isFocused === isFocused) return;
    this.isFocused = isFocused;
    this.metaBox.getElement().classList.toggle('timeline-column--focused', isFocused);
  }

  // ---------------------------------------------------------------------------
  // Layout (called every frame by the column manager)
  // ---------------------------------------------------------------------------

  /**
   * Project the 3D plane position to screen space and position this column's
   * metadata card directly below the image.
   *
   * Mirrors the original EventsPanel.placeMetaUnderPlane() logic, but scoped
   * to a single column so each column manages its own layout independently.
   *
   * @param {THREE.Camera} camera
   * @param {number} viewportWidth
   * @param {number} viewportHeight
   * @param {boolean} [isPrimary=false] Affects minimum card height
   * @returns {{ left: number, right: number, top: number, bottom: number } | null}
   */
  updateLayout(camera, viewportWidth, viewportHeight, isPrimary = false) {
    if (!this.isActive || !this.plane || !this.plane.visible) {
      this.metaBox.setLayout({ visible: false });
      return null;
    }

    const center = projectToScreen(this.plane.position, camera, viewportWidth, viewportHeight);
    const size = planePixelSize(this.plane, camera, viewportHeight, true);

    // Absolute minimum: card top must never go above this line regardless of any clamping.
    const imageBotPx = Math.round(center.y + size.height / 2);
    const minTopAllowed = imageBotPx + META_BOX_OFFSET_PX;

    const requestedLeft = Math.round(center.x - (size.width / 2));
    const requestedTop = minTopAllowed;
    const cardWidth = Math.max(
      1,
      Math.min(Math.round(size.width), viewportWidth - (META_VIEWPORT_MARGIN_PX * 2))
    );
    const maxLeft = Math.max(META_VIEWPORT_MARGIN_PX, viewportWidth - cardWidth - META_VIEWPORT_MARGIN_PX);
    const left = clamp(requestedLeft, META_VIEWPORT_MARGIN_PX, maxLeft);
    const right = left + cardWidth;
    const navBottomReserve = getSceneMargins().bottom;
    const desiredMinHeight = isPrimary
      ? Math.max(120, Math.min(230, Math.round(size.height * 0.8)))
      : 96;
    const maxTopFromMinHeight = Math.max(
      minTopAllowed,
      viewportHeight - desiredMinHeight - navBottomReserve
    );
    // Clamp but never let the viewport-space ceiling pull top above the image bottom.
    let top = Math.max(
      minTopAllowed,
      clamp(requestedTop, minTopAllowed, maxTopFromMinHeight)
    );

    this.metaBox.setLayout({ left, top, width: cardWidth, minHeight: desiredMinHeight, visible: true });

    const element = this.metaBox.getElement();
    if (element) {
      const rect = element.getBoundingClientRect();
      if (rect.bottom > viewportHeight - navBottomReserve) {
        top -= (rect.bottom - (viewportHeight - navBottomReserve));
      }
      if (rect.top < META_VIEWPORT_MARGIN_PX) {
        top += (META_VIEWPORT_MARGIN_PX - rect.top);
      }
      const clampedTop = clamp(
        Math.round(top),
        META_VIEWPORT_MARGIN_PX,
        Math.max(META_VIEWPORT_MARGIN_PX, viewportHeight - Math.ceil(rect.height) - navBottomReserve)
      );
      // Hard guard: card must always sit at least META_BOX_OFFSET_PX below the image bottom.
      const finalTop = Math.max(clampedTop, minTopAllowed);
      if (finalTop !== Math.round(element.offsetTop || 0)) {
        this.metaBox.setLayout({ left, top: finalTop, width: cardWidth, minHeight: desiredMinHeight, visible: true });
        top = finalTop;
      }
    }

    return { left, right, top, bottom: top + Math.round(desiredMinHeight) };
  }

  /**
   * Return the screen-space left/right pixel bounds of this column's 3D plane.
   * Used by the column manager to position vertical divider lines between columns.
   *
   * @param {THREE.Camera} camera
   * @param {number} viewportWidth
   * @param {number} viewportHeight
   * @returns {{ left: number, right: number } | null}
   */
  getPlaneBounds(camera, viewportWidth, viewportHeight) {
    if (!this.plane || !this.plane.visible) return null;
    const center = projectToScreen(this.plane.position, camera, viewportWidth, viewportHeight);
    const size = planePixelSize(this.plane, camera, viewportHeight, false);
    return {
      left: Math.floor(center.x - (size.width / 2)),
      right: Math.ceil(center.x + (size.width / 2))
    };
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  /** Remove the metadata card DOM element and release references. */
  destroy() {
    const el = this.metaBox.getElement();
    if (el?.parentNode) {
      el.parentNode.removeChild(el);
    }
    this.plane = null;
    this.panel = null;
  }
}
