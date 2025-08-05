import { gsap } from 'gsap';

export class TitleOverlay {
    constructor() {
        this.titleDiv = null;
        this.subtitle = null;
        
        this.init();
    }
    
    init() {
        // Add text using HTML overlay for better quality
        this.titleDiv = document.createElement('div');
        this.titleDiv.style.position = 'absolute';
        this.titleDiv.style.top = '50%';
        this.titleDiv.style.left = '50%';
        this.titleDiv.style.transform = 'translate(-50%, -50%)';
        this.titleDiv.style.textAlign = 'center';
        this.titleDiv.style.color = 'white';
        this.titleDiv.style.fontFamily = 'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        this.titleDiv.style.fontSize = '48px';
        this.titleDiv.style.fontWeight = 'bold';
        this.titleDiv.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
        this.titleDiv.style.zIndex = '1000';
        this.titleDiv.style.opacity = '0';
        this.titleDiv.style.scale = '0.8';
        this.titleDiv.innerHTML = 'THREE.JS PROJECT<br><span id="subtitle" style="font-size: 24px; font-weight: normal; color: #cccccc;">Welcome to the 3D World</span>';
        document.body.appendChild(this.titleDiv);
        
        this.subtitle = document.getElementById('subtitle');
        
        // Animate text appearance with GSAP
        gsap.to(this.titleDiv, {
            opacity: 1,
            scale: 1,
            duration: 1.2,
            ease: "back.out(1.7)",
            delay: 0.3
        });
    }
    
    setTitleFontSize(size) {
        this.titleDiv.style.fontSize = size + 'px';
        this.centerText();
    }
    
    setSubtitleFontSize(size) {
        this.subtitle.style.fontSize = size + 'px';
        this.centerText();
    }
    
    centerText() {
        this.titleDiv.style.top = '50%';
        this.titleDiv.style.left = '50%';
        this.titleDiv.style.transform = 'translate(-50%, -50%)';
    }
    
    getTitleDiv() {
        return this.titleDiv;
    }
    
    getSubtitle() {
        return this.subtitle;
    }
    
    setTitle(text) {
        // Extract the subtitle part and keep it
        const subtitleText = this.subtitle ? this.subtitle.outerHTML : '';
        this.titleDiv.innerHTML = text + '<br>' + subtitleText;
        
        // Re-get the subtitle reference
        this.subtitle = document.getElementById('subtitle');
    }
    
    setSubtitle(text) {
        if (this.subtitle) {
            this.subtitle.textContent = text;
        }
    }
    
    animateToTopLeft() {
        // Animate title to top-left corner with smaller size
        gsap.to(this.titleDiv, {
            top: '20px',
            left: '20px',
            transform: 'translate(0, 0)',
            fontSize: '24px',
            duration: 1.0,
            ease: "power2.inOut",
            delay: 0.2
        });
        
        // Animate subtitle to smaller size with stagger effect
        if (this.subtitle) {
            gsap.to(this.subtitle, {
                fontSize: '14px',
                duration: 1.0,
                ease: "power2.inOut",
                delay: 0.4 // 0.2s stagger after title starts
            });
        }
    }
    
    animateToCenter() {
        // Animate title back to center with original size
        gsap.to(this.titleDiv, {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '48px',
            duration: 1.0,
            ease: "power2.inOut"
        });
        
        // Animate subtitle back to original size
        if (this.subtitle) {
            gsap.to(this.subtitle, {
                fontSize: '24px',
                duration: 1.0,
                ease: "power2.inOut"
            });
        }
    }
} 