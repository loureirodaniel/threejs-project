import * as THREE from 'three';

export class MouseController {
    constructor(camera) {
        this.camera = camera;
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        
        this.init();
    }
    
    init() {
        // Mouse move event for spotlight effect
        window.addEventListener('mousemove', this.onMouseMove.bind(this), false);
    }
    
    onMouseMove(event) {
        // Calculate mouse position in normalized device coordinates (-1 to +1)
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
    
    getMousePosition() {
        return this.mouse;
    }
    
    // Convert screen coordinates to world coordinates for the grid plane
    getWorldPosition() {
        const vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5);
        vector.unproject(this.camera);
        const dir = vector.sub(this.camera.position).normalize();
        const distance = -this.camera.position.z / dir.z;
        const pos = this.camera.position.clone().add(dir.multiplyScalar(distance));
        
        return pos;
    }
    
    getMouse() {
        return this.mouse;
    }
    
    getRaycaster() {
        return this.raycaster;
    }
} 