/**
 * PerformanceMonitor - Comprehensive performance monitoring for Three.js timeline project
 * Tracks FPS, memory usage, draw calls, and other performance metrics
 */
export class PerformanceMonitor {
    constructor() {
        this.metrics = {
            fps: 0,
            frameTime: 0,
            memoryUsage: 0,
            drawCalls: 0,
            triangles: 0,
            lastFrameTime: 0,
            frameCount: 0,
            startTime: performance.now()
        };
        
        this.isMonitoring = false;
        this.callbacks = [];
        this.rafId = null;
        
        // Performance budgets
        this.budgets = {
            fps: { desktop: 60, mobile: 30 },
            frameTime: { desktop: 16.67, mobile: 33.33 },
            memory: { images: 512, geometry: 256, total: 1024 }, // MB
            drawCalls: 100,
            triangles: 1000000
        };
        
        this.isMobile = this.detectMobile();
    }

    /**
     * Start performance monitoring
     */
    start() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        this.startTime = performance.now();
        
        this.rafId = requestAnimationFrame(this.update.bind(this));
        
        console.debug('PerformanceMonitor: Started monitoring');
    }

    /**
     * Stop performance monitoring
     */
    stop() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        
        console.debug('PerformanceMonitor: Stopped monitoring');
    }

    /**
     * Update performance metrics
     */
    update() {
        if (!this.isMonitoring) return;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        
        // Update frame time
        this.metrics.frameTime = deltaTime;
        
        // Calculate FPS
        this.frameCount++;
        const elapsed = currentTime - this.startTime;
        if (elapsed >= 1000) {
            this.metrics.fps = Math.round((this.frameCount * 1000) / elapsed);
            this.frameCount = 0;
            this.startTime = currentTime;
        }
        
        // Update memory usage
        this.updateMemoryUsage();
        
        // Update draw calls and triangles (if available)
        this.updateRenderMetrics();
        
        // Check performance budgets
        this.checkBudgets();
        
        // Notify callbacks
        this.notifyCallbacks();
        
        // Log performance in development
        if (process.env.NODE_ENV === 'development') {
            this.logPerformance();
        }
        
        this.lastFrameTime = currentTime;
        this.rafId = requestAnimationFrame(this.update.bind(this));
    }

    /**
     * Update memory usage metrics
     */
    updateMemoryUsage() {
        if (performance.memory) {
            this.metrics.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
        } else {
            // Fallback estimation
            this.metrics.memoryUsage = this.estimateMemoryUsage();
        }
    }

    /**
     * Update render metrics (draw calls, triangles)
     */
    updateRenderMetrics() {
        // This would need to be implemented with Three.js renderer info
        // For now, we'll use placeholder values
        this.metrics.drawCalls = this.estimateDrawCalls();
        this.metrics.triangles = this.estimateTriangles();
    }

    /**
     * Check performance budgets
     */
    checkBudgets() {
        const targetFPS = this.isMobile ? this.budgets.fps.mobile : this.budgets.fps.desktop;
        const targetFrameTime = this.isMobile ? this.budgets.frameTime.mobile : this.budgets.frameTime.desktop;
        
        if (this.metrics.fps < targetFPS) {
            console.warn(`Performance: Low FPS detected: ${this.metrics.fps}fps (target: ${targetFPS}fps)`);
        }
        
        if (this.metrics.frameTime > targetFrameTime) {
            console.warn(`Performance: High frame time: ${this.metrics.frameTime.toFixed(2)}ms (target: ${targetFrameTime}ms)`);
        }
        
        if (this.metrics.memoryUsage > this.budgets.memory.total) {
            console.warn(`Performance: High memory usage: ${this.metrics.memoryUsage.toFixed(2)}MB (target: ${this.budgets.memory.total}MB)`);
        }
        
        if (this.metrics.drawCalls > this.budgets.drawCalls) {
            console.warn(`Performance: High draw calls: ${this.metrics.drawCalls} (target: ${this.budgets.drawCalls})`);
        }
        
        if (this.metrics.triangles > this.budgets.triangles) {
            console.warn(`Performance: High triangle count: ${this.metrics.triangles} (target: ${this.budgets.triangles})`);
        }
    }

    /**
     * Log performance metrics
     */
    logPerformance() {
        console.debug('Performance:', {
            fps: this.metrics.fps,
            frameTime: `${this.metrics.frameTime.toFixed(2)}ms`,
            memory: `${this.metrics.memoryUsage.toFixed(2)}MB`,
            drawCalls: this.metrics.drawCalls,
            triangles: this.metrics.triangles
        });
    }

    /**
     * Get current performance metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }

    /**
     * Subscribe to performance updates
     */
    subscribe(callback) {
        this.callbacks.push(callback);
    }

    /**
     * Unsubscribe from performance updates
     */
    unsubscribe(callback) {
        this.callbacks = this.callbacks.filter(cb => cb !== callback);
    }

    /**
     * Notify all subscribers
     */
    notifyCallbacks() {
        this.callbacks.forEach(callback => {
            try {
                callback(this.getMetrics());
            } catch (error) {
                console.error('PerformanceMonitor: Callback error:', error);
            }
        });
    }

    /**
     * Detect if device is mobile
     */
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Estimate memory usage (fallback)
     */
    estimateMemoryUsage() {
        // Rough estimation based on loaded images and objects
        const images = document.querySelectorAll('img');
        const canvases = document.querySelectorAll('canvas');
        
        let estimatedMemory = 0;
        
        // Estimate image memory usage
        images.forEach(img => {
            if (img.complete && img.naturalWidth) {
                estimatedMemory += (img.naturalWidth * img.naturalHeight * 4) / 1024 / 1024; // 4 bytes per pixel
            }
        });
        
        // Estimate canvas memory usage
        canvases.forEach(canvas => {
            estimatedMemory += (canvas.width * canvas.height * 4) / 1024 / 1024; // 4 bytes per pixel
        });
        
        return estimatedMemory;
    }

    /**
     * Estimate draw calls (placeholder)
     */
    estimateDrawCalls() {
        // This would need to be implemented with Three.js renderer info
        return Math.floor(Math.random() * 50) + 10; // Placeholder
    }

    /**
     * Estimate triangle count (placeholder)
     */
    estimateTriangles() {
        // This would need to be implemented with Three.js renderer info
        return Math.floor(Math.random() * 100000) + 10000; // Placeholder
    }

    /**
     * Generate performance report
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            device: this.isMobile ? 'mobile' : 'desktop',
            metrics: this.getMetrics(),
            budgets: this.budgets,
            status: this.getPerformanceStatus()
        };
        
        console.log('Performance Report:', report);
        return report;
    }

    /**
     * Get performance status
     */
    getPerformanceStatus() {
        const targetFPS = this.isMobile ? this.budgets.fps.mobile : this.budgets.fps.desktop;
        const targetFrameTime = this.isMobile ? this.budgets.frameTime.mobile : this.budgets.frameTime.desktop;
        
        let status = 'good';
        
        if (this.metrics.fps < targetFPS * 0.8 || 
            this.metrics.frameTime > targetFrameTime * 1.2 ||
            this.metrics.memoryUsage > this.budgets.memory.total * 0.8) {
            status = 'warning';
        }
        
        if (this.metrics.fps < targetFPS * 0.6 || 
            this.metrics.frameTime > targetFrameTime * 1.5 ||
            this.metrics.memoryUsage > this.budgets.memory.total) {
            status = 'critical';
        }
        
        return status;
    }

    /**
     * Reset metrics
     */
    reset() {
        this.metrics = {
            fps: 0,
            frameTime: 0,
            memoryUsage: 0,
            drawCalls: 0,
            triangles: 0,
            lastFrameTime: 0,
            frameCount: 0,
            startTime: performance.now()
        };
    }

    /**
     * Destroy the performance monitor
     */
    destroy() {
        this.stop();
        this.callbacks = [];
    }
}
