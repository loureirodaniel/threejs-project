import * as THREE from 'three';

export class TimelineController {
    constructor(camera, sceneManager) {
        this.camera = camera;
        this.sceneManager = sceneManager;
        this.scenes = [];
        this.currentSceneIndex = 0;
        this.isTransitioning = false;
        this.transitionProgress = 0;
        this.transitionDuration = 1.5; // seconds
        this.transitionStartTime = 0;
        
        // Camera positions for different scenes
        this.sceneConfigs = [
            {
                name: 'initial',
                position: new THREE.Vector3(0, 0, 5),
                target: new THREE.Vector3(0, 0, 0),
                fov: 75
            },
            {
                name: 'timeline',
                position: new THREE.Vector3(-9, -10, 8), // Start at 2010 position
                target: new THREE.Vector3(-9, -5, 0), // Look at 2010
                fov: 60
            }
        ];
        
        this.init();
    }
    
    init() {
        // Disable default scroll behavior
        document.body.style.overflow = 'hidden';
        
        // Add scroll event listener
        window.addEventListener('wheel', this.onScroll.bind(this), { passive: false });
        
        // Add touch events for mobile
        let touchStartY = 0;
        let touchStartX = 0;
        window.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
            touchStartX = e.touches[0].clientX;
        }, { passive: true });
        
        window.addEventListener('touchend', (e) => {
            const touchEndY = e.changedTouches[0].clientY;
            const touchEndX = e.changedTouches[0].clientX;
            const deltaY = touchStartY - touchEndY;
            const deltaX = touchStartX - touchEndX;
            
            if (this.currentSceneIndex === 1) {
                // In timeline scene, handle horizontal scrolling
                if (Math.abs(deltaX) > 50) { // Minimum swipe distance
                    if (deltaX > 0) {
                        // Swipe left - scroll right in timeline
                        this.handleTimelineScroll(-1);
                    } else {
                        // Swipe right - scroll left in timeline
                        this.handleTimelineScroll(1);
                    }
                }
            } else {
                // In initial scene, handle scene transitions
                if (Math.abs(deltaY) > 50) { // Minimum swipe distance
                    if (deltaY > 0) {
                        this.nextScene();
                    } else {
                        this.previousScene();
                    }
                }
            }
        }, { passive: true });
    }
    
    onScroll(event) {
        if (this.isTransitioning) return;
        
        const delta = event.deltaY;
        
        // If we're in the timeline scene, handle horizontal scrolling
        if (this.currentSceneIndex === 1) {
            this.handleTimelineScroll(delta);
        } else {
            // In initial scene, handle scene transitions
            if (delta > 0) {
                this.nextScene();
            } else if (delta < 0) {
                this.previousScene();
            }
        }
    }
    
    handleTimelineScroll(delta) {
        // Horizontal scrolling within timeline (2010-2020)
        const scrollSpeed = 0.5;
        const currentX = this.camera.position.x;
        
        if (delta > 0) {
            // Scroll right (towards 2020)
            const newX = Math.min(currentX + scrollSpeed, 9); // Max at 2020
            this.camera.position.x = newX;
        } else if (delta < 0) {
            // Scroll left (towards 2010)
            const newX = Math.max(currentX - scrollSpeed, -9); // Min at 2010
            this.camera.position.x = newX;
        }
        
        // Update camera target to look at the current position
        this.camera.lookAt(new THREE.Vector3(this.camera.position.x, -5, 0));
        
        // Update the current year display
        this.updateCurrentYear();
    }
    
    getCurrentYear() {
        // Convert camera X position to year (2010-2020)
        const currentX = this.camera.position.x;
        const yearRange = 2020 - 2010; // 10 years
        const xRange = 18; // -9 to 9
        
        // Map X position to year
        const normalizedX = (currentX + 9) / xRange; // 0 to 1
        const year = Math.round(2010 + (normalizedX * yearRange));
        
        return Math.max(2010, Math.min(2020, year));
    }
    
    updateCurrentYear() {
        const currentYear = this.getCurrentYear();
        
        // Dispatch custom event for year change
        const event = new CustomEvent('timelineYearChange', {
            detail: {
                year: currentYear,
                position: this.camera.position.x
            }
        });
        window.dispatchEvent(event);
    }
    
    nextScene() {
        if (this.currentSceneIndex < this.sceneConfigs.length - 1) {
            this.transitionToScene(this.currentSceneIndex + 1);
        }
    }
    
    previousScene() {
        if (this.currentSceneIndex > 0) {
            this.transitionToScene(this.currentSceneIndex - 1);
        }
    }
    
    transitionToScene(targetIndex) {
        if (this.isTransitioning || targetIndex === this.currentSceneIndex) return;
        
        this.isTransitioning = true;
        this.transitionProgress = 0;
        this.transitionStartTime = Date.now();
        
        const startConfig = this.sceneConfigs[this.currentSceneIndex];
        const endConfig = this.sceneConfigs[targetIndex];
        
        // Store initial camera state
        this.startPosition = this.camera.position.clone();
        this.startTarget = new THREE.Vector3();
        this.camera.getWorldDirection(this.startTarget);
        this.startTarget.multiplyScalar(5).add(this.camera.position);
        this.startFov = this.camera.fov;
        
        // Store target camera state
        this.endPosition = endConfig.position.clone();
        this.endTarget = endConfig.target.clone();
        this.endFov = endConfig.fov;
        
        // Update current scene index
        this.currentSceneIndex = targetIndex;
        
        // Trigger scene change event
        this.onSceneChange(targetIndex);
    }
    
    update() {
        if (!this.isTransitioning) return;
        
        const elapsed = (Date.now() - this.transitionStartTime) / 1000;
        this.transitionProgress = Math.min(elapsed / this.transitionDuration, 1);
        
        // Use easing function for smooth animation
        const easedProgress = this.easeInOutCubic(this.transitionProgress);
        
        // Interpolate camera position
        this.camera.position.lerpVectors(this.startPosition, this.endPosition, easedProgress);
        
        // Interpolate camera target (look-at point)
        const currentTarget = new THREE.Vector3();
        currentTarget.lerpVectors(this.startTarget, this.endTarget, easedProgress);
        
        // Interpolate FOV
        this.camera.fov = THREE.MathUtils.lerp(this.startFov, this.endFov, easedProgress);
        this.camera.updateProjectionMatrix();
        
        // Look at the interpolated target
        this.camera.lookAt(currentTarget);
        
        // Check if transition is complete
        if (this.transitionProgress >= 1) {
            this.isTransitioning = false;
            this.onTransitionComplete();
        }
    }
    
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    onSceneChange(sceneIndex) {
        // This method can be overridden or extended to handle scene-specific logic
        console.log(`Transitioning to scene: ${this.sceneConfigs[sceneIndex].name}`);
        
        // Emit custom event for other components to listen to
        const event = new CustomEvent('sceneChange', {
            detail: {
                sceneIndex,
                sceneName: this.sceneConfigs[sceneIndex].name
            }
        });
        window.dispatchEvent(event);
    }
    
    onTransitionComplete() {
        console.log(`Transition complete to scene: ${this.sceneConfigs[this.currentSceneIndex].name}`);
        
        // Emit custom event for transition completion
        const event = new CustomEvent('sceneTransitionComplete', {
            detail: {
                sceneIndex: this.currentSceneIndex,
                sceneName: this.sceneConfigs[this.currentSceneIndex].name
            }
        });
        window.dispatchEvent(event);
    }
    
    getCurrentSceneIndex() {
        return this.currentSceneIndex;
    }
    
    getCurrentSceneName() {
        return this.sceneConfigs[this.currentSceneIndex].name;
    }
    
    isInTransition() {
        return this.isTransitioning;
    }
    
    updateTimelineCameraConfig(config) {
        // Update the timeline scene configuration
        if (this.sceneConfigs[1]) { // Timeline scene is at index 1
            this.sceneConfigs[1].position.set(config.position.x, config.position.y, config.position.z);
            this.sceneConfigs[1].target.set(config.target.x, config.target.y, config.target.z);
            this.sceneConfigs[1].fov = config.fov;
        }
    }
} 