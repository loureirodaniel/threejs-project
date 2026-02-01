/**
 * AppIntroSequence - Handles the application intro (no camera movement)
 */
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
     * Create the intro timeline (no camera movement – instant ready)
     */
    createIntroTimeline(camera, controls) {
        if (controls) controls.enabled = true;
        this.cleanupInputBlocker();
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
