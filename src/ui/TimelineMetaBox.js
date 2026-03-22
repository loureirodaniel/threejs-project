/**
 * Reusable timeline metadata box component.
 * Encapsulates the DOM for year/title plus an optional ghost year overlay.
 * Comments are no longer rendered here — they appear in the hover tooltip.
 */
export class TimelineMetaBox {
  constructor({
    variant = 'secondary',
    includeGhostAndComments = false,
  } = {}) {
    this.variant = variant;
    this.includeGhostAndComments = includeGhostAndComments;

    this.element = null;
    this.yearEl = null;
    this.titleEl = null;
    this.descriptionEl = null;
    this.ghostYearEl = null;

    this.create();
  }

  create() {
    const card = document.createElement('article');
    card.className = `timeline-meta-card timeline-meta-card-${this.variant}`;

    const content = document.createElement('div');
    content.className = 'timeline-meta-content';

    const year = document.createElement('div');
    year.className = 'timeline-meta-year';

    const textStack = document.createElement('div');
    textStack.className = 'timeline-meta-text-stack';

    const title = document.createElement('h3');
    title.className = 'timeline-meta-title';
    title.textContent = 'Event name';

    const description = document.createElement('p');
    description.className = 'timeline-meta-description';
    description.textContent = '';

    textStack.appendChild(title);
    textStack.appendChild(description);

    content.appendChild(year);
    content.appendChild(textStack);

    let ghostYear = null;
    if (this.includeGhostAndComments) {
      ghostYear = document.createElement('div');
      ghostYear.className = 'timeline-meta-ghost-year';
      content.appendChild(ghostYear);
    }

    card.appendChild(content);

    this.element = card;
    this.yearEl = year;
    this.titleEl = title;
    this.descriptionEl = description;
    this.ghostYearEl = ghostYear;
  }

  getElement() {
    return this.element;
  }

  setContent({ year, title, description, ghostYear } = {}) {
    if (typeof year !== 'undefined' && this.yearEl) {
      this.yearEl.textContent = String(year);
    }
    if (typeof title !== 'undefined' && this.titleEl) {
      this.titleEl.textContent = title || 'Event name';
    }
    if (typeof description !== 'undefined' && this.descriptionEl) {
      this.descriptionEl.textContent = description || '';
    }
    if (this.ghostYearEl && typeof ghostYear !== 'undefined') {
      this.ghostYearEl.textContent = String(ghostYear);
    }
  }

  setLayout({ left, top, width, minHeight, visible = true } = {}) {
    if (!this.element) return;
    this.element.style.display = visible ? 'block' : 'none';
    if (!visible) return;

    if (typeof left === 'number') this.element.style.left = `${Math.round(left)}px`;
    if (typeof top === 'number') this.element.style.top = `${Math.round(top)}px`;
    if (typeof width === 'number') this.element.style.width = `${Math.max(1, Math.round(width))}px`;
    if (typeof minHeight === 'number') this.element.style.minHeight = `${Math.round(minHeight)}px`;
  }
}
