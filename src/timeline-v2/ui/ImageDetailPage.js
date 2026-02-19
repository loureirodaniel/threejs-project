/**
 * ImageDetailPage - Full-screen detail view for timeline images
 * Shows hero image, gallery, text content, and comments
 */

import { gsap } from 'gsap';

class ImageDetailPage {
  constructor(state, eventBus) {
    this.state = state;
    this.eventBus = eventBus;
    
    this.container = null;
    this.currentImageData = null;
    this.isOpen = false;
    this.seamlessMode = false;
    this.fullscreenImage = null;
    this.titleElement = null;
    this.descriptionElement = null;
    this.metadataContainer = null;
    this.contentRevealObserver = null;
    
    this.init();
  }
  
  init() {
    this.createContainer();
    
    // Listen for open/close events
    this.eventBus.on('timeline:image:enlarge', this.open.bind(this));
    this.eventBus.on('timeline:image:close', this.close.bind(this));
    
    // console.log('✅ ImageDetailPage initialized');
  }
  
  /**
   * Create main container structure
   */
  createContainer() {
    // Main container - full viewport overlay
    this.container = document.createElement('div');
    this.container.id = 'image-detail-page';
    this.container.className = 'detail-overlay';
    this.container.style.cssText = `
      opacity: 0;
      pointer-events: none;
    `;
    this.ensureOverlayStyles();

    // CRITICAL: Block ALL pointer/touch/mouse events from reaching timeline
    const blockEvent = (e) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
      // console.log('🔒 Event blocked at detail container:', e.type);
    };
    
    // Block all mouse events
    this.container.addEventListener('mousedown', blockEvent, { capture: true });
    this.container.addEventListener('mousemove', blockEvent, { capture: true });
    this.container.addEventListener('mouseup', blockEvent, { capture: true });
    
    // Block all touch events
    this.container.addEventListener('touchstart', blockEvent, { capture: true, passive: false });
    this.container.addEventListener('touchmove', blockEvent, { capture: true, passive: false });
    this.container.addEventListener('touchend', blockEvent, { capture: true, passive: false });
    
    // Block wheel/scroll
    this.container.addEventListener('wheel', blockEvent, { capture: true, passive: false });
    // console.log('✅ All input events blocked at container level');
    
    // Close button (top-left)
    this.closeButton = document.createElement('button');
    this.closeButton.className = 'close-button';
    this.closeButton.setAttribute('aria-label', 'Close detail view');
    this.closeButton.textContent = '✕';

    this.closeButton.addEventListener('click', () => {
      console.log('🔴 ========== CLOSE BUTTON CLICKED ==========');
      this.handleCloseButton();
    });
    
    // Full-screen image (100% viewport)
    this.fullscreenImage = document.createElement('img');
    this.fullscreenImage.className = 'detail-fullscreen-image';
    this.fullscreenImage.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      object-fit: cover;
      object-position: center;
      z-index: 10;
      display: block;
      pointer-events: none;
    `;

    // Create black background overlay (covers WebGL canvas)
    const blackOverlay = document.createElement('div');
    blackOverlay.className = 'black-overlay';
    blackOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: transparent;
      z-index: 0;
      opacity: 0;
      pointer-events: none;
    `;
    this.container.appendChild(blackOverlay);
    this.blackOverlay = blackOverlay;

    // Spacer keeps the first viewport focused on the fullscreen image
    this.detailSpacer = document.createElement('div');
    this.detailSpacer.className = 'detail-spacer';

    this.contentContainer = document.createElement('div');
    this.contentContainer.className = 'detail-content';
    this.contentContainer.style.cssText = `
      opacity: 0;
    `;

    this.contentInner = document.createElement('div');
    this.contentInner.className = 'detail-content-inner';
    this.contentInner.id = 'detail-content';
    this.contentContainer.appendChild(this.contentInner);
    
    this.container.appendChild(this.fullscreenImage);
    this.container.appendChild(this.closeButton);
    this.container.appendChild(this.detailSpacer);
    this.container.appendChild(this.contentContainer);
    document.body.appendChild(this.container);
    
    // console.log('✅ ImageDetailPage container created');
  }

  ensureOverlayStyles() {
    if (document.getElementById('detail-overlay-shared-style')) return;

    const style = document.createElement('style');
    style.id = 'detail-overlay-shared-style';
    style.textContent = `
      /* Container - enables scrolling */
      .detail-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 1000;
        overflow-y: auto;
        overflow-x: hidden;
        scroll-behavior: smooth;
        background: transparent;
        pointer-events: all;
      }

      /* Spacer - Full viewport height where image shows */
      .detail-spacer {
        width: 100%;
        height: 100vh;
        position: relative;
        background: transparent;
        display: block;
      }

      /* Content section - appears BELOW spacer */
      .detail-content {
        width: 100%;
        min-height: 100vh;
        background: transparent;
        padding: 4rem 2rem;
        display: flex;
        justify-content: center;
      }

      /* White card inside content section */
      .detail-content-inner {
        max-width: 900px;
        width: 100%;
        background: transparent;
        backdrop-filter: none;
        border-radius: 0;
        padding: 0;
        box-shadow: none;
      }

      /* Close button */
      .close-button {
        position: fixed;
        top: 2rem;
        right: 2rem;
        z-index: 1002;
        width: 48px;
        height: 48px;
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        border: 2px solid rgba(255, 255, 255, 0.4);
        border-radius: 50%;
        color: white;
        font-size: 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s;
        border: none;
        outline: none;
      }

      .close-button:hover {
        background: rgba(255, 255, 255, 0.3);
        border-color: rgba(255, 255, 255, 0.6);
        transform: scale(1.1) rotate(90deg);
      }

      /* Content styling */
      .detail-header h1 {
        font-size: 3rem;
        font-weight: 700;
        margin: 0 0 1rem 0;
        color: white;
        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
      }

      .event-subtitle {
        font-size: 1rem;
        color: rgba(255, 255, 255, 0.8);
        margin: 0 0 2rem 0;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .detail-body {
        font-size: 1.125rem;
        line-height: 1.8;
        color: white;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }

      .detail-body p {
        margin-bottom: 1.5rem;
      }
    `;
    document.head.appendChild(style);
  }

  animateOverlayIn() {
    gsap.fromTo(this.container, {
      opacity: 0
    }, {
      opacity: 1,
      duration: 0.4,
      ease: 'power2.out'
    });
  }

  setupContentRevealObserver() {
    if (this.contentRevealObserver) {
      this.contentRevealObserver.disconnect();
      this.contentRevealObserver = null;
    }

    if (!this.contentInner) return;

    gsap.set(this.contentInner, { opacity: 0, y: 50 });

    if (typeof IntersectionObserver === 'undefined') {
      gsap.to(this.contentInner, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' });
      return;
    }

    this.contentRevealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        gsap.to(this.contentInner, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power2.out'
        });

        if (this.contentRevealObserver) {
          this.contentRevealObserver.disconnect();
          this.contentRevealObserver = null;
        }
      });
    }, {
      threshold: 0.2,
      root: this.container
    });

    this.contentRevealObserver.observe(this.contentInner);
  }
  
  /**
   * Open detail page
   * @param {Object} data - Contains plane, imageData, and mode flags
   * @param {boolean} data.preload - If true, prepare DOM but keep invisible
   * @param {boolean} data.reveal - If true, instantly reveal the preloaded page
   */
  open(data) {
    // console.log('📖 ImageDetailPage.open() called');
    // console.log('📖 Raw data received:', data);
    
    if (!data) {
      console.error('❌ No data object provided at all');
      return;
    }

    if (this.container) this.container.scrollTop = 0;
    
    const preloadMode = data.preload === true;
    const revealMode = data.reveal === true;
    const resolveImageData = () => {
      let imageData = data.imageData;
      if (!imageData) {
        console.warn('⚠️ No imageData in data object, checking for direct properties...');
        if (data.year || data.id || data.imageUrl) {
          // console.log('✅ Data object appears to be imageData itself, using it directly');
          imageData = data;
        } else {
          console.error('❌ Cannot find imageData anywhere in provided data');
          // console.log('Available keys in data:', Object.keys(data));
          return null;
        }
      }
      return imageData;
    };

    const prepareDetailDom = (imageData) => {
      this.currentPlane = data?.plane;
      this.currentImageData = imageData;
      this.updateContent(imageData);
      this.titleElement = this.container.querySelector('[data-role="detail-title"]');
      this.descriptionElement = this.container.querySelector('[data-role="detail-description"]');
      this.metadataContainer = this.container.querySelector('[data-role="detail-metadata"]');
      this.container.style.display = 'block';
    };

    // Preload mode
    if (preloadMode) {
      // console.log('🔧 PRELOAD MODE: Setting up DOM but keeping invisible');
      
      const imageData = resolveImageData();
      if (!imageData) return;
      prepareDetailDom(imageData);
      this.setupContentRevealObserver();
      
      // Preload: Set up everything but keep container and image invisible
      this.container.classList.add('active');
      this.container.style.opacity = '0';
      this.container.style.pointerEvents = 'none';
      
      // Image starts hidden and slightly scaled down
      this.fullscreenImage.style.opacity = '0';
      this.fullscreenImage.style.transform = 'scale(0.98)';
      
      // Hide content initially
      if (this.contentContainer) {
        this.contentContainer.style.opacity = '0';
      }
      
      // console.log('✅ Detail page preloaded (invisible)');
      return;
    }

    // Reveal mode
    if (revealMode) {
      console.log('🎨 REVEAL MODE: WebGL plane stays visible');
      
      const showImageOnly = data.showImageOnly !== false; // Default true
      const imageData = resolveImageData();
      if (!imageData) return;
      prepareDetailDom(imageData);
      
      this.container.style.pointerEvents = 'auto';
      
      // Fade in overlay
      this.animateOverlayIn();
      
      // Fade in black overlay (behind WebGL)
      gsap.to(this.blackOverlay, {
        opacity: 1,
        duration: 0.8,
        ease: 'power2.out'
      });
      
      // SKIP DOM image entirely - keep WebGL visible
      if (showImageOnly) {
        console.log('✅ Showing DOM image');
        
        // Setup image (but keep it invisible)
        this.fullscreenImage.style.display = 'block';
        this.fullscreenImage.style.position = 'fixed';
        this.fullscreenImage.style.top = '0';
        this.fullscreenImage.style.left = '0';
        this.fullscreenImage.style.width = '100vw';
        this.fullscreenImage.style.height = '100vh';
        this.fullscreenImage.style.objectFit = 'cover';
        this.fullscreenImage.style.zIndex = '60';
        this.fullscreenImage.style.opacity = '0';  // Start invisible
        
        // Wait for WebGL animation (1.2s)
        setTimeout(() => {
          console.log('✅ Fading in DOM image');
          
          // Fade in DOM image
          gsap.to(this.fullscreenImage, {
            opacity: 1,
            duration: 0.3,  // Quick fade
            ease: 'power2.out',
            onComplete: () => {
              console.log('✅ DOM image visible');

              // Call callback to hide WebGL plane
              if (data.onDOMImageReady) {
                data.onDOMImageReady();
              }
            }
          });
        }, 1200);  // ← 1.2 seconds (match animation)
      } else {
        console.log('✅ Keeping WebGL plane visible (no DOM switch)');
        // Hide the DOM image
        this.fullscreenImage.style.display = 'none';
      }
      
      if (this.contentContainer) {
        this.contentContainer.style.opacity = '1';
      }
      this.setupContentRevealObserver();
      this.isOpen = true;
      this.state.setState({
        isImageEnlarged: true,
        enlargedImageId: this.currentImageData?.id || this.currentImageData?.year
      });
      
      return;
    }

    // Normal mode starts here
    // console.log('📖 data.imageData:', data?.imageData);
    // console.log('📖 data.plane:', data?.plane);
    this.currentPlane = data?.plane;
    const seamlessMode = data?.seamless === true;
    this.seamlessMode = seamlessMode;
    if (seamlessMode) {
      // console.log('🎨 Opening in SEAMLESS mode - syncing with 3D animation');
    }

    const imageData = resolveImageData();
    if (!imageData) return;
    // console.log('✅ Using imageData:', imageData);
    
    if (this.isOpen) {
      // console.log('Detail page already open, updating content...');
      this.updateContent(imageData);
      return;
    }
    
    this.currentImageData = imageData;
    this.isOpen = true;
    
    this.updateContent(imageData);
    this.titleElement = this.container.querySelector('[data-role="detail-title"]');
    this.descriptionElement = this.container.querySelector('[data-role="detail-description"]');
    this.metadataContainer = this.container.querySelector('[data-role="detail-metadata"]');
    
    this.container.style.display = 'block';
    this.container.style.pointerEvents = 'auto';
    document.body.style.overflow = 'hidden';
    this.eventBus.emit('timeline:pause');

    this.container.classList.add('active');
    this.animateOverlayIn();
    this.container.style.pointerEvents = 'auto';
    if (this.contentContainer) {
      this.contentContainer.style.opacity = '1';
    }
    this.setupContentRevealObserver();
    
    this.state.setState({
      isImageEnlarged: true,
      enlargedImageId: imageData.id || imageData.year
    });
    
    // console.log('✅ Detail page opened for year:', imageData.year);
  }
  
  /**
   * Build/update page content
   */
  updateContent(imageData) {
    const contentContainer = this.container.querySelector('#detail-content');
    
    // Extract image URL from multiple possible properties
    const imageUrl = imageData.url || 
                     imageData.imageUrl || 
                     imageData.image || 
                     imageData.src;
    // console.log('📸 Image URL:', imageUrl);
    // console.log('📸 Full imageData:', imageData);
    
    if (this.fullscreenImage) {
      // Ensure image loads before continuing
      this.fullscreenImage.onload = () => {
        // console.log('✅ Fullscreen image loaded:', imageUrl);
      };

      this.fullscreenImage.onerror = () => {
        console.error('❌ Failed to load image:', imageUrl);
      };

      this.fullscreenImage.src = imageUrl;

      // Force browser to render the image
      this.fullscreenImage.style.display = 'block';
      this.fullscreenImage.alt = `Year ${imageData.year}`;
    }
    
    // Build HTML content
    contentContainer.innerHTML = `
      <div class="detail-header">
        <h1 data-role="detail-title">${imageData.year}</h1>
        <p class="event-subtitle">Timeline Event</p>
      </div>

      <div class="detail-body">
        <p>
          Event details and description for ${imageData.year} go here...
        </p>
        ${imageData?.description ? `<p data-role="detail-description">${imageData.description}</p>` : ''}
      </div>
    `;

    this.titleElement = contentContainer.querySelector('[data-role="detail-title"]');
    this.descriptionElement = contentContainer.querySelector('[data-role="detail-description"]');
    this.metadataContainer = null;

    if (this.titleElement) {
      this.titleElement.style.cssText = `
        font-size: 48px;
        font-weight: bold;
        margin-bottom: 16px;
        color: white;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      `;
    }

    if (this.descriptionElement) {
      this.descriptionElement.style.cssText = `
        font-size: 18px;
        line-height: 1.6;
        margin-bottom: 24px;
        color: rgba(255,255,255,0.9);
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
      `;
    }

    if (this.metadataContainer) {
      this.metadataContainer.style.cssText = `
        display: flex;
        gap: 24px;
        font-size: 14px;
        color: rgba(255,255,255,0.7);
      `;
    }

    // In seamless mode, keep banner hidden initially
    if (this.seamlessMode && this.fullscreenImage) {
      this.fullscreenImage.style.opacity = '0';
      this.fullscreenImage.style.transform = 'scale(0.95)';
    }
    
    // console.log('✅ Content updated for year:', imageData.year);
  }
  
  /**
   * Build gallery grid (placeholder for now)
   */
  buildGallery(imageData) {
    // For now, show 3 placeholder images
    // In the future, this would come from imageData.gallery array
    const placeholders = [
      'https://picsum.photos/400/300?random=1',
      'https://picsum.photos/400/300?random=2',
      'https://picsum.photos/400/300?random=3'
    ];
    
    return placeholders.map(url => `
      <div style="
        aspect-ratio: 4/3;
        border-radius: 8px;
        overflow: hidden;
        background: #111;
        cursor: pointer;
        transition: transform 0.3s ease;
      "
      onmouseover="this.style.transform='scale(1.05)'"
      onmouseout="this.style.transform='scale(1)'"
      >
        <img 
          src="${url}" 
          alt="Gallery image"
          style="
            width: 100%;
            height: 100%;
            object-fit: cover;
          "
        />
      </div>
    `).join('');
  }

  handleCloseButton() {
    const renderSystem = window.app?.timelineController?.renderSystem;
    const imagePlanes = renderSystem?.imagePlanes || window.app?.imagePlanes;
    const fullscreenPlane = imagePlanes?.planes?.find((p) => p.userData.isFullscreen);

    if (renderSystem?.handleCloseButton && fullscreenPlane) {
      renderSystem.handleCloseButton();
      return;
    }

    if (renderSystem?.closeDetailView && fullscreenPlane) {
      renderSystem.closeDetailView(fullscreenPlane);
      return;
    }

    this.close();
  }
  
  /**
   * Close detail page
   */
  close() {
    // console.log('📖 ImageDetailPage.close() called');
    this.state.setState({ isImageEnlarged: false, enlargedImageId: null });
    
    if (!this.isOpen) {
      return;
    }
    
    this.isOpen = false;
    if (this.contentRevealObserver) {
      this.contentRevealObserver.disconnect();
      this.contentRevealObserver = null;
    }
    
    // Fade out content
    gsap.to(this.contentContainer, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in'
    });
    
    // Fade out black overlay
    if (this.blackOverlay) {
      gsap.to(this.blackOverlay, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in'
      });
    }
    
    // Fade out container
    gsap.to(this.container, {
      opacity: 0,
      duration: 0.4,
      ease: 'power2.in',
      onComplete: () => {
        this.container.classList.remove('active');
        this.container.style.pointerEvents = 'none';
        
        // Re-enable canvas
        if (window.app) {
          window.app.enableCanvasInteraction();
        }
        
        const renderSystem = window.app?.timelineController?.renderSystem;

        // Restore hidden planes
        if (renderSystem && renderSystem.hiddenPlanes) {
          renderSystem.hiddenPlanes.forEach(plane => {
            renderSystem.scene.add(plane);
            plane.visible = true;
          });
          renderSystem.hiddenPlanes = [];
        }
        
        // Animate fullscreen plane back
        if (renderSystem && this.currentPlane) {
          const plane = this.currentPlane;
          const originalScale = plane.userData.originalScale;
          const originalPosition = plane.userData.originalPosition;
          
          if (originalScale && originalPosition && plane.userData.isFullscreen) {
            renderSystem.rippleAnimation.animateFromFullscreen(
              plane,
              originalScale,
              originalPosition,
              () => {
                // Resume timeline
                if (window.app?.timelineController) {
                  // Unfreeze camera
                  if (window.app.timelineController.cameraSystem) {
                    window.app.timelineController.cameraSystem.unfreezeCamera();
                  }
                  
                  window.app.timelineController.resumeTimeline();
                }
              }
            );
          }
        }
      }
    });
  }
  
  /**
   * Dispose
   */
  dispose() {
    if (this.isOpen) {
      this.close();
    }
    
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    if (this.contentRevealObserver) {
      this.contentRevealObserver.disconnect();
      this.contentRevealObserver = null;
    }
    
    document.body.style.overflow = '';
    
    // console.log('🧹 ImageDetailPage disposed');
  }
}

export { ImageDetailPage };
