// Test script for missing images debug
console.log('🔍 Testing missing images from 2014 onwards...');

// Wait for app to be available
function testMissingImages() {
    if (!window.app) {
        console.log('App not ready, retrying...');
        setTimeout(testMissingImages, 100);
        return;
    }
    
    console.log('App ready, testing missing images...');
    
    const timelineController = window.app.timelineController;
    const timelineScene = window.app.timelineScene;
    const imagePlanes = window.app.imagePlanes;
    
    // Add missing images test button
    const testButton = document.createElement('button');
    testButton.textContent = '🔍 Test Missing Images';
    testButton.style.position = 'fixed';
    testButton.style.top = '290px';
    testButton.style.left = '10px';
    testButton.style.zIndex = '10000';
    testButton.style.padding = '10px';
    testButton.style.backgroundColor = '#E91E63';
    testButton.style.color = 'white';
    testButton.style.border = 'none';
    testButton.style.borderRadius = '5px';
    testButton.style.cursor = 'pointer';
    testButton.style.fontSize = '12px';
    
    testButton.addEventListener('click', () => {
        console.log('🔍 === MISSING IMAGES TEST ===');
        
        if (timelineController.getCurrentSceneIndex() === 1) {
            console.log('✅ In timeline scene, checking images...');
            checkAllImages();
        } else {
            console.log('❌ Not in timeline scene, cannot test');
        }
    });
    
    document.body.appendChild(testButton);
    
    // Function to check all images
    function checkAllImages() {
        console.log('🔍 Checking all timeline images...');
        
        // Check initial scene images
        if (imagePlanes) {
            const initialImages = imagePlanes.getPlanes();
            console.log(`🖼️ Initial scene images (${initialImages.length}):`);
            initialImages.forEach((image, index) => {
                const pos = image.position;
                const scale = image.scale;
                const visible = image.visible;
                const isTransitioned = image.userData.isTimelineTransitioned;
                const year = 2010 + index;
                console.log(`  ${index} (${year}): pos=(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}), scale=(${scale.x.toFixed(2)}, ${scale.y.toFixed(2)}), visible=${visible}, transitioned=${isTransitioned}`);
            });
        }
        
        // Check additional timeline images
        if (timelineScene && timelineScene.getTimelinePlanes) {
            const timelinePlanes = timelineScene.getTimelinePlanes();
            console.log(`📸 Additional timeline images (${timelinePlanes.length}):`);
            timelinePlanes.forEach((plane, index) => {
                const pos = plane.position;
                const scale = plane.scale;
                const visible = plane.visible;
                const opacity = plane.material.opacity;
                const year = 2015 + index;
                console.log(`  ${index} (${year}): pos=(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}), scale=(${scale.x.toFixed(2)}, ${scale.y.toFixed(2)}), visible=${visible}, opacity=${opacity.toFixed(2)}`);
            });
        }
        
        // Check timeline offset
        const timelineOffset = timelineController.timelineOffset;
        console.log(`📊 Timeline offset: ${timelineOffset?.toFixed(2) || 'undefined'}`);
        
        // Check camera position
        const camera = window.app.sceneManager.getCamera();
        console.log(`📷 Camera: pos=(${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}), fov=${camera.fov.toFixed(1)}`);
        
        // Check for missing years
        checkMissingYears();
    }
    
    // Function to check for missing years
    function checkMissingYears() {
        console.log('🔍 Checking for missing years...');
        
        const allImages = [];
        const imagePlanes = window.app.imagePlanes;
        const timelineScene = window.app.timelineScene;
        
        // Collect initial scene images
        if (imagePlanes) {
            const initialImages = imagePlanes.getPlanes();
            initialImages.forEach((image, index) => {
                if (image.userData.isTimelineTransitioned) {
                    allImages.push({
                        type: 'initial',
                        index: index,
                        year: 2010 + index,
                        position: image.position.clone(),
                        visible: image.visible
                    });
                }
            });
        }
        
        // Collect additional timeline images
        if (timelineScene && timelineScene.getTimelinePlanes) {
            const timelinePlanes = timelineScene.getTimelinePlanes();
            timelinePlanes.forEach((plane, index) => {
                allImages.push({
                    type: 'timeline',
                    index: index,
                    year: 2015 + index,
                    position: plane.position.clone(),
                    visible: plane.visible
                });
            });
        }
        
        // Check for missing years
        const expectedYears = [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019];
        const foundYears = allImages.map(img => img.year);
        const missingYears = expectedYears.filter(year => !foundYears.includes(year));
        
        console.log(`📅 Expected years: ${expectedYears.join(', ')}`);
        console.log(`✅ Found years: ${foundYears.join(', ')}`);
        
        if (missingYears.length > 0) {
            console.log(`❌ Missing years: ${missingYears.join(', ')}`);
        } else {
            console.log('✅ All years present!');
        }
        
        // Check visibility issues
        const invisibleImages = allImages.filter(img => !img.visible);
        if (invisibleImages.length > 0) {
            console.log(`❌ Invisible images: ${invisibleImages.map(img => `${img.year} (${img.type})`).join(', ')}`);
        }
        
        // Check position issues
        const expectedPositions = [-4, -2, 0, 2, 4, 6, 8, 10, 12, 14];
        const actualPositions = allImages.map(img => Math.round(img.position.x));
        const missingPositions = expectedPositions.filter(pos => !actualPositions.includes(pos));
        
        if (missingPositions.length > 0) {
            console.log(`❌ Missing positions: ${missingPositions.join(', ')}`);
        }
    }
    
    // Add real-time monitoring
    setInterval(() => {
        if (timelineController && timelineController.getCurrentSceneIndex() === 1) {
            // Check for missing images every 5 seconds
            if (Math.random() < 0.2) { // 20% chance each second
                const timelinePlanes = timelineScene?.getTimelinePlanes();
                const initialImages = imagePlanes?.getPlanes();
                
                if (timelinePlanes && initialImages) {
                    const visibleInitialImages = initialImages.filter(img => img.userData.isTimelineTransitioned && img.visible).length;
                    const visibleTimelineImages = timelinePlanes.filter(plane => plane.visible).length;
                    
                    if (visibleInitialImages < 5 || visibleTimelineImages < 5) {
                        console.log(`⚠️ Missing images detected: Initial=${visibleInitialImages}/5, Timeline=${visibleTimelineImages}/5`);
                    }
                }
            }
        }
    }, 1000);
}

// Start testing
testMissingImages(); 