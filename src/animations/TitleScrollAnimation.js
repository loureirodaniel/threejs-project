import gsap from 'gsap';

export class TitleScrollAnimation {
  constructor() {
    this.title = null;
    this.isAtTop = false;
    this.scrollThreshold = 50; // Small scroll to trigger
    this.hasScrolled = false;
    this.onFirstScroll = null;
    this.init();
  }
  
  init() {
    // Find the title element
    this.title = document.querySelector('.title-overlay') ||
                 document.querySelector('.title-div') ||
                 document.querySelector('.timeline-title') || 
                 document.querySelector('.project-title') ||
                 document.querySelector('h1');
    
    if (!this.title) {
      console.warn('⚠️ Title element not found');
      return;
    }
    
    console.log('🎯 Found title element:', this.title.className || this.title.tagName);
    
    // FORCE inline styles first (highest priority)
    this.title.style.cssText = `
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      margin: 0 !important;
      padding: 0 !important;
      z-index: 100 !important;
    `;
    
    console.log('🔧 Forced inline styles with !important');
    
    // Then use GSAP for animations (inline styles will stick)
    gsap.set(this.title, {
      xPercent: -50,
      yPercent: -50
    });
    
    console.log('✅ Title initialized at exact center');
    
    // Debug position after 200ms
    setTimeout(() => {
      const rect = this.title.getBoundingClientRect();
      const viewportCenterX = window.innerWidth / 2;
      const titleCenterX = rect.left + rect.width / 2;
      
      console.log('📐 Title position check:', {
        titleCenterX: titleCenterX.toFixed(2),
        viewportCenterX: viewportCenterX.toFixed(2),
        offsetX: (titleCenterX - viewportCenterX).toFixed(2) + 'px',
        isCentered: Math.abs(titleCenterX - viewportCenterX) < 1
      });
    }, 200);
    
    this.setupScrollListener();
  }
  
  setupScrollListener() {
    this.hasScrolled = false;

    this.onFirstScroll = () => {
      if (!this.hasScrolled) {
        this.hasScrolled = true;
        this.moveToTop();
        console.log('🎯 First scroll detected - moving title to top');

        // Remove listener after first scroll
        window.removeEventListener('wheel', this.onFirstScroll);
        window.removeEventListener('touchmove', this.onFirstScroll);
      }
    };

    // Listen for any scroll input
    window.addEventListener('wheel', this.onFirstScroll, { passive: true });
    window.addEventListener('touchmove', this.onFirstScroll, { passive: true });

    console.log('👂 Listening for scroll events');
  }
  
  moveToTop() {
    if (!this.title || this.isAtTop) return;
    
    this.isAtTop = true;
    
    gsap.to(this.title, {
      top: 32,
      yPercent: 0,      // Remove vertical centering
      xPercent: -50,    // KEEP horizontal centering
      scale: 0.8,
      duration: 0.8,
      ease: 'power2.out',
      onComplete: () => {
        console.log('✅ Title at top, horizontally centered');
      }
    });
  }
  
  moveToCenter() {
    if (!this.title || !this.isAtTop) return;
    
    this.isAtTop = false;
    
    gsap.to(this.title, {
      top: '50%',
      xPercent: -50,    // Center horizontally
      yPercent: -50,    // Center vertically
      scale: 1,
      duration: 0.8,
      ease: 'power2.out',
      onComplete: () => {
        console.log('✅ Title perfectly centered');
      }
    });
  }
  
  destroy() {
    if (this.onFirstScroll) {
      window.removeEventListener('wheel', this.onFirstScroll);
      window.removeEventListener('touchmove', this.onFirstScroll);
      this.onFirstScroll = null;
    }
  }
}
