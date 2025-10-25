/**
 * DebugControlGenerator - Automatic debug control generation for Three.js objects
 * Creates standardized 1-10 range controls for all Three.js object properties
 */
import { Slider } from '../components/Slider/Slider.js';
import { Button } from '../components/Button/Button.js';

export class DebugControlGenerator {
    constructor() {
        this.controls = new Map();
        this.performanceMonitor = null;
    }

    /**
     * Set performance monitor reference
     * @param {PerformanceMonitor} monitor - Performance monitor instance
     */
    setPerformanceMonitor(monitor) {
        this.performanceMonitor = monitor;
    }

    /**
     * Generate debug controls for a Three.js object
     * @param {Object} object - Three.js object
     * @param {string} name - Object name for controls
     * @param {Object} options - Generation options
     * @returns {Object} Generated controls
     */
    generateControls(object, name, options = {}) {
        const controls = {};
        const controlContainer = document.createElement('div');
        controlContainer.className = 'debug-object-controls';
        controlContainer.setAttribute('data-object-name', name);

        // Position controls
        if (object.position) {
            controls[`${name}PositionX`] = this.createPositionControl(name, 'X', object.position.x, -10, 10);
            controls[`${name}PositionY`] = this.createPositionControl(name, 'Y', object.position.y, -10, 10);
            controls[`${name}PositionZ`] = this.createPositionControl(name, 'Z', object.position.z, 1, 20);
            
            controlContainer.appendChild(controls[`${name}PositionX`].create());
            controlContainer.appendChild(controls[`${name}PositionY`].create());
            controlContainer.appendChild(controls[`${name}PositionZ`].create());
        }

        // Rotation controls
        if (object.rotation) {
            controls[`${name}RotationX`] = this.createRotationControl(name, 'X', object.rotation.x, -Math.PI, Math.PI);
            controls[`${name}RotationY`] = this.createRotationControl(name, 'Y', object.rotation.y, -Math.PI, Math.PI);
            controls[`${name}RotationZ`] = this.createRotationControl(name, 'Z', object.rotation.z, -Math.PI, Math.PI);
            
            controlContainer.appendChild(controls[`${name}RotationX`].create());
            controlContainer.appendChild(controls[`${name}RotationY`].create());
            controlContainer.appendChild(controls[`${name}RotationZ`].create());
        }

        // Scale controls
        if (object.scale) {
            controls[`${name}ScaleX`] = this.createScaleControl(name, 'X', object.scale.x, 0.1, 10);
            controls[`${name}ScaleY`] = this.createScaleControl(name, 'Y', object.scale.y, 0.1, 10);
            controls[`${name}ScaleZ`] = this.createScaleControl(name, 'Z', object.scale.z, 0.1, 10);
            
            controlContainer.appendChild(controls[`${name}ScaleX`].create());
            controlContainer.appendChild(controls[`${name}ScaleY`].create());
            controlContainer.appendChild(controls[`${name}ScaleZ`].create());
        }

        // FOV control for cameras
        if (object.fov !== undefined) {
            controls[`${name}FOV`] = this.createFOVControl(name, object.fov, 30, 120);
            controlContainer.appendChild(controls[`${name}FOV`].create());
        }

        // Intensity control for lights
        if (object.intensity !== undefined) {
            controls[`${name}Intensity`] = this.createIntensityControl(name, object.intensity, 0, 10);
            controlContainer.appendChild(controls[`${name}Intensity`].create());
        }

        // Color control for lights and materials
        if (object.color) {
            controls[`${name}Color`] = this.createColorControl(name, object.color);
            controlContainer.appendChild(controls[`${name}Color`].create());
        }

        // Opacity control for materials
        if (object.opacity !== undefined) {
            controls[`${name}Opacity`] = this.createOpacityControl(name, object.opacity, 0, 1);
            controlContainer.appendChild(controls[`${name}Opacity`].create());
        }

        // Performance display
        if (this.performanceMonitor) {
            controls[`${name}Performance`] = this.createPerformanceDisplay(name);
            controlContainer.appendChild(controls[`${name}Performance`].create());
        }

        // Reset button
        controls[`${name}Reset`] = this.createResetButton(name, object);
        controlContainer.appendChild(controls[`${name}Reset`].create());

        // Store controls
        this.controls.set(name, {
            object: object,
            controls: controls,
            container: controlContainer
        });

        return {
            controls: controls,
            container: controlContainer
        };
    }

    /**
     * Create position control
     * @param {string} name - Object name
     * @param {string} axis - Axis (X, Y, Z)
     * @param {number} value - Current value
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {Slider} Slider control
     */
    createPositionControl(name, axis, value, min, max) {
        const normalizedValue = this.normalizeValue(value, min, max);
        
        return new Slider({
            label: `${name} Position ${axis}`,
            value: normalizedValue,
            min: 1,
            max: 10,
            step: 0.1,
            onChange: (normalizedVal) => {
                const actualValue = this.denormalizeValue(normalizedVal, min, max);
                this.updateObjectProperty(name, `position.${axis.toLowerCase()}`, actualValue);
            }
        });
    }

    /**
     * Create rotation control
     * @param {string} name - Object name
     * @param {string} axis - Axis (X, Y, Z)
     * @param {number} value - Current value
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {Slider} Slider control
     */
    createRotationControl(name, axis, value, min, max) {
        const normalizedValue = this.normalizeValue(value, min, max);
        
        return new Slider({
            label: `${name} Rotation ${axis}`,
            value: normalizedValue,
            min: 1,
            max: 10,
            step: 0.1,
            onChange: (normalizedVal) => {
                const actualValue = this.denormalizeValue(normalizedVal, min, max);
                this.updateObjectProperty(name, `rotation.${axis.toLowerCase()}`, actualValue);
            }
        });
    }

    /**
     * Create scale control
     * @param {string} name - Object name
     * @param {string} axis - Axis (X, Y, Z)
     * @param {number} value - Current value
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {Slider} Slider control
     */
    createScaleControl(name, axis, value, min, max) {
        const normalizedValue = this.normalizeValue(value, min, max);
        
        return new Slider({
            label: `${name} Scale ${axis}`,
            value: normalizedValue,
            min: 1,
            max: 10,
            step: 0.1,
            onChange: (normalizedVal) => {
                const actualValue = this.denormalizeValue(normalizedVal, min, max);
                this.updateObjectProperty(name, `scale.${axis.toLowerCase()}`, actualValue);
            }
        });
    }

    /**
     * Create FOV control
     * @param {string} name - Object name
     * @param {number} value - Current FOV value
     * @param {number} min - Minimum FOV
     * @param {number} max - Maximum FOV
     * @returns {Slider} Slider control
     */
    createFOVControl(name, value, min, max) {
        const normalizedValue = this.normalizeValue(value, min, max);
        
        return new Slider({
            label: `${name} FOV`,
            value: normalizedValue,
            min: 1,
            max: 10,
            step: 0.1,
            onChange: (normalizedVal) => {
                const actualValue = this.denormalizeValue(normalizedVal, min, max);
                this.updateObjectProperty(name, 'fov', actualValue);
                if (this.controls.get(name)?.object.updateProjectionMatrix) {
                    this.controls.get(name).object.updateProjectionMatrix();
                }
            }
        });
    }

    /**
     * Create intensity control
     * @param {string} name - Object name
     * @param {number} value - Current intensity value
     * @param {number} min - Minimum intensity
     * @param {number} max - Maximum intensity
     * @returns {Slider} Slider control
     */
    createIntensityControl(name, value, min, max) {
        const normalizedValue = this.normalizeValue(value, min, max);
        
        return new Slider({
            label: `${name} Intensity`,
            value: normalizedValue,
            min: 1,
            max: 10,
            step: 0.1,
            onChange: (normalizedVal) => {
                const actualValue = this.denormalizeValue(normalizedVal, min, max);
                this.updateObjectProperty(name, 'intensity', actualValue);
            }
        });
    }

    /**
     * Create color control
     * @param {string} name - Object name
     * @param {THREE.Color} color - Current color
     * @returns {HTMLElement} Color input control
     */
    createColorControl(name, color) {
        const container = document.createElement('div');
        container.className = 'debug-color-control';
        
        const label = document.createElement('label');
        label.textContent = `${name} Color`;
        label.style.cssText = 'display: block; margin-bottom: 5px; color: white; font-size: 14px;';
        
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = `#${color.getHexString()}`;
        colorInput.style.cssText = 'width: 100%; height: 30px; border: none; border-radius: 4px;';
        
        colorInput.addEventListener('input', (e) => {
            const newColor = new THREE.Color(e.target.value);
            this.updateObjectProperty(name, 'color', newColor);
        });
        
        container.appendChild(label);
        container.appendChild(colorInput);
        
        return {
            create: () => container,
            getElement: () => container
        };
    }

    /**
     * Create opacity control
     * @param {string} name - Object name
     * @param {number} value - Current opacity value
     * @param {number} min - Minimum opacity
     * @param {number} max - Maximum opacity
     * @returns {Slider} Slider control
     */
    createOpacityControl(name, value, min, max) {
        const normalizedValue = this.normalizeValue(value, min, max);
        
        return new Slider({
            label: `${name} Opacity`,
            value: normalizedValue,
            min: 1,
            max: 10,
            step: 0.1,
            onChange: (normalizedVal) => {
                const actualValue = this.denormalizeValue(normalizedVal, min, max);
                this.updateObjectProperty(name, 'opacity', actualValue);
            }
        });
    }

    /**
     * Create performance display
     * @param {string} name - Object name
     * @returns {HTMLElement} Performance display element
     */
    createPerformanceDisplay(name) {
        const container = document.createElement('div');
        container.className = 'debug-performance-display';
        container.setAttribute('data-object-name', name);
        
        const label = document.createElement('div');
        label.textContent = `${name} Performance`;
        label.style.cssText = 'color: #00ff88; font-weight: bold; margin-bottom: 5px;';
        
        const metrics = document.createElement('div');
        metrics.className = 'performance-metrics';
        metrics.style.cssText = 'font-size: 12px; color: #ccc;';
        
        container.appendChild(label);
        container.appendChild(metrics);
        
        // Update metrics if performance monitor is available
        if (this.performanceMonitor) {
            const updateMetrics = () => {
                const perfMetrics = this.performanceMonitor.getMetrics();
                metrics.innerHTML = `
                    FPS: ${perfMetrics.fps} | 
                    Memory: ${perfMetrics.memoryUsage.toFixed(1)}MB | 
                    Draw Calls: ${perfMetrics.drawCalls}
                `;
            };
            
            this.performanceMonitor.subscribe(updateMetrics);
            updateMetrics();
        }
        
        return {
            create: () => container,
            getElement: () => container
        };
    }

    /**
     * Create reset button
     * @param {string} name - Object name
     * @param {Object} object - Three.js object
     * @returns {Button} Reset button
     */
    createResetButton(name, object) {
        return new Button({
            children: `Reset ${name}`,
            variant: 'secondary',
            size: 'small',
            onClick: () => {
                this.resetObjectToDefaults(name, object);
            },
            style: { width: '100%', marginTop: '10px' }
        });
    }

    /**
     * Normalize value to 1-10 range
     * @param {number} value - Actual value
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Normalized value (1-10)
     */
    normalizeValue(value, min, max) {
        return Math.max(1, Math.min(10, ((value - min) / (max - min)) * 9 + 1));
    }

    /**
     * Denormalize value from 1-10 range
     * @param {number} normalizedValue - Normalized value (1-10)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Actual value
     */
    denormalizeValue(normalizedValue, min, max) {
        return min + ((normalizedValue - 1) / 9) * (max - min);
    }

    /**
     * Update object property
     * @param {string} name - Object name
     * @param {string} property - Property path (e.g., 'position.x')
     * @param {*} value - New value
     */
    updateObjectProperty(name, property, value) {
        const objectData = this.controls.get(name);
        if (!objectData) return;
        
        const object = objectData.object;
        const propertyPath = property.split('.');
        
        if (propertyPath.length === 1) {
            object[propertyPath[0]] = value;
        } else if (propertyPath.length === 2) {
            object[propertyPath[0]][propertyPath[1]] = value;
        }
        
        // Emit update event
        window.dispatchEvent(new CustomEvent('debugControlUpdate', {
            detail: { objectName: name, property: property, value: value }
        }));
    }

    /**
     * Reset object to defaults
     * @param {string} name - Object name
     * @param {Object} object - Three.js object
     */
    resetObjectToDefaults(name, object) {
        // Reset position
        if (object.position) {
            object.position.set(0, 0, 0);
        }
        
        // Reset rotation
        if (object.rotation) {
            object.rotation.set(0, 0, 0);
        }
        
        // Reset scale
        if (object.scale) {
            object.scale.set(1, 1, 1);
        }
        
        // Reset FOV
        if (object.fov !== undefined) {
            object.fov = 75;
            if (object.updateProjectionMatrix) {
                object.updateProjectionMatrix();
            }
        }
        
        // Reset intensity
        if (object.intensity !== undefined) {
            object.intensity = 1;
        }
        
        // Reset opacity
        if (object.opacity !== undefined) {
            object.opacity = 1;
        }
        
        // Update all controls
        this.updateAllControls(name);
        
        console.info(`Reset ${name} to defaults`);
    }

    /**
     * Update all controls for an object
     * @param {string} name - Object name
     */
    updateAllControls(name) {
        const objectData = this.controls.get(name);
        if (!objectData) return;
        
        const object = objectData.object;
        const controls = objectData.controls;
        
        // Update position controls
        if (object.position && controls[`${name}PositionX`]) {
            controls[`${name}PositionX`].setValue(this.normalizeValue(object.position.x, -10, 10));
            controls[`${name}PositionY`].setValue(this.normalizeValue(object.position.y, -10, 10));
            controls[`${name}PositionZ`].setValue(this.normalizeValue(object.position.z, 1, 20));
        }
        
        // Update rotation controls
        if (object.rotation && controls[`${name}RotationX`]) {
            controls[`${name}RotationX`].setValue(this.normalizeValue(object.rotation.x, -Math.PI, Math.PI));
            controls[`${name}RotationY`].setValue(this.normalizeValue(object.rotation.y, -Math.PI, Math.PI));
            controls[`${name}RotationZ`].setValue(this.normalizeValue(object.rotation.z, -Math.PI, Math.PI));
        }
        
        // Update scale controls
        if (object.scale && controls[`${name}ScaleX`]) {
            controls[`${name}ScaleX`].setValue(this.normalizeValue(object.scale.x, 0.1, 10));
            controls[`${name}ScaleY`].setValue(this.normalizeValue(object.scale.y, 0.1, 10));
            controls[`${name}ScaleZ`].setValue(this.normalizeValue(object.scale.z, 0.1, 10));
        }
    }

    /**
     * Get controls for an object
     * @param {string} name - Object name
     * @returns {Object} Controls object
     */
    getControls(name) {
        const objectData = this.controls.get(name);
        return objectData ? objectData.controls : null;
    }

    /**
     * Remove controls for an object
     * @param {string} name - Object name
     */
    removeControls(name) {
        const objectData = this.controls.get(name);
        if (objectData) {
            // Destroy all controls
            Object.values(objectData.controls).forEach(control => {
                if (control.destroy) {
                    control.destroy();
                }
            });
            
            // Remove container
            if (objectData.container && objectData.container.parentNode) {
                objectData.container.parentNode.removeChild(objectData.container);
            }
            
            this.controls.delete(name);
        }
    }

    /**
     * Get all controls
     * @returns {Map} All controls map
     */
    getAllControls() {
        return this.controls;
    }

    /**
     * Destroy all controls
     */
    destroy() {
        this.controls.forEach((objectData, name) => {
            this.removeControls(name);
        });
        this.controls.clear();
    }
}
