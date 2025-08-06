import { gsap } from 'gsap';

export class DebugPanel {
    constructor() {
        this.debugPanel = null;
        this.controls = {};
        this.isCollapsed = false;
        this.sectionStates = {
            typography: false,
            spotlight: false,
            camera: false,
            enlargement: false
        };
        
        this.init();
    }
    
    init() {
        // Create debug panel
        this.debugPanel = document.createElement('div');
        this.debugPanel.style.position = 'absolute';
        this.debugPanel.style.top = '20px';
        this.debugPanel.style.right = '20px';
        this.debugPanel.style.background = 'rgba(0, 0, 0, 0.8)';
        this.debugPanel.style.color = 'white';
        this.debugPanel.style.padding = '20px';
        this.debugPanel.style.borderRadius = '8px';
        this.debugPanel.style.fontFamily = 'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        this.debugPanel.style.fontSize = '14px';
        this.debugPanel.style.minWidth = '250px';
        this.debugPanel.style.zIndex = '1001';

        this.debugPanel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: #00ff88;">Debug Panel</h3>
                <button id="toggleDebugPanel" style="background: #333; color: white; border: 1px solid #555; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-family: inherit; font-size: 12px;">−</button>
            </div>
            <div id="debugPanelContent">
            
            <!-- Typography Section -->
            <div class="debug-section" style="margin-bottom: 15px;">
                <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; padding: 8px 0; border-bottom: 1px solid #333;">
                    <h4 style="margin: 0; color: #00ff88;">Typography</h4>
                    <button class="section-toggle" data-section="typography" style="background: #333; color: white; border: 1px solid #555; padding: 2px 6px; border-radius: 3px; cursor: pointer; font-family: inherit; font-size: 10px;">+</button>
                </div>
                <div class="section-content" id="typography-content" style="display: none; padding-top: 10px;">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px;">Header Font Size: <span id="headerSize">48</span>px</label>
                        <input type="range" id="headerSlider" min="20" max="80" value="48" style="width: 100%;">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px;">Body Font Size: <span id="bodySize">24</span>px</label>
                        <input type="range" id="bodySlider" min="12" max="40" value="24" style="width: 100%;">
                    </div>
                </div>
            </div>
            
            <!-- Spotlight Effect Section -->
            <div class="debug-section" style="margin-bottom: 15px;">
                <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; padding: 8px 0; border-bottom: 1px solid #333;">
                    <h4 style="margin: 0; color: #00ff88;">Spotlight Effect</h4>
                    <button class="section-toggle" data-section="spotlight" style="background: #333; color: white; border: 1px solid #555; padding: 2px 6px; border-radius: 3px; cursor: pointer; font-family: inherit; font-size: 10px;">+</button>
                </div>
                <div class="section-content" id="spotlight-content" style="display: none; padding-top: 10px;">
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 5px;">Spotlight Radius: <span id="spotlightRadius">2</span></label>
                        <input type="range" id="spotlightRadiusSlider" min="0.5" max="5" step="0.1" value="2" style="width: 100%;">
                    </div>
                    

                    
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 5px;">Vignette Opacity: <span id="vignetteOpacity">1.0</span></label>
                        <input type="range" id="vignetteSlider" min="0.5" max="1.0" step="0.1" value="1.0" style="width: 100%;">
                    </div>
                    
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 5px;">Grid Opacity: <span id="gridOpacity">0.4</span></label>
                        <input type="range" id="gridSlider" min="0.1" max="1.0" step="0.1" value="0.4" style="width: 100%;">
                    </div>
                </div>
            </div>
            
            <!-- Timeline Camera Section -->
            <div class="debug-section" style="margin-bottom: 15px;">
                <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; padding: 8px 0; border-bottom: 1px solid #333;">
                    <h4 style="margin: 0; color: #00ff88;">Timeline Camera</h4>
                    <button class="section-toggle" data-section="camera" style="background: #333; color: white; border: 1px solid #555; padding: 2px 6px; border-radius: 3px; cursor: pointer; font-family: inherit; font-size: 10px;">+</button>
                </div>
                <div class="section-content" id="camera-content" style="display: none; padding-top: 10px;">
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 5px;">Camera X: <span id="cameraX">0</span></label>
                        <input type="range" id="cameraXSlider" min="-5" max="25" step="0.5" value="0" style="width: 100%;">
                    </div>
                    
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 5px;">Camera Y: <span id="cameraY">0</span></label>
                        <input type="range" id="cameraYSlider" min="-20" max="20" step="0.5" value="0" style="width: 100%;">
                    </div>
                    
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 5px;">Camera Z: <span id="cameraZ">8</span></label>
                        <input type="range" id="cameraZSlider" min="5" max="20" step="0.5" value="8" style="width: 100%;">
                    </div>
                    
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 5px;">Target Y: <span id="targetY">0</span></label>
                        <input type="range" id="targetYSlider" min="-10" max="10" step="0.5" value="0" style="width: 100%;">
                    </div>
                    
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 5px;">FOV: <span id="cameraFov">30</span></label>
                        <input type="range" id="cameraFovSlider" min="30" max="90" step="1" value="30" style="width: 100%;">
                    </div>
                    
                    <div style="margin-bottom: 10px;">
                        <button id="goToInitialBtn" style="background: #ff6b6b; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-family: inherit; margin-right: 8px;">Go to Initial</button>
                        <button id="goToTimelineBtn" style="background: #4ecdc4; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-family: inherit; margin-right: 8px;">Go to Timeline</button>
                        <button id="testVibrationBtn" style="background: #ffd93d; color: black; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-family: inherit; margin-top: 8px; width: 100%;">Test Vibration</button>
                    </div>
                </div>
            </div>
            
            <!-- Image Enlargement Section -->
            <div class="debug-section" style="margin-bottom: 15px;">
                <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; padding: 8px 0; border-bottom: 1px solid #333;">
                    <h4 style="margin: 0; color: #00ff88;">Image Enlargement</h4>
                    <button class="section-toggle" data-section="enlargement" style="background: #333; color: white; border: 1px solid #555; padding: 2px 6px; border-radius: 3px; cursor: pointer; font-family: inherit; font-size: 10px;">+</button>
                </div>
                <div class="section-content" id="enlargement-content" style="display: none; padding-top: 10px;">
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 5px;">Background Blur: <span id="backgroundBlur">5</span>px</label>
                        <input type="range" id="backgroundBlurSlider" min="0" max="20" step="0.5" value="5" style="width: 100%;">
                    </div>
                    
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 5px;">Blur Opacity: <span id="blurOpacity">0.8</span></label>
                        <input type="range" id="blurOpacitySlider" min="0.1" max="1.0" step="0.1" value="0.8" style="width: 100%;">
                    </div>
                    
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 5px;">Left Blur Width: <span id="leftBlurWidth">4</span>%</label>
                        <input type="range" id="leftBlurWidthSlider" min="0" max="50" step="0.5" value="4" style="width: 100%;">
                    </div>
                    
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 5px;">Right Blur Width: <span id="rightBlurWidth">4</span>%</label>
                        <input type="range" id="rightBlurWidthSlider" min="0" max="50" step="0.5" value="4" style="width: 100%;">
                    </div>
                </div>
            </div>
            
            <!-- Smooth Scroll Section -->
            <div class="debug-section" style="margin-bottom: 15px;">
                <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; padding: 8px 0; border-bottom: 1px solid #333;">
                    <h4 style="margin: 0; color: #00ff88;">Smooth Scroll</h4>
                    <button class="section-toggle" data-section="smoothScroll" style="background: #333; color: white; border: 1px solid #555; padding: 2px 6px; border-radius: 3px; cursor: pointer; font-family: inherit; font-size: 10px;">+</button>
                </div>
                <div class="section-content" id="smoothScroll-content" style="display: none; padding-top: 10px;">
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 5px;">Sensitivity: <span id="smoothScrollSensitivityDisplay">0.25</span></label>
                        <input type="range" id="smoothScrollSensitivitySlider" min="0.1" max="1.0" step="0.05" value="0.25" style="width: 100%;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 5px;">Friction: <span id="smoothScrollFrictionDisplay">0.85</span></label>
                        <input type="range" id="smoothScrollFrictionSlider" min="0.7" max="0.95" step="0.01" value="0.85" style="width: 100%;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <button id="scrollToYearBtn" style="background: #9c27b0; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-family: inherit; margin-right: 8px;">Scroll to 2015</button>
                        <button id="scrollToYearBtn2" style="background: #ff9800; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-family: inherit;">Scroll to 2019</button>
                    </div>
                </div>
            </div>
            
            <button id="resetBtn" style="background: #00ff88; color: black; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-family: inherit;">Reset to Default</button>
            </div>
        `;

        document.body.appendChild(this.debugPanel);

        // Animate debug panel appearance
        this.debugPanel.style.opacity = '0';
        this.debugPanel.style.transform = 'translateX(20px)';

        gsap.to(this.debugPanel, {
            opacity: 1,
            x: 0,
            duration: 0.8,
            ease: "power2.out",
            delay: 0.8
        });
        
        this.setupControls();
    }
    
    setupControls() {
        // Get all control elements
        this.controls.headerSlider = document.getElementById('headerSlider');
        this.controls.bodySlider = document.getElementById('bodySlider');
        this.controls.headerSize = document.getElementById('headerSize');
        this.controls.bodySize = document.getElementById('bodySize');
        this.controls.resetBtn = document.getElementById('resetBtn');
        
        // Spotlight effect controls
        this.controls.spotlightRadiusSlider = document.getElementById('spotlightRadiusSlider');
        this.controls.blurSlider = document.getElementById('blurSlider');
        this.controls.vignetteSlider = document.getElementById('vignetteSlider');
        this.controls.gridSlider = document.getElementById('gridSlider');
        this.controls.spotlightRadiusDisplay = document.getElementById('spotlightRadius');

        this.controls.vignetteOpacityDisplay = document.getElementById('vignetteOpacity');
        this.controls.gridOpacityDisplay = document.getElementById('gridOpacity');
        
        // Timeline camera controls
        this.controls.cameraXSlider = document.getElementById('cameraXSlider');
        this.controls.cameraYSlider = document.getElementById('cameraYSlider');
        this.controls.cameraZSlider = document.getElementById('cameraZSlider');
        this.controls.targetYSlider = document.getElementById('targetYSlider');
        this.controls.cameraFovSlider = document.getElementById('cameraFovSlider');
        this.controls.cameraXDisplay = document.getElementById('cameraX');
        this.controls.cameraYDisplay = document.getElementById('cameraY');
        this.controls.cameraZDisplay = document.getElementById('cameraZ');
        this.controls.targetYDisplay = document.getElementById('targetY');
        this.controls.cameraFovDisplay = document.getElementById('cameraFov');
        this.controls.goToInitialBtn = document.getElementById('goToInitialBtn');
        this.controls.goToTimelineBtn = document.getElementById('goToTimelineBtn');
        this.controls.testVibrationBtn = document.getElementById('testVibrationBtn');
        
        // Background blur controls
        this.controls.backgroundBlurSlider = document.getElementById('backgroundBlurSlider');
        this.controls.blurOpacitySlider = document.getElementById('blurOpacitySlider');
        this.controls.backgroundBlurDisplay = document.getElementById('backgroundBlur');
        this.controls.blurOpacityDisplay = document.getElementById('blurOpacity');
        
        // Blur div width controls
        this.controls.leftBlurWidthSlider = document.getElementById('leftBlurWidthSlider');
        this.controls.rightBlurWidthSlider = document.getElementById('rightBlurWidthSlider');
        this.controls.leftBlurWidthDisplay = document.getElementById('leftBlurWidth');
        this.controls.rightBlurWidthDisplay = document.getElementById('rightBlurWidth');
        
        // Smooth scroll controls
        this.controls.smoothScrollSensitivitySlider = document.getElementById('smoothScrollSensitivitySlider');
        this.controls.smoothScrollFrictionSlider = document.getElementById('smoothScrollFrictionSlider');
        this.controls.smoothScrollSensitivityDisplay = document.getElementById('smoothScrollSensitivityDisplay');
        this.controls.smoothScrollFrictionDisplay = document.getElementById('smoothScrollFrictionDisplay');
        this.controls.scrollToYearBtn = document.getElementById('scrollToYearBtn');
        this.controls.scrollToYearBtn2 = document.getElementById('scrollToYearBtn2');
        
        // Debug panel toggle
        this.controls.toggleDebugPanel = document.getElementById('toggleDebugPanel');
        this.controls.debugPanelContent = document.getElementById('debugPanelContent');
        
        // Setup section toggles
        this.setupSectionToggles();
        
        // Add toggle functionality
        this.controls.toggleDebugPanel.addEventListener('click', () => {
            this.togglePanel();
        });
        
        // Add vibration test functionality
        this.controls.testVibrationBtn.addEventListener('click', () => {
            console.log('=== MANUAL VIBRATION TEST ===');
            
            // Test different vibration patterns
            if (navigator.vibrate) {
                console.log('Testing short vibration (10ms)...');
                navigator.vibrate(10);
                
                setTimeout(() => {
                    console.log('Testing medium vibration (50ms)...');
                    navigator.vibrate(50);
                }, 1000);
                
                setTimeout(() => {
                    console.log('Testing long vibration (200ms)...');
                    navigator.vibrate(200);
                }, 2000);
                
                setTimeout(() => {
                    console.log('Testing pattern vibration [100, 50, 100]...');
                    navigator.vibrate([100, 50, 100]);
                }, 3000);
            } else {
                console.log('❌ Vibration API not available');
                alert('Vibration API not supported on this device/browser');
            }
        });
    }
    
    setupSectionToggles() {
        // Get all section toggle buttons
        const toggleButtons = document.querySelectorAll('.section-toggle');
        
        toggleButtons.forEach(button => {
            const sectionName = button.getAttribute('data-section');
            const sectionContent = document.getElementById(`${sectionName}-content`);
            const sectionHeader = button.closest('.section-header');
            
            // Add click event to both button and header
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSection(sectionName, button, sectionContent);
            });
            
            sectionHeader.addEventListener('click', () => {
                this.toggleSection(sectionName, button, sectionContent);
            });
        });
    }
    
    toggleSection(sectionName, button, content) {
        this.sectionStates[sectionName] = !this.sectionStates[sectionName];
        
        if (this.sectionStates[sectionName]) {
            // Expand section
            gsap.to(content, {
                height: 'auto',
                opacity: 1,
                duration: 0.3,
                ease: "power2.out",
                onStart: () => {
                    content.style.display = 'block';
                    content.style.overflow = 'hidden';
                },
                onComplete: () => {
                    content.style.overflow = 'visible';
                }
            });
            button.textContent = '−';
        } else {
            // Collapse section
            gsap.to(content, {
                height: 0,
                opacity: 0,
                duration: 0.3,
                ease: "power2.out",
                onComplete: () => {
                    content.style.display = 'none';
                    content.style.overflow = 'hidden';
                }
            });
            button.textContent = '+';
        }
    }
    
    getControls() {
        return this.controls;
    }
    
    getDebugPanel() {
        return this.debugPanel;
    }
    
    updateDisplay(id, value) {
        if (this.controls[id]) {
            this.controls[id].textContent = value;
        }
    }
    
    togglePanel() {
        this.isCollapsed = !this.isCollapsed;
        
        if (this.isCollapsed) {
            // Collapse the panel
            gsap.to(this.controls.debugPanelContent, {
                height: 0,
                opacity: 0,
                duration: 0.3,
                ease: "power2.out",
                onComplete: () => {
                    this.controls.debugPanelContent.style.overflow = 'hidden';
                }
            });
            
            // Update toggle button
            this.controls.toggleDebugPanel.textContent = '+';
            this.controls.toggleDebugPanel.title = 'Expand Debug Panel';
        } else {
            // Expand the panel
            this.controls.debugPanelContent.style.overflow = 'visible';
            
            gsap.to(this.controls.debugPanelContent, {
                height: 'auto',
                opacity: 1,
                duration: 0.3,
                ease: "power2.out"
            });
            
            // Update toggle button
            this.controls.toggleDebugPanel.textContent = '−';
            this.controls.toggleDebugPanel.title = 'Collapse Debug Panel';
        }
    }
} 