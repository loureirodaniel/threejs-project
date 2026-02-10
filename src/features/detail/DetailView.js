/**
 * DetailView - Full-screen scrollable overlay for enlarged timeline images
 * Provides a "new scene" experience with hero image and content sections below
 */
export class DetailView {
    constructor(controller) {
        this.controller = controller;
        this.overlay = null;
        this.heroSection = null;
        this.contentContainer = null;
        this.closeButton = null;
        this.parallaxFactor = 0.2; // Parallax speed multiplier
        this.scrollHandler = null;
        this.isOpen = false;
    }

    /**
     * Open detail view for a plane
     * @param {THREE.Mesh} plane - The enlarged plane
     */
    open(plane) {
        if (this.isOpen) {
            this.close();
        }

        console.log('Opening detail view for plane:', plane);

        // Get detail payload from plane
        const payload = this.getDetailPayload(plane);

        // Create overlay
        this.createOverlay(payload);

        // Set scroll to top
        this.overlay.scrollTop = 0;

        // Setup parallax
        this.setupParallax();

        this.isOpen = true;
    }

    /**
     * Get detail payload from plane userData or generate default
     * @param {THREE.Mesh} plane - The plane
     * @returns {Object} Detail payload
     */
    getDetailPayload(plane) {
        // Check for explicit detail data
        if (plane.userData.detail) {
            return plane.userData.detail;
        }

        // Check for title/description in userData
        if (plane.userData.title || plane.userData.description) {
            return {
                title: plane.userData.title || (plane.userData.year ? `Year ${plane.userData.year}` : 'Timeline'),
                description: plane.userData.description || '',
                sections: []
            };
        }

        // Default payload
        return {
            title: plane.userData.year ? `Year ${plane.userData.year}` : 'Timeline',
            description: '',
            sections: []
        };
    }

    /**
     * Create the overlay DOM structure
     * @param {Object} payload - Detail payload
     */
    createOverlay(payload) {
        // Remove existing overlay if any
        if (this.overlay) {
            this.overlay.remove();
        }

        // Create main overlay container
        this.overlay = document.createElement('div');
        this.overlay.id = 'detail-view-overlay';
        this.overlay.style.position = 'fixed';
        this.overlay.style.top = '0';
        this.overlay.style.left = '0';
        this.overlay.style.width = '100%';
        this.overlay.style.height = '100%';
        this.overlay.style.overflowY = 'auto';
        this.overlay.style.overflowX = 'hidden';
        this.overlay.style.zIndex = '10000'; // Above canvas and other overlays
        this.overlay.style.backgroundColor = 'transparent';
        this.overlay.style.opacity = '0';
        this.overlay.style.transition = 'opacity 0.3s ease';
        this.overlay.style.webkitOverflowScrolling = 'touch'; // Smooth scrolling on iOS
        this.overlay.tabIndex = -1; // Make focusable for scroll events

        // Create hero section (transparent, shows Three.js canvas underneath)
        this.heroSection = document.createElement('div');
        this.heroSection.className = 'detail-hero';
        this.heroSection.style.position = 'relative';
        this.heroSection.style.width = '100%';
        this.heroSection.style.minHeight = '100vh';
        this.heroSection.style.backgroundColor = 'transparent';
        this.heroSection.style.display = 'flex';
        this.heroSection.style.flexDirection = 'column';
        this.heroSection.style.justifyContent = 'flex-end';
        this.heroSection.style.padding = '0';
        this.heroSection.style.pointerEvents = 'none'; // Allow clicks to pass through to close button

        // Hero content wrapper (for parallax)
        const heroWrapper = document.createElement('div');
        heroWrapper.className = 'detail-hero-wrapper';
        heroWrapper.style.position = 'relative';
        heroWrapper.style.width = '100%';
        heroWrapper.style.height = '100%';
        heroWrapper.style.display = 'flex';
        heroWrapper.style.flexDirection = 'column';
        heroWrapper.style.justifyContent = 'flex-end';
        heroWrapper.style.padding = '40px';
        heroWrapper.style.pointerEvents = 'none';

        // Hero title (overlay on image)
        if (payload.title) {
            const heroTitle = document.createElement('h1');
            heroTitle.className = 'detail-hero-title';
            heroTitle.textContent = payload.title;
            heroTitle.style.color = 'white';
            heroTitle.style.fontSize = 'clamp(2rem, 5vw, 4rem)';
            heroTitle.style.fontWeight = 'bold';
            heroTitle.style.margin = '0 0 20px 0';
            heroTitle.style.textShadow = '0 2px 10px rgba(0,0,0,0.8)';
            heroTitle.style.pointerEvents = 'none';
            heroWrapper.appendChild(heroTitle);
        }

        // Hero description (overlay on image)
        if (payload.description) {
            const heroDescription = document.createElement('p');
            heroDescription.className = 'detail-hero-description';
            heroDescription.textContent = payload.description;
            heroDescription.style.color = 'rgba(255,255,255,0.95)';
            heroDescription.style.fontSize = 'clamp(1rem, 2vw, 1.5rem)';
            heroDescription.style.margin = '0';
            heroDescription.style.maxWidth = '800px';
            heroDescription.style.textShadow = '0 1px 5px rgba(0,0,0,0.8)';
            heroDescription.style.pointerEvents = 'none';
            heroWrapper.appendChild(heroDescription);
        }

        this.heroSection.appendChild(heroWrapper);
        this.overlay.appendChild(this.heroSection);

        // Create content container
        this.contentContainer = document.createElement('div');
        this.contentContainer.className = 'detail-content';
        this.contentContainer.style.position = 'relative';
        this.contentContainer.style.width = '100%';
        this.contentContainer.style.backgroundColor = '#000';
        this.contentContainer.style.padding = '60px 40px';
        this.contentContainer.style.pointerEvents = 'auto';

        // Render content sections
        if (payload.sections && payload.sections.length > 0) {
            payload.sections.forEach((section, index) => {
                const sectionElement = this.createSection(section, index);
                if (sectionElement) {
                    this.contentContainer.appendChild(sectionElement);
                }
            });
        } else {
            // Add placeholder content if no sections
            const placeholder = document.createElement('div');
            placeholder.style.color = 'rgba(255,255,255,0.6)';
            placeholder.style.fontSize = '1.2rem';
            placeholder.style.textAlign = 'center';
            placeholder.style.padding = '40px';
            placeholder.textContent = 'Scroll to explore more content';
            this.contentContainer.appendChild(placeholder);
        }

        this.overlay.appendChild(this.contentContainer);

        // Create close button
        this.createCloseButton();

        // Append to body
        document.body.appendChild(this.overlay);

        // Fade in
        requestAnimationFrame(() => {
            this.overlay.style.opacity = '1';
        });
    }

    /**
     * Create a content section element
     * @param {Object} section - Section data
     * @param {number} index - Section index
     * @returns {HTMLElement|null} Section element
     */
    createSection(section, index) {
        if (!section || !section.type) return null;

        const sectionElement = document.createElement('div');
        sectionElement.className = `detail-section detail-section-${section.type}`;
        sectionElement.style.marginBottom = '60px';
        sectionElement.style.opacity = '0';
        sectionElement.style.transform = 'translateY(20px)';
        sectionElement.style.transition = 'opacity 0.6s ease, transform 0.6s ease';

        if (section.type === 'text') {
            const textElement = document.createElement('div');
            textElement.className = 'detail-text';
            textElement.innerHTML = section.content || '';
            textElement.style.color = 'rgba(255,255,255,0.9)';
            textElement.style.fontSize = '1.2rem';
            textElement.style.lineHeight = '1.8';
            textElement.style.maxWidth = '900px';
            textElement.style.margin = '0 auto';
            sectionElement.appendChild(textElement);
        } else if (section.type === 'image') {
            const imageContainer = document.createElement('div');
            imageContainer.className = 'detail-image-container';
            imageContainer.style.marginBottom = '20px';
            imageContainer.style.textAlign = 'center';

            const img = document.createElement('img');
            img.src = section.src || '';
            img.alt = section.alt || '';
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.borderRadius = '8px';
            img.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
            img.onerror = () => {
                img.style.display = 'none';
            };
            imageContainer.appendChild(img);

            if (section.caption) {
                const caption = document.createElement('p');
                caption.className = 'detail-image-caption';
                caption.textContent = section.caption;
                caption.style.color = 'rgba(255,255,255,0.7)';
                caption.style.fontSize = '0.9rem';
                caption.style.marginTop = '10px';
                caption.style.fontStyle = 'italic';
                imageContainer.appendChild(caption);
            }

            sectionElement.appendChild(imageContainer);
        }

        // Animate in
        setTimeout(() => {
            sectionElement.style.opacity = '1';
            sectionElement.style.transform = 'translateY(0)';
        }, index * 100);

        return sectionElement;
    }

    /**
     * Create close button
     */
    createCloseButton() {
        if (this.closeButton) {
            this.closeButton.remove();
        }

        this.closeButton = document.createElement('div');
        this.closeButton.innerHTML = '✕';
        this.closeButton.className = 'detail-close-button';
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
        this.closeButton.style.zIndex = '10001';
        this.closeButton.style.opacity = '0';
        this.closeButton.style.transition = 'opacity 0.3s ease, transform 0.2s ease';
        this.closeButton.style.pointerEvents = 'auto';

        // Hover effect
        this.closeButton.addEventListener('mouseenter', () => {
            this.closeButton.style.transform = 'scale(1.1)';
            this.closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        });
        this.closeButton.addEventListener('mouseleave', () => {
            this.closeButton.style.transform = 'scale(1)';
            this.closeButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        });

        // Click handler
        this.closeButton.addEventListener('click', () => {
            if (this.controller && this.controller.closeEnlargedImage) {
                this.controller.closeEnlargedImage();
            }
        });

        document.body.appendChild(this.closeButton);

        // Fade in
        setTimeout(() => {
            this.closeButton.style.opacity = '1';
        }, 100);
    }

    /**
     * Setup parallax effect on scroll
     */
    setupParallax() {
        if (!this.overlay || !this.heroSection) return;

        // Remove existing handler
        if (this.scrollHandler) {
            this.overlay.removeEventListener('scroll', this.scrollHandler);
        }

        // Create new handler
        this.scrollHandler = () => {
            const scrollTop = this.overlay.scrollTop;
            const heroWrapper = this.heroSection.querySelector('.detail-hero-wrapper');
            
            if (heroWrapper) {
                // Apply parallax transform
                const translateY = scrollTop * this.parallaxFactor;
                heroWrapper.style.transform = `translateY(${translateY}px)`;
                
                // Optional: Fade out hero content as we scroll
                const fadeStart = 0;
                const fadeEnd = window.innerHeight * 0.5;
                const fadeProgress = Math.min(1, Math.max(0, (scrollTop - fadeStart) / (fadeEnd - fadeStart)));
                heroWrapper.style.opacity = 1 - fadeProgress * 0.5;
            }
        };

        this.overlay.addEventListener('scroll', this.scrollHandler, { passive: true });
    }

    /**
     * Close the detail view
     */
    close() {
        if (!this.isOpen) return;

        console.log('Closing detail view');

        // Set ignore scroll flag immediately to prevent any scroll that's happening from moving timeline
        if (this.controller && this.controller.lastEnlargedCloseTime !== undefined) {
            this.controller.ignoreScrollUntil = Date.now() + 500;
        }

        // Allow scroll and clicks to pass through immediately so timeline scroll works
        if (this.overlay) {
            this.overlay.style.pointerEvents = 'none';
        }

        // Remove scroll handler
        if (this.scrollHandler && this.overlay) {
            this.overlay.removeEventListener('scroll', this.scrollHandler);
            this.scrollHandler = null;
        }

        // Fade out and remove overlay
        if (this.overlay) {
            this.overlay.style.opacity = '0';
            setTimeout(() => {
                if (this.overlay && this.overlay.parentNode) {
                    this.overlay.remove();
                }
                this.overlay = null;
            }, 300);
        }

        // Remove close button
        if (this.closeButton) {
            this.closeButton.style.opacity = '0';
            setTimeout(() => {
                if (this.closeButton && this.closeButton.parentNode) {
                    this.closeButton.remove();
                }
                this.closeButton = null;
            }, 300);
        }

        // Clear references
        this.heroSection = null;
        this.contentContainer = null;
        this.isOpen = false;
    }

    /**
     * Check if detail view is open
     * @returns {boolean}
     */
    isDetailViewOpen() {
        return this.isOpen;
    }

    /**
     * Destroy the detail view
     */
    destroy() {
        this.close();
        this.controller = null;
    }
}
