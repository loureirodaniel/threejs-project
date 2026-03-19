/**
 * ImageDetailController - Owns the image expand/close lifecycle.
 *
 * Extracted from RenderSystem so the Three.js render loop is not entangled
 * with the click → fullscreen → close → restore state machine.
 *
 * Dependencies injected at construction time:
 *   state          - TimelineState (shared with all systems)
 *   eventBus       - shared EventBus
 *   rippleAnimation - RippleAnimation instance (also kept on RenderSystem for
 *                    backward-compat access by ImageDetailPage.js)
 *   uiManager      - UIManager (hide/show timeline UI, scroll-lock removal)
 *   effects        - { backgroundBlurEffect } passed through from App
 *   callbacks      - { render, updateImagePositions, triggerDreamEffect,
 *                      fadeOutDreamEffect }
 *
 * @module timeline-v2/core
 */

class ImageDetailController {
  constructor(state, eventBus, rippleAnimation, uiManager, effects, callbacks) {
    this.state = state;
    this.eventBus = eventBus;
    this.rippleAnimation = rippleAnimation;
    this.uiManager = uiManager;
    this.effects = effects;
    this.callbacks = callbacks; // { render, updateImagePositions, triggerDreamEffect, fadeOutDreamEffect }

    // State owned by this controller (moved from RenderSystem)
    this.currentAnimatingPlane = null;
    this.currentImageData = null;
    this.savedTimelineState = null;
    this.savedTimelineConfig = null;
    this.timelineStateBeforeDetail = null;
    this.isHandlingImageClose = false;
    this.suppressNextImageCloseEvent = false;
    this.hiddenPlanes = [];
    this.fullscreenPlane = null;
    this.detailRenderInterval = null;

    // Lazy-loaded scene references (same pattern as RenderSystem)
    this.imagePlanes = null;

    this.unsubscribeFns = [];
    this.init();
  }

  // ─── Lazy accessors ─────────────────────────────────────────────────────────

  get camera() { return window.app?.camera; }
  get scene()  { return window.app?.scene;  }
  get renderer() { return window.app?.renderer; }

  // ─── Initialisation ─────────────────────────────────────────────────────────

  init() {
    // Handle: hide the 3D plane once the DOM detail page takes over
    this.onHidePlaneForDetailPage = () => {
      if (this.currentAnimatingPlane) {
        this.currentAnimatingPlane.visible = false;
        console.log('🙈 3D plane hidden on detail page signal');
      }
    };
    window.addEventListener('hidePlaneForDetailPage', this.onHidePlaneForDetailPage);

    // Handle: seamless animation handoff from 3D → DOM detail page
    this.onImageExpandHandoff = (event) => {
      console.log('🎨 Handoff signal received - hiding plane and revealing detail');

      if (this.currentAnimatingPlane) {
        this.currentAnimatingPlane.visible = false;
        console.log('🙈 3D plane hidden');
      }

      const detailPage = window.app?.timelineController?.imageDetailPage;
      if (detailPage) {
        detailPage.open({
          plane: this.currentAnimatingPlane,
          imageData: this.currentImageData,
          reveal: true,
        });
        this.uiManager.hideTimelineUI();
        console.log('🙈 Title and year hidden via CSS class');

        setTimeout(() => {
          const title = document.querySelector('h1');
          const year  = document.querySelector('[class*="year"]');
          console.log('🔍 Title element:', {
            exists: !!title,
            text: title?.textContent.substring(0, 30),
            opacity: title ? window.getComputedStyle(title).opacity : 'N/A',
            visibility: title ? window.getComputedStyle(title).visibility : 'N/A',
          });
          console.log('🔍 Year element:', {
            exists: !!year,
            opacity: year ? window.getComputedStyle(year).opacity : 'N/A',
            visibility: year ? window.getComputedStyle(year).visibility : 'N/A',
          });
        }, 100);
        console.log('👁️ Detail page reveal triggered');
      }
    };
    window.addEventListener('imageExpandHandoff', this.onImageExpandHandoff);

    // Subscribe to timeline events
    this.unsubscribeFns.push(
      this.eventBus.on('timeline:click', this.onTimelineClick.bind(this)),
      this.eventBus.on('timeline:image:close', this.onImageClose.bind(this)),
      // Stop the detail render loop when the timeline resumes
      this.eventBus.on('timeline:resume', () => this.stopDetailRenderLoop())
    );
  }

  // ─── Detail render loop ──────────────────────────────────────────────────────

  startDetailRenderLoop() {
    if (this.detailRenderInterval) return;
    console.log('🔄 Starting continuous render loop for detail view');
    this.detailRenderInterval = setInterval(() => {
      this.callbacks.render();
    }, 16); // ~60 fps
  }

  stopDetailRenderLoop() {
    if (this.detailRenderInterval) {
      clearInterval(this.detailRenderInterval);
      this.detailRenderInterval = null;
      console.log('⏹️ Stopped continuous render loop');
    }
  }

  // ─── Pause/resume helpers ────────────────────────────────────────────────────

  pauseTimelineSystems() {
    this.eventBus.emit('systems:pause', {});
  }

  resumeTimelineSystems() {
    this.eventBus.emit('systems:resume', {});
  }

  // ─── Image click → fullscreen flow ──────────────────────────────────────────

  /**
   * Handle timeline clicks - proximity-based detection.
   */
  onTimelineClick(data) {
    console.log('🖱️ CLICK at screen:', data.clientX, data.clientY);

    try {
      const app = window.app;
      if (!app || !app.imagePlanes || !app.camera) {
        console.error('❌ Missing components');
        return;
      }

      this.imagePlanes = app.imagePlanes;
      const planes    = this.imagePlanes.planes || this.imagePlanes.getPlanes();
      const imageData = this.imagePlanes.imageData;
      const camera    = app.camera;
      const detailPage = app.timelineController?.imageDetailPage;

      if (!planes || !imageData || !camera || !detailPage) {
        console.error('❌ Missing required data');
        return;
      }

      console.log(`✅ Checking ${planes.length} planes`);

      // Convert each plane's 3D position to screen coordinates
      const screenPositions = planes.map((plane, index) => {
        const vector = plane.position.clone();
        vector.project(camera);

        const widthHalf  = window.innerWidth  / 2;
        const heightHalf = window.innerHeight / 2;
        const screenX = (vector.x * widthHalf)  + widthHalf;
        const screenY = -(vector.y * heightHalf) + heightHalf;

        const distance = Math.sqrt(
          Math.pow(screenX - data.clientX, 2) +
          Math.pow(screenY - data.clientY, 2)
        );

        return { index, plane, screenX, screenY, distance, imageData: imageData[index] };
      }).filter(Boolean);

      const clickRadius = Math.min(window.innerWidth, window.innerHeight) * 0.2;
      console.log(`🎯 Click radius: ${clickRadius.toFixed(0)}px, checking ${screenPositions.length} planes`);

      const closest = screenPositions
        .filter(p => p.distance < clickRadius)
        .sort((a, b) => a.distance - b.distance)[0];

      if (closest) {
        console.log(`✅ Clicked image ${closest.index} (${closest.distance.toFixed(0)}px away)`);
        console.log(`   Image year: ${closest.imageData.year}`);
        this.callbacks.triggerDreamEffect();

        this.eventBus.emit('timeline:plane:click', { planeIndex: closest.index });

        const currentIndex = this.state.get('currentImageIndex') || 0;
        const clickedIndex = closest.index;
        console.log(`📍 Current centered image: ${currentIndex}, clicked: ${clickedIndex}`);

        const startSeamlessHandoff = () => {
          const animatingPlane    = closest.plane;
          const imageDataForDetail = closest.imageData;

          document.body.classList.add('detail-view-open', 'is-fullscreen');
          this.pauseTimelineSystems();

          requestAnimationFrame(() => {
            const physicsSystem = window.app?.timelineController?.physicsSystem;

            // === SAVE TIMELINE STATE FOR RESTORATION ===
            console.log('💾 ========== SAVING TIMELINE STATE ==========');

            this.savedTimelineState = {
              physicsOffset:   physicsSystem?.currentOffset || 0,
              physicsVelocity: physicsSystem?.velocity || 0,
              physicsEnabled:  physicsSystem?.scrollEnabled !== false,
              cameraPosition:  camera.position.clone(),
              cameraRotation:  camera.rotation.clone(),
              planesState: this.imagePlanes.planes.map((plane, index) => ({
                index,
                position:    plane.position.clone(),
                scale:       plane.scale.clone(),
                rotation:    plane.rotation.clone(),
                visible:     plane.visible,
                renderOrder: plane.renderOrder,
                inScene:     !!plane.parent,
              })),
            };

            console.log('💾 SAVED:', {
              offset:  this.savedTimelineState.physicsOffset.toFixed(2),
              planes:  this.savedTimelineState.planesState.length,
              visible: this.savedTimelineState.planesState.filter(p => p.visible).length,
            });

            if (window.app?.timelineController?.titleScrollAnimation) {
              window.app.timelineController.titleScrollAnimation.disable?.();
              console.log('📝 TitleScrollAnimation disabled');
            }

            this.timelineStateBeforeDetail = {
              cameraPosition: camera.position.clone(),
              cameraRotation: camera.rotation.clone(),
              physicsOffset:  physicsSystem?.currentOffset || 0,
              physicsVelocity: 0,
              allPlanesState: this.imagePlanes?.planes?.map(p => ({
                position: p.position.clone(),
                scale:    p.scale.clone(),
                visible:  p.visible,
                userData: { ...p.userData },
              })),
            };

            console.log('💾 Stored CLEAN timeline state', {
              cameraPos:     this.timelineStateBeforeDetail.cameraPosition,
              physicsOffset: this.timelineStateBeforeDetail.physicsOffset,
              planesCount:   this.timelineStateBeforeDetail.allPlanesState?.length,
            });

            // STEP 1: Preload detail page (invisible) BEFORE animation
            console.log('🔧 Step 1: Preloading detail page');
            detailPage.open({ plane: animatingPlane, imageData: imageDataForDetail, preload: true });

            // STEP 2: Start 3D plane animation
            console.log('🎬 Step 2: Starting 3D plane animation');
            this.currentAnimatingPlane = animatingPlane;
            this.currentImageData      = imageDataForDetail;

            const clickPos = { x: data.clientX, y: data.clientY };
            console.log('🖱️ Click position:', clickPos);

            animatingPlane.userData.originalScale    = animatingPlane.scale.clone();
            animatingPlane.userData.originalPosition = animatingPlane.position.clone();

            console.log('💾 Stored original transforms:', {
              scale:    animatingPlane.userData.originalScale,
              position: animatingPlane.userData.originalPosition,
            });

            if (physicsSystem) {
              physicsSystem.scrollEnabled = false;
              console.log('🔒 Physics system DISABLED for fullscreen animation');
            }

            this.rippleAnimation.animateToFullscreen(animatingPlane, clickPos, () => {
              console.log('🌊 Ripple animation complete, showing detail page');

              if (window.app?.timelineController) {
                window.app.timelineController.pauseTimeline();
                if (window.app.timelineController.cameraSystem) {
                  window.app.timelineController.cameraSystem.freezeCamera();
                }
              }

              if (window.app) {
                window.app.disableCanvasInteraction();
              }

              this.hiddenPlanes = [];
              this.fullscreenPlane = animatingPlane;

              // Remove all OTHER planes from scene (keep the fullscreen one)
              this.imagePlanes.planes.forEach(p => {
                if (p.uuid !== animatingPlane.uuid) {
                  if (p.parent) {
                    p.parent.remove(p);
                    this.hiddenPlanes.push(p);
                  }
                } else {
                  p.visible = true;
                  p.renderOrder = 9999;
                  console.log('👁️ Fullscreen plane render order:', p.renderOrder);
                }
              });

              console.log('🔄 Forcing render after animation complete');
              this.callbacks.render();

              this.startDetailRenderLoop();

              // Save complete timeline configuration
              console.log('💾 ========== SAVING TIMELINE STATE ==========');
              this.savedTimelineConfig = {
                physicsOffset:      physicsSystem?.currentOffset || 0,
                physicsVelocity:    physicsSystem?.velocity || 0,
                centeredImageIndex: physicsSystem?.centeredImageIndex || 0,
                cameraPosition:     camera.position.clone(),
                cameraRotation:     camera.rotation.clone(),
                planesConfig: this.imagePlanes?.planes?.map((p, i) => ({
                  index:       i,
                  position:    p.position.clone(),
                  scale:       p.scale.clone(),
                  rotation:    p.rotation.clone(),
                  visible:     p.visible,
                  renderOrder: p.renderOrder,
                  userData:    { ...p.userData },
                })),
                imageSpacing: physicsSystem?.imageSpacing || 4.5,
                scrollOffset: physicsSystem?.scrollOffset || 0,
              };

              console.log('💾 SAVED CONFIG:', {
                physicsOffset:  this.savedTimelineConfig.physicsOffset.toFixed(2),
                centeredImage:  this.savedTimelineConfig.centeredImageIndex,
                plane0Pos: this.savedTimelineConfig.planesConfig?.[0]?.position?.x?.toFixed?.(2),
                plane1Pos: this.savedTimelineConfig.planesConfig?.[1]?.position?.x?.toFixed?.(2),
                plane2Pos: this.savedTimelineConfig.planesConfig?.[2]?.position?.x?.toFixed?.(2),
              });
              console.log('💾 ========================================');

              // Show detail page
              detailPage.open({
                plane:        animatingPlane,
                imageData:    this.currentImageData,
                reveal:       true,
                showImageOnly: false,
                onDOMImageReady: () => {
                  console.log('🔄 Hiding WebGL plane, DOM image taking over');
                  animatingPlane.visible = false;
                },
              });
              this.uiManager.hideTimelineUI();
              console.log('🙈 Title and year hidden via CSS class');

              setTimeout(() => {
                const title = document.querySelector('h1');
                const year  = document.querySelector('[class*="year"]');
                console.log('🔍 Title element:', {
                  exists: !!title,
                  text: title?.textContent.substring(0, 30),
                  opacity: title ? window.getComputedStyle(title).opacity : 'N/A',
                  visibility: title ? window.getComputedStyle(title).visibility : 'N/A',
                });
                console.log('🔍 Year element:', {
                  exists: !!year,
                  opacity: year ? window.getComputedStyle(year).opacity : 'N/A',
                  visibility: year ? window.getComputedStyle(year).visibility : 'N/A',
                });
              }, 100);

              const canvas = this.renderer?.domElement;
              if (canvas) {
                console.log('🎨 Canvas state after detail opens:', {
                  display:    canvas.style.display || 'not set',
                  visibility: canvas.style.visibility || 'not set',
                  opacity:    canvas.style.opacity || 'not set',
                  width:  canvas.width,
                  height: canvas.height,
                  inDOM:  document.body.contains(canvas),
                });
                canvas.style.display    = '';
                canvas.style.visibility = 'visible';
                canvas.style.opacity    = '1';
                console.log('✅ Forced canvas to visible state');
              }
            });
          });
        }; // end startSeamlessHandoff

        if (clickedIndex !== currentIndex) {
          console.log(`📹 Image ${clickedIndex} is not centered, snapping camera first...`);
          const calculatedSpacing = this.state.get('calculatedSpacing') || 4.194;
          const firstPosition     = -4.5;
          const targetOffset      = firstPosition + (clickedIndex * calculatedSpacing);
          console.log(`📹 Snapping to offset ${targetOffset.toFixed(2)}`);

          const physicsSystem = app.timelineController?.physicsSystem;
          if (physicsSystem && physicsSystem.snapToOffset) {
            physicsSystem.snapToOffset(targetOffset, clickedIndex);
            setTimeout(() => {
              console.log(`⏰ Camera snap complete, opening detail page for ${closest.imageData.year}`);
              startSeamlessHandoff();
            }, 500);
          } else {
            console.warn('⚠️ PhysicsSystem not available, opening without snap');
            startSeamlessHandoff();
          }
        } else {
          console.log(`✅ Image ${clickedIndex} is already centered, opening immediately`);
          startSeamlessHandoff();
        }
      } else {
        console.log('❌ No image within click radius');
        const sorted = screenPositions.sort((a, b) => a.distance - b.distance);
        console.log('Closest 3 images:', sorted.slice(0, 3).map(p => ({
          index:    p.index,
          year:     p.imageData.year,
          distance: p.distance.toFixed(0) + 'px',
          screenPos: `(${p.screenX.toFixed(0)}, ${p.screenY.toFixed(0)})`,
        })));
      }

    } catch (error) {
      console.error('❌ Error in onTimelineClick:', error);
    }
  }

  // ─── Image close flow ────────────────────────────────────────────────────────

  /**
   * Handle close request from InputSystem / UI.
   */
  onImageClose() {
    if (this.suppressNextImageCloseEvent) {
      this.suppressNextImageCloseEvent = false;
      return;
    }
    if (this.isHandlingImageClose) return;
    this.isHandlingImageClose = true;

    this.imagePlanes = this.imagePlanes || window.app?.imagePlanes;

    this.eventBus.emit('timeline:plane:focus:clear', {});
    console.log('🔴 ========== CLOSING DETAIL ==========');
    this.callbacks.fadeOutDreamEffect();

    const fullscreenPlane =
      this.currentAnimatingPlane ||
      this.imagePlanes?.planes?.find(p => p.userData.isFullscreen);

    if (!fullscreenPlane) {
      console.error('❌ No fullscreen plane');
      if (this.savedTimelineState) {
        console.log('🔄 No fullscreen plane; running direct restoration fallback');
        this.restoreCompleteTimelineState();
      }
      this.isHandlingImageClose = false;
      this.suppressNextImageCloseEvent = true;
      this.eventBus.emit('timeline:image:close');
      return;
    }

    const detailOverlay =
      document.querySelector('.detail-overlay') ||
      document.querySelector('.image-detail-page');
    if (detailOverlay) {
      detailOverlay.style.opacity      = '0';
      detailOverlay.style.pointerEvents = 'none';
      setTimeout(() => { detailOverlay.style.display = 'none'; }, 300);
    }

    this.uiManager.unlockGlobalScrollLock();
    console.log('🌊 Starting reverse animation');

    this.rippleAnimation.animateFromFullscreen(fullscreenPlane, () => {
      console.log('✅ Reverse animation complete');
      this.currentAnimatingPlane = null;
      this.currentImageData      = null;
      this.restoreCompleteTimelineState();
      this.isHandlingImageClose = false;
      this.suppressNextImageCloseEvent = true;
      this.eventBus.emit('timeline:image:close');
    });
  }

  closeDetailView(plane) {
    if (plane && !plane.userData?.isFullscreen) {
      console.log('⚠️ No fullscreen plane to close');
      return;
    }
    this.onImageClose();
  }

  handleCloseButton() {
    this.onImageClose();
  }

  handleDetailClose() {
    this.onImageClose();
  }

  // ─── Restore: exact config (called from restoreExactTimelineConfig) ──────────

  restoreExactTimelineConfig() {
    console.log('🔄 ========== RESTORING EXACT TIMELINE ==========');

    document.body.classList.remove('detail-view-open', 'is-fullscreen', 'detail-active');
    console.log('🎨 Removed detail classes from body');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('pointer-events');

    if (!this.savedTimelineConfig) {
      console.error('❌ NO SAVED TIMELINE CONFIG');
      return;
    }

    const config       = this.savedTimelineConfig;
    const tc           = window.app?.timelineController;
    const physicsSystem = tc?.physicsSystem;
    const inputSystem   = tc?.inputSystem;
    const cameraSystem  = tc?.cameraSystem;
    const animChoreo    = tc?.animationChoreographer;

    console.log('📊 Restoring from config:', {
      physicsOffset: config.physicsOffset.toFixed(2),
      centeredImage: config.centeredImageIndex,
      planesCount:   config.planesConfig.length,
    });

    // STEP 1: Restore camera
    const camera = this.camera;
    if (camera && config.cameraPosition && config.cameraRotation) {
      console.log('📷 Step 1: Restoring camera');
      camera.position.copy(config.cameraPosition);
      camera.rotation.copy(config.cameraRotation);
      camera.updateMatrixWorld(true);
    }

    // STEP 2: Restore physics system
    console.log('⚙️ Step 2: Restoring physics system');
    if (physicsSystem) {
      physicsSystem.enabled       = false;
      physicsSystem.scrollEnabled = false;
      physicsSystem.isBeingRestored = true;
      physicsSystem.currentOffset   = config.physicsOffset;
      physicsSystem.targetOffset    = config.physicsOffset;
      physicsSystem.velocity        = 0;
      physicsSystem.centeredImageIndex = config.centeredImageIndex;
      physicsSystem.imageSpacing    = config.imageSpacing;

      this.state.setState({
        timelineOffset:  config.physicsOffset,
        currentSnapIndex: config.centeredImageIndex,
        targetOffset:    config.physicsOffset,
        scrollVelocity:  0,
      });
      console.log('  Physics offset:', physicsSystem.currentOffset.toFixed(2));
    }

    if (cameraSystem) {
      const restoredOffset = config.physicsOffset;
      cameraSystem.lookAtTarget.set(-restoredOffset, 0, 0);
      cameraSystem.lookAtCurrent.set(-restoredOffset, 0, 0);
      cameraSystem.camera.lookAt(cameraSystem.lookAtCurrent);
      cameraSystem.camera.updateMatrixWorld(true);
      console.log('📷 Camera lookAt synced to offset:', restoredOffset);
    }

    // STEP 3: Restore ALL planes (aggressive)
    console.log('🖼️ Step 3: Making ALL planes visible (aggressive)');
    this.imagePlanes = this.imagePlanes || window.app?.imagePlanes;
    const totalPlanes = this.imagePlanes?.planes?.length || 0;
    console.log(`  Total planes in scene: ${totalPlanes}`);

    this.imagePlanes?.planes?.forEach((plane, index) => {
      const savedPlane = config.planesConfig?.[index];
      if (savedPlane) {
        plane.position.copy(savedPlane.position);
        plane.scale.copy(savedPlane.scale);
      }
      plane.visible     = true;
      plane.renderOrder = index;
      if (plane.material) {
        plane.material.opacity     = 1;
        plane.material.transparent = true;
        plane.material.needsUpdate = true;
      }
      plane.userData.isFullscreen         = false;
      plane.userData.isFrozen             = false;
      delete plane.userData.animatingToFullscreen;
      delete plane.userData.animatingFromFullscreen;
      plane.updateMatrixWorld(true);
      console.log(`  ✓ Plane ${index}: pos=(${plane.position.x.toFixed(1)}, ${plane.position.y.toFixed(1)}), visible=true`);
    });

    const visibleCount = this.imagePlanes?.planes?.filter(p => p.visible).length || 0;
    console.log(`  📊 Total visible planes: ${visibleCount}/${totalPlanes}`);
    if (visibleCount < totalPlanes) {
      console.error(`  ⚠️ WARNING: Only ${visibleCount} of ${totalPlanes} planes are visible!`);
    }

    // STEP 4: Force render
    console.log('🎨 Step 4: Forcing render');
    requestAnimationFrame(() => {
      const renderer = this.renderer;
      const scene    = this.scene;
      if (renderer && scene) {
        renderer.render(scene, camera);
        console.log('  ✓ Rendered restored state');
      }

      // STEP 5: Re-enable systems
      setTimeout(() => {
        if (physicsSystem) {
          physicsSystem.isBeingRestored = false;
          physicsSystem.enabled         = true;
          physicsSystem.scrollEnabled   = true;
          console.log('⚙️ Step 5: Physics re-enabled');
        }
        if (inputSystem)   inputSystem.enabled = true;
        if (cameraSystem?.unfreeze)       cameraSystem.unfreeze();
        else if (cameraSystem?.unfreezeCamera) cameraSystem.unfreezeCamera();
        if (animChoreo)    animChoreo.enabled = true;

        const canvas = renderer?.domElement;
        if (canvas) canvas.style.pointerEvents = 'auto';
        window.app?.enableCanvasInteraction?.();
        this.stopDetailRenderLoop();

        console.log('✅ All systems re-enabled');

        // STEP 6: Restore title to top
        console.log('📝 Step 6: Restoring title to top');
        const title =
          document.querySelector('.title-overlay') ||
          document.querySelector('.title-div') ||
          document.querySelector('.timeline-title') ||
          document.querySelector('.project-title') ||
          document.querySelector('h1');

        if (title) {
          title.style.cssText = `
            position: fixed !important;
            top: 32px !important;
            left: 50% !important;
            transform: translateX(-50%) scale(0.8) !important;
            opacity: 1 !important;
            visibility: visible !important;
            display: block !important;
            pointer-events: none !important;
            z-index: 100 !important;
          `;
          const titleAnim = window.app?.timelineController?.titleScrollAnimation;
          if (titleAnim && titleAnim.isAtTop === false) titleAnim.moveToTop();
          console.log('  ✓ Title positioned at top');
        } else {
          console.error('  ❌ Title element NOT FOUND');
        }

        // STEP 7: Show navigation
        console.log('🧭 Step 7: Showing timeline navigation');
        const timelineNav = document.querySelector('#timeline-navigation, .timeline-navigation');
        if (timelineNav) {
          timelineNav.style.display      = 'flex';
          timelineNav.style.opacity      = '1';
          timelineNav.style.visibility   = 'visible';
          timelineNav.style.pointerEvents = 'auto';
          console.log('  ✓ Navigation visible');
        } else {
          console.warn('  ⚠️ Timeline navigation not found');
        }

        this.eventBus.emit('timeline:restored', {});

        // STEP 8: Restore year display
        console.log('📅 Step 8: Restoring year display');
        const yearDisplay =
          document.querySelector('.year-display') ||
          document.querySelector('.timeline-year') ||
          document.querySelector('[class*="year"]');
        if (yearDisplay) {
          yearDisplay.style.cssText = `
            opacity: 1 !important;
            visibility: visible !important;
            display: block !important;
            pointer-events: auto !important;
          `;
          console.log('  ✓ Year display visible');
        } else {
          console.error('  ❌ Year display NOT FOUND');
        }
      }, 100);
    });

    this.savedTimelineConfig = null;
    console.log('✅ ========== TIMELINE FULLY RESTORED ==========');

    // Diagnostic check
    setTimeout(() => {
      console.log('🔍 ========== VISIBILITY CHECK ==========');
      const allPlanes     = this.imagePlanes?.planes || [];
      const visiblePlanes = allPlanes.filter(p => p.visible);
      const hiddenPlanesCheck = allPlanes.filter(p => !p.visible);
      console.log(`📊 Planes: ${visiblePlanes.length} visible, ${hiddenPlanesCheck.length} hidden`);
      if (hiddenPlanesCheck.length > 0) {
        console.log('  Hidden plane indices:', hiddenPlanesCheck.map(p => allPlanes.indexOf(p)));
      }
      const titleEl = document.querySelector('h1') || document.querySelector('[class*="title"]');
      if (titleEl) {
        const styles = window.getComputedStyle(titleEl);
        console.log('📝 Title state:', { exists: true, text: titleEl.textContent?.substring(0, 30), display: styles.display, opacity: styles.opacity, visibility: styles.visibility, top: styles.top });
      } else {
        console.error('❌ Title element not found in DOM');
      }
      const yearEl = document.querySelector('[class*="year"]');
      if (yearEl) {
        const styles = window.getComputedStyle(yearEl);
        console.log('📅 Year state:', { exists: true, text: yearEl.textContent?.substring(0, 20), display: styles.display, opacity: styles.opacity, visibility: styles.visibility });
      } else {
        console.error('❌ Year element not found in DOM');
      }
      console.log('🔍 ====================================');
    }, 1000);

    // Nuclear option: force everything visible
    setTimeout(() => {
      console.log('🔥 FORCING VISIBILITY (nuclear option)');
      this.imagePlanes?.planes?.forEach((p, i) => {
        p.visible = true;
        if (p.material) { p.material.opacity = 1; p.material.transparent = true; }
        console.log(`  Plane ${i}: FORCED visible`);
      });
      const titleForce = document.querySelector('.timeline-title') || document.querySelector('h1');
      if (titleForce) {
        titleForce.style.cssText = `
          position: fixed !important;
          top: 32px !important;
          left: 50% !important;
          transform: translateX(-50%) scale(0.8) !important;
          opacity: 1 !important;
          visibility: visible !important;
          display: block !important;
        `;
        console.log('  Title: FORCED visible');
      }
      const renderer = this.renderer;
      const scene    = this.scene;
      if (renderer && scene) {
        renderer.render(scene, this.camera);
        console.log('  Forced final render');
      }
      console.log('✅ Everything forced visible with !important');
    }, 500);

    // Nuclear: force visibility over multiple frames
    const forceVisibility = (attempt = 1) => {
      if (attempt > 3) return;
      console.log(`🔥 Force visibility attempt ${attempt}/3`);
      this.imagePlanes?.planes?.forEach(p => {
        p.visible = true;
        if (p.material) p.material.opacity = 1;
      });
      const titleForce2 = document.querySelector('.title-overlay') || document.querySelector('h1');
      if (titleForce2) { titleForce2.style.display = 'block'; titleForce2.style.opacity = '1'; titleForce2.style.visibility = 'visible'; }
      const yearForce = document.querySelector('[class*="year"]');
      if (yearForce) { yearForce.style.display = 'block'; yearForce.style.opacity = '1'; yearForce.style.visibility = 'visible'; }
      const renderer = this.renderer;
      const scene    = this.scene;
      if (renderer && scene) renderer.render(scene, this.camera);
      requestAnimationFrame(() => forceVisibility(attempt + 1));
    };
    setTimeout(() => forceVisibility(), 200);
  }

  // ─── Restore: complete state ─────────────────────────────────────────────────

  restoreCompleteTimelineState() {
    console.log('🔄 ========== RESTORING TIMELINE ==========');

    if (!this.savedTimelineState) {
      console.error('❌ NO SAVED STATE');
      return;
    }

    const savedState = this.savedTimelineState;
    this.uiManager.unlockGlobalScrollLock();

    document.body.classList.remove('detail-view-open', 'is-fullscreen');
    this.state.setState({ isImageEnlarged: false, enlargedImageId: null });
    this.effects?.backgroundBlurEffect?.deactivate?.();
    this.uiManager.showTimelineUI();

    // Re-add hidden planes to scene FIRST
    const scene = this.scene;
    if (this.hiddenPlanes) {
      this.hiddenPlanes.forEach(p => {
        if (p && !p.parent && scene) scene.add(p);
        if (p) {
          p.visible = true;
          p.userData.isFullscreen = false;
          p.userData.isFrozen     = false;
        }
      });
      this.hiddenPlanes = [];
    }

    this.imagePlanes = this.imagePlanes || window.app?.imagePlanes;

    // Restore physics offset into render state
    const offset = this.state.get('timelineOffset');
    this.callbacks.updateImagePositions(offset);

    // Restore camera
    console.log('📷 Restoring camera');
    const camera = this.camera;
    if (camera) {
      camera.position.copy(savedState.cameraPosition);
      camera.rotation.copy(savedState.cameraRotation);
      camera.updateMatrixWorld(true);
    }

    // Restore physics
    const physicsSystem = window.app?.timelineController?.physicsSystem;
    console.log('⚙️ Restoring physics');
    if (physicsSystem) {
      physicsSystem.scrollEnabled  = false;
      physicsSystem.currentOffset  = savedState.physicsOffset;
      physicsSystem.targetOffset   = savedState.physicsOffset;
      physicsSystem.velocity       = 0;
    }

    // Restore ALL planes
    console.log('🖼️ Restoring ALL planes');
    let restored = 0;
    this.imagePlanes.planes.forEach((plane, index) => {
      const saved = savedState.planesState[index];
      if (saved) {
        plane.scale.copy(saved.scale);
        plane.rotation.copy(saved.rotation);
        restored++;
      }
      plane.visible     = true;
      plane.renderOrder = index;
      if (!plane.parent && scene) scene.add(plane);
      if (plane.material) { plane.material.opacity = 1; plane.material.needsUpdate = true; }
      plane.userData.isFullscreen = false;
      plane.userData.isFrozen     = false;
      plane.updateMatrixWorld(true);
    });

    this.callbacks.updateImagePositions(savedState.physicsOffset);
    const cameraSystem = window.app?.timelineController?.cameraSystem;
    if (cameraSystem) {
      const restoredOffset = savedState.physicsOffset;
      cameraSystem.lookAtTarget.set(-restoredOffset, 0, 0);
      cameraSystem.lookAtCurrent.set(-restoredOffset, 0, 0);
      cameraSystem.camera.lookAt(cameraSystem.lookAtCurrent);
      cameraSystem.camera.updateMatrixWorld(true);
      console.log('📷 Camera lookAt synced to offset:', restoredOffset);
    }
    console.log(`  ✓ ${restored}/${this.imagePlanes.planes.length} planes`);

    // Restore title
    console.log('📝 Restoring title (forcing to top)');
    let titleAnimation = null;
    if (window.app?.timelineController?.titleScrollAnimation) {
      titleAnimation = window.app.timelineController.titleScrollAnimation;
      titleAnimation.disable?.();
      console.log('  Disabled TitleScrollAnimation');
    }

    const titleSelectors = ['.title-overlay', '.title-div', '.project-title', '.timeline-title', 'h1'];
    let title = null;
    for (const selector of titleSelectors) {
      title = document.querySelector(selector);
      if (title) { console.log(`  Found: ${selector}`); break; }
    }
    if (title) {
      title.style.cssText = `
        position: fixed !important;
        top: 32px !important;
        left: 50% !important;
        transform: translateX(-50%) scale(0.8) !important;
        opacity: 1 !important;
        visibility: visible !important;
        display: block !important;
        z-index: 100 !important;
        pointer-events: none !important;
      `;
      let parent = title.parentElement;
      while (parent && parent !== document.body) {
        parent.style.opacity = '1'; parent.style.visibility = 'visible';
        parent = parent.parentElement;
      }
      console.log('  ✓ Title forced to top');
      setTimeout(() => {
        if (titleAnimation) {
          titleAnimation.isAtTop    = true;
          titleAnimation.hasScrolled = false;
          titleAnimation.enable?.();
          console.log('  ✓ TitleScrollAnimation re-enabled and reset');
        }
      }, 500);
    } else {
      console.error('  ❌ Title NOT FOUND');
    }

    console.log('RESTORING YEAR OVERLAY');
    const bigYearElement = document.querySelector('.year-overlay');
    if (!bigYearElement) {
      console.error('Year overlay NOT FOUND');
      return;
    }

    const calculatedSpacing = this.state?.get?.('calculatedSpacing') ?? 4.194;
    const firstPosition = 0;
    const startYear  = 2010;
    const yearCount  = 10;
    const relativeOffset = savedState.physicsOffset - firstPosition;
    const yearIndex  = Math.round(relativeOffset / calculatedSpacing);
    const clampedIdx = Math.max(0, Math.min(yearIndex, yearCount - 1));
    const currentYear = startYear + clampedIdx;

    const yearOverlay = window.app?.yearOverlay;
    if (yearOverlay) {
      yearOverlay.setYear(currentYear);
      yearOverlay.show();
    } else {
      const firstSlot = bigYearElement.querySelector('.year-overlay-slot');
      if (firstSlot) firstSlot.textContent = currentYear.toString();
    }
    bigYearElement.classList.remove('hidden', 'fade-out', 'detail-active');
    bigYearElement.style.opacity      = '1';
    bigYearElement.style.visibility   = 'visible';
    bigYearElement.style.display      = 'block';
    bigYearElement.style.pointerEvents = 'none';
    let bigParent = bigYearElement.parentElement;
    while (bigParent && bigParent !== document.body) {
      bigParent.style.opacity = '1'; bigParent.style.visibility = 'visible';
      bigParent = bigParent.parentElement;
    }
    yearOverlay?.positionBelowActiveImage?.();
    console.log(`Year overlay restored to ${currentYear}`);

    // Restore navigation
    const nav = document.querySelector('#timeline-navigation, .timeline-navigation');
    if (nav) {
      nav.style.display      = 'flex';
      nav.style.opacity      = '1';
      nav.style.visibility   = 'visible';
      nav.style.pointerEvents = 'auto';
      console.log('🧭 Navigation visible');
    }

    console.log('📅 Restoring year (aggressive)');
    const yearSelectors = ['.year-display', '.timeline-year', '.current-year', '[class*="year"]', '.timeline-navigation .year'];
    let yearDisplay = null;
    for (const selector of yearSelectors) {
      yearDisplay = document.querySelector(selector);
      if (yearDisplay) break;
    }
    if (yearDisplay) {
      yearDisplay.style.cssText = 'opacity: 1 !important; visibility: visible !important; display: block !important;';
      let yParent = yearDisplay.parentElement;
      while (yParent && yParent !== document.body) {
        yParent.style.opacity = '1'; yParent.style.visibility = 'visible';
        yParent = yParent.parentElement;
      }
      console.log('  ✓ Year visible');
    } else {
      console.error('  ❌ Year NOT FOUND');
    }

    // Force render + re-enable systems
    requestAnimationFrame(() => {
      const renderer = this.renderer;
      if (renderer && scene) renderer.render(scene, camera);

      setTimeout(() => {
        console.log('▶️ Re-enabling systems');
        if (physicsSystem) {
          physicsSystem.scrollEnabled     = true;
          physicsSystem.enabled           = true;
          physicsSystem.paused            = false;
          delete physicsSystem.isBeingRestored;
          console.log('  ✓ Physics enabled:', physicsSystem.scrollEnabled);
        }
        if (this.state) {
          this.state.setState({ isImageEnlarged: false, isDragging: false });
        }
        const tc = window.app?.timelineController;
        if (tc) {
          tc.resumeTimeline?.();
          this.eventBus.emit('timeline:resume', {});
          tc.cameraSystem?.unfreezeCamera?.();
          if (tc.inputSystem) {
            tc.inputSystem.enabled        = true;
            tc.inputSystem.wheelCooldownMs = 0;
            console.log('  ✓ InputSystem enabled');
          }
        }
        window.app?.enableCanvasInteraction?.();
        const canvas = document.querySelector('canvas');
        if (canvas) {
          canvas.style.pointerEvents = 'auto';
          canvas.style.touchAction   = 'none';
          canvas.focus?.();
          console.log('  ✓ Canvas events enabled and focused');
        }
        for (let i = 0; i < 3; i++) {
          requestAnimationFrame(() => {
            if (renderer && scene) renderer.render(scene, camera);
          });
        }
        console.log('✅ All systems enabled');
      }, 100);
    });

    this.savedTimelineState = null;

    setTimeout(() => {
      console.log('🔍 POST-RESTORATION CHECK:');
      const t = document.querySelector('h1');
      const y = document.querySelector('[class*="year"]');
      console.log('  Title:', t ? window.getComputedStyle(t).display : 'NOT FOUND');
      console.log('  Year:',  y ? window.getComputedStyle(y).display : 'NOT FOUND');
      console.log('  Physics scrollEnabled:', physicsSystem?.scrollEnabled);
      console.log('  Input enabled:', window.app?.timelineController?.inputSystem?.enabled);
    }, 1000);

    console.log('✅ ========== RESTORATION COMPLETE ==========');
  }

  /** Backward-compatible alias for restoreCompleteTimelineState. */
  restoreTimelineState() {
    this.restoreCompleteTimelineState();
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────────────

  dispose() {
    for (const unsubscribe of this.unsubscribeFns) {
      try { unsubscribe(); } catch (err) { console.warn('ImageDetailController unsubscribe failed:', err); }
    }
    this.unsubscribeFns = [];

    if (this.onHidePlaneForDetailPage) {
      window.removeEventListener('hidePlaneForDetailPage', this.onHidePlaneForDetailPage);
      this.onHidePlaneForDetailPage = null;
    }
    if (this.onImageExpandHandoff) {
      window.removeEventListener('imageExpandHandoff', this.onImageExpandHandoff);
      this.onImageExpandHandoff = null;
    }
    this.stopDetailRenderLoop();
    this.currentAnimatingPlane = null;
    this.currentImageData      = null;
    console.log('🧹 ImageDetailController disposed');
  }
}

export { ImageDetailController };
