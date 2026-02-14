import { gsap } from 'gsap';

/**
 * Handles the squeeze → expand animation when clicking an image
 */
export class ImageExpandAnimation {
  constructor(camera, renderer) {
    this.camera = camera;
    this.renderer = renderer;
    this.isAnimating = false;
  }

  /**
   * Animate a plane from timeline to full-screen detail view
   * @param {THREE.Mesh} plane - The 3D plane to animate
   * @param {Function} onComplete - Called when animation finishes
   */
  animateToDetail(plane, onComplete) {
    console.log('🎬 Starting expand animation');
    
    if (this.isAnimating) {
      console.log('⚠️ Animation already in progress');
      return;
    }
    
    this.isAnimating = true;
    
    // Store original values
    const originalScale = { x: plane.scale.x, y: plane.scale.y, z: plane.scale.z };
    const originalPosition = { x: plane.position.x, y: plane.position.y, z: plane.position.z };
    
    // Calculate target values
    const targetScale = this.calculateFullScreenScale(plane);
    const targetPosition = { x: 0, y: 0, z: plane.position.z };
    
    console.log('📊 Animation params:', {
      originalScale,
      targetScale,
      originalPosition,
      targetPosition
    });
    
    // Create timeline
    const tl = gsap.timeline({
      onComplete: () => {
        console.log('✅ Expand animation complete');
        this.isAnimating = false;
        if (onComplete) onComplete();
      }
    });

    // ========================================
    // PHASE 1: ANTICIPATION (0 - 0.12s)
    // ========================================
    tl.to(plane.position, {
      y: originalPosition.y - 0.2,
      duration: 0.12,
      ease: 'power2.in',
      onStart: () => {
        console.log('⬇️ Phase 1: Anticipation - moving down');
      }
    }, 0); // Start at 0

    // ========================================
    // PHASE 2: SQUEEZE (0.12 - 0.40s)
    // ========================================
    tl.to(plane.scale, {
      x: originalScale.x * 1.3,   // Expand width MORE
      y: originalScale.y * 0.45,  // Compress height MORE
      duration: 0.28,              // Longer squeeze duration
      ease: 'back.in(3)',         // More dramatic
      onStart: () => {
        console.log('🔽 Phase 2: SQUASHING - visible effect!');
        console.log('   Width: x' + (1.3) + ', Height: x' + (0.45));
      }
    }, 0.12); // Start AFTER anticipation at 0.12s

    // ========================================
    // PHASE 3: EXPAND TO FULLSCREEN (0.40 - 1.60s)
    // ========================================

    // Expand Y (height)
    tl.to(plane.scale, {
      y: targetScale.y,
      duration: 1.2,
      ease: 'power4.out',
      onStart: () => {
        console.log('🔼 Phase 3: Expanding to fullscreen');
      }
    }, 0.40); // Start AFTER squeeze completes at 0.40s

    // Expand X (width)
    tl.to(plane.scale, {
      x: targetScale.x,
      duration: 1.2,
      ease: 'power4.out'
    }, 0.40); // Start at same time as Y

    // Move to center
    tl.to(plane.position, {
      x: targetPosition.x,
      y: targetPosition.y,
      z: targetPosition.z,
      duration: 1.3,
      ease: 'power4.out'
    }, 0.40); // Start at same time as expand

    // ========================================
    // HANDOFF: Trigger detail page (85% complete)
    // ========================================
    tl.call(() => {
      console.log('🎨 85% complete - triggering seamless handoff');
      window.dispatchEvent(new CustomEvent('imageExpandHandoff', {
        detail: { plane, targetPosition, targetScale }
      }));
    }, null, 1.35); // At 1.35s (85% of 1.6s total)

    return tl;
  }

  /**
   * Calculate scale needed to fill ENTIRE viewport (not just 90%)
   */
  calculateFullScreenScale(plane) {
    // Get plane's original geometry size
    const geometry = plane.geometry;
    const width = geometry.parameters.width;
    const height = geometry.parameters.height;

    // Get viewport size in world units at plane's Z position
    const distance = this.camera.position.z - plane.position.z;
    const vFov = this.camera.fov * Math.PI / 180;
    const viewportHeight = 2 * Math.tan(vFov / 2) * distance;
    const viewportWidth = viewportHeight * this.camera.aspect;

    // Calculate scale to fill 100% of screen (cover entire viewport)
    const scaleX = viewportWidth / width;
    const scaleY = viewportHeight / height;

    // Use larger scale to ensure full coverage (like background-size: cover)
    const scale = Math.max(scaleX, scaleY) * 1.05; // 5% extra to ensure full coverage

    console.log('📐 Full-viewport scale calculated:', {
      planeSize: { width, height },
      viewportSize: { width: viewportWidth, height: viewportHeight },
      targetScale: { x: scale, y: scale }
    });

    return { x: scale, y: scale, z: 1 };
  }

  /**
   * Cancel ongoing animation
   */
  cancel() {
    gsap.killTweensOf('*');
    this.isAnimating = false;
  }
}
