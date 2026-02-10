/**
 * TimelineEffects - Manages haptic feedback, audio, vignette, and UI overlays for timeline
 */
import { gsap } from 'gsap';
import { TIMELINE_FIRST_POSITION, getTimelinePlaneX, getTimelineAdditionalPlaneX } from '../config/timelineLayout.js';

export class TimelineEffects {
    constructor(timelineController) {
        this.controller = timelineController;
        
        // Haptic feedback state
        this.lastHapticTime = 0;
        this.capabilitiesChecked = false;
        this.audioContext = null;
        this.hapticIndicator = null;
        
        // UI overlay elements
        this.closeButton = null;
        this.scrollIndicator = null;
        this.backgroundOverlay = null;
        
        // Vignette configuration
        this.vignetteStrength = timelineController.timelineVignetteStrength || 0.6;
        this.vignetteWidth = timelineController.timelineVignetteWidth || 3.5;
    }
    
    /**
     * Trigger haptic feedback based on type
     * @param {string} type - Feedback type: 'drag', 'start', 'end', 'boundary', 'snap'
     */
    triggerHapticFeedback(type = 'drag') {
        console.log(`Haptic feedback triggered: ${type}`);
        
        // Show visual feedback indicator
        this.showHapticIndicator(type);
        
        // Check device capabilities
        this.checkDeviceCapabilities();
        
        // Throttle haptic feedback to avoid overwhelming the device
        if (!this.lastHapticTime) this.lastHapticTime = 0;
        const now = Date.now();
        
        // Different throttling based on feedback type
        let throttleTime = 100; // Default for drag
        if (type === 'start' || type === 'end') {
            throttleTime = 0; // No throttle for start/end
        }
        
        if (now - this.lastHapticTime > throttleTime) {
            this.lastHapticTime = now;
            
            // Different vibration patterns based on type
            let vibrationPattern = 10; // Default short vibration
            if (type === 'start') {
                vibrationPattern = 20; // Slightly longer for start
            } else if (type === 'end') {
                vibrationPattern = 15; // Medium for end
            } else if (type === 'boundary') {
                vibrationPattern = [10, 50, 10]; // Pattern for boundaries
            } else if (type === 'snap') {
                vibrationPattern = [5, 20, 5]; // Quick double tap for snap
            }
            
            // Try multiple haptic feedback methods
            let hapticTriggered = false;
            
            // Method 1: Standard vibration API
            if (navigator.vibrate) {
                try {
                    console.log(`Attempting vibration with pattern:`, vibrationPattern);
                    const result = navigator.vibrate(vibrationPattern);
                    console.log(`Vibration API result: ${result}`);
                    hapticTriggered = result;
                    
                    // If vibration returns false, try a longer pattern
                    if (!result && type === 'start') {
                        console.log('Trying longer vibration pattern...');
                        navigator.vibrate(100);
                    }
                } catch (e) {
                    console.log('Vibration API failed:', e);
                }
            } else {
                console.log('Vibration API not available');
            }
            
            // Method 2: iOS specific haptic feedback
            if (window.navigator && window.navigator.userAgent.includes('iPhone')) {
                this.triggerIOSHaptic(type);
                hapticTriggered = true;
            }
            
            // Method 3: Try alternative vibration methods
            if (!hapticTriggered) {
                this.tryAlternativeHaptic(type);
            }
            
            // Method 4: Audio feedback as fallback
            if (!hapticTriggered) {
                this.triggerAudioFeedback(type);
            }
        }
    }
    
    /**
     * Trigger iOS-specific haptic feedback
     */
    triggerIOSHaptic(type = 'drag') {
        console.log('Attempting iOS haptic feedback');
        // iOS haptic feedback using WebKit
        if (window.webkit && window.webkit.messageHandlers) {
            try {
                let style = 'light';
                if (type === 'start' || type === 'end') {
                    style = 'medium';
                } else if (type === 'boundary') {
                    style = 'heavy';
                } else if (type === 'snap') {
                    style = 'light';
                }
                
                window.webkit.messageHandlers.hapticFeedback.postMessage({
                    type: 'impact',
                    style: style
                });
                console.log('iOS haptic feedback sent');
            } catch (e) {
                console.log('iOS haptic feedback failed:', e);
                // Fallback to vibration if haptic feedback fails
                if (navigator.vibrate) {
                    let vibrationPattern = 15;
                    if (type === 'start') vibrationPattern = 20;
                    else if (type === 'end') vibrationPattern = 15;
                    else if (type === 'boundary') vibrationPattern = [10, 50, 10];
                    navigator.vibrate(vibrationPattern);
                }
            }
        } else {
            console.log('iOS WebKit not available');
        }
    }
    
    /**
     * Try alternative haptic methods
     */
    tryAlternativeHaptic(type = 'drag') {
        console.log('Trying alternative haptic methods');
        
        try {
            if (navigator.vibrate) {
                let pattern = 10;
                if (type === 'start') pattern = 30;
                else if (type === 'end') pattern = 20;
                else if (type === 'boundary') pattern = 50;
                else if (type === 'snap') pattern = [5, 20, 5];
                
                navigator.vibrate(pattern);
                console.log('Alternative vibration triggered');
            }
        } catch (e) {
            console.log('Alternative vibration failed:', e);
        }
    }
    
    /**
     * Trigger audio feedback as fallback
     */
    triggerAudioFeedback(type = 'drag') {
        console.log('Triggering audio feedback');
        
        // Create audio context for feedback
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.log('Audio context not available:', e);
                return;
            }
        }
        
        try {
            // Create oscillator for audio feedback
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // Different frequencies based on type
            let frequency = 200; // Default
            if (type === 'start') frequency = 300;
            else if (type === 'end') frequency = 250;
            else if (type === 'boundary') frequency = 400;
            else if (type === 'snap') frequency = 150;
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = 'sine';
            
            // Very short duration
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.05);
            
            console.log('Audio feedback triggered');
        } catch (e) {
            console.log('Audio feedback failed:', e);
        }
    }
    
    /**
     * Check device capabilities for haptic/audio
     */
    checkDeviceCapabilities() {
        // Only check once
        if (this.capabilitiesChecked) return;
        this.capabilitiesChecked = true;
        
        console.log('=== DEVICE CAPABILITIES CHECK ===');
        console.log('User Agent:', navigator.userAgent);
        console.log('Platform:', navigator.platform);
        console.log('Vendor:', navigator.vendor);
        
        // Check vibration support
        if (navigator.vibrate) {
            console.log('✅ Vibration API supported');
            try {
                const result = navigator.vibrate(10);
                console.log('Vibration test result:', result);
            } catch (e) {
                console.log('❌ Vibration test failed:', e);
            }
        } else {
            console.log('❌ Vibration API not supported');
        }
        
        // Check iOS WebKit
        if (window.webkit && window.webkit.messageHandlers) {
            console.log('✅ iOS WebKit detected');
        } else {
            console.log('❌ iOS WebKit not available');
        }
        
        // Check audio context
        if (window.AudioContext || window.webkitAudioContext) {
            console.log('✅ Audio Context supported');
        } else {
            console.log('❌ Audio Context not supported');
        }
        
        // Check if on mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        console.log('Mobile device:', isMobile);
        
        // Check permissions
        if (navigator.permissions) {
            navigator.permissions.query({ name: 'notifications' }).then(result => {
                console.log('Notification permission:', result.state);
            });
        }
        
        console.log('=== END CAPABILITIES CHECK ===');
    }
    
    /**
     * Show visual haptic feedback indicator
     */
    showHapticIndicator(type = 'drag') {
        // Create or get haptic indicator element
        if (!this.hapticIndicator) {
            this.hapticIndicator = document.createElement('div');
            this.hapticIndicator.style.position = 'fixed';
            this.hapticIndicator.style.top = '50%';
            this.hapticIndicator.style.left = '50%';
            this.hapticIndicator.style.transform = 'translate(-50%, -50%)';
            this.hapticIndicator.style.width = '100px';
            this.hapticIndicator.style.height = '100px';
            this.hapticIndicator.style.borderRadius = '50%';
            this.hapticIndicator.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
            this.hapticIndicator.style.border = '3px solid white';
            this.hapticIndicator.style.zIndex = '9999';
            this.hapticIndicator.style.pointerEvents = 'none';
            this.hapticIndicator.style.transition = 'all 0.1s ease-out';
            this.hapticIndicator.style.opacity = '0';
            this.hapticIndicator.style.scale = '0';
            document.body.appendChild(this.hapticIndicator);
        }
        
        // Different colors based on type
        let color = '#ffffff';
        if (type === 'start') color = '#4CAF50';
        else if (type === 'end') color = '#FF9800';
        else if (type === 'boundary') color = '#F44336';
        else if (type === 'snap') color = '#2196F3';
        
        // Animate the indicator
        this.hapticIndicator.style.backgroundColor = color;
        this.hapticIndicator.style.borderColor = color;
        this.hapticIndicator.style.opacity = '1';
        this.hapticIndicator.style.scale = '1';
        
        // Hide after animation
        setTimeout(() => {
            this.hapticIndicator.style.opacity = '0';
            this.hapticIndicator.style.scale = '0';
        }, 100);
    }
    
    /**
     * Update timeline vignette (center emphasis: opacity + scale)
     * Opacity applied immediately; scale animated with GSAP (focus: back.out, unfocus: staggered).
     */
    updateTimelineVignette() {
        if (this.controller.getCurrentSceneIndex() !== 1) {
            return;
        }

        console.log('🎨 Updating timeline vignette, timelineOffset:', this.controller.timelineOffset);

        const timelinePlanes = this.controller.timelineScene?.getTimelinePlanes() || [];
        const initialPlanes = window.app?.imagePlanes?.getPlanes() || [];
        const allTimelineImages = [
            ...timelinePlanes.filter(p => !p.userData.isEnlarged),
            ...initialPlanes.filter(plane => plane.userData.isTimelineTransitioned && !plane.userData.isEnlarged)
        ];

        if (allTimelineImages.length === 0) return;

        const centerX = 0;
        const focusWidth = 2.0;
        const falloffWidth = 4.0;
        const minOpacity = 0.3;
        const focusScale = 0.85;
        const normalScale = 0.75;

        const imagesToFocus = [];
        const imagesToUnfocus = [];

        allTimelineImages.forEach((plane, index) => {
            if (!plane || !plane.visible) return;

            const distance = Math.abs(plane.position.x - centerX);

            let opacity;
            if (distance < focusWidth) {
                opacity = 1.0;
            } else {
                const fadeDistance = distance - focusWidth;
                const fadeFactor = Math.min(1.0, fadeDistance / falloffWidth);
                opacity = 1.0 - fadeFactor * (1.0 - minOpacity);
            }

            const isFocused = distance < 1.0;
            const targetScale = isFocused ? focusScale : normalScale;

            if (plane.material) {
                plane.material.opacity = opacity;
                plane.material.transparent = true;
                plane.material.needsUpdate = true;
            }

            const currentScale = plane.scale.x;
            const needsScaleChange = Math.abs(currentScale - targetScale) > 0.01;

            if (needsScaleChange) {
                gsap.killTweensOf(plane.scale);
                if (isFocused) {
                    imagesToFocus.push({ plane, targetScale, index });
                } else {
                    imagesToUnfocus.push({ plane, targetScale, index });
                }
            }
        });

        if (imagesToFocus.length > 0) {
            console.log(`🎨 Focusing ${imagesToFocus.length} image(s)`);
            imagesToFocus.forEach(({ plane, targetScale, index }) => {
                gsap.to(plane.scale, {
                    x: targetScale,
                    y: targetScale,
                    z: targetScale,
                    duration: 0.4,
                    ease: 'back.out(1.2)',
                    onStart: () => {
                        console.log(`  📍 Focusing image ${index} to scale ${targetScale}`);
                    }
                });
            });
        }

        if (imagesToUnfocus.length > 0) {
            console.log(`🎨 Unfocusing ${imagesToUnfocus.length} image(s)`);
            const unfocusScales = imagesToUnfocus.map(i => i.plane.scale);
            gsap.to(unfocusScales, {
                x: normalScale,
                y: normalScale,
                z: normalScale,
                duration: 0.3,
                ease: 'power2.out',
                stagger: {
                    amount: 0.1,
                    from: 'center',
                    ease: 'power1.inOut'
                }
            });
        }

        console.log('✅ Vignette update complete');
    }
    
    /**
     * Add close button and scroll indicator
     */
    addCloseButton() {
        // Remove existing close button if any
        this.removeCloseButton();
        
        // Create close button
        this.closeButton = document.createElement('div');
        this.closeButton.innerHTML = '✕';
        this.closeButton.style.position = 'fixed';
        this.closeButton.style.top = '20px';
        this.closeButton.style.right = '20px';
        this.closeButton.style.width = '50px';
        this.closeButton.style.height = '50px';
        this.closeButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.closeButton.style.color = 'white';
        this.closeButton.style.border = '2px solid white';
        this.closeButton.style.borderRadius = '50%';
        this.closeButton.style.display = 'flex';
        this.closeButton.style.alignItems = 'center';
        this.closeButton.style.justifyContent = 'center';
        this.closeButton.style.fontSize = '24px';
        this.closeButton.style.fontWeight = 'bold';
        this.closeButton.style.cursor = 'pointer';
        this.closeButton.style.zIndex = '1000';
        this.closeButton.style.opacity = '0';
        this.closeButton.style.transition = 'opacity 0.3s ease';
        
        // Add click event
        this.closeButton.addEventListener('click', () => {
            if (this.controller.closeEnlargedImage) {
                this.controller.closeEnlargedImage();
            }
        });
        
        document.body.appendChild(this.closeButton);
        
        // Create scroll disabled indicator
        this.scrollIndicator = document.createElement('div');
        this.scrollIndicator.innerHTML = 'Scroll disabled';
        this.scrollIndicator.style.position = 'fixed';
        this.scrollIndicator.style.bottom = '20px';
        this.scrollIndicator.style.left = '50%';
        this.scrollIndicator.style.transform = 'translateX(-50%)';
        this.scrollIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.scrollIndicator.style.color = 'white';
        this.scrollIndicator.style.padding = '8px 16px';
        this.scrollIndicator.style.borderRadius = '20px';
        this.scrollIndicator.style.fontSize = '14px';
        this.scrollIndicator.style.fontWeight = 'bold';
        this.scrollIndicator.style.zIndex = '1000';
        this.scrollIndicator.style.opacity = '0';
        this.scrollIndicator.style.transition = 'opacity 0.3s ease';
        
        document.body.appendChild(this.scrollIndicator);
        
        // Fade in both elements
        setTimeout(() => {
            this.closeButton.style.opacity = '1';
            this.scrollIndicator.style.opacity = '1';
        }, 100);
    }
    
    /**
     * Remove close button and overlays
     */
    removeCloseButton() {
        if (this.closeButton) {
            this.closeButton.remove();
            this.closeButton = null;
        }
        if (this.scrollIndicator) {
            this.scrollIndicator.remove();
            this.scrollIndicator = null;
        }
        if (this.backgroundOverlay) {
            this.backgroundOverlay.remove();
            this.backgroundOverlay = null;
        }
    }
    
    /**
     * Add background overlay for enlarged images
     */
    addBackgroundOverlay() {
        // Remove existing background overlay if any
        if (this.backgroundOverlay) {
            this.backgroundOverlay.remove();
        }
        
        // Create background overlay
        this.backgroundOverlay = document.createElement('div');
        this.backgroundOverlay.style.position = 'fixed';
        this.backgroundOverlay.style.top = '0';
        this.backgroundOverlay.style.left = '0';
        this.backgroundOverlay.style.width = '100%';
        this.backgroundOverlay.style.height = '100%';
        this.backgroundOverlay.style.backgroundColor = `rgba(0, 0, 0, ${this.getBackgroundOpacity()})`;
        this.backgroundOverlay.style.zIndex = '999';
        this.backgroundOverlay.style.opacity = '0';
        this.backgroundOverlay.style.transition = 'opacity 0.3s ease';
        this.backgroundOverlay.style.pointerEvents = 'none'; // Allow clicks to pass through to the image
        
        document.body.appendChild(this.backgroundOverlay);
        
        // Fade in
        setTimeout(() => {
            this.backgroundOverlay.style.opacity = '1';
        }, 100);
    }
    
    /**
     * Remove background overlay
     */
    removeBackgroundOverlay() {
        if (this.backgroundOverlay) {
            this.backgroundOverlay.remove();
            this.backgroundOverlay = null;
        }
    }
    
    /**
     * Get background opacity from debug panel or default
     */
    getBackgroundOpacity() {
        // Get background opacity from debug panel or use default
        const debugPanel = document.querySelector('#backgroundOpacitySlider');
        if (debugPanel) {
            return parseFloat(debugPanel.value);
        }
        return 0.8; // Default opacity
    }
    
    /**
     * Update vignette configuration
     */
    updateVignetteConfig(strength, width) {
        this.vignetteStrength = strength;
        this.vignetteWidth = width;
    }
    
    /**
     * Destroy the effects manager
     */
    destroy() {
        // Remove all UI elements
        this.removeCloseButton();
        this.removeBackgroundOverlay();
        
        // Clear references
        if (this.hapticIndicator) {
            this.hapticIndicator.remove();
            this.hapticIndicator = null;
        }
        
        // Clear audio context
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.controller = null;
    }
}

