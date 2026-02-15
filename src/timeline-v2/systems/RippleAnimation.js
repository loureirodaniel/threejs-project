import * as THREE from 'three';
import gsap from 'gsap';
import { RippleShader } from '../shaders/RippleShader.js';

/**
 * Handles ripple/wave animation effect when clicking images
 * Inspired by CurtainsJS click-to-fullscreen example
 */
export class RippleAnimation {
  constructor(camera, getRenderer, getScene) {
    this.camera = camera;
    this.getRenderer = getRenderer || (() => window.app?.renderer);
    this.getScene = getScene || (() => window.app?.scene);
    this.isAnimating = false;
    this.animationTween = null;
  }

  /**
   * Animate plane with ripple effect to fullscreen
   * Uses a separate rendering context to avoid conflicts with timeline systems
   */
  animateToFullscreen(plane, clickPosition, onComplete) {
    if (this.isAnimating) {
      console.log('⚠️ Ripple animation already in progress');
      return;
    }

    this.isAnimating = true;
    console.log('🌊 Starting ripple animation to fullscreen');

    // Convert click position to plane coordinates
    const planeMousePos = this.screenToPlaneCoords(plane, clickPosition);
    
    // Store original material and transform
    const originalMaterial = plane.material;
    const originalScale = plane.scale.clone();
    const originalPosition = plane.position.clone();
    const originalParent = plane.parent; // Store parent scene
    
    // Create shader material with ripple effect
    const rippleMaterial = new THREE.ShaderMaterial({
      vertexShader: RippleShader.vertexShader,
      fragmentShader: RippleShader.fragmentShader,
      uniforms: {
        tDiffuse: { value: originalMaterial.map },
        uMousePosition: { value: new THREE.Vector2(planeMousePos.x, planeMousePos.y) },
        uTime: { value: 0 },
        uTransition: { value: 0 }
      },
      transparent: true
    });

    // Apply ripple material
    plane.material = rippleMaterial;

    // Calculate target scale and position for fullscreen
    const targetScale = this.calculateFullscreenScale(plane);
    
    // Get current plane Z position
    const currentZ = plane.position.z;

    const targetPosition = new THREE.Vector3(
      0,  // Center X
      0,  // Center Y
      currentZ  // Keep the ORIGINAL Z position (don't move to 0!)
    );

    console.log('🎯 Target position (keeping Z):', targetPosition);
    console.log('📷 Camera position:', this.camera.position);
    console.log('📏 Distance from camera:', this.camera.position.z - currentZ);

    // Animation object
    const animation = {
      scaleX: originalScale.x,
      scaleY: originalScale.y,
      posX: originalPosition.x,
      posY: originalPosition.y,
      transition: 0,
      time: 0,
      mouseX: planeMousePos.x,
      mouseY: planeMousePos.y
    };

    // Kill existing tween
    if (this.animationTween) {
      this.animationTween.kill();
    }

    console.log('🎬 Starting animation:', {
      from: { scale: originalScale.x.toFixed(2), pos: `(${originalPosition.x.toFixed(2)}, ${originalPosition.y.toFixed(2)})` },
      to: { scale: targetScale.x.toFixed(2), pos: `(${targetPosition.x}, ${targetPosition.y})` }
    });

    // Animate with GSAP
    this.animationTween = gsap.to(animation, {
      duration: 1.2,
      scaleX: targetScale.x,
      scaleY: targetScale.y,
      posX: targetPosition.x,
      posY: targetPosition.y,
      transition: 1,
      time: 100,
      mouseX: 0,
      mouseY: 0,
      ease: 'power2.inOut',
      immediateRender: true,
      overwrite: 'auto',
      onStart: () => {
        console.log('🎬 Animation STARTED');
        
        // CRITICAL: Mark plane as fullscreen IMMEDIATELY
        plane.userData.isFullscreen = true;
        plane.userData.isFrozen = true;
        plane.userData.animatingToFullscreen = true;
      },
      onUpdate: () => {
        // FORCE update plane transforms every frame
        plane.scale.set(animation.scaleX, animation.scaleY, 1);
        plane.position.set(animation.posX, animation.posY, plane.position.z);
        
        // Update shader uniforms
        if (rippleMaterial.uniforms) {
          rippleMaterial.uniforms.uTransition.value = animation.transition;
          rippleMaterial.uniforms.uTime.value = animation.time;
          rippleMaterial.uniforms.uMousePosition.value.set(animation.mouseX, animation.mouseY);
        }
        
        // Prevent any other system from modifying this plane
        plane.userData.isFrozen = true;
        plane.userData.isFullscreen = true;
      },
      onComplete: () => {
        console.log('✅ Animation COMPLETE');
        console.log('   Final scale:', plane.scale.x.toFixed(2));
        console.log('   Final position:', `(${plane.position.x.toFixed(2)}, ${plane.position.y.toFixed(2)})`);
        console.log('   Plane visible:', plane.visible);
        console.log('   Plane in scene:', plane.parent !== null);
        console.log('   Plane material:', plane.material);
        
        // Lock the transform values
        const finalScale = plane.scale.clone();
        const finalPosition = plane.position.clone();
        
        // Freeze uniforms
        rippleMaterial.uniforms.uTransition.value = 1.0;

        // CRITICAL: Ensure plane stays visible
        plane.visible = true;
        plane.renderOrder = 9999;
        
        if (plane.material) {
          plane.material.opacity = 1;
          plane.material.transparent = true;
          plane.material.needsUpdate = true;
        }

        // DEBUG: Add wireframe to see the plane
        if (plane.material) {
          plane.material.wireframe = false;  // Set to true to see wireframe
          plane.material.side = THREE.DoubleSide;  // Render both sides
          console.log('🔍 Material configured:', {
            wireframe: plane.material.wireframe,
            side: plane.material.side,
            opacity: plane.material.opacity,
            transparent: plane.material.transparent
          });
        }
        
        console.log('🔒 After setup:');
        console.log('   Plane visible:', plane.visible);
        console.log('   Plane renderOrder:', plane.renderOrder);
        console.log('   Material opacity:', plane.material?.opacity);
        
        // Store everything for restoration
        plane.userData.rippleMaterial = rippleMaterial;
        plane.userData.originalMaterial = originalMaterial;
        plane.userData.originalScale = originalScale;
        plane.userData.originalPosition = originalPosition;
        plane.userData.fullscreenScale = finalScale;
        plane.userData.fullscreenPosition = finalPosition;
        plane.userData.isFullscreen = true;
        plane.userData.isFrozen = true;
        plane.userData.animatingToFullscreen = false;
        
        // Lock transform
        this.lockPlaneTransform(plane, finalScale, finalPosition);
        
        console.log('🔒 Plane LOCKED at fullscreen');

        // Check plane state every second for debugging
        let checkCount = 0;
        const checkInterval = setInterval(() => {
          checkCount++;
          console.log(`🔍 Plane check #${checkCount}:`, {
            visible: plane.visible,
            inScene: plane.parent !== null,
            scale: plane.scale.x.toFixed(2),
            position: `(${plane.position.x.toFixed(2)}, ${plane.position.y.toFixed(2)})`,
            renderOrder: plane.renderOrder,
            materialOpacity: plane.material?.opacity
          });
          
          if (checkCount >= 5) {
            clearInterval(checkInterval);
          }
        }, 1000);
        
        this.isAnimating = false;
        this.animationTween = null;
        
        // DIAGNOSTIC: Check everything
        setTimeout(() => {
          // Get renderer and scene from window.app
          const renderer = window.app?.renderer;
          const scene = window.app?.scene;
          const canvas = renderer?.domElement;

          console.log('🔍 DIAGNOSTIC AFTER 2 SECONDS:');
          console.log('  Renderer exists:', !!renderer);
          console.log('  Scene exists:', !!scene);
          console.log('  Camera exists:', !!this.camera);
          console.log('  Canvas element:', !!canvas);
          console.log('  Canvas visible:', canvas?.style.display || 'not set');
          console.log('  Canvas size:', canvas?.width, 'x', canvas?.height);
          console.log('  Plane in scene:', plane.parent !== null);
          console.log('  Plane visible:', plane.visible);
          console.log('  Plane position:', plane.position.toArray());
          console.log('  Plane scale:', plane.scale.toArray());
          console.log('  Plane renderOrder:', plane.renderOrder);
          console.log('  Material opacity:', plane.material?.opacity);
          console.log('  Material type:', plane.material?.type);
          console.log('  Texture exists:', !!plane.material?.uniforms?.tDiffuse?.value);
          console.log('  Scene children count:', scene?.children?.length);
          console.log('  Scene has plane:', scene?.children?.includes(plane));

          // Try forcing a render
          if (renderer && scene && this.camera) {
            console.log('  🔄 Forcing manual render...');
            renderer.render(scene, this.camera);
            console.log('  ✅ Manual render executed successfully');
          } else {
            console.error('  ❌ Cannot render - missing components:', {
              hasRenderer: !!renderer,
              hasScene: !!scene,
              hasCamera: !!this.camera
            });
          }
        }, 2000);

        if (onComplete) onComplete();
      }
    });
  }

  /**
   * Lock plane transform to prevent any modifications
   */
  lockPlaneTransform(plane, targetScale, targetPosition) {
    // Store original setters
    const originalScaleSet = plane.scale.set.bind(plane.scale);
    const originalPositionSet = plane.position.set.bind(plane.position);
    
    // Override scale.set to always reset to fullscreen values
    plane.scale.set = function(x, y, z) {
      if (plane.userData.isFrozen && plane.userData.isFullscreen) {
        // Force fullscreen scale
        originalScaleSet(targetScale.x, targetScale.y, targetScale.z);
      } else {
        originalScaleSet(x, y, z);
      }
    };
    
    // Override position.set to always reset to fullscreen values  
    plane.position.set = function(x, y, z) {
      if (plane.userData.isFrozen && plane.userData.isFullscreen) {
        // Force fullscreen position
        originalPositionSet(targetPosition.x, targetPosition.y, z);
      } else {
        originalPositionSet(x, y, z);
      }
    };
    
    console.log('🔐 Transform setters OVERRIDDEN - plane is now immutable');
  }

  /**
   * Calculate fullscreen scale for plane
   */
  calculateFullscreenScale(plane) {
    const geometry = plane.geometry;
    const width = geometry.parameters.width;
    const height = geometry.parameters.height;

    const distance = this.camera.position.z - plane.position.z;
    const vFov = this.camera.fov * Math.PI / 180;
    const viewportHeight = 2 * Math.tan(vFov / 2) * distance;
    const viewportWidth = viewportHeight * this.camera.aspect;

    const scaleX = viewportWidth / width;
    const scaleY = viewportHeight / height;
    const scale = Math.max(scaleX, scaleY) * 1.05;

    return { x: scale, y: scale };
  }

  /**
   * Convert screen coordinates to plane-local coordinates
   */
  screenToPlaneCoords(plane, screenPos) {
    // Normalize screen coordinates to [-1, 1]
    const x = (screenPos.x / window.innerWidth) * 2 - 1;
    const y = -(screenPos.y / window.innerHeight) * 2 + 1;

    // Project to plane space
    const vector = new THREE.Vector3(x, y, 0.5);
    vector.unproject(this.camera);

    const dir = vector.sub(this.camera.position).normalize();
    const distance = (plane.position.z - this.camera.position.z) / dir.z;
    const pos = this.camera.position.clone().add(dir.multiplyScalar(distance));

    // Convert to plane-local coordinates [-1, 1]
    const planeX = (pos.x - plane.position.x) / (plane.scale.x * 0.5);
    const planeY = (pos.y - plane.position.y) / (plane.scale.y * 0.5);

    return { x: planeX, y: planeY };
  }

  /**
   * Animate back from fullscreen to normal
   */
  animateToNormal(plane, originalScale, originalPosition, onComplete) {
    // Implementation for closing animation
    console.log('🌊 Animating back to normal');
    
    // Similar to animateToFullscreen but in reverse
    // ... implement if needed
  }

  /**
   * Animate plane back from fullscreen to normal state
   * @param {THREE.Mesh} plane - The plane to animate back
   * @param {Object} originalScale - Original scale to restore
   * @param {Object} originalPosition - Original position to restore
   * @param {Function} onComplete - Callback when complete
   */
  animateFromFullscreen(plane, originalScale, originalPosition, onComplete) {
    if (this.isAnimating) {
      console.log('⚠️ Ripple animation already in progress');
      return;
    }

    this.isAnimating = true;
    console.log('🌊 Animating back from fullscreen to normal');

    // Get stored materials
    const rippleMaterial = plane.userData.rippleMaterial;
    const originalMaterial = plane.userData.originalMaterial;

    if (!rippleMaterial) {
      console.error('⚠️ No ripple material found on plane');
      this.isAnimating = false;
      if (onComplete) onComplete();
      return;
    }

    // Animation object
    const animation = {
      scaleX: plane.scale.x,
      scaleY: plane.scale.y,
      posX: plane.position.x,
      posY: plane.position.y,
      transition: 1,
      time: rippleMaterial.uniforms.uTime.value
    };

    // Animate back
    this.animationTween = gsap.to(animation, {
      duration: 1.2,
      scaleX: originalScale.x,
      scaleY: originalScale.y,
      posX: originalPosition.x,
      posY: originalPosition.y,
      transition: 0,
      time: animation.time + 50,
      ease: 'power3.inOut',
      onUpdate: () => {
        plane.scale.set(animation.scaleX, animation.scaleY, 1);
        plane.position.set(animation.posX, animation.posY, plane.position.z);
        
        if (rippleMaterial.uniforms) {
          rippleMaterial.uniforms.uTransition.value = animation.transition;
          rippleMaterial.uniforms.uTime.value = animation.time;
        }
      },
      onComplete: () => {
        console.log('✅ Back animation complete - restoring original material');
        
        // NOW restore original material
        plane.material = originalMaterial;
        rippleMaterial.dispose();
        
        // Clean up userData
        delete plane.userData.rippleMaterial;
        delete plane.userData.originalMaterial;
        delete plane.userData.isFullscreen;
        
        this.isAnimating = false;
        this.animationTween = null;
        
        if (onComplete) onComplete();
      }
    });
  }
}
