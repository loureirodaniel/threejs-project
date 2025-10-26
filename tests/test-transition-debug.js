// Test script for transition debugging
console.log('🔄 Testing transition from initial scene to timeline scene...');

// Wait for app to be available
function testTransition() {
    if (!window.app) {
        console.log('App not ready, retrying...');
        setTimeout(testTransition, 100);
        return;
    }
    
    console.log('App ready, setting up transition debugging...');
    
    const timelineController = window.app.timelineController;
    const timelineScene = window.app.timelineScene;
    const imagePlanes = window.app.imagePlanes;
    
    // Add transition test button
    const testButton = document.createElement('button');
    testButton.textContent = '🔄 Test Transition';
    testButton.style.position = 'fixed';
    testButton.style.top = '250px';
    testButton.style.left = '10px';
    testButton.style.zIndex = '10000';
    testButton.style.padding = '10px';
    testButton.style.backgroundColor = '#FF5722';
    testButton.style.color = 'white';
    testButton.style.border = 'none';
    testButton.style.borderRadius = '5px';
    testButton.style.cursor = 'pointer';
    testButton.style.fontSize = '12px';
    
    testButton.addEventListener('click', () => {
        console.log('🔄 === TRANSITION TEST ===');
        
        if (timelineController.getCurrentSceneIndex() === 0) {
            console.log('✅ In initial scene, triggering transition...');
            
            // Monitor transition state
            let transitionStep = 0;
            const transitionMonitor = setInterval(() => {
                transitionStep++;
                console.log(`🔄 Transition step ${transitionStep}:`);
                
                // Check camera state
                const camera = window.app.sceneManager.getCamera();
                console.log(`  📷 Camera: pos=(${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}), fov=${camera.fov.toFixed(1)}`);
                
                // Check initial images state
                if (imagePlanes) {
                    const initialImages = imagePlanes.getPlanes();
                    console.log(`  🖼️ Initial images (${initialImages.length}):`);
                    initialImages.forEach((image, index) => {
                        const pos = image.position;
                        const scale = image.scale;
                        const rot = image.rotation;
                        const visible = image.visible;
                        const isTransitioned = image.userData.isTimelineTransitioned;
                        console.log(`    ${index}: pos=(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}), scale=(${scale.x.toFixed(2)}, ${scale.y.toFixed(2)}), rot=(${rot.x.toFixed(2)}, ${rot.y.toFixed(2)}, ${rot.z.toFixed(2)}), visible=${visible}, transitioned=${isTransitioned}`);
                    });
                }
                
                // Check timeline scene state
                if (timelineScene) {
                    const timelineState = timelineScene.getCameraTransitionState();
                    const isTransitioning = timelineScene.isTransitioning();
                    console.log(`  📊 Timeline scene: state=${timelineState}, transitioning=${isTransitioning}`);
                    
                    if (timelineScene.getTimelinePlanes) {
                        const timelinePlanes = timelineScene.getTimelinePlanes();
                        console.log(`  📸 Timeline planes (${timelinePlanes.length}):`);
                        timelinePlanes.forEach((plane, index) => {
                            const pos = plane.position;
                            const scale = plane.scale;
                            const visible = plane.visible;
                            const opacity = plane.material.opacity;
                            console.log(`    ${index}: pos=(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}), scale=(${scale.x.toFixed(2)}, ${scale.y.toFixed(2)}), visible=${visible}, opacity=${opacity.toFixed(2)}`);
                        });
                    }
                }
                
                // Check if transition is complete
                if (timelineController.getCurrentSceneIndex() === 1) {
                    console.log('✅ Transition complete!');
                    clearInterval(transitionMonitor);
                    
                    // Final state check
                    setTimeout(() => {
                        console.log('🔄 === FINAL STATE CHECK ===');
                        checkFinalState();
                    }, 1000);
                }
                
                // Stop monitoring after 10 seconds
                if (transitionStep > 100) {
                    console.log('⏰ Transition monitoring timeout');
                    clearInterval(transitionMonitor);
                }
            }, 100);
            
            // Trigger transition
            setTimeout(() => {
                console.log('🔄 Triggering transition to timeline scene...');
                timelineController.nextScene();
            }, 500);
            
        } else {
            console.log('❌ Not in initial scene, cannot test transition');
        }
    });
    
    document.body.appendChild(testButton);
    
    // Function to check final state
    function checkFinalState() {
        console.log('🔍 Checking final transition state...');
        
        const camera = window.app.sceneManager.getCamera();
        console.log(`📷 Final camera: pos=(${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}), fov=${camera.fov.toFixed(1)}`);
        
        // Check all images are properly positioned
        const allImages = [];
        
        // Collect initial scene images
        if (imagePlanes) {
            const initialImages = imagePlanes.getPlanes();
            initialImages.forEach((image, index) => {
                if (image.userData.isTimelineTransitioned) {
                    allImages.push({
                        type: 'initial',
                        index: index,
                        position: image.position.clone(),
                        scale: image.scale.clone(),
                        rotation: image.rotation.clone(),
                        visible: image.visible
                    });
                }
            });
        }
        
        // Collect timeline images
        if (timelineScene && timelineScene.getTimelinePlanes) {
            const timelinePlanes = timelineScene.getTimelinePlanes();
            timelinePlanes.forEach((plane, index) => {
                allImages.push({
                    type: 'timeline',
                    index: index,
                    position: plane.position.clone(),
                    scale: plane.scale.clone(),
                    rotation: plane.rotation.clone(),
                    visible: plane.visible
                });
            });
        }
        
        // Sort images by X position
        allImages.sort((a, b) => a.position.x - b.position.x);
        
        console.log('📊 All timeline images (sorted by X position):');
        allImages.forEach((img, index) => {
            console.log(`  ${index}: ${img.type} ${img.index} - pos=(${img.position.x.toFixed(2)}, ${img.position.y.toFixed(2)}, ${img.position.z.toFixed(2)}), scale=(${img.scale.x.toFixed(2)}, ${img.scale.y.toFixed(2)}), visible=${img.visible}`);
        });
        
        // Check for issues
        checkForTransitionIssues(allImages);
    }
    
    // Function to check for transition issues
    function checkForTransitionIssues(allImages) {
        console.log('🔍 Checking for transition issues...');
        
        let issues = [];
        
        // Check for invisible images
        const invisibleImages = allImages.filter(img => !img.visible);
        if (invisibleImages.length > 0) {
            issues.push(`❌ ${invisibleImages.length} images are invisible`);
        }
        
        // Check for misaligned images (Y position not 0)
        const misalignedImages = allImages.filter(img => Math.abs(img.position.y) > 0.1);
        if (misalignedImages.length > 0) {
            issues.push(`❌ ${misalignedImages.length} images are not horizontally aligned (Y != 0)`);
        }
        
        // Check for wrong scale
        const wrongScaleImages = allImages.filter(img => Math.abs(img.scale.x - 0.75) > 0.1 || Math.abs(img.scale.y - 0.75) > 0.1);
        if (wrongScaleImages.length > 0) {
            issues.push(`❌ ${wrongScaleImages.length} images have wrong scale (should be 0.75)`);
        }
        
        // Check for overlapping images
        for (let i = 0; i < allImages.length; i++) {
            for (let j = i + 1; j < allImages.length; j++) {
                const img1 = allImages[i];
                const img2 = allImages[j];
                
                if (img1.visible && img2.visible) {
                    const distance = img1.position.distanceTo(img2.position);
                    if (distance < 1.0) {
                        issues.push(`❌ Images ${img1.type} ${img1.index} and ${img2.type} ${img2.index} are overlapping (distance: ${distance.toFixed(2)})`);
                    }
                }
            }
        }
        
        // Check for gaps in timeline
        const expectedPositions = [-4, -2, 0, 2, 4, 6, 8, 10, 12, 14];
        const actualPositions = allImages.map(img => Math.round(img.position.x));
        const missingPositions = expectedPositions.filter(pos => !actualPositions.includes(pos));
        if (missingPositions.length > 0) {
            issues.push(`❌ Missing images at positions: ${missingPositions.join(', ')}`);
        }
        
        if (issues.length === 0) {
            console.log('✅ No transition issues detected!');
        } else {
            console.log('❌ Transition issues found:');
            issues.forEach(issue => console.log(`  ${issue}`));
        }
    }
    
    // Add real-time monitoring for transition state
    setInterval(() => {
        if (timelineScene) {
            const transitionState = timelineScene.getCameraTransitionState();
            const isTransitioning = timelineScene.isTransitioning();
            
            // Log state changes
            if (this.lastTransitionState !== transitionState) {
                console.log(`🔄 Timeline transition state changed: ${this.lastTransitionState} -> ${transitionState}`);
                this.lastTransitionState = transitionState;
            }
        }
    }, 500);
}

// Start testing
testTransition(); 