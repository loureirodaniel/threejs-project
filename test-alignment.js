// Test script for image alignment
console.log('Testing image alignment...');

// Wait for app to be available
function testImageAlignment() {
    if (!window.app) {
        console.log('App not ready, retrying...');
        setTimeout(testImageAlignment, 100);
        return;
    }
    
    console.log('App ready, testing image alignment...');
    
    // Test 1: Check initial scene images
    const imagePlanes = window.app.imagePlanes;
    if (imagePlanes) {
        const planes = imagePlanes.getPlanes();
        console.log('✅ Initial scene has', planes.length, 'images');
        
        // Check if images are properly positioned
        planes.forEach((plane, index) => {
            console.log(`Image ${index}: Position (${plane.position.x.toFixed(2)}, ${plane.position.y.toFixed(2)}, ${plane.position.z.toFixed(2)})`);
            console.log(`Image ${index}: Scale (${plane.scale.x.toFixed(2)}, ${plane.scale.y.toFixed(2)}, ${plane.scale.z.toFixed(2)})`);
            console.log(`Image ${index}: Rotation (${plane.rotation.x.toFixed(2)}, ${plane.rotation.y.toFixed(2)}, ${plane.rotation.z.toFixed(2)})`);
        });
    }
    
    // Test 2: Check timeline scene
    const timelineScene = window.app.timelineScene;
    if (timelineScene) {
        const timelinePlanes = timelineScene.getTimelinePlanes();
        console.log('✅ Timeline scene has', timelinePlanes.length, 'additional images');
        
        // Check timeline image positions
        timelinePlanes.forEach((plane, index) => {
            const expectedX = ((index + 5) * 2) - 4; // Positions 6, 8, 10, 12, 14
            console.log(`Timeline image ${index}: Position (${plane.position.x.toFixed(2)}, ${plane.position.y.toFixed(2)}, ${plane.position.z.toFixed(2)}) - Expected X: ${expectedX}`);
        });
    }
    
    // Test 3: Add alignment test button
    const testButton = document.createElement('button');
    testButton.textContent = 'Test Image Alignment';
    testButton.style.position = 'fixed';
    testButton.style.top = '60px';
    testButton.style.left = '10px';
    testButton.style.zIndex = '10000';
    testButton.style.padding = '10px';
    testButton.style.backgroundColor = '#4CAF50';
    testButton.style.color = 'white';
    testButton.style.border = 'none';
    testButton.style.borderRadius = '5px';
    testButton.style.cursor = 'pointer';
    
    testButton.addEventListener('click', () => {
        console.log('🧪 Testing image alignment...');
        
        // Check current alignment
        const imagePlanes = window.app.imagePlanes;
        const timelineScene = window.app.timelineScene;
        
        if (imagePlanes) {
            const planes = imagePlanes.getPlanes();
            console.log('--- Initial Scene Images Alignment ---');
            planes.forEach((plane, index) => {
                const isAligned = Math.abs(plane.position.y) < 0.1 && 
                                 Math.abs(plane.rotation.x) < 0.1 && 
                                 Math.abs(plane.rotation.z) < 0.1;
                console.log(`Image ${index}: ${isAligned ? '✅ Aligned' : '❌ Not Aligned'} - Y: ${plane.position.y.toFixed(3)}, RotX: ${plane.rotation.x.toFixed(3)}, RotZ: ${plane.rotation.z.toFixed(3)}`);
            });
        }
        
        if (timelineScene) {
            const timelinePlanes = timelineScene.getTimelinePlanes();
            console.log('--- Timeline Images Alignment ---');
            timelinePlanes.forEach((plane, index) => {
                const isAligned = Math.abs(plane.position.y) < 0.1 && 
                                 Math.abs(plane.rotation.x) < 0.1 && 
                                 Math.abs(plane.rotation.z) < 0.1;
                console.log(`Timeline ${index}: ${isAligned ? '✅ Aligned' : '❌ Not Aligned'} - Y: ${plane.position.y.toFixed(3)}, RotX: ${plane.rotation.x.toFixed(3)}, RotZ: ${plane.rotation.z.toFixed(3)}`);
            });
        }
    });
    
    document.body.appendChild(testButton);
}

// Start testing
testImageAlignment(); 