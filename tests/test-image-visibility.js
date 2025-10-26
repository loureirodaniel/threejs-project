// Test script for image visibility during scrolling
console.log('Testing image visibility during scrolling...');

// Wait for app to be available
function testImageVisibility() {
    if (!window.app) {
        console.log('App not ready, retrying...');
        setTimeout(testImageVisibility, 100);
        return;
    }
    
    console.log('App ready, testing image visibility...');
    
    // Add visibility test button
    const testButton = document.createElement('button');
    testButton.textContent = 'Test Image Visibility';
    testButton.style.position = 'fixed';
    testButton.style.top = '110px';
    testButton.style.left = '10px';
    testButton.style.zIndex = '10000';
    testButton.style.padding = '10px';
    testButton.style.backgroundColor = '#2196F3';
    testButton.style.color = 'white';
    testButton.style.border = 'none';
    testButton.style.borderRadius = '5px';
    testButton.style.cursor = 'pointer';
    
    testButton.addEventListener('click', () => {
        console.log('🔍 Testing image visibility...');
        
        const timelineController = window.app.timelineController;
        const timelineScene = window.app.timelineScene;
        const imagePlanes = window.app.imagePlanes;
        
        if (timelineController && timelineController.getCurrentSceneIndex() === 1) {
            console.log('--- Timeline Scene Image Visibility ---');
            
            // Check timeline images
            if (timelineScene) {
                const planes = timelineScene.getTimelinePlanes();
                console.log(`Timeline images count: ${planes.length}`);
                
                planes.forEach((plane, index) => {
                    const isVisible = plane.visible;
                    const position = plane.position;
                    const scale = plane.scale;
                    const material = plane.material;
                    
                    console.log(`Timeline ${index}: Visible=${isVisible}, Position=(${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}), Scale=(${scale.x.toFixed(2)}, ${scale.y.toFixed(2)}, ${scale.z.toFixed(2)}), Opacity=${material.opacity}`);
                    
                    if (!isVisible || scale.x < 0.1 || material.opacity < 0.1) {
                        console.log(`⚠️ Timeline image ${index} has visibility issues!`);
                    }
                });
            }
            
            // Check initial scene images that are part of timeline
            if (imagePlanes) {
                const initialImages = imagePlanes.getPlanes();
                console.log(`Initial images count: ${initialImages.length}`);
                
                initialImages.forEach((image, index) => {
                    if (image.userData.isTimelineTransitioned) {
                        const isVisible = image.visible;
                        const position = image.position;
                        const scale = image.scale;
                        const material = image.material;
                        
                        console.log(`Initial ${index} (timeline): Visible=${isVisible}, Position=(${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}), Scale=(${scale.x.toFixed(2)}, ${scale.y.toFixed(2)}, ${scale.z.toFixed(2)}), Opacity=${material.opacity}`);
                        
                        if (!isVisible || scale.x < 0.1 || material.opacity < 0.1) {
                            console.log(`⚠️ Initial image ${index} has visibility issues!`);
                        }
                    }
                });
            }
            
            // Force restore visibility
            console.log('🔧 Forcing image visibility restoration...');
            timelineController.ensureTimelineImagesVisible();
            
        } else {
            console.log('Not in timeline scene, current scene index:', timelineController ? timelineController.getCurrentSceneIndex() : 'N/A');
        }
    });
    
    document.body.appendChild(testButton);
    
    // Add auto-monitoring for image visibility
    setInterval(() => {
        if (window.app && window.app.timelineController && window.app.timelineController.getCurrentSceneIndex() === 1) {
            const timelineScene = window.app.timelineScene;
            const imagePlanes = window.app.imagePlanes;
            
            let hasVisibilityIssues = false;
            
            // Check timeline images
            if (timelineScene) {
                const planes = timelineScene.getTimelinePlanes();
                planes.forEach((plane) => {
                    if (!plane.visible || plane.scale.x < 0.1 || plane.material.opacity < 0.1) {
                        hasVisibilityIssues = true;
                    }
                });
            }
            
            // Check initial scene images
            if (imagePlanes) {
                const initialImages = imagePlanes.getPlanes();
                initialImages.forEach((image) => {
                    if (image.userData.isTimelineTransitioned) {
                        if (!image.visible || image.scale.x < 0.1 || image.material.opacity < 0.1) {
                            hasVisibilityIssues = true;
                        }
                    }
                });
            }
            
            if (hasVisibilityIssues) {
                console.log('🚨 Auto-detected image visibility issues, restoring...');
                window.app.timelineController.ensureTimelineImagesVisible();
            }
        }
    }, 2000); // Check every 2 seconds
}

// Start testing
testImageVisibility(); 