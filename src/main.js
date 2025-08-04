import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gsap } from 'gsap';

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

// Create a cube
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshPhongMaterial({ 
    color: 0x00ff00,
    shininess: 100
});
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Add some additional cubes for visual interest
for (let i = 0; i < 5; i++) {
    const cubeGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const cubeMaterial = new THREE.MeshPhongMaterial({ 
        color: Math.random() * 0xffffff,
        shininess: 50
    });
    const smallCube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    smallCube.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
    );
    scene.add(smallCube);
}

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
    
    // Rotate the main cube
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    
    // Update controls
    controls.update();
    
    renderer.render(scene, camera);
}

animate(); 