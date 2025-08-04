import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gsap } from 'gsap';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);
document.body.appendChild(renderer.domElement);

// Create static full-scene grid background
const gridSize = 50; // Larger size for the entire grid
const gridDivisions = 25; // Fewer divisions for larger grid sections
const gridMaterial = new THREE.LineBasicMaterial({ 
    color: 0x666666, // Light gray grid lines
    transparent: true, 
    opacity: 0.4 
});

// Create grid geometry for entire scene
const gridGeometry = new THREE.BufferGeometry();
const gridPoints = [];

// Create horizontal lines covering entire scene
for (let i = 0; i <= gridDivisions; i++) {
    const y = (i / gridDivisions - 0.5) * gridSize;
    gridPoints.push(-gridSize/2, y, 0, gridSize/2, y, 0);
}

// Create vertical lines covering entire scene
for (let i = 0; i <= gridDivisions; i++) {
    const x = (i / gridDivisions - 0.5) * gridSize;
    gridPoints.push(x, -gridSize/2, 0, x, gridSize/2, 0);
}

gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridPoints, 3));
const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
grid.position.z = -2; // Place grid further back
scene.add(grid);

// Create vignette effect that covers the entire scene
const vignetteGeometry = new THREE.PlaneGeometry(gridSize * 2, gridSize * 2);
const vignetteMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x000000,
    transparent: true,
    opacity: 1.0 // Completely opaque to hide the grid by default
});
const vignette = new THREE.Mesh(vignetteGeometry, vignetteMaterial);
vignette.position.z = -1; // Position between grid and camera
scene.add(vignette);

// Create spotlight that removes the vignette effect with blur
const spotlightRadius = 2; // Smaller radius for more focused effect
const spotlightSegments = 64; // More segments for smoother circle

// Create a gradient texture for the spotlight with blur on edges
const canvas = document.createElement('canvas');
canvas.width = 256;
canvas.height = 256;
const ctx = canvas.getContext('2d');

// Create radial gradient for blur effect
const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
gradient.addColorStop(0, 'rgba(0, 0, 0, 0)'); // Completely transparent center
gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0)'); // Still transparent
gradient.addColorStop(1, 'rgba(0, 0, 0, 1.0)'); // Completely opaque edge matching vignette

ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 256, 256);

const spotlightTexture = new THREE.CanvasTexture(canvas);
const spotlightGeometry = new THREE.CircleGeometry(spotlightRadius, spotlightSegments);
const spotlightMaterial = new THREE.MeshBasicMaterial({ 
    map: spotlightTexture,
    transparent: true,
    side: THREE.DoubleSide
});
const spotlight = new THREE.Mesh(spotlightGeometry, spotlightMaterial);
spotlight.position.z = -0.8; // Position between vignette and camera
scene.add(spotlight);

// Mouse tracking
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 10, 5);
scene.add(directionalLight);

// Scene is now clean and ready for text overlay

// Add text using HTML overlay for better quality
const titleDiv = document.createElement('div');
titleDiv.style.position = 'absolute';
titleDiv.style.top = '50%';
titleDiv.style.left = '50%';
titleDiv.style.transform = 'translate(-50%, -50%)';
titleDiv.style.textAlign = 'center';
titleDiv.style.color = 'white';
titleDiv.style.fontFamily = 'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
titleDiv.style.fontSize = '48px';
titleDiv.style.fontWeight = 'bold';
titleDiv.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
titleDiv.style.zIndex = '1000';
titleDiv.style.opacity = '0';
titleDiv.style.scale = '0.8';
titleDiv.innerHTML = 'THREE.JS PROJECT<br><span id="subtitle" style="font-size: 24px; font-weight: normal; color: #cccccc;">Welcome to the 3D World</span>';
document.body.appendChild(titleDiv);

// Animate text appearance with GSAP
gsap.to(titleDiv, {
    opacity: 1,
    scale: 1,
    duration: 1.2,
    ease: "back.out(1.7)",
    delay: 0.3
});

// Create debug panel
const debugPanel = document.createElement('div');
debugPanel.style.position = 'absolute';
debugPanel.style.top = '20px';
debugPanel.style.right = '20px';
debugPanel.style.background = 'rgba(0, 0, 0, 0.8)';
debugPanel.style.color = 'white';
debugPanel.style.padding = '20px';
debugPanel.style.borderRadius = '8px';
debugPanel.style.fontFamily = 'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
debugPanel.style.fontSize = '14px';
debugPanel.style.minWidth = '250px';
debugPanel.style.zIndex = '1001';

debugPanel.innerHTML = `
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
    
    <button id="resetBtn" style="background: #00ff88; color: black; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-family: inherit;">Reset to Default</button>
`;

document.body.appendChild(debugPanel);

// Animate debug panel appearance
debugPanel.style.opacity = '0';
debugPanel.style.transform = 'translateX(20px)';

gsap.to(debugPanel, {
    opacity: 1,
    x: 0,
    duration: 0.8,
    ease: "power2.out",
    delay: 0.8
});

// Add event listeners for the sliders
const headerSlider = document.getElementById('headerSlider');
const bodySlider = document.getElementById('bodySlider');
const headerSize = document.getElementById('headerSize');
const bodySize = document.getElementById('bodySize');
const subtitle = document.getElementById('subtitle');
const resetBtn = document.getElementById('resetBtn');

// Spotlight effect controls
const spotlightRadiusSlider = document.getElementById('spotlightRadiusSlider');
const blurSlider = document.getElementById('blurSlider');
const vignetteSlider = document.getElementById('vignetteSlider');
const gridSlider = document.getElementById('gridSlider');
const spotlightRadiusDisplay = document.getElementById('spotlightRadius');
const blurAmountDisplay = document.getElementById('blurAmount');
const vignetteOpacityDisplay = document.getElementById('vignetteOpacity');
const gridOpacityDisplay = document.getElementById('gridOpacity');

// Function to center the text
function centerText() {
    titleDiv.style.top = '50%';
    titleDiv.style.left = '50%';
    titleDiv.style.transform = 'translate(-50%, -50%)';
}

headerSlider.addEventListener('input', (e) => {
    const size = e.target.value;
    titleDiv.style.fontSize = size + 'px';
    headerSize.textContent = size;
    centerText(); // Re-center after font size change
});

bodySlider.addEventListener('input', (e) => {
    const size = e.target.value;
    subtitle.style.fontSize = size + 'px';
    bodySize.textContent = size;
    centerText(); // Re-center after font size change
});

resetBtn.addEventListener('click', () => {
    headerSlider.value = 48;
    bodySlider.value = 24;
    titleDiv.style.fontSize = '48px';
    subtitle.style.fontSize = '24px';
    headerSize.textContent = '48';
    bodySize.textContent = '24';
    centerText(); // Re-center after reset
    
    // Reset spotlight effect
    spotlightRadiusSlider.value = 2;
    blurSlider.value = 0.6;
    vignetteSlider.value = 1.0;
    gridSlider.value = 0.4;
    updateSpotlightEffect();
});

// Function to update spotlight effect
function updateSpotlightEffect() {
    const radius = parseFloat(spotlightRadiusSlider.value);
    const blur = parseFloat(blurSlider.value);
    const vignetteOpacity = parseFloat(vignetteSlider.value);
    const gridOpacity = parseFloat(gridSlider.value);
    
    // Update displays
    spotlightRadiusDisplay.textContent = radius;
    blurAmountDisplay.textContent = blur;
    vignetteOpacityDisplay.textContent = vignetteOpacity;
    gridOpacityDisplay.textContent = gridOpacity;
    
    // Update spotlight radius
    spotlight.geometry.dispose();
    spotlight.geometry = new THREE.CircleGeometry(radius, 64);
    
    // Update gradient texture
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(blur, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(0, 0, 0, ${vignetteOpacity})`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    
    spotlight.material.map.dispose();
    spotlight.material.map = new THREE.CanvasTexture(canvas);
    spotlight.material.needsUpdate = true;
    
    // Update vignette opacity
    vignette.material.opacity = vignetteOpacity;
    
    // Update grid opacity
    grid.material.opacity = gridOpacity;
}

// Add event listeners for spotlight controls
spotlightRadiusSlider.addEventListener('input', updateSpotlightEffect);
blurSlider.addEventListener('input', updateSpotlightEffect);
vignetteSlider.addEventListener('input', updateSpotlightEffect);
gridSlider.addEventListener('input', updateSpotlightEffect);

// Camera position
camera.position.z = 5;

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = false; // Disable zoom
controls.enablePan = true; // Keep panning enabled
controls.enableRotate = false; // Disable rotation to keep grid static

// Handle window resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Mouse move event for spotlight effect
window.addEventListener('mousemove', (event) => {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Convert screen coordinates to world coordinates for the grid plane
    const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
    vector.unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    const pos = camera.position.clone().add(dir.multiplyScalar(distance));
    
    // Update spotlight position
    spotlight.position.x = pos.x;
    spotlight.position.y = pos.y;
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update controls
    controls.update();
    
    renderer.render(scene, camera);
}

animate(); 