// Test script for camera transitions
console.log('Testing camera transitions...');

// Wait for app to be available
function testCameraTransitions() {
    if (!window.app) {
        console.log('App not ready, retrying...');
        setTimeout(testCameraTransitions, 100);
        return;
    }
    
    console.log('App ready, testing camera transitions...');
    
    // Test 1: Check if timeline scene has transition methods
    const timelineScene = window.app.timelineScene;
    if (timelineScene) {
        console.log('✅ TimelineScene found');
        console.log('✅ startSceneTransition method:', typeof timelineScene.startSceneTransition);
        console.log('✅ startCameraZoomIn method:', typeof timelineScene.startCameraZoomIn);
        console.log('✅ getCameraTransitionState method:', typeof timelineScene.getCameraTransitionState);
    } else {
        console.log('❌ TimelineScene not found');
    }
    
    // Test 2: Check if initial scene images are connected
    const imagePlanes = window.app.imagePlanes;
    if (imagePlanes) {
        const planes = imagePlanes.getPlanes();
        console.log('✅ ImagePlanes found with', planes.length, 'planes');
        
        // Check if timeline scene can access initial images
        const initialImages = timelineScene.getInitialSceneImages();
        console.log('✅ TimelineScene can access', initialImages.length, 'initial images');
    } else {
        console.log('❌ ImagePlanes not found');
    }
    
    // Test 3: Check timeline controller integration
    const timelineController = window.app.timelineController;
    if (timelineController) {
        console.log('✅ TimelineController found');
        console.log('✅ Current scene index:', timelineController.getCurrentSceneIndex());
        console.log('✅ Scene configs:', timelineController.sceneConfigs.length);
    } else {
        console.log('❌ TimelineController not found');
    }
    
    // Test 4: Ready for manual scroll transition
    console.log('🎬 Ready for manual scroll transition to timeline scene');
    console.log('📝 Scroll down on the initial scene to trigger the transition');
}

// Start testing
testCameraTransitions();

// Add test button to UI
setTimeout(() => {
    const testButton = document.createElement('button');
    testButton.textContent = 'Test Camera Transitions';
    testButton.style.position = 'fixed';
    testButton.style.top = '10px';
    testButton.style.left = '10px';
    testButton.style.zIndex = '10000';
    testButton.style.padding = '10px';
    testButton.style.backgroundColor = '#ff6b6b';
    testButton.style.color = 'white';
    testButton.style.border = 'none';
    testButton.style.borderRadius = '5px';
    testButton.style.cursor = 'pointer';
    
    testButton.addEventListener('click', () => {
        console.log('🧪 Manual test button clicked');
        if (window.app && window.app.timelineController) {
            const currentScene = window.app.timelineController.getCurrentSceneIndex();
            const targetScene = currentScene === 0 ? 1 : 0;
            console.log(`Transitioning from scene ${currentScene} to scene ${targetScene}`);
            window.app.timelineController.transitionToScene(targetScene);
        }
    });
    
    document.body.appendChild(testButton);
}, 1000); 