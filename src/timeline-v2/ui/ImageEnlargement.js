/**
 * ImageEnlargement - Full-viewport image viewer
 * Handles click-to-enlarge functionality with smooth animations
 */

import { gsap } from 'gsap';

class ImageEnlargement {
  constructor(state, eventBus) {
    this.state = state;
    this.eventBus = eventBus;
    
    this.overlay = null;
    this.enlargedImage = null;
    this.closeButton = null;
    this.currentImageData = null;
    
    this.init();
  }
  
  init() {
    // Create DOM elements
    this.createOverlay();
    
    // Listen for image click events
    this.eventBus.on('timeline:image:enlarge', this.handleEnlarge.bind(this));
    this.eventBus.on('timeline:image:close', this.handleClose.bind(this));
    
    console.log('✅ ImageEnlargement initialized');
  }
  
  /**
   * Create overlay container with image and close button
   */
  createOverlay() {
    // Create overlay background
    this.overlay = document.createElement('div');
    this.overlay.id = 'image-enlargement-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.95);
      z-index: 9999;
      display: none;
      align-items: center;
      justify-content: center;
      cursor: zoom-out;
      opacity: 0;
    `;
    
    // Create image container
    const imageContainer = document.createElement('div');
    imageContainer.style.cssText = `
      position: relative;
      max-width: 90vw;
      max-height: 90vh;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    // Create enlarged image
    this.enlargedImage = document.createElement('img');
    this.enlargedImage.style.cssText = `
      max-width: 100%;
      max-height: 90vh;
      width: auto;
      height: auto;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      transform: scale(0.9);
    `;
    
    // Create close button
    this.closeButton = document.createElement('button');
    this.closeButton.innerHTML = '×';
    this.closeButton.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      color: white;
      font-size: 36px;
      font-weight: 300;
      cursor: pointer;
      border-radius: 50%;
      z-index: 10001;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(10px);
    `;
    
    this.closeButton.addEventListener('mouseenter', () => {
      this.closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
      this.closeButton.style.transform = 'rotate(90deg)';
    });
    
    this.closeButton.addEventListener('mouseleave', () => {
      this.closeButton.style.background = 'rgba(255, 255, 255, 0.1)';
      this.closeButton.style.transform = 'rotate(0deg)';
    });
    
    // Assemble overlay
    imageContainer.appendChild(this.enlargedImage);
    this.overlay.appendChild(imageContainer);
    this.overlay.appendChild(this.closeButton);
    document.body.appendChild(this.overlay);
    
    // Click handlers
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.handleClose();
      }
    });
    
    this.closeButton.addEventListener('click', () => {
      this.handleClose();
    });
    
    console.log('✅ ImageEnlargement overlay created');
  }
  
  /**
   * Enlarge image to full viewport
   * @param {Object} data - { plane, imageData }
   */
  handleEnlarge(data) {
    console.log('🖼️ handleEnlarge called with:', data);
    
    // More lenient validation - accept if we have imageData
    if (!data || !data.imageData) {
      console.warn('⚠️ No imageData in enlargement data');
      console.log('Received data:', data);
      return;
    }
    
    const imgData = data.imageData;
    
    // Try multiple possible property names for image URL
    const imageUrl = imgData.imageUrl || 
                     imgData.image || 
                     imgData.url || 
                     imgData.src || 
                     imgData.path;
    
    if (!imageUrl) {
      console.error('❌ No image URL found in imageData');
      console.log('Available properties:', Object.keys(imgData));
      console.log('Full imageData:', imgData);
      return;
    }
    
    console.log('✅ Found image URL:', imageUrl);
    
    this.currentImageData = imgData;
    
    // Set image source
    this.enlargedImage.src = imageUrl;
    
    // Show overlay
    this.overlay.style.display = 'flex';
    
    // Animate in
    gsap.timeline()
      .to(this.overlay, {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out'
      })
      .to(this.enlargedImage, {
        scale: 1,
        duration: 0.4,
        ease: 'power2.out'
      }, '-=0.2');
    
    // Update state
    this.state.setState({
      isImageEnlarged: true,
      enlargedImageId: imgData.id || imgData.year
    });
    
    // Prevent timeline scrolling
    document.body.style.overflow = 'hidden';
    
    console.log('✅ Image enlarged successfully');
  }
  
  /**
   * Close enlarged image
   */
  handleClose() {
    console.log('🖼️ Closing enlarged image');
    
    // Animate out
    gsap.timeline()
      .to(this.enlargedImage, {
        scale: 0.9,
        duration: 0.3,
        ease: 'power2.in'
      })
      .to(this.overlay, {
        opacity: 0,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
          this.overlay.style.display = 'none';
        }
      }, '-=0.1');
    
    // Update state
    this.state.setState({
      isImageEnlarged: false,
      enlargedImageId: null
    });
    
    // Re-enable timeline scrolling
    document.body.style.overflow = '';
    
    console.log('✅ Image closed');
  }
  
  /**
   * Clean up
   */
  dispose() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    document.body.style.overflow = '';
    console.log('🧹 ImageEnlargement disposed');
  }
}

export { ImageEnlargement };
