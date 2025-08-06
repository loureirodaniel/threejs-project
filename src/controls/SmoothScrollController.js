import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

export class SmoothScrollController {
    constructor(timelineController) {
        this.timelineController = timelineController;
        this.isEnabled = true;
        this.scrollSensitivity = 1.0;
        this.momentum = 0.8;
        this.deceleration = 0.95;
        this.currentVelocity = 0;
        this.targetPosition = 0;
        this.currentPosition = 0;
        this.isScrolling = false;
        this.scrollTimeout = null;
        
        // Smooth scrolling state
        this.smoothScrollTween = null;
        this.lastScrollTime = 0;
        this.scrollDirection = 0;
        
        this.init();
    }
    
    init() {
        // Override the original scroll handler
        this.originalScrollHandler = this.timelineController.onScroll.bind(this.timelineController);
        
        // Replace the scroll handler with our smooth version
        window.removeEventListener('wheel', this.originalScrollHandler);
        window.addEventListener('wheel', this.onSmoothScroll.bind(this), { passive: false });
        
        // Initialize smooth scrolling for timeline
        this.initializeTimelineSmoothScroll();
        
        // Add smooth scrolling controls to debug panel
        this.addSmoothScrollControls();
    }
    
    onSmoothScroll(event) {
        if (!this.isEnabled) {
            // Fall back to original behavior
            this.originalScrollHandler(event);
            return;
        }
        
        // Prevent default scroll behavior
        event.preventDefault();
        
        if (this.timelineController.isImageCurrentlyEnlarged()) {
            return;
        }
        
        const delta = event.deltaY;
        const currentTime = Date.now();
        
        // Calculate scroll direction and velocity
        this.scrollDirection = Math.sign(delta);
        const timeDelta = currentTime - this.lastScrollTime;
        const velocity = Math.abs(delta) / Math.max(timeDelta, 1);
        
        // Update velocity with momentum
        this.currentVelocity = this.currentVelocity * this.momentum + velocity * this.scrollDirection;
        
        // Handle different scenes
        if (this.timelineController.getCurrentSceneIndex() === 1) {
            // Timeline scene - horizontal smooth scrolling
            this.handleTimelineSmoothScroll(delta);
        } else {
            // Initial scene - vertical smooth scrolling for scene transitions
            this.handleSceneSmoothScroll(delta);
        }
        
        this.lastScrollTime = currentTime;
        
        // Clear existing timeout
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }
        
        // Set timeout for scroll end detection
        this.scrollTimeout = setTimeout(() => {
            this.onScrollEnd();
        }, 150);
    }
    
    handleTimelineSmoothScroll(delta) {
        const scrollSpeed = 0.5 * this.scrollSensitivity;
        const targetDelta = delta > 0 ? -scrollSpeed : scrollSpeed;
        
        // Kill existing smooth scroll animation
        if (this.smoothScrollTween) {
            this.smoothScrollTween.kill();
        }
        
        // Create smooth scroll animation
        this.smoothScrollTween = gsap.to(this.timelineController, {
            timelineOffset: this.timelineController.timelineOffset + targetDelta,
            duration: 0.3,
            ease: "power2.out",
            onUpdate: () => {
                // Update timeline images during animation
                this.updateTimelineImages();
                this.timelineController.updateCurrentYear();
                this.timelineController.syncDebugPanel();
            },
            onComplete: () => {
                this.smoothScrollTween = null;
            }
        });
    }
    
    handleSceneSmoothScroll(delta) {
        if (delta > 0) {
            this.smoothTransitionToNextScene();
        } else if (delta < 0) {
            this.smoothTransitionToPreviousScene();
        }
    }
    
    smoothTransitionToNextScene() {
        if (this.timelineController.getCurrentSceneIndex() < this.timelineController.sceneConfigs.length - 1) {
            this.performSmoothSceneTransition(this.timelineController.getCurrentSceneIndex() + 1);
        }
    }
    
    smoothTransitionToPreviousScene() {
        if (this.timelineController.getCurrentSceneIndex() > 0) {
            this.performSmoothSceneTransition(this.timelineController.getCurrentSceneIndex() - 1);
        }
    }
    
    performSmoothSceneTransition(targetIndex) {
        if (this.timelineController.isInTransition()) return;
        
        const startConfig = this.timelineController.sceneConfigs[this.timelineController.getCurrentSceneIndex()];
        const endConfig = this.timelineController.sceneConfigs[targetIndex];
        
        // Create smooth camera transition
        const camera = this.timelineController.camera;
        
        // Kill any existing camera animations
        gsap.killTweensOf(camera.position);
        gsap.killTweensOf(camera);
        
        // Create smooth camera transition
        const tl = gsap.timeline({
            onStart: () => {
                this.timelineController.isTransitioning = true;
                this.timelineController.onSceneChange(targetIndex);
            },
            onComplete: () => {
                this.timelineController.isTransitioning = false;
                this.timelineController.currentSceneIndex = targetIndex;
                this.timelineController.onTransitionComplete();
            }
        });
        
        // Animate camera position
        tl.to(camera.position, {
            x: endConfig.position.x,
            y: endConfig.position.y,
            z: endConfig.position.z,
            duration: 1.5,
            ease: "power2.inOut"
        }, 0);
        
        // Animate camera FOV
        tl.to(camera, {
            fov: endConfig.fov,
            duration: 1.5,
            ease: "power2.inOut",
            onUpdate: () => {
                camera.updateProjectionMatrix();
            }
        }, 0);
        
        // Animate camera look-at target
        tl.to({}, {
            duration: 1.5,
            ease: "power2.inOut",
            onUpdate: () => {
                const progress = tl.progress();
                const currentTarget = new THREE.Vector3();
                currentTarget.lerpVectors(startConfig.target, endConfig.target, progress);
                camera.lookAt(currentTarget);
            }
        }, 0);
    }
    
    updateTimelineImages() {
        if (this.timelineController.timelineScene && this.timelineController.timelineScene.getTimelinePlanes) {
            const planes = this.timelineController.timelineScene.getTimelinePlanes();
            planes.forEach((plane, index) => {
                const originalX = (index * 2) - 4;
                plane.position.x = originalX - this.timelineController.timelineOffset;
            });
        }
    }
    
    onScrollEnd() {
        // Apply deceleration
        if (Math.abs(this.currentVelocity) > 0.01) {
            this.currentVelocity *= this.deceleration;
            
            // Continue momentum scrolling
            requestAnimationFrame(() => {
                this.onScrollEnd();
            });
        } else {
            this.currentVelocity = 0;
            this.isScrolling = false;
            
            // Snap to nearest position if in timeline
            if (this.timelineController.getCurrentSceneIndex() === 1) {
                this.timelineController.snapToNearestImage();
            }
        }
    }
    
    initializeTimelineSmoothScroll() {
        // Create smooth scrolling container for timeline
        this.createSmoothScrollContainer();
        
        // Initialize ScrollTrigger for timeline
        this.setupScrollTrigger();
    }
    
    createSmoothScrollContainer() {
        // Create a virtual scroll container for smooth scrolling
        this.scrollContainer = document.createElement('div');
        this.scrollContainer.style.position = 'fixed';
        this.scrollContainer.style.top = '0';
        this.scrollContainer.style.left = '0';
        this.scrollContainer.style.width = '100%';
        this.scrollContainer.style.height = '100%';
        this.scrollContainer.style.pointerEvents = 'none';
        this.scrollContainer.style.zIndex = '-1';
        document.body.appendChild(this.scrollContainer);
    }
    
    setupScrollTrigger() {
        // Setup ScrollTrigger for timeline smooth scrolling
        ScrollTrigger.create({
            trigger: this.scrollContainer,
            start: 'top top',
            end: 'bottom bottom',
            onUpdate: (self) => {
                if (this.timelineController.getCurrentSceneIndex() === 1) {
                    // Map scroll progress to timeline position
                    const progress = self.progress;
                    const timelineRange = 18; // -4 to 14
                    const targetOffset = -4 + (progress * timelineRange);
                    
                    // Smoothly animate to target position
                    gsap.to(this.timelineController, {
                        timelineOffset: targetOffset,
                        duration: 0.1,
                        ease: "power2.out",
                        onUpdate: () => {
                            this.updateTimelineImages();
                            this.timelineController.updateCurrentYear();
                            this.timelineController.syncDebugPanel();
                        }
                    });
                }
            }
        });
    }
    
    addSmoothScrollControls() {
        // Add smooth scrolling controls to debug panel
        const debugPanel = document.querySelector('#debugPanelContent');
        if (debugPanel) {
            const smoothScrollSection = document.createElement('div');
            smoothScrollSection.className = 'debug-section';
            smoothScrollSection.style.marginBottom = '15px';
            smoothScrollSection.innerHTML = `
                <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; padding: 8px 0; border-bottom: 1px solid #333;">
                    <h4 style="margin: 0; color: #00ff88;">Smooth Scroll</h4>
                    <button class="section-toggle" data-section="smoothScroll" style="background: #333; color: white; border: 1px solid #555; padding: 2px 6px; border-radius: 3px; cursor: pointer; font-family: inherit; font-size: 10px;">+</button>
                </div>
                <div class="section-content" id="smoothScroll-content" style="display: none; padding-top: 10px;">
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 5px;">Smooth Scroll: <span id="smoothScrollStatus">Enabled</span></label>
                        <input type="checkbox" id="smoothScrollToggle" checked style="margin-right: 8px;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 5px;">Sensitivity: <span id="scrollSensitivityDisplay">1.0</span></label>
                        <input type="range" id="scrollSensitivitySlider" min="0.1" max="2.0" step="0.1" value="1.0" style="width: 100%;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 5px;">Momentum: <span id="scrollMomentumDisplay">0.8</span></label>
                        <input type="range" id="scrollMomentumSlider" min="0.1" max="0.9" step="0.1" value="0.8" style="width: 100%;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 5px;">Deceleration: <span id="scrollDecelerationDisplay">0.95</span></label>
                        <input type="range" id="scrollDecelerationSlider" min="0.8" max="0.99" step="0.01" value="0.95" style="width: 100%;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <button id="scrollToYearBtn" style="background: #9c27b0; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-family: inherit; margin-right: 8px;">Scroll to 2015</button>
                        <button id="scrollToYearBtn2" style="background: #ff9800; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-family: inherit;">Scroll to 2019</button>
                    </div>
                </div>
            `;
            
            // Insert before the reset button
            const resetBtn = debugPanel.querySelector('#resetBtn');
            if (resetBtn) {
                debugPanel.insertBefore(smoothScrollSection, resetBtn);
            } else {
                debugPanel.appendChild(smoothScrollSection);
            }
            
            // Add event listeners
            this.setupSmoothScrollEventListeners();
            
            // Setup section toggle for smooth scroll
            this.setupSmoothScrollSectionToggle();
        }
    }
    
    setupSmoothScrollEventListeners() {
        const toggle = document.getElementById('smoothScrollToggle');
        const sensitivitySlider = document.getElementById('scrollSensitivitySlider');
        const momentumSlider = document.getElementById('scrollMomentumSlider');
        const decelerationSlider = document.getElementById('scrollDecelerationSlider');
        const scrollToYearBtn = document.getElementById('scrollToYearBtn');
        const scrollToYearBtn2 = document.getElementById('scrollToYearBtn2');
        
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                this.isEnabled = e.target.checked;
                this.updateSmoothScrollStatus();
            });
        }
        
        if (sensitivitySlider) {
            sensitivitySlider.addEventListener('input', (e) => {
                this.scrollSensitivity = parseFloat(e.target.value);
                document.getElementById('scrollSensitivityDisplay').textContent = this.scrollSensitivity.toFixed(1);
            });
        }
        
        if (momentumSlider) {
            momentumSlider.addEventListener('input', (e) => {
                this.momentum = parseFloat(e.target.value);
                document.getElementById('scrollMomentumDisplay').textContent = this.momentum.toFixed(1);
            });
        }
        
        if (decelerationSlider) {
            decelerationSlider.addEventListener('input', (e) => {
                this.deceleration = parseFloat(e.target.value);
                document.getElementById('scrollDecelerationDisplay').textContent = this.deceleration.toFixed(2);
            });
        }
        
        if (scrollToYearBtn) {
            scrollToYearBtn.addEventListener('click', () => {
                this.scrollToYear(2015, 1.5);
            });
        }
        
        if (scrollToYearBtn2) {
            scrollToYearBtn2.addEventListener('click', () => {
                this.scrollToYear(2019, 1.5);
            });
        }
    }
    
    setupSmoothScrollSectionToggle() {
        const sectionHeader = document.querySelector('[data-section="smoothScroll"]').parentElement;
        const sectionContent = document.getElementById('smoothScroll-content');
        const toggleButton = document.querySelector('[data-section="smoothScroll"]');
        
        if (sectionHeader && sectionContent && toggleButton) {
            sectionHeader.addEventListener('click', () => {
                this.toggleSmoothScrollSection(sectionContent, toggleButton);
            });
        }
    }
    
    toggleSmoothScrollSection(content, button) {
        const isVisible = content.style.display !== 'none';
        
        if (isVisible) {
            content.style.display = 'none';
            button.textContent = '+';
        } else {
            content.style.display = 'block';
            button.textContent = '−';
        }
    }
    
    updateSmoothScrollStatus() {
        const status = document.getElementById('smoothScrollStatus');
        if (status) {
            status.textContent = this.isEnabled ? 'Enabled' : 'Disabled';
            status.style.color = this.isEnabled ? '#4CAF50' : '#F44336';
        }
    }
    
    // Public methods for external control
    enable() {
        this.isEnabled = true;
        this.updateSmoothScrollStatus();
    }
    
    disable() {
        this.isEnabled = false;
        this.updateSmoothScrollStatus();
    }
    
    setSensitivity(value) {
        this.scrollSensitivity = Math.max(0.1, Math.min(2.0, value));
    }
    
    setMomentum(value) {
        this.momentum = Math.max(0.1, Math.min(0.9, value));
    }
    
    setDeceleration(value) {
        this.deceleration = Math.max(0.8, Math.min(0.99, value));
    }
    
    // Method to smoothly scroll to a specific timeline position
    scrollToTimelinePosition(targetOffset, duration = 1.0) {
        if (this.timelineController.getCurrentSceneIndex() !== 1) return;
        
        // Kill existing animations
        if (this.smoothScrollTween) {
            this.smoothScrollTween.kill();
        }
        
        // Create smooth scroll animation
        this.smoothScrollTween = gsap.to(this.timelineController, {
            timelineOffset: targetOffset,
            duration: duration,
            ease: "power2.inOut",
            onUpdate: () => {
                this.updateTimelineImages();
                this.timelineController.updateCurrentYear();
                this.timelineController.syncDebugPanel();
            },
            onComplete: () => {
                this.smoothScrollTween = null;
                this.timelineController.snapToNearestImage();
            }
        });
    }
    
    // Method to smoothly scroll to a specific year
    scrollToYear(year, duration = 1.0) {
        if (this.timelineController.getCurrentSceneIndex() !== 1) return;
        
        // Calculate timeline offset for the year
        const yearRange = 2019 - 2010;
        const xRange = 18;
        const normalizedX = (year - 2010) / yearRange;
        const targetOffset = -4 + (normalizedX * xRange);
        
        this.scrollToTimelinePosition(targetOffset, duration);
    }
    
    // Cleanup method
    destroy() {
        // Remove event listeners
        window.removeEventListener('wheel', this.onSmoothScroll.bind(this));
        
        // Kill all GSAP animations
        if (this.smoothScrollTween) {
            this.smoothScrollTween.kill();
        }
        
        // Remove scroll container
        if (this.scrollContainer) {
            this.scrollContainer.remove();
        }
        
        // Clear timeouts
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }
        
        // Kill all ScrollTrigger instances
        ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    }
} 