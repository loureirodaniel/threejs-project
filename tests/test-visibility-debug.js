// Enhanced debug script for image visibility issues
console.log('🔍 Enhanced visibility debugging started...');

// Wait for app to be available
function setupVisibilityDebug() {
    if (!window.app) {
        console.log('App not ready, retrying...');
        setTimeout(setupVisibilityDebug, 100);
        return;
    }
    
    console.log('App ready, setting up enhanced visibility debugging...');
    
    const timelineController = window.app.timelineController;
    const timelineScene = window.app.timelineScene;
    const imagePlanes = window.app.imagePlanes;
    
    // Add comprehensive debug button
    const debugButton = document.createElement('button');
    debugButton.textContent = '🔍 Debug Visibility';
    debugButton.style.position = 'fixed';
    debugButton.style.top = '160px';
    debugButton.style.left = '10px';
    debugButton.style.zIndex = '10000';
    debugButton.style.padding = '10px';
    debugButton.style.backgroundColor = '#FF5722';
    debugButton.style.color = 'white';
    debugButton.style.border = 'none';
    debugButton.style.borderRadius = '5px';
    debugButton.style.cursor = 'pointer';
    debugButton.style.fontSize = '12px';
    
    debugButton.addEventListener('click', () => {
        console.log('🔍 === COMPREHENSIVE VISIBILITY DEBUG ===');
        
        // Check current scene
        const currentScene = timelineController.getCurrentSceneIndex();
        console.log(`Current scene: ${currentScene} (${currentScene === 1 ? 'Timeline' : 'Initial'})`);
        
        // Check camera state
        const camera = timelineController.camera;
        console.log(`Camera position: (${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})`);
        console.log(`Camera FOV: ${camera.fov}`);
        console.log(`Camera near: ${camera.near}, far: ${camera.far}`);
        
        // Check timeline configuration
        const timelineConfig = timelineController.sceneConfigs[1];
        console.log(`Timeline config - position: (${timelineConfig.position.x}, ${timelineConfig.position.y}, ${timelineConfig.position.z})`);
        console.log(`Timeline config - target: (${timelineConfig.target.x}, ${timelineConfig.target.y}, ${timelineConfig.target.z})`);
        
        // Check timeline images
        if (timelineScene) {
            const planes = timelineScene.getTimelinePlanes();
            console.log(`\n📸 Timeline Images (${planes.length}):`);
            planes.forEach((plane, index) => {
                const isVisible = plane.visible;
                const position = plane.position;
                const scale = plane.scale;
                const material = plane.material;
                const inScene = plane.parent !== null;
                
                console.log(`  ${index}: visible=${isVisible}, inScene=${inScene}, position=(${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}), scale=(${scale.x.toFixed(2)}, ${scale.y.toFixed(2)}, ${scale.z.toFixed(2)}), opacity=${material.opacity}`);
            });
        }
        
        // Check initial scene images
        if (imagePlanes) {
            const initialImages = imagePlanes.getPlanes();
            console.log(`\n🖼️ Initial Scene Images (${initialImages.length}):`);
            initialImages.forEach((image, index) => {
                const isVisible = image.visible;
                const position = image.position;
                const scale = image.scale;
                const material = image.material;
                const inScene = image.parent !== null;
                const isTimelineTransitioned = image.userData.isTimelineTransitioned;
                
                console.log(`  ${index}: visible=${isVisible}, inScene=${inScene}, timelineTransitioned=${isTimelineTransitioned}, position=(${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}), scale=(${scale.x.toFixed(2)}, ${scale.y.toFixed(2)}, ${scale.z.toFixed(2)}), opacity=${material.opacity}`);
            });
        }
        
        // Check view frustum
        if (timelineController.checkImageVisibilityInView) {
            timelineController.checkImageVisibilityInView();
        }
        
        // Force visibility restoration
        console.log('\n🔧 Forcing visibility restoration...');
        timelineController.ensureTimelineImagesVisible();
        
        console.log('✅ Debug complete');
    });
    
    document.body.appendChild(debugButton);
    
    // Add real-time monitoring
    let lastVisibilityCheck = 0;
    setInterval(() => {
        if (timelineController && timelineController.getCurrentSceneIndex() === 1) {
            const now = Date.now();
            if (now - lastVisibilityCheck > 5000) { // Check every 5 seconds
                lastVisibilityCheck = now;
                
                let hasIssues = false;
                
                // Check timeline images
                if (timelineScene) {
                    const planes = timelineScene.getTimelinePlanes();
                    planes.forEach((plane) => {
                        if (!plane.visible || plane.scale.x < 0.1 || plane.material.opacity < 0.1) {
                            hasIssues = true;
                        }
                    });
                }
                
                // Check initial scene images
                if (imagePlanes) {
                    const initialImages = imagePlanes.getPlanes();
                    initialImages.forEach((image) => {
                        if (image.userData.isTimelineTransitioned) {
                            if (!image.visible || image.scale.x < 0.1 || image.material.opacity < 0.1) {
                                hasIssues = true;
                            }
                        }
                    });
                }
                
                if (hasIssues) {
                    console.log('🚨 Auto-detected visibility issues, restoring...');
                    timelineController.ensureTimelineImagesVisible();
                }
            }
        }
    }, 1000);
    
    // Add scroll/drag event monitoring
    const originalHandleScroll = timelineController.handleSmoothTimelineScroll.bind(timelineController);
    timelineController.handleSmoothTimelineScroll = function(delta) {
        console.log(`📜 Scroll event: delta=${delta}`);
        const result = originalHandleScroll(delta);
        console.log('📜 Scroll event completed');
        return result;
    };
    
    const originalMoveImages = timelineController.moveTimelineImages.bind(timelineController);
    timelineController.moveTimelineImages = function(deltaX) {
        console.log(`🖱️ Move images: deltaX=${deltaX}, timelineOffset=${this.timelineOffset}`);
        const result = originalMoveImages(deltaX);
        console.log('🖱️ Move images completed');
        return result;
    };
}

// Start debugging
setupVisibilityDebug(); 