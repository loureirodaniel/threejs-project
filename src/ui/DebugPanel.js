import { gsap } from 'gsap';

export class DebugPanel {
    constructor() {
        this.debugPanel = null;
        this.controls = {};
        
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
            <h3 style="margin: 0 0 15px 0; color: #00ff88;">Debug Panel</h3>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Header Font Size: <span id="headerSize">48</span>px</label>
                <input type="range" id="headerSlider" min="20" max="80" value="48" style="width: 100%;">
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Body Font Size: <span id="bodySize">24</span>px</label>
                <input type="range" id="bodySlider" min="12" max="40" value="24" style="width: 100%;">
            </div>
            
            <div style="margin-bottom: 15px; padding-top: 15px; border-top: 1px solid #333;">
                <h4 style="margin: 0 0 10px 0; color: #00ff88;">Spotlight Effect</h4>
                
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px;">Spotlight Radius: <span id="spotlightRadius">2</span></label>
                    <input type="range" id="spotlightRadiusSlider" min="0.5" max="5" step="0.1" value="2" style="width: 100%;">
                </div>
                
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px;">Blur Amount: <span id="blurAmount">0.6</span></label>
                    <input type="range" id="blurSlider" min="0.1" max="0.9" step="0.1" value="0.6" style="width: 100%;">
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
            
            <div style="margin-bottom: 15px; padding-top: 15px; border-top: 1px solid #333;">
                <h4 style="margin: 0 0 10px 0; color: #00ff88;">Timeline Camera</h4>
                
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
                    <label style="display: block; margin-bottom: 5px;">FOV: <span id="cameraFov">60</span></label>
                    <input type="range" id="cameraFovSlider" min="30" max="90" step="1" value="60" style="width: 100%;">
                </div>
                
                <div style="margin-bottom: 10px;">
                    <button id="goToInitialBtn" style="background: #ff6b6b; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-family: inherit; margin-right: 8px;">Go to Initial</button>
                    <button id="goToTimelineBtn" style="background: #4ecdc4; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-family: inherit;">Go to Timeline</button>
                </div>
            </div>
            
            <button id="resetBtn" style="background: #00ff88; color: black; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-family: inherit;">Reset to Default</button>
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
        this.controls.blurAmountDisplay = document.getElementById('blurAmount');
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
} 