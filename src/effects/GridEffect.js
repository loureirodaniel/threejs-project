import * as THREE from 'three';

export class GridEffect {
    constructor(scene) {
        this.scene = scene;
        this.grid = null;
        this.gridSize = 50;
        this.gridDivisions = 25;
        
        this.init();
    }
    
    init() {
        const gridMaterial = new THREE.LineBasicMaterial({ 
            color: 0x666666,
            transparent: true, 
            opacity: 0.4 
        });

        // Create grid geometry for entire scene
        const gridGeometry = new THREE.BufferGeometry();
        const gridPoints = [];

        // Create horizontal lines covering entire scene
        for (let i = 0; i <= this.gridDivisions; i++) {
            const y = (i / this.gridDivisions - 0.5) * this.gridSize;
            gridPoints.push(-this.gridSize/2, y, 0, this.gridSize/2, y, 0);
        }

        // Create vertical lines covering entire scene
        for (let i = 0; i <= this.gridDivisions; i++) {
            const x = (i / this.gridDivisions - 0.5) * this.gridSize;
            gridPoints.push(x, -this.gridSize/2, 0, x, this.gridSize/2, 0);
        }

        gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridPoints, 3));
        this.grid = new THREE.LineSegments(gridGeometry, gridMaterial);
        this.grid.position.z = -2; // Place grid further back
        this.scene.add(this.grid);
    }
    
    setOpacity(opacity) {
        this.grid.material.opacity = opacity;
    }
    
    getOpacity() {
        return this.grid.material.opacity;
    }
    
    getGrid() {
        return this.grid;
    }
} 