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
    this.parallaxItems = [];
    this.parallaxScrollHandler = null;
    
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

      .detail-lead {
        font-size: 1.18rem;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.96);
      }

      .detail-metadata {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin: 1rem 0 2rem;
      }

      .detail-chip {
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: rgba(255, 255, 255, 0.88);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 999px;
        padding: 0.35rem 0.7rem;
        background: rgba(0, 0, 0, 0.15);
      }

      .detail-gallery {
        margin-top: 2.5rem;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 1rem;
      }

      .detail-gallery-item {
        position: relative;
        overflow: hidden;
        border-radius: 14px;
        background: rgba(10, 10, 10, 0.55);
        min-height: 240px;
        border: 1px solid rgba(255, 255, 255, 0.18);
      }

      .detail-gallery-media {
        position: absolute;
        inset: -8%;
        width: 116%;
        height: 116%;
        object-fit: cover;
        transform: translate3d(0, 0, 0) scale(1.02);
        will-change: transform;
      }

      .detail-gallery-caption {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 2;
        background: linear-gradient(to top, rgba(0, 0, 0, 0.82), rgba(0, 0, 0, 0));
        padding: 1rem 0.9rem 0.7rem;
        color: rgba(255, 255, 255, 0.95);
        font-size: 0.88rem;
        line-height: 1.35;
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
    
    const relatedImages = this.getRelatedImages(imageData);
    const longDescription = this.buildNarrativeParagraphs(imageData);
    const chips = this.buildMetadataChips(imageData);

    // Build HTML content
    contentContainer.innerHTML = `
      <div class="detail-header">
        <h1 data-role="detail-title">${imageData.year || 'Timeline Event'}</h1>
        <p class="event-subtitle">${imageData.title || 'Timeline Event'}</p>
      </div>

      <div class="detail-body">
        <p class="detail-lead" data-role="detail-description">${imageData?.description || 'A defining moment in the timeline.'}</p>
        ${chips}
        ${longDescription.map((paragraph) => `<p>${paragraph}</p>`).join('')}
      </div>

      <div class="detail-gallery">
        ${relatedImages.map((item, index) => `
          <article class="detail-gallery-item" data-parallax-speed="${(0.08 + (index % 3) * 0.04).toFixed(2)}">
            <img
              class="detail-gallery-media"
              src="${item.url}"
              alt="${item.title || `Timeline image ${index + 1}`}"
              loading="lazy"
            />
            <div class="detail-gallery-caption">
              <strong>${item.year || imageData.year || ''}</strong>
              ${item.title ? ` - ${item.title}` : ''}
            </div>
          </article>
        `).join('')}
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

    this.setupParallaxScroll();
    this.updateParallaxScroll();
    
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

  setupParallaxScroll() {
    this.teardownParallaxScroll();
    this.parallaxItems = Array.from(this.container.querySelectorAll('.detail-gallery-item'));
    this.parallaxScrollHandler = this.updateParallaxScroll.bind(this);
    this.container.addEventListener('scroll', this.parallaxScrollHandler, { passive: true });
  }

  updateParallaxScroll() {
    if (!this.parallaxItems.length) return;
    const viewportHeight = this.container.clientHeight || window.innerHeight || 1;
    const centerY = viewportHeight * 0.5;

    this.parallaxItems.forEach((item) => {
      const media = item.querySelector('.detail-gallery-media');
      if (!media) return;

      const speed = Number(item.dataset.parallaxSpeed) || 0.1;
      const rect = item.getBoundingClientRect();
      const itemCenter = rect.top + (rect.height * 0.5);
      const distance = itemCenter - centerY;
      const offsetY = Math.max(-22, Math.min(22, -distance * speed * 0.12));
      media.style.transform = `translate3d(0, ${offsetY}px, 0) scale(1.04)`;
    });
  }

  teardownParallaxScroll() {
    if (this.parallaxScrollHandler && this.container) {
      this.container.removeEventListener('scroll', this.parallaxScrollHandler);
    }
    this.parallaxScrollHandler = null;
    this.parallaxItems = [];
  }

  buildMetadataChips(imageData) {
    const tags = Array.isArray(imageData?.metadata?.tags) ? imageData.metadata.tags : [];
    const chips = [];

    if (imageData?.metadata?.location) chips.push(imageData.metadata.location);
    if (imageData?.metadata?.event) chips.push(imageData.metadata.event);
    chips.push(...tags.slice(0, 4));

    if (!chips.length) return '';

    return `
      <div class="detail-metadata" data-role="detail-metadata">
        ${chips.map((chip) => `<span class="detail-chip">${chip}</span>`).join('')}
      </div>
    `;
  }

  buildNarrativeParagraphs(imageData) {
    const year = imageData?.year || 'this period';
    const title = imageData?.title || 'the timeline event';
    const location = imageData?.metadata?.location || 'the country';
    const event = imageData?.metadata?.event || 'a key national milestone';

    return [
      `In ${year}, ${location} became the stage for ${event}. This moment changed the rhythm of daily life and marked a clear transition in public sentiment.`,
      `Viewed through ${title}, the scene captures how institutions, citizens, and international observers reacted in real time. The timeline around this year shows a chain of causes and effects rather than a single isolated event.`,
      `As you continue scrolling, these supporting images reveal parallel stories from the same period, helping connect policy, street-level experience, and long-term impact in a single visual narrative.`
    ];
  }

  getRelatedImages(imageData) {
    const timelineImages = Array.isArray(window.app?.imagePlanes?.imageData)
      ? window.app.imagePlanes.imageData
      : [];

    const normalized = timelineImages
      .map((item, index) => {
        if (typeof item === 'string') {
          return {
            id: `timeline-${index}`,
            year: imageData?.year,
            title: `Timeline image ${index + 1}`,
            url: item
          };
        }

        const url = item?.url || item?.imageUrl || item?.image || item?.src;
        if (!url) return null;
        return { ...item, url };
      })
      .filter(Boolean);

    const currentYear = imageData?.year;
    const sameYear = normalized.filter((item) => item.year === currentYear);
    const currentId = imageData?.id;

    const ordered = [
      imageData,
      ...sameYear.filter((item) => item.id !== currentId)
    ];

    if (ordered.length < 4 && normalized.length > 0) {
      const currentIndex = Math.max(
        0,
        normalized.findIndex((item) => item.id === currentId || item.year === currentYear)
      );
      const neighborhood = [
        normalized[currentIndex - 2],
        normalized[currentIndex - 1],
        normalized[currentIndex + 1],
        normalized[currentIndex + 2],
        normalized[currentIndex + 3]
      ].filter(Boolean);
      ordered.push(...neighborhood);
    }

    const deduped = [];
    const seen = new Set();
    ordered.forEach((item) => {
      const url = item?.url || item?.imageUrl || item?.image || item?.src;
      if (!url || seen.has(url)) return;
      seen.add(url);
      deduped.push({
        ...item,
        url
      });
    });

    if (!deduped.length) {
      const fallbackUrl = imageData?.url || imageData?.imageUrl || imageData?.image || imageData?.src;
      if (fallbackUrl) {
        deduped.push({
          ...imageData,
          url: fallbackUrl
        });
      }
    }

    return deduped.slice(0, 7);
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
    this.teardownParallaxScroll();
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
    this.teardownParallaxScroll();
    
    document.body.style.overflow = '';
    
    // console.log('🧹 ImageDetailPage disposed');
  }
}

export { ImageDetailPage };
