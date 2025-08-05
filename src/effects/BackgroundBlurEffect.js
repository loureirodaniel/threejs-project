import * as THREE from 'three';

export class BackgroundBlurEffect {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.isActive = false;
        this.blurAmount = 5;
        this.blurOpacity = 0.8;
        
        // Blur div width adjustments (percentage of viewport)
        this.leftBlurWidth = 4;   // Default 4% extra width on left
        this.rightBlurWidth = 4;  // Default 4% extra width on right
        
        // Only left and right blur overlays
        this.leftBlur = null;
        this.rightBlur = null;
        
        this.init();
    }
    
    init() {
        this.createBlurOverlays();
    }
    
    createBlurOverlays() {
        // Create left blur overlay
        this.leftBlur = document.createElement('div');
        this.leftBlur.style.position = 'fixed';
        this.leftBlur.style.zIndex = '999';
        this.leftBlur.style.pointerEvents = 'none';
        this.leftBlur.style.opacity = '0';
        this.leftBlur.style.transition = 'opacity 0.3s ease';
        this.leftBlur.style.backdropFilter = `blur(${this.blurAmount}px)`;
        this.leftBlur.style.backgroundColor = `rgba(0, 0, 0, ${this.blurOpacity * 0.3})`;
        
        // Create right blur overlay
        this.rightBlur = document.createElement('div');
        this.rightBlur.style.position = 'fixed';
        this.rightBlur.style.zIndex = '999';
        this.rightBlur.style.pointerEvents = 'none';
        this.rightBlur.style.opacity = '0';
        this.rightBlur.style.transition = 'opacity 0.3s ease';
        this.rightBlur.style.backdropFilter = `blur(${this.blurAmount}px)`;
        this.rightBlur.style.backgroundColor = `rgba(0, 0, 0, ${this.blurOpacity * 0.3})`;
        
        // Add overlays to DOM
        document.body.appendChild(this.leftBlur);
        document.body.appendChild(this.rightBlur);
        
        console.log('BackgroundBlurEffect: Left and right blur overlays created');
    }
    
    activate(blurAmount = 5) {
        console.log('BackgroundBlurEffect: Activating blur effect');
        this.blurAmount = blurAmount;
        this.isActive = true;
        
        // Calculate the size of the enlarged image based on viewport
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // The enlarged image is 70% of viewport size (as set in TimelineController)
        const imageWidth = viewportWidth * 0.7;
        const imageHeight = viewportHeight * 0.7;
        
        // Calculate the position of the enlarged image (centered)
        const imageLeft = (viewportWidth - imageWidth) / 2;
        const imageTop = (viewportHeight - imageHeight) / 2;
        
        // Convert to percentages for CSS positioning with more precision
        const imageLeftPercent = Math.round((imageLeft / viewportWidth) * 10000) / 100;
        const imageTopPercent = Math.round((imageTop / viewportHeight) * 10000) / 100;
        const imageWidthPercent = Math.round((imageWidth / viewportWidth) * 10000) / 100;
        const imageHeightPercent = Math.round((imageHeight / viewportHeight) * 10000) / 100;
        
        console.log('Image dimensions:', {
            width: imageWidth,
            height: imageHeight,
            left: imageLeft,
            top: imageTop,
            widthPercent: imageWidthPercent,
            heightPercent: imageHeightPercent,
            leftPercent: imageLeftPercent,
            topPercent: imageTopPercent
        });
        
        console.log('Blur overlay positions (exact fit):');
        console.log('Left blur:', `top: 0, left: 0, width: ${imageLeftPercent}%, height: 100%`);
        console.log('Right blur:', `top: 0, left: ${imageLeftPercent + imageWidthPercent}%, width: ${100 - imageLeftPercent - imageWidthPercent}%, height: 100%`);
        
        // Position the left and right blur overlays around the enlarged image with adjustable widths
        // Left blur overlay - covers from left edge to left edge of image + extra width, full height
        this.leftBlur.style.top = '0';
        this.leftBlur.style.left = '0';
        this.leftBlur.style.width = `${imageLeftPercent + this.leftBlurWidth}%`;
        this.leftBlur.style.height = '100%';
        
        // Right blur overlay - covers from right edge of image to right edge of screen + extra width, full height
        this.rightBlur.style.top = '0';
        this.rightBlur.style.left = `${imageLeftPercent + imageWidthPercent - this.rightBlurWidth}%`;
        this.rightBlur.style.width = `${100 - imageLeftPercent - imageWidthPercent + this.rightBlurWidth}%`;
        this.rightBlur.style.height = '100%';
        
        // Update blur amount for overlays
        this.leftBlur.style.backdropFilter = `blur(${this.blurAmount}px)`;
        this.rightBlur.style.backdropFilter = `blur(${this.blurAmount}px)`;
        
        this.leftBlur.style.backgroundColor = `rgba(0, 0, 0, ${this.blurOpacity * 0.3})`;
        this.rightBlur.style.backgroundColor = `rgba(0, 0, 0, ${this.blurOpacity * 0.3})`;
        
        // Show overlays
        this.leftBlur.style.opacity = '1';
        this.rightBlur.style.opacity = '1';
        
        console.log('BackgroundBlurEffect: Left and right blur overlays activated');
    }
    
    deactivate() {
        console.log('BackgroundBlurEffect: Deactivating blur effect');
        this.isActive = false;
        this.leftBlur.style.opacity = '0';
        this.rightBlur.style.opacity = '0';
    }
    
    fadeInBlur() {
        // Not needed for DOM-based approach
    }
    
    fadeOutBlur() {
        // Animate the opacity of blur overlays to 0
        const fadeDuration = 300; // 300ms
        const startTime = Date.now();
        const startOpacity = parseFloat(this.leftBlur.style.opacity) || 1;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / fadeDuration, 1);
            
            const currentOpacity = startOpacity * (1 - progress);
            this.leftBlur.style.opacity = currentOpacity.toString();
            this.rightBlur.style.opacity = currentOpacity.toString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.deactivate();
            }
        };
        
        animate();
    }
    
    updateBlurAmount(blurAmount) {
        this.blurAmount = blurAmount;
        if (this.isActive) {
            this.leftBlur.style.backdropFilter = `blur(${this.blurAmount}px)`;
            this.rightBlur.style.backdropFilter = `blur(${this.blurAmount}px)`;
            console.log(`BackgroundBlurEffect: Blur amount updated to ${blurAmount}px`);
        }
    }
    
    updateBlurOpacity(blurOpacity) {
        this.blurOpacity = blurOpacity;
        if (this.isActive) {
            this.leftBlur.style.backgroundColor = `rgba(0, 0, 0, ${this.blurOpacity * 0.3})`;
            this.rightBlur.style.backgroundColor = `rgba(0, 0, 0, ${this.blurOpacity * 0.3})`;
            console.log(`BackgroundBlurEffect: Blur opacity updated to ${blurOpacity}`);
        }
    }
    
    updateLeftBlurWidth(width) {
        this.leftBlurWidth = width;
        if (this.isActive) {
            this.refreshBlur();
        }
        console.log(`BackgroundBlurEffect: Left blur width updated to ${width}%`);
    }
    
    updateRightBlurWidth(width) {
        this.rightBlurWidth = width;
        if (this.isActive) {
            this.refreshBlur();
        }
        console.log(`BackgroundBlurEffect: Right blur width updated to ${width}%`);
    }
    
    refreshBlur() {
        if (this.isActive) {
            // Recalculate positions with current width settings
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            
            const imageWidth = viewportWidth * 0.7;
            const imageHeight = viewportHeight * 0.7;
            
            const imageLeft = (viewportWidth - imageWidth) / 2;
            const imageTop = (viewportHeight - imageHeight) / 2;
            
            const imageLeftPercent = Math.round((imageLeft / viewportWidth) * 10000) / 100;
            const imageTopPercent = Math.round((imageTop / viewportHeight) * 10000) / 100;
            const imageWidthPercent = Math.round((imageWidth / viewportWidth) * 10000) / 100;
            const imageHeightPercent = Math.round((imageHeight / viewportHeight) * 10000) / 100;
            
            // Update positions with current width settings
            this.leftBlur.style.width = `${imageLeftPercent + this.leftBlurWidth}%`;
            this.rightBlur.style.left = `${imageLeftPercent + imageWidthPercent - this.rightBlurWidth}%`;
            this.rightBlur.style.width = `${100 - imageLeftPercent - imageWidthPercent + this.rightBlurWidth}%`;
            
            // Update blur amount and opacity
            this.updateBlurAmount(this.blurAmount);
            this.updateBlurOpacity(this.blurOpacity);
            
            console.log(`BackgroundBlurEffect: Blur refreshed with left width: ${this.leftBlurWidth}%, right width: ${this.rightBlurWidth}%`);
        }
    }
    
    isBlurActive() {
        return this.isActive;
    }
    
    getBlurAmount() {
        return this.blurAmount;
    }
    
    // Handle window resize
    onWindowResize() {
        // DOM-based approach doesn't need resize handling
    }
} 