/**
 * AppStateManager - Centralized state management for the application
 * Handles all application state and provides methods for state updates
 */
export class AppStateManager {
    constructor() {
        this.state = {
            currentScene: 'initial',
            isTransitioning: false,
            debugPanelOpen: true,
            effects: {
                backgroundBlur: {
                    amount: 5,
                    opacity: 0.8,
                    leftWidth: 4,
                    rightWidth: 4
                },
                glitch: {
                    navPeak: 1.0,
                    scrollPeak: 0.85,
                    lerp: 0.18,
                    decay: 0.85,
                    timeStep: 0.016
                },
                dream: {
                    enabled: true,
                    fogEnabled: true,
                    bloomStrength: 0.22,
                    bloomRadius: 0.48,
                    bloomThreshold: 0.76,
                    fogDensity: 0.08,
                    fogIntensity: 0.14,
                    fogNoiseScale: 1.8,
                    fogNoiseSpeed: 0.12,
                    fogColor: '#c9d6ff',
                    clickBoost: 0.55,
                    decayDuration: 1.8
                }
            },
            camera: {
                x: 0,
                y: 0,
                z: 5,
                targetX: 0,
                targetY: 0,
                targetZ: 0,
                rotX: 0,
                rotY: 0,
                rotZ: 0,
                fov: 75,
                near: 0.1,
                far: 1000,
                zoom: 1
            },
            smoothScroll: {
                sensitivity: 0.25,
                friction: 0.85
            },
            typography: {
                headerSize: 48,
                bodySize: 24
            }
        };
        this.listeners = [];
    }

    /**
     * Get current state
     * @returns {Object} Current application state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Update state and notify listeners
     * @param {Object} newState - Partial state update
     */
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.notifyListeners();
    }

    /**
     * Subscribe to state changes
     * @param {Function} listener - Callback function
     */
    subscribe(listener) {
        this.listeners.push(listener);
    }

    /**
     * Unsubscribe from state changes
     * @param {Function} listener - Callback function to remove
     */
    unsubscribe(listener) {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    /**
     * Notify all listeners of state changes
     */
    notifyListeners() {
        this.listeners.forEach(listener => listener(this.state));
    }

    /**
     * Reset state to defaults
     */
    resetToDefaults() {
        this.setState({
            effects: {
                backgroundBlur: {
                    amount: 5,
                    opacity: 0.8,
                    leftWidth: 4,
                    rightWidth: 4
                },
                glitch: {
                    navPeak: 1.0,
                    scrollPeak: 0.85,
                    lerp: 0.18,
                    decay: 0.85,
                    timeStep: 0.016
                },
                dream: {
                    enabled: true,
                    fogEnabled: true,
                    bloomStrength: 0.22,
                    bloomRadius: 0.48,
                    bloomThreshold: 0.76,
                    fogDensity: 0.08,
                    fogIntensity: 0.14,
                    fogNoiseScale: 1.8,
                    fogNoiseSpeed: 0.12,
                    fogColor: '#c9d6ff',
                    clickBoost: 0.55,
                    decayDuration: 1.8
                }
            },
            camera: {
                x: 0,
                y: 0,
                z: 5,
                targetX: 0,
                targetY: 0,
                targetZ: 0,
                rotX: 0,
                rotY: 0,
                rotZ: 0,
                fov: 75,
                near: 0.1,
                far: 1000,
                zoom: 1
            },
            smoothScroll: {
                sensitivity: 0.25,
                friction: 0.85
            },
            typography: {
                headerSize: 48,
                bodySize: 24
            }
        });
    }

    /**
     * Update specific effect settings
     * @param {string} effectName - Name of the effect
     * @param {Object} settings - Effect settings
     */
    updateEffect(effectName, settings) {
        this.setState({
            effects: {
                ...this.state.effects,
                [effectName]: {
                    ...this.state.effects[effectName],
                    ...settings
                }
            }
        });
    }

    /**
     * Update camera settings
     * @param {Object} cameraSettings - Camera configuration
     */
    updateCamera(cameraSettings) {
        this.setState({
            camera: {
                ...this.state.camera,
                ...cameraSettings
            }
        });
    }
}
