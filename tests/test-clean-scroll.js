/**
 * Clean Smooth Scroll Test
 * Tests the simplified, clean smooth scrolling implementation
 */

window.CleanScrollTest = {
    
    // Get the timeline controller instance
    getController() {
        if (window.app && window.app.timelineController) {
            return window.app.timelineController;
        }
        console.warn('Timeline controller not found.');
        return null;
    },
    
    // Test current settings
    testSettings() {
        const controller = this.getController();
        if (!controller) return;
        
        const settings = controller.getSmoothScrollSettings();
        console.log('🎯 Current Clean Scroll Settings:');
        console.log('- Sensitivity:', settings.sensitivity);
        console.log('- Friction:', settings.friction);
        console.log('- Current Scene:', controller.getCurrentSceneName());
        console.log('- Current Year:', controller.getCurrentYear());
    },
    
    // Test smooth scrolling
    testSmooth() {
        const controller = this.getController();
        if (!controller) return;
        
        console.log('🌊 Testing clean smooth scrolling...');
        console.log('Scroll your mouse wheel to see the smooth scrolling in action!');
        
        // Set optimal smooth settings
        controller.setSmoothScrollSensitivity(0.25);
        controller.setSmoothScrollFriction(0.85);
        
        console.log('✅ Clean smooth scrolling activated');
    },
    
    // Test responsive scrolling
    testResponsive() {
        const controller = this.getController();
        if (!controller) return;
        
        console.log('⚡ Testing responsive scrolling...');
        
        // Set responsive settings
        controller.setSmoothScrollSensitivity(0.5);
        controller.setSmoothScrollFriction(0.8);
        
        console.log('✅ Responsive scrolling activated');
    },
    
    // Test gentle scrolling
    testGentle() {
        const controller = this.getController();
        if (!controller) return;
        
        console.log('🕊️ Testing gentle scrolling...');
        
        // Set gentle settings
        controller.setSmoothScrollSensitivity(0.15);
        controller.setSmoothScrollFriction(0.9);
        
        console.log('✅ Gentle scrolling activated');
    },
    
    // Navigate to year
    navigateToYear(year) {
        const controller = this.getController();
        if (!controller) return;
        
        console.log(`🚀 Navigating to year ${year}...`);
        
        // Calculate offset based on year
        const yearRange = 2019 - 2010;
        const xRange = 18;
        const normalizedX = (year - 2010) / yearRange;
        const targetOffset = -4 + (normalizedX * xRange);
        
        controller.animateToYear(year, targetOffset);
    },
    
    // Show help
    showHelp() {
        console.log('📚 Clean Scroll Test - Available Methods:');
        console.log('');
        console.log('Information:');
        console.log('- CleanScrollTest.testSettings()');
        console.log('- CleanScrollTest.showHelp()');
        console.log('');
        console.log('Testing:');
        console.log('- CleanScrollTest.testSmooth()');
        console.log('- CleanScrollTest.testResponsive()');
        console.log('- CleanScrollTest.testGentle()');
        console.log('');
        console.log('Navigation:');
        console.log('- CleanScrollTest.navigateToYear(2015)');
        console.log('- CleanScrollTest.navigateToYear(2019)');
    }
};

// Auto-start when script is loaded
console.log('🎯 Clean Smooth Scroll Test loaded!');
console.log('Type "CleanScrollTest.showHelp()" to see all available methods');
console.log('Type "CleanScrollTest.testSmooth()" to test clean smooth scrolling');

// Make the test globally accessible
window.CleanScrollTest = window.CleanScrollTest; 