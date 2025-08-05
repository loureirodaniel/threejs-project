import * as THREE from 'three';

export class BackgroundBlurEffect {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.isActive = false;
        this.blurAmount = 5;
        this.blurOpacity = 0.8;
        
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
        
        // Convert to percentages for CSS positioning
        const imageLeftPercent = (imageLeft / viewportWidth) * 100;
        const imageTopPercent = (imageTop / viewportHeight) * 100;
        const imageWidthPercent = (imageWidth / viewportWidth) * 100;
        const imageHeightPercent = (imageHeight / viewportHeight) * 100;
        
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
        
        // Add a small buffer to prevent overlap
        const buffer = 0.5; // 0.5% buffer
        
        console.log('Blur overlay positions (with buffer):');
        console.log('Left blur:', `top: 0, left: 0, width: ${imageLeftPercent - buffer}%, height: 100%`);
        console.log('Right blur:', `top: 0, left: ${imageLeftPercent + imageWidthPercent + buffer}%, width: ${100 - imageLeftPercent - imageWidthPercent - buffer}%, height: 100%`);
        
        // Position the left and right blur overlays around the enlarged image
        // Left blur overlay - covers from left edge to left edge of image, full height (with buffer)
        this.leftBlur.style.top = '0';
        this.leftBlur.style.left = '0';
        this.leftBlur.style.width = `${imageLeftPercent - buffer}%`;
        this.leftBlur.style.height = '100%';
        
        // Right blur overlay - covers from right edge of image to right edge of screen, full height (with buffer)
        this.rightBlur.style.top = '0';
        this.rightBlur.style.left = `${imageLeftPercent + imageWidthPercent + buffer}%`;
        this.rightBlur.style.width = `${100 - imageLeftPercent - imageWidthPercent - buffer}%`;
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
    
    refreshBlur() {
        if (this.isActive) {
            this.updateBlurAmount(this.blurAmount);
            this.updateBlurOpacity(this.blurOpacity);
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