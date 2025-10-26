import { gsap } from 'gsap';

export class TitleOverlay {
    constructor() {
        this.titleDiv = null;
        this.subtitle = null;
        this.isDistortionActive = false;
        this.mousePosition = { x: 0.5, y: 0.5 };
        this.mouseVelocity = { x: 0, y: 0 };
        this.lastMousePosition = { x: 0.5, y: 0.5 };
        this.time = 0;
        this.animationId = null;
        this.scrambleAnimationActive = false;
        
        this.init();
    }
    
    init() {
        console.log('TitleOverlay: Initializing title overlay');
        
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
        
        console.log('TitleOverlay: Title div created and added to DOM');
        
        // Setup mouse tracking for distortion effect
        this.setupMouseTracking();
        
        // Start scramble animation after a delay to ensure DOM is ready
        // Use a longer delay to allow for intro sequence setup
        setTimeout(() => {
            console.log('TitleOverlay: Starting scramble animation after delay');
            this.startScrambleAnimation();
        }, 500);
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
        // Stop scramble animation if running
        if (this.scrambleAnimationActive) {
            this.scrambleAnimationActive = false;
        }
        
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
    
    setupMouseTracking() {
        document.addEventListener('mousemove', (event) => {
            this.mousePosition.x = event.clientX / window.innerWidth;
            this.mousePosition.y = event.clientY / window.innerHeight;
            
            this.mouseVelocity.x = this.mousePosition.x - this.lastMousePosition.x;
            this.mouseVelocity.y = this.mousePosition.y - this.lastMousePosition.y;
            
            this.lastMousePosition.x = this.mousePosition.x;
            this.lastMousePosition.y = this.mousePosition.y;
        });
    }
    
    activateDistortion() {
        if (this.isDistortionActive) return;
        
        this.isDistortionActive = true;
        this.time = 0;
        
        // Check if SVG filters are supported
        const svgSupported = this.checkSVGSupport();
        
        if (svgSupported) {
            // Add CSS filter for distortion
            this.titleDiv.style.filter = 'url(#liquid-distortion)';
            if (this.subtitle) {
                this.subtitle.style.filter = 'url(#liquid-distortion)';
            }
            
            // Create SVG filter for liquid distortion
            this.createSVGFilter();
        } else {
            // Fallback to CSS transforms
            this.titleDiv.style.transition = 'transform 0.1s ease-out';
            if (this.subtitle) {
                this.subtitle.style.transition = 'transform 0.1s ease-out';
            }
        }
        
        // Start animation loop
        this.animateDistortion();
        
        console.log('TitleOverlay: Distortion activated (SVG supported:', svgSupported, ')');
    }
    
    deactivateDistortion() {
        if (!this.isDistortionActive) return;
        
        this.isDistortionActive = false;
        
        // Remove CSS filter
        this.titleDiv.style.filter = 'none';
        if (this.subtitle) {
            this.subtitle.style.filter = 'none';
        }
        
        // Reset CSS transforms
        this.titleDiv.style.transform = 'translate(-50%, -50%)';
        if (this.subtitle) {
            this.subtitle.style.transform = 'none';
        }
        
        // Stop animation loop
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Remove SVG filter
        this.removeSVGFilter();
        
        console.log('TitleOverlay: Distortion deactivated');
    }
    
    createSVGFilter() {
        // Remove existing filter if any
        this.removeSVGFilter();
        
        // Create SVG filter element
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.position = 'absolute';
        svg.style.width = '0';
        svg.style.height = '0';
        svg.style.overflow = 'hidden';
        
        const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        filter.setAttribute('id', 'liquid-distortion');
        filter.setAttribute('x', '-50%');
        filter.setAttribute('y', '-50%');
        filter.setAttribute('width', '200%');
        filter.setAttribute('height', '200%');
        
        // Create more sophisticated liquid distortion
        const feTurbulence = document.createElementNS('http://www.w3.org/2000/svg', 'feTurbulence');
        feTurbulence.setAttribute('type', 'fractalNoise');
        feTurbulence.setAttribute('baseFrequency', '0.02 0.02');
        feTurbulence.setAttribute('numOctaves', '4');
        feTurbulence.setAttribute('seed', '1');
        feTurbulence.setAttribute('result', 'turbulence');
        
        // Create a second turbulence for more complex effect
        const feTurbulence2 = document.createElementNS('http://www.w3.org/2000/svg', 'feTurbulence');
        feTurbulence2.setAttribute('type', 'fractalNoise');
        feTurbulence2.setAttribute('baseFrequency', '0.05 0.05');
        feTurbulence2.setAttribute('numOctaves', '2');
        feTurbulence2.setAttribute('seed', '2');
        feTurbulence2.setAttribute('result', 'turbulence2');
        
        // Blend the two turbulence patterns
        const feBlend = document.createElementNS('http://www.w3.org/2000/svg', 'feBlend');
        feBlend.setAttribute('mode', 'multiply');
        feBlend.setAttribute('in', 'turbulence');
        feBlend.setAttribute('in2', 'turbulence2');
        feBlend.setAttribute('result', 'blended');
        
        // Apply displacement map
        const feDisplacementMap = document.createElementNS('http://www.w3.org/2000/svg', 'feDisplacementMap');
        feDisplacementMap.setAttribute('in', 'SourceGraphic');
        feDisplacementMap.setAttribute('in2', 'blended');
        feDisplacementMap.setAttribute('scale', '8');
        feDisplacementMap.setAttribute('xChannelSelector', 'R');
        feDisplacementMap.setAttribute('yChannelSelector', 'G');
        feDisplacementMap.setAttribute('result', 'displaced');
        
        // Add subtle color shift
        const feColorMatrix = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix');
        feColorMatrix.setAttribute('type', 'matrix');
        feColorMatrix.setAttribute('values', '1 0 0 0 0.1 0 1 0 0 0.2 0 0 1 0 0.3 0 0 0 1 0');
        feColorMatrix.setAttribute('in', 'displaced');
        
        filter.appendChild(feTurbulence);
        filter.appendChild(feTurbulence2);
        filter.appendChild(feBlend);
        filter.appendChild(feDisplacementMap);
        filter.appendChild(feColorMatrix);
        svg.appendChild(filter);
        
        document.body.appendChild(svg);
        this.svgFilter = svg;
    }
    
    removeSVGFilter() {
        if (this.svgFilter) {
            document.body.removeChild(this.svgFilter);
            this.svgFilter = null;
        }
    }
    
    animateDistortion() {
        if (!this.isDistortionActive) return;
        
        this.time += 0.016;
        
        // Update SVG filter parameters for animation
        if (this.svgFilter) {
            const feTurbulences = this.svgFilter.querySelectorAll('feTurbulence');
            
            // Update first turbulence
            if (feTurbulences[0]) {
                const frequency1 = 0.02 + Math.sin(this.time * 0.3) * 0.01;
                feTurbulences[0].setAttribute('baseFrequency', `${frequency1} ${frequency1}`);
                feTurbulences[0].setAttribute('seed', Math.floor(this.time * 5));
            }
            
            // Update second turbulence
            if (feTurbulences[1]) {
                const frequency2 = 0.05 + Math.sin(this.time * 0.7) * 0.02;
                feTurbulences[1].setAttribute('baseFrequency', `${frequency2} ${frequency2}`);
                feTurbulences[1].setAttribute('seed', Math.floor(this.time * 3) + 100);
            }
            
            const feDisplacementMap = this.svgFilter.querySelector('feDisplacementMap');
            if (feDisplacementMap) {
                // Calculate distance from text center to mouse
                const textRect = this.titleDiv.getBoundingClientRect();
                const textCenterX = textRect.left + textRect.width / 2;
                const textCenterY = textRect.top + textRect.height / 2;
                const mouseX = this.mousePosition.x * window.innerWidth;
                const mouseY = this.mousePosition.y * window.innerHeight;
                
                const distance = Math.sqrt((mouseX - textCenterX) ** 2 + (mouseY - textCenterY) ** 2);
                const maxDistance = Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2);
                const distanceFactor = Math.max(0, 1 - distance / maxDistance);
                
                // Animate displacement scale based on mouse velocity and distance
                const velocityMagnitude = Math.sqrt(this.mouseVelocity.x ** 2 + this.mouseVelocity.y ** 2);
                const baseScale = 8;
                const velocityScale = velocityMagnitude * 100;
                const distanceScale = distanceFactor * 20;
                const timeScale = Math.sin(this.time * 2) * 3;
                
                const totalScale = baseScale + velocityScale + distanceScale + timeScale;
                feDisplacementMap.setAttribute('scale', Math.max(1, totalScale).toString());
            }
            
            // Update color matrix for subtle color shifts
            const feColorMatrix = this.svgFilter.querySelector('feColorMatrix');
            if (feColorMatrix) {
                const velocityMagnitude = Math.sqrt(this.mouseVelocity.x ** 2 + this.mouseVelocity.y ** 2);
                const colorShift = velocityMagnitude * 0.3;
                feColorMatrix.setAttribute('values', 
                    `1 0 0 0 ${0.1 + colorShift} 0 1 0 0 ${0.2 + colorShift} 0 0 1 0 ${0.3 + colorShift} 0 0 0 1 0`
                );
            }
        } else {
            // Use CSS transform fallback
            this.applyCSSDistortion();
        }
        
        // Decay mouse velocity
        this.mouseVelocity.x *= 0.95;
        this.mouseVelocity.y *= 0.95;
        
        this.animationId = requestAnimationFrame(() => this.animateDistortion());
    }
    
    isDistortionActive() {
        return this.isDistortionActive;
    }
    
    /**
     * Start scramble text animation
     * Scrambles the title text and animates it to reveal the actual text
     */
    startScrambleAnimation() {
        const targetText = 'THREE.JS PROJECT';
        const scrambleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ.!@#$%^&*()_+-=[]{}|;:,.<>?';
        
        this.scrambleAnimationActive = true;
        let iterations = 0;
        const maxIterations = 30; // Increased iterations for longer animation
        const scrambleSpeed = 80; // Slower speed to make it more visible
        
        console.log('TitleOverlay: Starting scramble animation');
        
        try {
            // Make title visible immediately with opacity and full scale
            // Use direct style manipulation for immediate effect
            this.titleDiv.style.opacity = '1';
            this.titleDiv.style.scale = '1';
            this.titleDiv.style.visibility = 'visible';
            this.titleDiv.style.display = 'block';
            
            // Hide subtitle during scramble
            if (this.subtitle) {
                this.subtitle.style.opacity = '0';
                this.subtitle.style.visibility = 'hidden';
            }
            
            console.log('TitleOverlay: Title made visible, starting scramble iterations');
        } catch (error) {
            console.error('TitleOverlay: Error setting up scramble:', error);
            this.scrambleAnimationActive = false;
            return;
        }
        
        const animate = () => {
            if (!this.scrambleAnimationActive) return;
            
            if (iterations < maxIterations) {
                // Scramble the text with more variety
                let scrambledText = '';
                for (let i = 0; i < targetText.length; i++) {
                    if (targetText[i] === ' ') {
                        scrambledText += ' ';
                    } else {
                        scrambledText += scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
                    }
                }
                
                // Update only the main title (before the <br>)
                const parts = this.titleDiv.innerHTML.split('<br>');
                parts[0] = scrambledText;
                this.titleDiv.innerHTML = parts.join('<br>');
                
                iterations++;
                setTimeout(animate, scrambleSpeed);
            } else {
                // Reveal actual text
                const parts = this.titleDiv.innerHTML.split('<br>');
                parts[0] = targetText;
                this.titleDiv.innerHTML = parts.join('<br>');
                
                // Show subtitle with fade in
                if (this.subtitle) {
                    this.subtitle.style.visibility = 'visible';
                    gsap.to(this.subtitle, {
                        opacity: 1,
                        duration: 0.6
                    });
                }
                
                console.log('TitleOverlay: Scramble animation complete, revealing text');
                
                // Animate scale down then up with bounce effect
                gsap.to(this.titleDiv, {
                    scale: 1.1,
                    duration: 0.4,
                    ease: "power2.out",
                    onComplete: () => {
                        gsap.to(this.titleDiv, {
                            scale: 1,
                            duration: 0.8,
                            ease: "back.out(1.7)"
                        });
                    }
                });
                
                this.scrambleAnimationActive = false;
            }
        };
        
        // Start animation after ensuring element is rendered
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                animate();
            });
        });
    }
    
    checkSVGSupport() {
        // Check if SVG filters are supported
        try {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
            return !!filter;
        } catch (e) {
            return false;
        }
    }
    
    applyCSSDistortion() {
        if (!this.isDistortionActive) return;
        
        // Calculate distortion based on mouse position and velocity
        const velocityMagnitude = Math.sqrt(this.mouseVelocity.x ** 2 + this.mouseVelocity.y ** 2);
        const maxVelocity = 0.1;
        const normalizedVelocity = Math.min(velocityMagnitude / maxVelocity, 1);
        
        // Create subtle transform distortion
        const translateX = this.mouseVelocity.x * 20 * normalizedVelocity;
        const translateY = this.mouseVelocity.y * 20 * normalizedVelocity;
        const rotateZ = this.mouseVelocity.x * 2 * normalizedVelocity;
        const scale = 1 + normalizedVelocity * 0.02;
        
        // Apply transforms
        const transform = `translate(${translateX}px, ${translateY}px) rotate(${rotateZ}deg) scale(${scale})`;
        
        this.titleDiv.style.transform = `translate(-50%, -50%) ${transform}`;
        if (this.subtitle) {
            this.subtitle.style.transform = transform;
        }
    }
} 