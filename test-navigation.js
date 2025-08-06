// Test script for navigation fixes
console.log('🧭 Testing navigation fixes...');

// Wait for app to be available
function testNavigation() {
    if (!window.app) {
        console.log('App not ready, retrying...');
        setTimeout(testNavigation, 100);
        return;
    }
    
    console.log('App ready, testing navigation...');
    
    const timelineController = window.app.timelineController;
    const timelineNavigation = window.app.timelineNavigation;
    
    // Add navigation test button
    const testButton = document.createElement('button');
    testButton.textContent = '🧭 Test Navigation';
    testButton.style.position = 'fixed';
    testButton.style.top = '210px';
    testButton.style.left = '10px';
    testButton.style.zIndex = '10000';
    testButton.style.padding = '10px';
    testButton.style.backgroundColor = '#9C27B0';
    testButton.style.color = 'white';
    testButton.style.border = 'none';
    testButton.style.borderRadius = '5px';
    testButton.style.cursor = 'pointer';
    testButton.style.fontSize = '12px';
    
    testButton.addEventListener('click', () => {
        console.log('🧭 === NAVIGATION TEST ===');
        
        if (timelineController.getCurrentSceneIndex() === 1) {
            console.log('✅ In timeline scene, testing navigation...');
            
            // Test navigation to different years
            const testYears = [2010, 2015, 2019];
            let currentTestIndex = 0;
            
            function runNavigationTest() {
                if (currentTestIndex < testYears.length) {
                    const testYear = testYears[currentTestIndex];
                    console.log(`🧭 Testing navigation to year ${testYear}...`);
                    
                    // Trigger navigation
                    timelineNavigation.setYear(testYear);
                    timelineNavigation.triggerYearNavigation();
                    
                    // Check image positions after a delay
                    setTimeout(() => {
                        checkImagePositions(testYear);
                        currentTestIndex++;
                        runNavigationTest();
                    }, 1500); // Wait for animation to complete
                } else {
                    console.log('✅ Navigation test complete');
                }
            }
            
            runNavigationTest();
        } else {
            console.log('❌ Not in timeline scene, cannot test navigation');
        }
    });
    
    document.body.appendChild(testButton);
    
    // Function to check image positions
    function checkImagePositions(expectedYear) {
        console.log(`🔍 Checking image positions for year ${expectedYear}...`);
        
        const timelineScene = window.app.timelineScene;
        const imagePlanes = window.app.imagePlanes;
        
        // Check timeline images
        if (timelineScene) {
            const planes = timelineScene.getTimelinePlanes();
            console.log(`📸 Timeline images (${planes.length}):`);
            planes.forEach((plane, index) => {
                const position = plane.position;
                const isVisible = plane.visible;
                console.log(`  ${index}: position=(${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}), visible=${isVisible}`);
            });
        }
        
        // Check initial scene images
        if (imagePlanes) {
            const initialImages = imagePlanes.getPlanes();
            console.log(`🖼️ Initial scene images (${initialImages.length}):`);
            initialImages.forEach((image, index) => {
                if (image.userData.isTimelineTransitioned) {
                    const position = image.position;
                    const isVisible = image.visible;
                    console.log(`  ${index} (timeline): position=(${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}), visible=${isVisible}`);
                }
            });
        }
        
        // Check for overlapping images
        checkForOverlappingImages();
    }
    
    // Function to check for overlapping images
    function checkForOverlappingImages() {
        console.log('🔍 Checking for overlapping images...');
        
        const allImages = [];
        const timelineScene = window.app.timelineScene;
        const imagePlanes = window.app.imagePlanes;
        
        // Collect all timeline images
        if (timelineScene) {
            const planes = timelineScene.getTimelinePlanes();
            planes.forEach((plane, index) => {
                allImages.push({
                    type: 'timeline',
                    index: index,
                    position: plane.position.clone(),
                    visible: plane.visible
                });
            });
        }
        
        // Collect all initial scene images that are part of timeline
        if (imagePlanes) {
            const initialImages = imagePlanes.getPlanes();
            initialImages.forEach((image, index) => {
                if (image.userData.isTimelineTransitioned) {
                    allImages.push({
                        type: 'initial',
                        index: index,
                        position: image.position.clone(),
                        visible: image.visible
                    });
                }
            });
        }
        
        // Check for overlaps
        let hasOverlaps = false;
        for (let i = 0; i < allImages.length; i++) {
            for (let j = i + 1; j < allImages.length; j++) {
                const img1 = allImages[i];
                const img2 = allImages[j];
                
                if (img1.visible && img2.visible) {
                    const distance = img1.position.distanceTo(img2.position);
                    if (distance < 1.0) { // Images are too close
                        console.log(`⚠️ Overlap detected: ${img1.type} ${img1.index} and ${img2.type} ${img2.index} at distance ${distance.toFixed(2)}`);
                        hasOverlaps = true;
                    }
                }
            }
        }
        
        if (!hasOverlaps) {
            console.log('✅ No overlapping images detected');
        }
    }
    
    // Add real-time monitoring for navigation
    setInterval(() => {
        if (timelineController && timelineController.getCurrentSceneIndex() === 1) {
            const currentYear = timelineController.getCurrentYear();
            const timelineOffset = timelineController.timelineOffset;
            
            // Log navigation state every 10 seconds
            if (Math.random() < 0.1) { // 10% chance each second
                console.log(`🧭 Navigation state: Year=${currentYear}, Offset=${timelineOffset?.toFixed(2) || 'undefined'}`);
            }
        }
    }, 1000);
}

// Start testing
testNavigation(); 