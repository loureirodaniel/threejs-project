import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class SceneManager {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.controls = null;
        this.isTransitioning = false;
        
        this.init();
    }
    
    init() {
        // Setup renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000, 1);
        console.log('🎨 Renderer clear color set to black');
        document.body.appendChild(this.renderer.domElement);
        
        // Setup camera
        this.camera.position.z = 5;
        
        // Setup controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = false;
        this.controls.enablePan = true;
        this.controls.enableRotate = false;
        
        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        
        // Listen for transition events
        window.addEventListener('sceneChange', this.onSceneChange.bind(this));
        window.addEventListener('sceneTransitionComplete', this.onSceneTransitionComplete.bind(this));
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    onSceneChange(event) {
        this.isTransitioning = true;
        this.controls.enabled = false;
    }
    
    onSceneTransitionComplete(event) {
        this.isTransitioning = false;
        this.controls.enabled = true;
    }
    
    render() {
        if (!this.isTransitioning) {
            this.controls.update();
        }
        this.renderer.render(this.scene, this.camera);
    }
    
    // Method to update controls without rendering (for external renderers)
    updateControls() {
        if (!this.isTransitioning) {
            this.controls.update();
        }
    }
    
    getScene() {
        return this.scene;
    }
    
    getCamera() {
        return this.camera;
    }
    
    getRenderer() {
        return this.renderer;
    }
    
    isInTransition() {
        return this.isTransitioning;
    }
} 