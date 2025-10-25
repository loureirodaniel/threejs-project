/**
 * ErrorHandler - Comprehensive error handling and recovery for Three.js timeline project
 * Provides fallback behaviors, error logging, and recovery strategies
 */
export class ErrorHandler {
    constructor() {
        this.errorCount = 0;
        this.maxErrors = 10;
        this.errorLog = [];
        this.recoveryStrategies = new Map();
        this.fallbackBehaviors = new Map();
        
        this.setupDefaultRecoveryStrategies();
        this.setupDefaultFallbackBehaviors();
    }

    /**
     * Handle an error with context
     * @param {Error} error - The error object
     * @param {string} context - The context where the error occurred
     * @param {Object} additionalData - Additional data about the error
     */
    handleError(error, context, additionalData = {}) {
        this.errorCount++;
        
        const errorEntry = {
            timestamp: Date.now(),
            error: error.message,
            context: context,
            stack: error.stack,
            additionalData: additionalData,
            errorCount: this.errorCount
        };
        
        this.errorLog.push(errorEntry);
        
        console.error(`[${context}] Error #${this.errorCount}:`, error);
        console.error('Additional Data:', additionalData);
        
        // Implement fallback behavior
        this.implementFallback(context, error, additionalData);
        
        // Report critical errors
        if (this.errorCount > this.maxErrors) {
            this.reportCriticalError();
        }
        
        // Emit error event
        this.emitErrorEvent(errorEntry);
    }

    /**
     * Implement fallback behavior based on context
     * @param {string} context - The error context
     * @param {Error} error - The error object
     * @param {Object} additionalData - Additional data
     */
    implementFallback(context, error, additionalData) {
        const fallback = this.fallbackBehaviors.get(context);
        if (fallback) {
            try {
                fallback(error, additionalData);
            } catch (fallbackError) {
                console.error('Fallback behavior failed:', fallbackError);
                this.implementEmergencyFallback(context, error);
            }
        } else {
            this.implementEmergencyFallback(context, error);
        }
    }

    /**
     * Implement emergency fallback when specific fallback fails
     * @param {string} context - The error context
     * @param {Error} error - The error object
     */
    implementEmergencyFallback(context, error) {
        console.warn(`Emergency fallback for ${context}:`, error.message);
        
        // Generic emergency fallbacks
        switch (context) {
            case 'cameraTransition':
            case 'cameraAnimation':
                this.resetCameraToSafePosition();
                break;
            case 'imageLoad':
            case 'textureLoad':
                this.showImageErrorPlaceholder();
                break;
            case 'animation':
            case 'timelineAnimation':
                this.pauseAnimations();
                break;
            case 'stateUpdate':
            case 'stateManagement':
                this.restoreLastValidState();
                break;
            case 'render':
            case 'rendering':
                this.pauseRendering();
                break;
            default:
                this.showGenericError();
        }
    }

    /**
     * Setup default recovery strategies
     */
    setupDefaultRecoveryStrategies() {
        this.recoveryStrategies.set('cameraTransition', {
            maxRetries: 3,
            retryDelay: 1000,
            fallback: () => this.resetCameraToSafePosition()
        });
        
        this.recoveryStrategies.set('imageLoad', {
            maxRetries: 2,
            retryDelay: 500,
            fallback: () => this.showImageErrorPlaceholder()
        });
        
        this.recoveryStrategies.set('animation', {
            maxRetries: 1,
            retryDelay: 200,
            fallback: () => this.pauseAnimations()
        });
    }

    /**
     * Setup default fallback behaviors
     */
    setupDefaultFallbackBehaviors() {
        this.fallbackBehaviors.set('cameraTransition', (error, data) => {
            console.warn('Camera transition failed, resetting to safe position');
            this.resetCameraToSafePosition();
        });
        
        this.fallbackBehaviors.set('imageLoad', (error, data) => {
            console.warn('Image load failed, showing placeholder');
            this.showImageErrorPlaceholder(data.imageUrl);
        });
        
        this.fallbackBehaviors.set('animation', (error, data) => {
            console.warn('Animation failed, pausing animations');
            this.pauseAnimations();
        });
        
        this.fallbackBehaviors.set('stateUpdate', (error, data) => {
            console.warn('State update failed, restoring last valid state');
            this.restoreLastValidState();
        });
        
        this.fallbackBehaviors.set('render', (error, data) => {
            console.warn('Render failed, pausing rendering');
            this.pauseRendering();
        });
    }

    /**
     * Reset camera to safe position
     */
    resetCameraToSafePosition() {
        try {
            // Emit event to reset camera
            window.dispatchEvent(new CustomEvent('errorRecovery', {
                detail: { action: 'resetCamera', position: { x: 0, y: 0, z: 5 } }
            }));
            console.info('Camera reset to safe position');
        } catch (error) {
            console.error('Failed to reset camera:', error);
        }
    }

    /**
     * Show image error placeholder
     * @param {string} imageUrl - The failed image URL
     */
    showImageErrorPlaceholder(imageUrl) {
        try {
            // Emit event to show error placeholder
            window.dispatchEvent(new CustomEvent('errorRecovery', {
                detail: { action: 'showImagePlaceholder', imageUrl: imageUrl }
            }));
            console.info('Image error placeholder shown');
        } catch (error) {
            console.error('Failed to show image placeholder:', error);
        }
    }

    /**
     * Pause all animations
     */
    pauseAnimations() {
        try {
            // Emit event to pause animations
            window.dispatchEvent(new CustomEvent('errorRecovery', {
                detail: { action: 'pauseAnimations' }
            }));
            console.info('Animations paused due to error');
        } catch (error) {
            console.error('Failed to pause animations:', error);
        }
    }

    /**
     * Restore last valid state
     */
    restoreLastValidState() {
        try {
            // Emit event to restore state
            window.dispatchEvent(new CustomEvent('errorRecovery', {
                detail: { action: 'restoreState' }
            }));
            console.info('State restored to last valid state');
        } catch (error) {
            console.error('Failed to restore state:', error);
        }
    }

    /**
     * Pause rendering
     */
    pauseRendering() {
        try {
            // Emit event to pause rendering
            window.dispatchEvent(new CustomEvent('errorRecovery', {
                detail: { action: 'pauseRendering' }
            }));
            console.info('Rendering paused due to error');
        } catch (error) {
            console.error('Failed to pause rendering:', error);
        }
    }

    /**
     * Show generic error message
     */
    showGenericError() {
        try {
            // Emit event to show generic error
            window.dispatchEvent(new CustomEvent('errorRecovery', {
                detail: { action: 'showGenericError' }
            }));
            console.info('Generic error message shown');
        } catch (error) {
            console.error('Failed to show generic error:', error);
        }
    }

    /**
     * Report critical error when error count exceeds limit
     */
    reportCriticalError() {
        console.error('CRITICAL: Too many errors detected, system may be unstable');
        
        const criticalError = {
            timestamp: Date.now(),
            errorCount: this.errorCount,
            recentErrors: this.errorLog.slice(-5), // Last 5 errors
            systemState: this.getSystemState()
        };
        
        // Emit critical error event
        window.dispatchEvent(new CustomEvent('criticalError', {
            detail: criticalError
        }));
        
        // In a real application, you might want to send this to a logging service
        console.error('Critical Error Report:', criticalError);
    }

    /**
     * Get current system state
     */
    getSystemState() {
        return {
            errorCount: this.errorCount,
            memoryUsage: performance.memory ? performance.memory.usedJSHeapSize : 'unknown',
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
    }

    /**
     * Emit error event
     * @param {Object} errorEntry - The error entry
     */
    emitErrorEvent(errorEntry) {
        window.dispatchEvent(new CustomEvent('errorOccurred', {
            detail: errorEntry
        }));
    }

    /**
     * Add custom recovery strategy
     * @param {string} context - The error context
     * @param {Object} strategy - The recovery strategy
     */
    addRecoveryStrategy(context, strategy) {
        this.recoveryStrategies.set(context, strategy);
    }

    /**
     * Add custom fallback behavior
     * @param {string} context - The error context
     * @param {Function} fallback - The fallback function
     */
    addFallbackBehavior(context, fallback) {
        this.fallbackBehaviors.set(context, fallback);
    }

    /**
     * Get error log
     */
    getErrorLog() {
        return [...this.errorLog];
    }

    /**
     * Clear error log
     */
    clearErrorLog() {
        this.errorLog = [];
        this.errorCount = 0;
        console.info('Error log cleared');
    }

    /**
     * Get error statistics
     */
    getErrorStatistics() {
        const errorsByContext = {};
        this.errorLog.forEach(error => {
            errorsByContext[error.context] = (errorsByContext[error.context] || 0) + 1;
        });
        
        return {
            totalErrors: this.errorCount,
            errorsByContext: errorsByContext,
            recentErrors: this.errorLog.slice(-10),
            systemStability: this.errorCount < this.maxErrors ? 'stable' : 'unstable'
        };
    }

    /**
     * Check if system is stable
     */
    isSystemStable() {
        return this.errorCount < this.maxErrors;
    }

    /**
     * Reset error handler
     */
    reset() {
        this.errorCount = 0;
        this.errorLog = [];
        console.info('Error handler reset');
    }

    /**
     * Destroy the error handler
     */
    destroy() {
        this.recoveryStrategies.clear();
        this.fallbackBehaviors.clear();
        this.errorLog = [];
        this.errorCount = 0;
    }
}
