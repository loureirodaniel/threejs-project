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
      z-index: 999999;
      display: none;
      overflow-y: auto;
      overflow-x: hidden;
      opacity: 0;
    `;
    
    // Close button (top-left)
    const closeButton = document.createElement('button');
    closeButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    `;
    closeButton.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      width: 50px;
      height: 50px;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      color: white;
      cursor: pointer;
      border-radius: 50%;
      z-index: 1000000;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
    `;
    
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
      closeButton.style.transform = 'scale(1.1)';
    });
    
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.background = 'rgba(255, 255, 255, 0.1)';
      closeButton.style.transform = 'scale(1)';
    });
    
    closeButton.addEventListener('click', () => this.close());
    
    // Content container (scrollable)
    const contentContainer = document.createElement('div');
    contentContainer.id = 'detail-content';
    contentContainer.style.cssText = `
      max-width: 1400px;
      margin: 0 auto;
      padding: 80px 40px 40px;
      min-height: 100vh;
    `;
    
    this.container.appendChild(closeButton);
    this.container.appendChild(contentContainer);
    document.body.appendChild(this.container);
    
    console.log('✅ ImageDetailPage container created');
  }
  
  /**
   * Open detail page with image data
   */
  open(data) {
    console.log('📖 ImageDetailPage.open() called');
    console.log('📖 Raw data received:', data);
    console.log('📖 data.imageData:', data?.imageData);
    console.log('📖 data.plane:', data?.plane);
    
    // More lenient validation - accept if we have ANY data
    if (!data) {
      console.error('❌ No data object provided at all');
      return;
    }
    
    // If imageData is missing but we have a year or other info, create minimal object
    let imageData = data.imageData;
    
    if (!imageData) {
      console.warn('⚠️ No imageData in data object, checking for direct properties...');
      
      // Check if data itself IS the imageData
      if (data.year || data.id || data.imageUrl) {
        console.log('✅ Data object appears to be imageData itself, using it directly');
        imageData = data;
      } else {
        console.error('❌ Cannot find imageData anywhere in provided data');
        console.log('Available keys in data:', Object.keys(data));
        return;
      }
    }
    
    console.log('✅ Using imageData:', imageData);
    
    if (this.isOpen) {
      console.log('Detail page already open, updating content...');
      this.updateContent(imageData);
      return;
    }
    
    // ... rest of method continues as before
    this.currentImageData = imageData;
    this.isOpen = true;
    
    this.updateContent(imageData);
    
    this.container.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    gsap.to(this.container, {
      opacity: 1,
      duration: 0.4,
      ease: 'power2.out',
      onStart: () => {
        this.eventBus.emit('timeline:pause');
      }
    });
    
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
    
    // Build HTML content
    contentContainer.innerHTML = `
      <!-- Hero Image -->
      <div style="
        width: 100%;
        max-height: 80vh;
        margin-bottom: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        overflow: hidden;
        background: #111;
      ">
        <img 
          src="${imageUrl || 'https://via.placeholder.com/1200x800'}" 
          alt="Year ${imageData.year}"
          style="
            width: 100%;
            height: auto;
            max-height: 80vh;
            object-fit: contain;
          "
        />
      </div>
      
      <!-- Content Section -->
      <div style="
        color: white;
        max-width: 800px;
        margin: 0 auto;
      ">
        <!-- Year/Title -->
        <h1 style="
          font-size: 48px;
          font-weight: 300;
          margin: 0 0 20px 0;
          letter-spacing: -1px;
        ">
          ${imageData.title || imageData.year}
        </h1>
        
        <!-- Description -->
        <p style="
          font-size: 18px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.8);
          margin: 0 0 40px 0;
        ">
          ${imageData.description || `Timeline entry for year ${imageData.year}. More details coming soon.`}
        </p>
        
        <!-- Metadata -->
        <div style="
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
        this.container.style.display = 'none';
        this.isOpen = false;
        this.currentImageData = null;
        
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
