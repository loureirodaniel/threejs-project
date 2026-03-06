const DEFAULT_COMMENTS = Object.freeze([
  Object.freeze({ date: '24/06/26', text: 'Comment1' }),
  Object.freeze({ date: '24/06/26', text: 'Comment 2' }),
  Object.freeze({ date: '24/06/26', text: 'Comment3' })
]);

/**
 * Reusable timeline metadata box component.
 * Encapsulates the DOM for year/title plus optional ghost year + comments.
 */
export class TimelineMetaBox {
  constructor({
    variant = 'secondary',
    includeGhostAndComments = false,
    comments = DEFAULT_COMMENTS
  } = {}) {
    this.variant = variant;
    this.includeGhostAndComments = includeGhostAndComments;
    this.comments = Array.isArray(comments) ? comments : DEFAULT_COMMENTS;

    this.element = null;
    this.yearEl = null;
    this.titleEl = null;
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

    const title = document.createElement('h3');
    title.className = 'timeline-meta-title';
    title.textContent = 'Event name';

    content.appendChild(year);
    content.appendChild(title);

    let ghostYear = null;
    if (this.includeGhostAndComments) {
      ghostYear = document.createElement('div');
      ghostYear.className = 'timeline-meta-ghost-year';
      content.appendChild(ghostYear);

      const commentsContainer = document.createElement('div');
      commentsContainer.className = 'timeline-meta-comments-container';

      const comments = document.createElement('div');
      comments.className = 'timeline-meta-comments';

      this.comments.forEach((item) => {
        const block = document.createElement('div');
        block.className = 'timeline-meta-comment-item';

        const date = document.createElement('div');
        date.className = 'timeline-meta-comment-date';
        date.textContent = item.date || '';

        const text = document.createElement('div');
        text.className = 'timeline-meta-comment-text';
        text.textContent = item.text || '';

        block.appendChild(date);
        block.appendChild(text);
        comments.appendChild(block);
      });

      commentsContainer.appendChild(comments);
      content.appendChild(commentsContainer);
    }

    card.appendChild(content);

    this.element = card;
    this.yearEl = year;
    this.titleEl = title;
    this.ghostYearEl = ghostYear;
  }

  getElement() {
    return this.element;
  }

  setContent({ year, title, ghostYear } = {}) {
    if (typeof year !== 'undefined' && this.yearEl) {
      this.yearEl.textContent = String(year);
    }
    if (typeof title !== 'undefined' && this.titleEl) {
      this.titleEl.textContent = title || 'Event name';
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
