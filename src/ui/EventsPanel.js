import { TimelineMetaBox } from './TimelineMetaBox.js';

const PRIMARY_COMMENT_ITEMS = [
  { date: '24/06/26', text: 'Comment1' },
  { date: '24/06/26', text: 'Comment 2' },
  { date: '24/06/26', text: 'Comment3' }
];
const META_BOX_OFFSET_PX = 14;

function projectToScreen(position, camera, viewportWidth, viewportHeight) {
  const projected = position.clone().project(camera);
  return {
    x: (projected.x * 0.5 + 0.5) * viewportWidth,
    y: (-projected.y * 0.5 + 0.5) * viewportHeight
  };
}

function planePixelSize(plane, camera, viewportHeight) {
  const geometryWidth = plane?.geometry?.parameters?.width ?? 2.5;
  const geometryHeight = plane?.geometry?.parameters?.height ?? (geometryWidth * 0.75);
  const scaleX = plane?.scale?.x ?? 1;
  const scaleY = plane?.scale?.y ?? 1;
  const worldWidth = geometryWidth * scaleX;
  const worldHeight = geometryHeight * scaleY;

  const distance = Math.max(0.001, Math.abs((camera.position?.z ?? 2.5) - (plane.position?.z ?? 0)));
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

    const dividerOne = document.createElement('div');
    dividerOne.className = 'timeline-meta-divider timeline-meta-divider-one';
    this.dividerOne = dividerOne;

    const dividerTwo = document.createElement('div');
    dividerTwo.className = 'timeline-meta-divider timeline-meta-divider-two';
    this.dividerTwo = dividerTwo;

    this.header = document.createElement('div');
    this.header.className = 'timeline-meta-header';
    this.header.textContent = 'Archivo memoria';

    this.primaryMetaBox = new TimelineMetaBox({
      variant: 'primary',
      includeGhostAndComments: true,
      comments: PRIMARY_COMMENT_ITEMS
    });
    this.secondaryMetaBox = new TimelineMetaBox({ variant: 'secondary' });
    this.tertiaryMetaBox = new TimelineMetaBox({ variant: 'tertiary' });

    this.panel.appendChild(dividerOne);
    this.panel.appendChild(dividerTwo);
    this.panel.appendChild(this.header);
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

      #timeline-meta-overlay .timeline-meta-divider {
        position: absolute;
        top: 8px;
        bottom: 8px;
        width: 1px;
        background: rgba(244, 244, 244, 0.12);
      }

      #timeline-meta-overlay .timeline-meta-divider-one {
        left: var(--timeline-divider-one);
      }

      #timeline-meta-overlay .timeline-meta-divider-two {
        left: var(--timeline-divider-two);
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

      #timeline-meta-overlay .timeline-meta-card-secondary .timeline-meta-title,
      #timeline-meta-overlay .timeline-meta-card-tertiary .timeline-meta-title {
        font-size: clamp(18px, 1.4vw, 28px);
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

    this.primaryMetaBox?.setContent({ year: year1, title: primaryEntry.title, ghostYear: year1 });
    this.secondaryMetaBox?.setContent({ year: year2, title: secondaryEntry.title });
    this.tertiaryMetaBox?.setContent({ year: year3, title: tertiaryEntry.title });

    this.updateAnchoredLayout();
  }

  getAllTimelinePlanes() {
    const initialPlanes = window.app?.imagePlanes?.getPlanes?.() || [];
    const additionalPlanes = window.app?.timelineScene?.timelinePlanes || [];
    return [...initialPlanes, ...additionalPlanes];
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

    this.updateColumnGuides(viewportWidth, primaryBounds, secondaryBounds, tertiaryBounds);
  }

  placeMetaUnderPlane(metaBox, plane, camera, viewportWidth, viewportHeight, isPrimary) {
    if (!metaBox || !plane || !plane.visible) {
      if (metaBox) metaBox.setLayout({ visible: false });
      return null;
    }

    const center = projectToScreen(plane.position, camera, viewportWidth, viewportHeight);
    const size = planePixelSize(plane, camera, viewportHeight);

    const left = Math.round(center.x - (size.width / 2));
    const top = Math.round(center.y + (size.height / 2));

    if (isPrimary) {
      const minHeight = Math.max(120, Math.min(230, Math.round(size.height * 0.8)));
      metaBox.setLayout({
        left,
        top: Math.round(top + META_BOX_OFFSET_PX),
        width: Math.round(size.width),
        minHeight,
        visible: true
      });
    } else {
      metaBox.setLayout({
        left,
        top: Math.round(top + META_BOX_OFFSET_PX),
        width: Math.round(size.width),
        minHeight: 96,
        visible: true
      });
    }

    return {
      left,
      right: left + Math.round(size.width),
      top,
      bottom: top + Math.round(size.height)
    };
  }

  updateColumnGuides(viewportWidth, primaryBounds, secondaryBounds, tertiaryBounds) {
    if (!this.panel || !Number.isFinite(viewportWidth) || viewportWidth <= 0) return;

    const fallbackDividerOne = Math.round(viewportWidth * 0.42);
    const fallbackDividerTwo = Math.round(viewportWidth * 0.69);

    const dividerOnePx = primaryBounds?.right ?? fallbackDividerOne;
    // Keep divider lines on actual image edges so columns match visible plane widths.
    const dividerTwoSource = secondaryBounds?.right ?? tertiaryBounds?.left ?? fallbackDividerTwo;
    const dividerTwoPx = Math.max(dividerOnePx + 1, Math.round(dividerTwoSource));

    this.panel.style.setProperty('--timeline-divider-one', `${dividerOnePx}px`);
    this.panel.style.setProperty('--timeline-divider-two', `${dividerTwoPx}px`);
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
