/**
 * AppIntroSequence - Handles the application intro animation
 * Separates intro logic from the main App class
 */
import { gsap } from 'gsap';

export class AppIntroSequence {
    constructor(app) {
        this.app = app;
        this.inputBlocker = null;
    }

    /**
     * Play the intro sequence
     */
    playIntro() {
        const camera = this.app.sceneManager.getCamera();
        const controls = this.app.sceneManager.controls;
        
        // Create an input blocker overlay to swallow user input during the intro
        this.createInputBlocker();
        
        // Disable orbit controls during the intro
        if (controls) controls.enabled = false;
        
        // Create the intro animation timeline
        this.createIntroTimeline(camera, controls);
    }

    /**
     * Create input blocker to prevent user interaction during intro
     */
    createInputBlocker() {
        this.inputBlocker = document.createElement('div');
        this.inputBlocker.style.position = 'fixed';
        this.inputBlocker.style.top = '0';
        this.inputBlocker.style.left = '0';
        this.inputBlocker.style.right = '0';
        this.inputBlocker.style.bottom = '0';
        this.inputBlocker.style.zIndex = '99999';
        this.inputBlocker.style.cursor = 'default';
        this.inputBlocker.style.backgroundColor = 'rgba(0, 0, 0, 0)';
        
        // Wheel/touch/mouse listeners to prevent interactions
        const swallow = (e) => { 
            try { 
                e.preventDefault(); 
            } catch (_) {} 
            e.stopPropagation(); 
        };
        
        this.inputBlocker.addEventListener('wheel', swallow, { passive: false });
        this.inputBlocker.addEventListener('touchmove', swallow, { passive: false });
        this.inputBlocker.addEventListener('mousedown', swallow, true);
        this.inputBlocker.addEventListener('mousemove', swallow, true);
        this.inputBlocker.addEventListener('mouseup', swallow, true);
        
        document.body.appendChild(this.inputBlocker);
    }

    /**
     * Create the intro animation timeline
     * @param {THREE.Camera} camera - Three.js camera
     * @param {OrbitControls} controls - Orbit controls
     */
    createIntroTimeline(camera, controls) {
        // Subtle dolly-in with a small arc, then settle, to lead into the composition
        const startY = camera.position.y;
        const arcDriver = { t: 0 };
        
        const tl = gsap.timeline({
            onComplete: () => {
                this.cleanupInputBlocker();
            }
        });
        
        // Phase A: ease into a slightly closer, offset vantage (x/z only)
        tl.to(camera.position, {
            x: -0.25,
            z: 4.6,
            duration: 1.4,
            ease: 'power2.inOut'
        }, 0);
        
        tl.to(camera, {
            fov: 68,
            duration: 1.4,
            ease: 'power2.inOut',
            onUpdate: () => camera.updateProjectionMatrix()
        }, 0);
        
        tl.to(arcDriver, {
            t: 1,
            duration: 1.4,
            ease: 'sine.inOut',
            onUpdate: () => {
                const peak = 0.08; // arc height (reduced for smoothness)
                const yOffset = peak * 4 * arcDriver.t * (1 - arcDriver.t);
                const prev = camera.userData._introArcOffsetY || 0;
                camera.position.y += (yOffset - prev);
                camera.userData._introArcOffsetY = yOffset;
            },
            onComplete: () => {
                // clear arc offset bookkeeping
                const prev = camera.userData._introArcOffsetY || 0;
                camera.position.y -= prev;
                camera.userData._introArcOffsetY = 0;
            }
        }, 0);
        
        // Phase B: settle back to canonical starting pose
        tl.to(camera.position, {
            x: 0,
            z: 5.0,
            duration: 0.9,
            ease: 'power2.out'
        }, '>-0.05');
        
        tl.to(camera, {
            fov: 75,
            duration: 0.9,
            ease: 'power2.out',
            onUpdate: () => camera.updateProjectionMatrix()
        }, '<');

        // Tiny 0.2s crossfade while re-enabling controls
        tl.add(() => {
            if (controls) controls.enabled = true;
        }, '>-0.2');
        
        tl.fromTo(this.inputBlocker, {
            backgroundColor: 'rgba(0,0,0,0.08)'
        }, {
            backgroundColor: 'rgba(0,0,0,0) ',
            duration: 0.2,
            ease: 'power1.out',
            onComplete: () => {
                this.cleanupInputBlocker();
            }
        }, '>-0.2');
    }

    /**
     * Clean up the input blocker
     */
    cleanupInputBlocker() {
        if (this.inputBlocker) {
            this.inputBlocker.remove();
            this.inputBlocker = null;
        }
    }

    /**
     * Show scroll hint after intro
     */
    showScrollHint() {
        // Create or update scroll hint
        if (!this.scrollHint) {
            this.scrollHint = document.createElement('div');
            this.scrollHint.innerHTML = '↓ Scroll down to explore timeline';
            this.scrollHint.style.position = 'fixed';
            this.scrollHint.style.bottom = '30px';
            this.scrollHint.style.left = '50%';
            this.scrollHint.style.transform = 'translateX(-50%)';
            this.scrollHint.style.color = 'white';
            this.scrollHint.style.fontSize = '16px';
            this.scrollHint.style.fontWeight = 'bold';
            this.scrollHint.style.textAlign = 'center';
            this.scrollHint.style.zIndex = '1000';
            this.scrollHint.style.opacity = '0';
            this.scrollHint.style.transition = 'opacity 0.5s ease';
            this.scrollHint.style.textShadow = '0 2px 4px rgba(0,0,0,0.8)';
            document.body.appendChild(this.scrollHint);
        }
        
        // Show the hint
        setTimeout(() => {
            this.scrollHint.style.opacity = '1';
        }, 1000);
        
        // Hide hint after 5 seconds
        setTimeout(() => {
            this.scrollHint.style.opacity = '0';
        }, 5000);
    }

    /**
     * Hide scroll hint
     */
    hideScrollHint() {
        if (this.scrollHint) {
            this.scrollHint.style.opacity = '0';
        }
    }
}
