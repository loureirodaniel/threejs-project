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
                position: new THREE.Vector3(0, -10, 8),
                target: new THREE.Vector3(0, -5, 0),
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
        window.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
        
        window.addEventListener('touchend', (e) => {
            const touchEndY = e.changedTouches[0].clientY;
            const deltaY = touchStartY - touchEndY;
            
            if (Math.abs(deltaY) > 50) { // Minimum swipe distance
                if (deltaY > 0) {
                    this.nextScene();
                } else {
                    this.previousScene();
                }
            }
        }, { passive: true });
    }
    
    onScroll(event) {
        event.preventDefault();
        
        if (this.isTransitioning) return;
        
        const delta = event.deltaY;
        
        if (delta > 0) {
            this.nextScene();
        } else if (delta < 0) {
            this.previousScene();
        }
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
} 