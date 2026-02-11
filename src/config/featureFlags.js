/**
 * Feature flags for gradual rollout of new timeline architecture
 *
 * This allows us to:
 * 1. Test new architecture safely
 * 2. Quickly rollback if issues arise
 * 3. Compare old vs new side-by-side
 * 4. Gradually enable for users (A/B testing)
 */

export const FEATURE_FLAGS = Object.freeze({
  // ============================================
  // NEW TIMELINE ARCHITECTURE
  // ============================================

  /**
   * Toggle between old and new timeline controller
   *
   * false (default) = Use OLD architecture (11 controllers, scattered state)
   * true = Use NEW architecture (4 systems, unified state)
   *
   * SAFE TO CHANGE: Can flip instantly to rollback if needed
   */
  USE_NEW_TIMELINE_CONTROLLER: true,

  /**
   * Debug logging for new controller
   * Shows system initialization, events, state changes
   */
  DEBUG_NEW_CONTROLLER: true,

  // ============================================
  // PERFORMANCE OPTIMIZATIONS
  // ============================================

  /**
   * Cap pixel ratio to prevent excessive rendering on high-DPI displays
   * Recommended: true (2x performance boost on Retina displays)
   */
  ENABLE_PIXEL_RATIO_CAP: true,

  /**
   * Optimize texture loading (disable mipmaps, use linear filtering)
   * Recommended: true (faster load, less memory)
   */
  ENABLE_TEXTURE_OPTIMIZATION: true,

  /**
   * Disable heavy effects on mobile devices
   * Recommended: true (better mobile performance)
   */
  DISABLE_MOBILE_EFFECTS: true,

  // ============================================
  // EXPERIMENTAL FEATURES
  // ============================================

  /**
   * Enable hold-to-pullback camera behavior
   * Experimental - may cause motion sickness
   */
  ENABLE_HOLD_TO_PULLBACK: false,
});

/**
 * Check if feature is enabled
 * @param {string} flagName - Feature flag name
 * @returns {boolean}
 */
export function isFeatureEnabled(flagName) {
  return FEATURE_FLAGS[flagName] === true;
}

/**
 * Get all enabled features
 * @returns {string[]} Array of enabled feature names
 */
export function getEnabledFeatures() {
  return Object.keys(FEATURE_FLAGS).filter((key) => FEATURE_FLAGS[key] === true);
}

/**
 * Log feature flag status (for debugging)
 */
export function logFeatureFlags() {
  console.group("🚩 Feature Flags");
  Object.entries(FEATURE_FLAGS).forEach(([key, value]) => {
    const emoji = value ? "✅" : "❌";
    console.log(`${emoji} ${key}: ${value}`);
  });
  console.groupEnd();
}

// Auto-log on import (only in development)
if (import.meta.env.DEV) {
  logFeatureFlags();
}
