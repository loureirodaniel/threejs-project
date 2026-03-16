import { TimelineMetaBox } from './TimelineMetaBox.js';
import { SCENE_CONFIG, IMAGE_ASPECT_RATIO } from '../timeline-v2/utils/TimelineConstants.js';

const PRIMARY_COMMENT_ITEMS = [
  { date: '24/06/26', text: 'Comment1' },
  { date: '24/06/26', text: 'Comment 2' },
  { date: '24/06/26', text: 'Comment3' }
];
const META_BOX_OFFSET_PX = 14;
const META_VIEWPORT_MARGIN_PX = 12;

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
    const timelineDefaultZ = cameraSystem.getTimelineDefaultZ();
    if (Number.isFinite(timelineDefaultZ)) return timelineDefaultZ;
  }

  const configuredTimelineZ = SCENE_CONFIG?.timeline?.position?.z;
  if (Number.isFinite(configuredTimelineZ)) return configuredTimelineZ;

  return Number.isFinite(camera?.position?.z) ? camera.position.z : 2.5;
}

function planePixelSize(plane, camera, viewportHeight, useTimelineReferenceDistance = true) {
  const geometryWidth = plane?.geometry?.parameters?.width ?? 2.5;
  const geometryHeight = plane?.geometry?.parameters?.height ?? (geometryWidth * IMAGE_ASPECT_RATIO);
  const scaleX = plane?.scale?.x ?? 1;
  const scaleY = plane?.scale?.y ?? 1;
  const worldWidth = geometryWidth * scaleX;
  const worldHeight = geometryHeight * scaleY;

  // Metadata boxes use timeline baseline distance so temporary scroll pullback/return
  // doesn't squash or crop text while the cards keep a stable reading size.
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

export class EventsPanel {
  constructor(imageData = []) {
    this.imageData = Array.isArray(imageData) ? imageData : [];
    this.currentYear = 2010;
    this.minYear = 2010;
    this.maxYear = 2019;
    this.isVisible = false;
    this.rafId = null;

    this.panel = null;
    this.header = null;
    this.primaryMetaBox = null;
    this.secondaryMetaBox = null;
    this.tertiaryMetaBox = null;
    this.dividerLayer = null;
    this.lastDividerPositionsKey = '';

    this.boundOnYearChange = this.onYearChange.bind(this);
    this.boundOnSceneChange = this.onSceneChange.bind(this);
    this.boundOnTransitionComplete = this.onTransitionComplete.bind(this);

    this.init();
  }

  init() {
    this.createPanel();
    this.injectStyles();
    this.setupEventListeners();
    this.updateEvents(this.currentYear);
    this.hide();
  }

  createPanel() {
    this.panel = document.createElement('div');
    this.panel.id = 'timeline-meta-overlay';
    this.panel.setAttribute('aria-hidden', 'true');

    this.dividerLayer = document.createElement('div');
    this.dividerLayer.className = 'timeline-meta-divider-layer';


    this.primaryMetaBox = new TimelineMetaBox({
      variant: 'primary',
      includeGhostAndComments: true,
      comments: PRIMARY_COMMENT_ITEMS
    });
    this.secondaryMetaBox = new TimelineMetaBox({ variant: 'secondary' });
    this.tertiaryMetaBox = new TimelineMetaBox({ variant: 'tertiary' });

    this.panel.appendChild(this.dividerLayer);
    this.panel.appendChild(this.primaryMetaBox.getElement());
    this.panel.appendChild(this.secondaryMetaBox.getElement());
    this.panel.appendChild(this.tertiaryMetaBox.getElement());

    document.body.appendChild(this.panel);
  }

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
        border-top: 1px solid rgba(255, 255, 255, 0.07);
        padding: 8px 10px 10px;
        box-sizing: border-box;
        overflow: hidden;
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
      }

      #timeline-meta-overlay .timeline-meta-title {
        margin: 0;
        font-weight: 300;
        letter-spacing: -0.01em;
        font-size: clamp(22px, 1.7vw, 35px);
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

  setupEventListeners() {
    window.addEventListener('timelineYearChange', this.boundOnYearChange);
    window.addEventListener('sceneChange', this.boundOnSceneChange);
    window.addEventListener('sceneTransitionComplete', this.boundOnTransitionComplete);
  }

  setImageData(imageData = []) {
    this.imageData = Array.isArray(imageData) ? imageData : [];
    this.updateEvents(this.currentYear);
  }

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

  getCardDataForYear(year) {
    const byYear = this.imageData.filter((item) => Number(item.year) === Number(year));
    if (byYear.length > 0) {
      return byYear.sort((a, b) => (a.order || 0) - (b.order || 0))[0];
    }

    return {
      year,
      title: 'Event name',
      description: ''
    };
  }

  updateEvents(year) {
    this.currentYear = year;

    const year1 = this.currentYear;
    const year2 = Math.min(this.maxYear, year1 + 1);
    const year3 = Math.min(this.maxYear, year1 + 2);

    const primaryEntry = this.getCardDataForYear(year1);
    const secondaryEntry = this.getCardDataForYear(year2);
    const tertiaryEntry = this.getCardDataForYear(year3);

    this.primaryMetaBox?.setContent({
      year: year1,
      title: primaryEntry.title,
      description: primaryEntry.description,
      ghostYear: year1
    });
    this.secondaryMetaBox?.setContent({
      year: year2,
      title: secondaryEntry.title,
      description: secondaryEntry.description
    });
    this.tertiaryMetaBox?.setContent({
      year: year3,
      title: tertiaryEntry.title,
      description: tertiaryEntry.description
    });

    this.updateAnchoredLayout();
  }

  getAllTimelinePlanes() {
    // Keep in sync with RenderSystem, which positions and renders window.app.imagePlanes.planes.
    const imagePlanes = window.app?.imagePlanes;
    if (!imagePlanes) return [];
    if (Array.isArray(imagePlanes.planes) && imagePlanes.planes.length > 0) {
      return imagePlanes.planes;
    }
    return imagePlanes.getPlanes?.() || [];
  }

  updateAnchoredLayout() {
    if (!this.isVisible) return;

    const camera = window.app?.camera;
    if (!camera) return;

    const allPlanes = this.getAllTimelinePlanes();
    if (!Array.isArray(allPlanes) || allPlanes.length === 0) return;

    const viewportWidth = Math.max(1, window.innerWidth || 1);
    const viewportHeight = Math.max(1, window.innerHeight || 1);

    const index1 = Math.max(0, Math.min(allPlanes.length - 1, this.currentYear - this.minYear));
    const index2 = Math.max(0, Math.min(allPlanes.length - 1, index1 + 1));
    const index3 = Math.max(0, Math.min(allPlanes.length - 1, index1 + 2));

    const primaryBounds = this.placeMetaUnderPlane(this.primaryMetaBox, allPlanes[index1], camera, viewportWidth, viewportHeight, true);
    const secondaryBounds = this.placeMetaUnderPlane(this.secondaryMetaBox, allPlanes[index2], camera, viewportWidth, viewportHeight, false);
    const tertiaryBounds = this.placeMetaUnderPlane(this.tertiaryMetaBox, allPlanes[index3], camera, viewportWidth, viewportHeight, false);

    this.updateColumnGuides(
      viewportWidth,
      primaryBounds,
      secondaryBounds,
      tertiaryBounds,
      allPlanes,
      camera,
      viewportHeight
    );
  }

  placeMetaUnderPlane(metaBox, plane, camera, viewportWidth, viewportHeight, isPrimary) {
    if (!metaBox || !plane || !plane.visible) {
      if (metaBox) metaBox.setLayout({ visible: false });
      return null;
    }

    const center = projectToScreen(plane.position, camera, viewportWidth, viewportHeight);
    const size = planePixelSize(plane, camera, viewportHeight, true);

    const requestedLeft = Math.round(center.x - (size.width / 2));
    const requestedTop = Math.round(center.y + (size.height / 2) + META_BOX_OFFSET_PX);
    const cardWidth = Math.max(1, Math.min(Math.round(size.width), viewportWidth - (META_VIEWPORT_MARGIN_PX * 2)));
    const maxLeft = Math.max(META_VIEWPORT_MARGIN_PX, viewportWidth - cardWidth - META_VIEWPORT_MARGIN_PX);
    const left = clamp(requestedLeft, META_VIEWPORT_MARGIN_PX, maxLeft);
    const right = left + cardWidth;
    const desiredMinHeight = isPrimary
      ? Math.max(120, Math.min(230, Math.round(size.height * 0.8)))
      : 96;
    const maxTopFromMinHeight = Math.max(
      META_VIEWPORT_MARGIN_PX,
      viewportHeight - desiredMinHeight - META_VIEWPORT_MARGIN_PX
    );
    let top = clamp(requestedTop, META_VIEWPORT_MARGIN_PX, maxTopFromMinHeight);

    metaBox.setLayout({
      left,
      top,
      width: cardWidth,
      minHeight: desiredMinHeight,
      visible: true
    });

    const element = typeof metaBox.getElement === 'function' ? metaBox.getElement() : null;
    if (element) {
      const rect = element.getBoundingClientRect();
      if (rect.bottom > viewportHeight - META_VIEWPORT_MARGIN_PX) {
        top -= (rect.bottom - (viewportHeight - META_VIEWPORT_MARGIN_PX));
      }
      if (rect.top < META_VIEWPORT_MARGIN_PX) {
        top += (META_VIEWPORT_MARGIN_PX - rect.top);
      }
      const clampedTop = clamp(
        Math.round(top),
        META_VIEWPORT_MARGIN_PX,
        Math.max(META_VIEWPORT_MARGIN_PX, viewportHeight - Math.ceil(rect.height) - META_VIEWPORT_MARGIN_PX)
      );
      if (clampedTop !== Math.round(element.offsetTop || 0)) {
        metaBox.setLayout({
          left,
          top: clampedTop,
          width: cardWidth,
          minHeight: desiredMinHeight,
          visible: true
        });
      }
      top = clampedTop;
    }

    return {
      left,
      right,
      top,
      bottom: top + Math.round(desiredMinHeight)
    };
  }

  getPlaneBounds(plane, camera, viewportWidth, viewportHeight) {
    if (!plane || !plane.visible) return null;
    const center = projectToScreen(plane.position, camera, viewportWidth, viewportHeight);
    // Divider lines should reflect live image width while scrolling.
    const size = planePixelSize(plane, camera, viewportHeight, false);
    const left = Math.floor(center.x - (size.width / 2));
    const right = Math.ceil(center.x + (size.width / 2));
    return { left, right };
  }

  updateColumnGuides(viewportWidth, primaryBounds, secondaryBounds, tertiaryBounds, allPlanes, camera, viewportHeight) {
    if (!this.panel || !Number.isFinite(viewportWidth) || viewportWidth <= 0) return;

    const fallbackDividerOne = Math.round(viewportWidth * 0.42);
    const fallbackDividerTwo = Math.round(viewportWidth * 0.69);
    const dividerOnePx = primaryBounds?.right ?? fallbackDividerOne;
    const dividerTwoSource = secondaryBounds?.right ?? tertiaryBounds?.left ?? fallbackDividerTwo;
    const dividerTwoPx = Math.max(dividerOnePx + 1, Math.round(dividerTwoSource));

    this.panel.style.setProperty('--timeline-divider-one', `${dividerOnePx}px`);
    this.panel.style.setProperty('--timeline-divider-two', `${dividerTwoPx}px`);

    if (!this.dividerLayer || !Array.isArray(allPlanes)) return;

    const visibleBounds = allPlanes
      .map((plane, index) => ({ bounds: this.getPlaneBounds(plane, camera, viewportWidth, viewportHeight), index }))
      .filter((entry) => Boolean(entry.bounds));

    const visibleBoundsByIndex = new Map(
      visibleBounds.map(({ bounds, index }) => [index, bounds])
    );

    const dividerPositions = visibleBounds
      .flatMap(({ bounds, index }) => {
        const positions = [];

        // Align cluster boundary dividers (4th, 7th, ...) to the incoming card left edge.
        // Keep this marker AND the card's own right edge so the 4th-column right divider is visible.
        if (index > 0 && (index % 3) === 0) {
          positions.push(Math.round(bounds.left));
        }

        // Avoid duplicate boundary lines between the 3rd and 4th cards in each cluster.
        // Only suppress the 3rd card right edge when the 4th card left edge is on-screen.
        const isClusterTail = (index % 3) === 2;
        if (isClusterTail) {
          const nextBounds = visibleBoundsByIndex.get(index + 1);
          const nextLeftPx = Number.isFinite(nextBounds?.left) ? Math.round(nextBounds.left) : null;
          const nextBoundaryIsOnScreen = Number.isFinite(nextLeftPx) && nextLeftPx > 0 && nextLeftPx < viewportWidth;
          if (!nextBoundaryIsOnScreen) {
            positions.push(Math.round(bounds.right));
          }
          return positions;
        }

        positions.push(Math.round(bounds.right));
        return positions;
      })
      .filter((x) => Number.isFinite(x) && x > 0 && x < viewportWidth)
      .sort((a, b) => a - b)
      .filter((x, index, arr) => index === 0 || Math.abs(x - arr[index - 1]) > 2);

    const key = dividerPositions.join(',');
    if (key === this.lastDividerPositionsKey) return;
    this.lastDividerPositionsKey = key;

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
  }

  destroy() {
    window.removeEventListener('timelineYearChange', this.boundOnYearChange);
    window.removeEventListener('sceneChange', this.boundOnSceneChange);
    window.removeEventListener('sceneTransitionComplete', this.boundOnTransitionComplete);

    this.hide();

    if (this.panel && this.panel.parentNode) {
      this.panel.parentNode.removeChild(this.panel);
    }
  }
}
