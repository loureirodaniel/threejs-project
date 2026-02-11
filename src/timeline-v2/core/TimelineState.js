/**
 * TimelineState - Reactive state management for timeline
 *
 * Single source of truth for ALL timeline state.
 * Emits events when state changes so systems can react.
 * Immutable updates via setState().
 *
 * @module timeline-v2/core
 */

const INITIAL_STATE = Object.freeze({
  // Scene state
  currentSceneIndex: 0,
  isTransitioning: false,
  transitionProgress: 0,
  introComplete: false,
  imagesGathering: false,
  imagesGathered: false,

  // Timeline position
  timelineOffset: -4.5,
  targetOffset: -4.5,
  currentSnapIndex: 0,
  currentYear: 2010,

  // User interaction state
  isDragging: false,
  isScrolling: false,
  scrollVelocity: 0,
  dragVelocity: 0,

  // UI state
  isImageEnlarged: false,
  enlargedImageId: null,
  isDetailViewOpen: false,

  // Physics state
  friction: 0.92,
  sensitivity: 0.5,
});

const VALID_PROPERTIES = new Set(Object.keys(INITIAL_STATE));

class TimelineState {
  constructor() {
    this._state = Object.assign({}, INITIAL_STATE);
    this._listeners = new Map();
    this._globalListeners = new Set();
  }

  /**
   * Get current state snapshot (immutable)
   * @returns {object} State object (frozen)
   */
  getState() {
    return Object.freeze(Object.assign({}, this._state));
  }

  /**
   * Get specific property value
   * @param {string} property - Property name
   * @returns {*} Property value
   */
  get(property) {
    if (!VALID_PROPERTIES.has(property)) {
      console.warn(`[TimelineState] Unknown property: "${property}"`);
    }
    return this._state[property];
  }

  /**
   * Update state properties atomically
   * @param {object} updates - Partial state updates
   */
  setState(updates) {
    if (!updates || typeof updates !== 'object') return;

    const changes = [];

    for (const property of Object.keys(updates)) {
      if (!VALID_PROPERTIES.has(property)) {
        console.warn(`[TimelineState] Unknown property in setState: "${property}"`);
        continue;
      }

      const oldValue = this._state[property];
      const newValue = updates[property];

      if (Object.is(oldValue, newValue)) continue;

      this._state[property] = newValue;
      changes.push({ property, oldValue, newValue });
    }

    for (const { property, oldValue, newValue } of changes) {
      this._notify(property, oldValue, newValue);
    }
  }

  /**
   * Subscribe to specific property changes, or all changes if property omitted.
   * @param {string} [property] - Property name to watch (omit for global)
   * @param {function} callback - Called with { property, oldValue, newValue }
   * @returns {function} Unsubscribe function
   */
  subscribe(property, callback) {
    if (typeof property === 'function') {
      return this.subscribeAll(property);
    }

    if (!VALID_PROPERTIES.has(property)) {
      console.warn(`[TimelineState] Unknown property in subscribe: "${property}"`);
    }

    if (!this._listeners.has(property)) {
      this._listeners.set(property, new Set());
    }
    this._listeners.get(property).add(callback);

    return () => {
      const set = this._listeners.get(property);
      if (set) set.delete(callback);
    };
  }

  /**
   * Subscribe to all state changes
   * @param {function} callback - Called on any state change
   * @returns {function} Unsubscribe function
   */
  subscribeAll(callback) {
    this._globalListeners.add(callback);
    return () => this._globalListeners.delete(callback);
  }

  /**
   * Notify listeners of property change
   * @private
   */
  _notify(property, oldValue, newValue) {
    const payload = { property, oldValue, newValue };

    const propertyListeners = this._listeners.get(property);
    if (propertyListeners) {
      for (const cb of propertyListeners) {
        try {
          cb(payload);
        } catch (err) {
          console.warn(`[TimelineState] Listener error for "${property}":`, err);
        }
      }
    }

    for (const cb of this._globalListeners) {
      try {
        cb(payload);
      } catch (err) {
        console.warn('[TimelineState] Global listener error:', err);
      }
    }
  }

  /**
   * Reset state to initial values
   */
  reset() {
    this._state = Object.assign({}, INITIAL_STATE);
    this._notify('reset', null, this.getState());
  }

  /**
   * Clean up all listeners
   */
  dispose() {
    this._listeners.clear();
    this._globalListeners.clear();
    this._listeners = null;
    this._globalListeners = null;
  }
}

export { TimelineState };
