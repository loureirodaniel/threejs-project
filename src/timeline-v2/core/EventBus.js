/**
 * EventBus - Type-safe pub/sub event system for inter-system communication
 *
 * Replaces window.addEventListener with scoped, manageable events.
 * Supports one-time listeners and proper cleanup.
 *
 * @module timeline-v2/core
 *
 * SUPPORTED EVENT TYPES:
 * - 'timeline:scroll' - { delta, timestamp }
 * - 'timeline:drag:start' - { clientX, clientY, timestamp }
 * - 'timeline:drag:move' - { delta, velocity, timestamp }
 * - 'timeline:drag:end' - { velocity, timestamp }
 * - 'timeline:click' - { target, worldPos, normalizedX, normalizedY }
 * - 'timeline:snap:start' - { fromOffset, toOffset, toIndex }
 * - 'timeline:snap:complete' - { offset, index }
 * - 'timeline:year:change' - { year, offset }
 * - 'timeline:image:enlarge' - { plane }
 * - 'timeline:image:close' - {}
 * - 'scene:transition:start' - { fromScene, toScene }
 * - 'scene:transition:complete' - { scene }
 */

export class EventBus {
  constructor() {
    /** @type {Map<string, Set<function>>} O(1) lookup and easy cleanup */
    this._listeners = new Map();
  }

  /**
   * Register event listener
   * @param {string} eventType - Event name (e.g., 'timeline:scroll')
   * @param {function} callback - Handler function
   * @param {object} options - { once: boolean }
   * @param {boolean} [options.once=false] - If true, auto-unsubscribe after first call
   * @returns {function} Unsubscribe function
   */
  on(eventType, callback, options = {}) {
    if (typeof callback !== 'function') {
      console.warn('[EventBus] on() called with non-function callback');
      return () => {};
    }

    let wrappedCallback = callback;
    if (options.once) {
      const self = this;
      wrappedCallback = function onceWrapper(data) {
        self.off(eventType, onceWrapper);
        callback(data);
      };
    }

    if (!this._listeners.has(eventType)) {
      this._listeners.set(eventType, new Set());
    }
    this._listeners.get(eventType).add(wrappedCallback);

    return () => this.off(eventType, wrappedCallback);
  }

  /**
   * Remove event listener
   * @param {string} eventType - Event name
   * @param {function} callback - Handler to remove
   */
  off(eventType, callback) {
    const set = this._listeners.get(eventType);
    if (!set) return;
    set.delete(callback);
    if (set.size === 0) {
      this._listeners.delete(eventType);
    }
  }

  /**
   * Emit event to all listeners
   * @param {string} eventType - Event name
   * @param {*} data - Event data (passed to callbacks)
   */
  emit(eventType, data) {
    const set = this._listeners.get(eventType);
    if (!set || set.size === 0) return;

    // Snapshot to avoid mutation during iteration (e.g. callback calls off/on)
    const callbacks = Array.from(set);
    for (const callback of callbacks) {
      try {
        callback(data);
      } catch (err) {
        console.error(`[EventBus] Error in listener for "${eventType}":`, err);
      }
    }
  }

  /**
   * Register one-time listener
   * @param {string} eventType - Event name
   * @param {function} callback - Handler (called once then removed)
   * @returns {function} Unsubscribe function
   */
  once(eventType, callback) {
    return this.on(eventType, callback, { once: true });
  }

  /**
   * Remove all listeners for event type (or all events)
   * @param {string} [eventType] - Event name (optional)
   */
  clear(eventType) {
    if (eventType !== undefined) {
      this._listeners.delete(eventType);
    } else {
      this._listeners.clear();
    }
  }

  /**
   * Get listener count for debugging
   * @param {string} [eventType] - Event name (optional)
   * @returns {number} Number of listeners
   */
  getListenerCount(eventType) {
    if (eventType !== undefined) {
      const set = this._listeners.get(eventType);
      return set ? set.size : 0;
    }
    let total = 0;
    for (const set of this._listeners.values()) {
      total += set.size;
    }
    return total;
  }

  /**
   * Clean up all listeners
   */
  dispose() {
    this._listeners.clear();
    this._listeners = null;
  }
}

/** @type {EventBus} Singleton instance for timeline events */
export const timelineEventBus = new EventBus();
