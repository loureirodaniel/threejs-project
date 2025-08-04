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
titleDiv.innerHTML = 'THREE.JS PROJECT<br><span id="subtitle" style="font-size: 24px; font-weight: normal; color: #cccccc;">Welcome to the 3D World</span>';
document.body.appendChild(titleDiv);

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
    
    <button id="resetBtn" style="background: #00ff88; color: black; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-family: inherit;">Reset to Default</button>
`;

document.body.appendChild(debugPanel);

// Add event listeners for the sliders
const headerSlider = document.getElementById('headerSlider');
const bodySlider = document.getElementById('bodySlider');
const headerSize = document.getElementById('headerSize');
const bodySize = document.getElementById('bodySize');
const subtitle = document.getElementById('subtitle');
const resetBtn = document.getElementById('resetBtn');

headerSlider.addEventListener('input', (e) => {
    const size = e.target.value;
    titleDiv.style.fontSize = size + 'px';
    headerSize.textContent = size;
});

bodySlider.addEventListener('input', (e) => {
    const size = e.target.value;
    subtitle.style.fontSize = size + 'px';
    bodySize.textContent = size;
});

resetBtn.addEventListener('click', () => {
    headerSlider.value = 48;
    bodySlider.value = 24;
    titleDiv.style.fontSize = '48px';
    subtitle.style.fontSize = '24px';
    headerSize.textContent = '48';
    bodySize.textContent = '24';
});

// Camera position
camera.position.z = 5;

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Handle window resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update controls
    controls.update();
    
    renderer.render(scene, camera);
}

animate(); 