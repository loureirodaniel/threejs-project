/**
 * GSAP Smooth Scrolling Demo Script
 * 
 * This script demonstrates the smooth scrolling features added to the Three.js project.
 * Run this in the browser console to test various smooth scrolling functions.
 */

// Demo object to showcase smooth scrolling features
window.SmoothScrollDemo = {
    
    // Get the smooth scroll controller instance
    getController() {
        // Access the smooth scroll controller through the app instance
        if (window.app && window.app.smoothScrollController) {
            return window.app.smoothScrollController;
        }
        console.warn('Smooth scroll controller not found. Make sure the app is initialized.');
        return null;
    },
    
    // Demo 1: Basic smooth scrolling test
    testBasicScrolling() {
        const controller = this.getController();
        if (!controller) return;
        
        console.log('🎯 Testing basic smooth scrolling...');
        console.log('Scroll your mouse wheel to see smooth scrolling in action!');
        console.log('Current settings:');
        console.log('- Sensitivity:', controller.scrollSensitivity);
        console.log('- Momentum:', controller.momentum);
        console.log('- Deceleration:', controller.deceleration);
    },
    
    // Demo 2: Adjust sensitivity
    adjustSensitivity(value = 0.3) {
        const controller = this.getController();
        if (!controller) return;
        
        controller.setSensitivity(value);
        console.log(`🎚️ Sensitivity adjusted to: ${value}`);
        console.log('Try scrolling now - it should feel more responsive!');
    },
    
    // Demo 2.5: Test ultra-smooth scrolling
    testUltraSmooth() {
        const controller = this.getController();
        if (!controller) return;
        
        controller.setSensitivity(0.2);
        controller.setMomentum(0.7);
        controller.setDeceleration(0.94);
        console.log('🌊 Ultra-smooth scrolling activated!');
        console.log('Settings: Sensitivity=0.2, Momentum=0.7, Deceleration=0.94');
        console.log('Try scrolling now - it should be very gentle and smooth!');
    },
    
    // Demo 2.6: Test smooth scrolling toggle
    testSmoothToggle() {
        const controller = this.getController();
        if (!controller) return;
        
        console.log('🔄 Testing smooth scrolling toggle...');
        console.log('Current state:', controller.isEnabled ? 'Enabled' : 'Disabled');
        
        // Toggle smooth scrolling
        controller.toggleSmoothScroll();
        
        console.log('New state:', controller.isEnabled ? 'Enabled' : 'Disabled');
        console.log('Try scrolling now to see the difference!');
    },
    
    // Demo 3: Adjust momentum
    adjustMomentum(value = 0.9) {
        const controller = this.getController();
        if (!controller) return;
        
        controller.setMomentum(value);
        console.log(`⚡ Momentum adjusted to: ${value}`);
        console.log('Try scrolling now - it should have more momentum!');
    },
    
    // Demo 4: Adjust deceleration
    adjustDeceleration(value = 0.98) {
        const controller = this.getController();
        if (!controller) return;
        
        controller.setDeceleration(value);
        console.log(`🛑 Deceleration adjusted to: ${value}`);
        console.log('Try scrolling now - it should decelerate more slowly!');
    },
    
    // Demo 5: Navigate to specific years
    navigateToYear(year = 2015) {
        const controller = this.getController();
        if (!controller) return;
        
        console.log(`🚀 Navigating to year ${year}...`);
        controller.scrollToYear(year, 2.0);
    },
    
    // Demo 6: Test different scroll behaviors
    testScrollBehaviors() {
        console.log('🧪 Testing different scroll behaviors...');
        
        // Test high sensitivity
        this.adjustSensitivity(2.0);
        setTimeout(() => {
            console.log('High sensitivity test complete');
            
            // Test low sensitivity
            this.adjustSensitivity(0.5);
            setTimeout(() => {
                console.log('Low sensitivity test complete');
                
                // Test high momentum
                this.adjustMomentum(0.9);
                setTimeout(() => {
                    console.log('High momentum test complete');
                    
                    // Test low momentum
                    this.adjustMomentum(0.3);
                    setTimeout(() => {
                        console.log('Low momentum test complete');
                        
                        // Reset to defaults
                        this.resetToDefaults();
                        console.log('✅ All tests complete! Reset to defaults.');
                    }, 2000);
                }, 2000);
            }, 2000);
        }, 2000);
    },
    
    // Demo 7: Reset to default settings
    resetToDefaults() {
        const controller = this.getController();
        if (!controller) return;
        
        controller.setSensitivity(0.3);
        controller.setMomentum(0.6);
        controller.setDeceleration(0.92);
        console.log('🔄 Reset to default settings (smooth and subtle)');
    },
    
    // Demo 8: Enable/disable smooth scrolling
    toggleSmoothScroll() {
        const controller = this.getController();
        if (!controller) return;
        
        if (controller.isEnabled) {
            controller.disable();
            console.log('❌ Smooth scrolling disabled');
        } else {
            controller.enable();
            console.log('✅ Smooth scrolling enabled');
        }
    },
    
    // Demo 9: Show current settings
    showSettings() {
        const controller = this.getController();
        if (!controller) return;
        
        console.log('📊 Current Smooth Scroll Settings:');
        console.log('- Enabled:', controller.isEnabled);
        console.log('- Sensitivity:', controller.scrollSensitivity);
        console.log('- Momentum:', controller.momentum);
        console.log('- Deceleration:', controller.deceleration);
        console.log('- Current Scene:', controller.timelineController.getCurrentSceneName());
        console.log('- Current Year:', controller.timelineController.getCurrentYear());
    },
    
    // Demo 10: Performance test
    performanceTest() {
        console.log('⚡ Starting performance test...');
        const startTime = performance.now();
        
        // Perform multiple scroll operations
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                this.navigateToYear(2010 + i);
            }, i * 200);
        }
        
        setTimeout(() => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            console.log(`⏱️ Performance test completed in ${duration.toFixed(2)}ms`);
        }, 3000);
    },
    
    // Demo 11: Interactive tutorial
    startTutorial() {
        console.log('🎓 Starting Smooth Scroll Tutorial...');
        console.log('');
        console.log('Step 1: Basic Scrolling');
        console.log('Scroll your mouse wheel to navigate through the timeline');
        console.log('');
        
        setTimeout(() => {
            console.log('Step 2: Adjust Sensitivity');
            console.log('Try: SmoothScrollDemo.adjustSensitivity(1.5)');
            console.log('');
        }, 3000);
        
        setTimeout(() => {
            console.log('Step 3: Adjust Momentum');
            console.log('Try: SmoothScrollDemo.adjustMomentum(0.9)');
            console.log('');
        }, 6000);
        
        setTimeout(() => {
            console.log('Step 4: Quick Navigation');
            console.log('Try: SmoothScrollDemo.navigateToYear(2015)');
            console.log('');
        }, 9000);
        
        setTimeout(() => {
            console.log('Step 5: Debug Panel');
            console.log('Open the debug panel (top-right) to access smooth scroll controls');
            console.log('');
        }, 12000);
        
        setTimeout(() => {
            console.log('🎉 Tutorial complete! Explore the smooth scrolling features.');
        }, 15000);
    },
    
    // Demo 12: Show all available methods
    showHelp() {
        console.log('📚 Smooth Scroll Demo - Available Methods:');
        console.log('');
        console.log('Basic Tests:');
        console.log('- SmoothScrollDemo.testBasicScrolling()');
        console.log('- SmoothScrollDemo.testScrollBehaviors()');
        console.log('- SmoothScrollDemo.testUltraSmooth()');
        console.log('- SmoothScrollDemo.testSmoothToggle()');
        console.log('- SmoothScrollDemo.performanceTest()');
        console.log('');
        console.log('Parameter Adjustment:');
        console.log('- SmoothScrollDemo.adjustSensitivity(value)');
        console.log('- SmoothScrollDemo.adjustMomentum(value)');
        console.log('- SmoothScrollDemo.adjustDeceleration(value)');
        console.log('');
        console.log('Navigation:');
        console.log('- SmoothScrollDemo.navigateToYear(year)');
        console.log('- SmoothScrollDemo.toggleSmoothScroll()');
        console.log('');
        console.log('Information:');
        console.log('- SmoothScrollDemo.showSettings()');
        console.log('- SmoothScrollDemo.showHelp()');
        console.log('');
        console.log('Tutorial:');
        console.log('- SmoothScrollDemo.startTutorial()');
        console.log('');
        console.log('Reset:');
        console.log('- SmoothScrollDemo.resetToDefaults()');
    }
};

// Auto-start tutorial when script is loaded
console.log('🎯 GSAP Smooth Scroll Demo loaded!');
console.log('Type "SmoothScrollDemo.showHelp()" to see all available methods');
console.log('Type "SmoothScrollDemo.startTutorial()" to begin the interactive tutorial');

// Make the demo globally accessible
window.SmoothScrollDemo = window.SmoothScrollDemo; 