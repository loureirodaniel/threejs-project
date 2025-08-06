/**
 * Test script for integrated smooth scrolling
 * Run this in the browser console to test the smooth scrolling functionality
 */

window.SmoothScrollTest = {
    
    // Get the timeline controller instance
    getController() {
        if (window.app && window.app.timelineController) {
            return window.app.timelineController;
        }
        console.warn('Timeline controller not found. Make sure the app is initialized.');
        return null;
    },
    
    // Test current smooth scroll settings
    testSettings() {
        const controller = this.getController();
        if (!controller) return;
        
        const settings = controller.getSmoothScrollSettings();
        console.log('🎯 Current Smooth Scroll Settings:');
        console.log('- Sensitivity:', settings.sensitivity);
        console.log('- Momentum:', settings.momentum);
        console.log('- Deceleration:', settings.deceleration);
        console.log('- Current Scene:', controller.getCurrentSceneName());
        console.log('- Current Year:', controller.getCurrentYear());
    },
    
    // Test smooth scrolling with different settings
    testSmoothScrolling() {
        const controller = this.getController();
        if (!controller) return;
        
        console.log('🌊 Testing smooth scrolling...');
        console.log('Scroll your mouse wheel to see the smooth scrolling in action!');
        
        // Set to smooth settings
        controller.setSmoothScrollSensitivity(0.3);
        controller.setSmoothScrollMomentum(0.6);
        controller.setSmoothScrollDeceleration(0.92);
        
        console.log('✅ Smooth scrolling activated with gentle settings');
    },
    
    // Test ultra-smooth scrolling
    testUltraSmooth() {
        const controller = this.getController();
        if (!controller) return;
        
        console.log('🌊 Testing ultra-smooth scrolling...');
        
        // Set to ultra-smooth settings
        controller.setSmoothScrollSensitivity(0.2);
        controller.setSmoothScrollMomentum(0.7);
        controller.setSmoothScrollDeceleration(0.94);
        
        console.log('✅ Ultra-smooth scrolling activated');
        console.log('Scroll your mouse wheel - it should be very gentle and smooth!');
    },
    
    // Test responsive scrolling
    testResponsive() {
        const controller = this.getController();
        if (!controller) return;
        
        console.log('⚡ Testing responsive scrolling...');
        
        // Set to responsive settings
        controller.setSmoothScrollSensitivity(0.8);
        controller.setSmoothScrollMomentum(0.5);
        controller.setSmoothScrollDeceleration(0.9);
        
        console.log('✅ Responsive scrolling activated');
        console.log('Scroll your mouse wheel - it should be more responsive!');
    },
    
    // Navigate to specific years
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
    
    // Test all scrolling modes
    testAllModes() {
        console.log('🧪 Testing all smooth scrolling modes...');
        
        this.testSmoothScrolling();
        
        setTimeout(() => {
            console.log('Switching to ultra-smooth mode...');
            this.testUltraSmooth();
        }, 3000);
        
        setTimeout(() => {
            console.log('Switching to responsive mode...');
            this.testResponsive();
        }, 6000);
        
        setTimeout(() => {
            console.log('Resetting to default smooth settings...');
            this.testSmoothScrolling();
        }, 9000);
    },
    
    // Show help
    showHelp() {
        console.log('📚 Smooth Scroll Test - Available Methods:');
        console.log('');
        console.log('Information:');
        console.log('- SmoothScrollTest.testSettings()');
        console.log('- SmoothScrollTest.showHelp()');
        console.log('');
        console.log('Testing:');
        console.log('- SmoothScrollTest.testSmoothScrolling()');
        console.log('- SmoothScrollTest.testUltraSmooth()');
        console.log('- SmoothScrollTest.testResponsive()');
        console.log('- SmoothScrollTest.testAllModes()');
        console.log('');
        console.log('Navigation:');
        console.log('- SmoothScrollTest.navigateToYear(2015)');
        console.log('- SmoothScrollTest.navigateToYear(2019)');
    }
};

// Auto-start when script is loaded
console.log('🎯 Integrated Smooth Scroll Test loaded!');
console.log('Type "SmoothScrollTest.showHelp()" to see all available methods');
console.log('Type "SmoothScrollTest.testSmoothScrolling()" to test smooth scrolling');

// Make the test globally accessible
window.SmoothScrollTest = window.SmoothScrollTest; 