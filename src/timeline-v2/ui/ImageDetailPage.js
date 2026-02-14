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
    
    this.init();
  }
  
  init() {
    this.createContainer();
    
    // Listen for open/close events
    this.eventBus.on('timeline:image:enlarge', this.open.bind(this));
    this.eventBus.on('timeline:image:close', this.close.bind(this));
    
    console.log('✅ ImageDetailPage initialized');
  }
  
  /**
   * Create main container structure
   */
  createContainer() {
    // Main container - full viewport overlay
    this.container = document.createElement('div');
    this.container.id = 'image-detail-page';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: #000;
      z-index: 9999;
      opacity: 0;
      pointer-events: none;
      overflow-y: auto;
    `;
    
    // Close button (top-left)
    this.closeButton = document.createElement('button');
    this.closeButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    `;
    this.closeButton.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      cursor: pointer;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: white;
      transition: all 0.3s ease;
    `;

    // Add hover effect
    this.closeButton.onmouseenter = () => {
      this.closeButton.style.background = 'rgba(255, 255, 255, 0.3)';
      this.closeButton.style.transform = 'scale(1.1)';
    };

    this.closeButton.onmouseleave = () => {
      this.closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
      this.closeButton.style.transform = 'scale(1)';
    };

    this.closeButton.addEventListener('click', () => this.close());
    
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

    // Gradient overlay for readability
    const gradientOverlay = document.createElement('div');
    gradientOverlay.className = 'detail-gradient-overlay';
    gradientOverlay.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 50%;
      background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%);
      z-index: 2;
      pointer-events: none;
    `;

    this.contentContainer = document.createElement('div');
    this.contentContainer.className = 'detail-content-container';
    this.contentContainer.id = 'detail-content';
    this.contentContainer.style.cssText = `
      position: absolute;
      top: 100vh;
      left: 0;
      width: 100%;
      min-height: 100vh;
      padding: 60px 40px;
      background: #000;
      z-index: 3;
      color: white;
    `;
    
    this.container.appendChild(this.fullscreenImage);
    this.container.appendChild(gradientOverlay);
    this.container.appendChild(this.closeButton);
    this.container.appendChild(this.contentContainer);
    this.container.style.overflow = 'auto'; // Enable vertical scroll
    document.body.appendChild(this.container);
    
    console.log('✅ ImageDetailPage container created');
  }
  
  /**
   * Open detail page
   * @param {Object} data - Contains plane, imageData, and mode flags
   * @param {boolean} data.preload - If true, prepare DOM but keep invisible
   * @param {boolean} data.reveal - If true, instantly reveal the preloaded page
   */
  open(data) {
    console.log('📖 ImageDetailPage.open() called');
    console.log('📖 Raw data received:', data);
    
    if (!data) {
      console.error('❌ No data object provided at all');
      return;
    }
    
    const preloadMode = data.preload === true;
    const revealMode = data.reveal === true;
    const resolveImageData = () => {
      let imageData = data.imageData;
      if (!imageData) {
        console.warn('⚠️ No imageData in data object, checking for direct properties...');
        if (data.year || data.id || data.imageUrl) {
          console.log('✅ Data object appears to be imageData itself, using it directly');
          imageData = data;
        } else {
          console.error('❌ Cannot find imageData anywhere in provided data');
          console.log('Available keys in data:', Object.keys(data));
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
      console.log('🔧 PRELOAD MODE: Setting up DOM but keeping invisible');
      
      const imageData = resolveImageData();
      if (!imageData) return;
      prepareDetailDom(imageData);
      
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
      
      console.log('✅ Detail page preloaded (invisible)');
      return;
    }

    // Reveal mode
    if (revealMode) {
      console.log('🎨 REVEAL MODE: Smooth transition from 3D plane to detail image');
      const imageData = resolveImageData();
      if (!imageData) return;
      prepareDetailDom(imageData);
      
      // Show container
      this.container.style.pointerEvents = 'auto';
      
      // Fade in container background
      gsap.to(this.container, {
        opacity: 1,
        duration: 0.8,               // Slower (was 0.5)
        ease: 'power3.out'          // Smoother
      });
      
      // Smoothly reveal fullscreen image
      gsap.to(this.fullscreenImage, {
        opacity: 1,
        scale: 1,
        duration: 0.6,               // Slower (was 0.3)
        ease: 'power4.out',          // Smoother (was power3.out)
        delay: 0.1,                  // Slightly more delay
        onStart: () => {
          console.log('🎨 Starting slow, smooth image reveal');
        },
        onComplete: () => {
          console.log('✅ Image reveal complete');
        }
      });
      
      // Fade in content after image is visible
      setTimeout(() => {
        if (this.contentContainer) {
          gsap.to(this.contentContainer, {
            opacity: 1,
            duration: 1.0,             // Slower (was 0.8)
            ease: 'power3.out'        // Smoother
          });
        }
      }, 900);                         // Later start (was 600)
      
      return; // CRITICAL: Exit here
    }

    // Normal mode starts here
    console.log('📖 data.imageData:', data?.imageData);
    console.log('📖 data.plane:', data?.plane);
    this.currentPlane = data?.plane;
    const seamlessMode = data?.seamless === true;
    this.seamlessMode = seamlessMode;
    if (seamlessMode) {
      console.log('🎨 Opening in SEAMLESS mode - syncing with 3D animation');
    }

    const imageData = resolveImageData();
    if (!imageData) return;
    console.log('✅ Using imageData:', imageData);
    
    if (this.isOpen) {
      console.log('Detail page already open, updating content...');
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
    this.container.style.opacity = '1';
    this.container.style.pointerEvents = 'auto';
    
    this.state.setState({
      isImageEnlarged: true,
      enlargedImageId: imageData.id || imageData.year
    });
    
    console.log('✅ Detail page opened for year:', imageData.year);
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
    console.log('📸 Image URL:', imageUrl);
    console.log('📸 Full imageData:', imageData);
    
    if (this.fullscreenImage) {
      // Ensure image loads before continuing
      this.fullscreenImage.onload = () => {
        console.log('✅ Fullscreen image loaded:', imageUrl);
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
      <div style="
        color: white;
        max-width: 800px;
      ">
        <!-- Year/Title -->
        <h1 data-role="detail-title" style="
          font-size: 48px;
          font-weight: 300;
          margin: 0 0 20px 0;
          letter-spacing: -1px;
        ">
          ${imageData.title || imageData.year}
        </h1>
        
        <!-- Description -->
        <p data-role="detail-description" style="
          font-size: 18px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.8);
          margin: 0 0 40px 0;
        ">
          ${imageData.description || `Timeline entry for year ${imageData.year}. More details coming soon.`}
        </p>
        
        <!-- Metadata -->
        <div data-role="detail-metadata" style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 60px;
          padding: 30px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
        ">
          <div>
            <div style="font-size: 14px; color: rgba(255, 255, 255, 0.5); margin-bottom: 8px;">Year</div>
            <div style="font-size: 24px; font-weight: 500;">${imageData.year}</div>
          </div>
          <div>
            <div style="font-size: 14px; color: rgba(255, 255, 255, 0.5); margin-bottom: 8px;">ID</div>
            <div style="font-size: 24px; font-weight: 500;">${imageData.id || imageData.year}</div>
          </div>
        </div>
        
        <!-- Additional Images Section (placeholder) -->
        <div style="margin-bottom: 60px;">
          <h2 style="
            font-size: 32px;
            font-weight: 300;
            margin: 0 0 24px 0;
          ">
            Gallery
          </h2>
          <div style="
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
          ">
            ${this.buildGallery(imageData)}
          </div>
        </div>
        
        <!-- Comments Section (placeholder) -->
        <div style="margin-bottom: 60px;">
          <h2 style="
            font-size: 32px;
            font-weight: 300;
            margin: 0 0 24px 0;
          ">
            Comments
          </h2>
          <div style="
            padding: 40px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            text-align: center;
            color: rgba(255, 255, 255, 0.5);
          ">
            <p style="margin: 0; font-size: 16px;">
              Comments feature coming soon...
            </p>
          </div>
        </div>
      </div>
    `;

    this.titleElement = contentContainer.querySelector('[data-role="detail-title"]');
    this.descriptionElement = contentContainer.querySelector('[data-role="detail-description"]');
    this.metadataContainer = contentContainer.querySelector('[data-role="detail-metadata"]');

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
    
    console.log('✅ Content updated for year:', imageData.year);
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
  
  /**
   * Close detail page
   */
  close() {
    console.log('📖 Closing detail page');
    
    if (!this.isOpen) {
      console.log('Detail page not open');
      return;
    }
    
    // Animate out
    gsap.to(this.container, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        // Restore 3D plane visibility
        const plane = this.currentPlane;
        if (plane) {
          plane.visible = true;
          console.log('👁️ 3D plane restored');
          
          // Reset plane scale/position
          gsap.to(plane.scale, {
            x: 0.85,
            y: 0.85,
            duration: 0.3,
            ease: 'power2.out'
          });
        }

        this.container.style.display = 'none';
        this.container.style.pointerEvents = 'none';
        this.container.classList.remove('active');
        this.isOpen = false;
        this.currentImageData = null;
        this.seamlessMode = false;
        
        // Re-enable body scroll
        document.body.style.overflow = '';
        
        // Resume timeline rendering
        this.eventBus.emit('timeline:resume');
      }
    });
    
    // Update state
    this.state.setState({
      isImageEnlarged: false,
      enlargedImageId: null
    });
    
    console.log('✅ Detail page closing');
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
    
    document.body.style.overflow = '';
    
    console.log('🧹 ImageDetailPage disposed');
  }
}

export { ImageDetailPage };
