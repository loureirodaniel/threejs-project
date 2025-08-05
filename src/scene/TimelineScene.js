import * as THREE from 'three';

export class TimelineScene {
    constructor(scene) {
        this.scene = scene;
        this.timelineElements = [];
        this.timelineGroup = new THREE.Group();
        this.isActive = false;
        this.animationProgress = 0;
        
        this.init();
    }
    
    init() {
        // Add timeline group to scene
        this.scene.add(this.timelineGroup);
        
        // Create timeline elements
        this.createTimelineElements();
        
        // Initially hide timeline
        this.timelineGroup.visible = false;
    }
    
    createTimelineElements() {
        // Create timeline line
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-8, 0, 0),
            new THREE.Vector3(8, 0, 0)
        ]);
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0xffffff, 
            transparent: true, 
            opacity: 0.6 
        });
        const timelineLine = new THREE.Line(lineGeometry, lineMaterial);
        this.timelineGroup.add(timelineLine);
        
        // Create timeline nodes/events
        const events = [
            { year: '2020', title: 'Event 1', position: new THREE.Vector3(-6, 0, 0) },
            { year: '2021', title: 'Event 2', position: new THREE.Vector3(-2, 0, 0) },
            { year: '2022', title: 'Event 3', position: new THREE.Vector3(2, 0, 0) },
            { year: '2023', title: 'Event 4', position: new THREE.Vector3(6, 0, 0) }
        ];
        
        events.forEach((event, index) => {
            const eventGroup = this.createTimelineEvent(event, index);
            this.timelineElements.push(eventGroup);
            this.timelineGroup.add(eventGroup);
        });
        
        // Create floating particles around timeline
        this.createParticles();
    }
    
    createTimelineEvent(event, index) {
        const group = new THREE.Group();
        
        // Create node circle
        const nodeGeometry = new THREE.CircleGeometry(0.3, 32);
        const nodeMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ffff, 
            transparent: true, 
            opacity: 0.8 
        });
        const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
        node.position.copy(event.position);
        group.add(node);
        
        // Create year text (simplified as a small cube for now)
        const yearGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const yearMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const yearCube = new THREE.Mesh(yearGeometry, yearMaterial);
        yearCube.position.copy(event.position);
        yearCube.position.y = 0.8;
        group.add(yearCube);
        
        // Create title text (simplified as a small cube for now)
        const titleGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
        const titleMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const titleCube = new THREE.Mesh(titleGeometry, titleMaterial);
        titleCube.position.copy(event.position);
        titleCube.position.y = -0.8;
        group.add(titleCube);
        
        // Add glow effect
        const glowGeometry = new THREE.CircleGeometry(0.5, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ffff, 
            transparent: true, 
            opacity: 0.3 
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.copy(event.position);
        glow.position.z = -0.1;
        group.add(glow);
        
        // Store original position for animations
        group.userData = {
            originalPosition: event.position.clone(),
            index: index,
            year: event.year,
            title: event.title
        };
        
        return group;
    }
    
    createParticles() {
        const particleCount = 50;
        const particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 20; // x
            positions[i * 3 + 1] = (Math.random() - 0.5) * 10; // y
            positions[i * 3 + 2] = (Math.random() - 0.5) * 10; // z
            
            colors[i * 3] = Math.random() * 0.5 + 0.5; // r
            colors[i * 3 + 1] = Math.random() * 0.5 + 0.5; // g
            colors[i * 3 + 2] = 1.0; // b
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.6
        });
        
        this.particles = new THREE.Points(particleGeometry, particleMaterial);
        this.timelineGroup.add(this.particles);
    }
    
    activate() {
        this.isActive = true;
        this.timelineGroup.visible = true;
        this.animationProgress = 0;
        
        // Animate timeline elements in
        this.animateIn();
    }
    
    deactivate() {
        this.isActive = false;
        this.timelineGroup.visible = false;
        
        // Reset all elements
        this.timelineElements.forEach((element, index) => {
            element.position.copy(element.userData.originalPosition);
            element.scale.setScalar(0);
            element.material.opacity = 0;
        });
    }
    
    animateIn() {
        // Staggered animation for timeline elements
        this.timelineElements.forEach((element, index) => {
            setTimeout(() => {
                this.animateElementIn(element);
            }, index * 200);
        });
    }
    
    animateElementIn(element) {
        const originalPosition = element.userData.originalPosition;
        const targetPosition = originalPosition.clone();
        
        // Start from above
        element.position.copy(originalPosition);
        element.position.y += 5;
        element.scale.setScalar(0);
        
        // Animate to target position
        const duration = 1000;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = this.easeOutBack(progress);
            
            element.position.y = originalPosition.y + (5 * (1 - easedProgress));
            element.scale.setScalar(easedProgress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
    
    update(time) {
        if (!this.isActive) return;
        
        // Animate particles
        if (this.particles) {
            this.particles.rotation.y += 0.001;
            this.particles.rotation.x += 0.0005;
        }
        
        // Animate timeline elements
        this.timelineElements.forEach((element, index) => {
            // Subtle floating animation
            element.position.y = element.userData.originalPosition.y + Math.sin(time * 0.001 + index) * 0.1;
            
            // Subtle rotation
            element.rotation.z = Math.sin(time * 0.0005 + index) * 0.05;
        });
    }
    
    getTimelineGroup() {
        return this.timelineGroup;
    }
    
    isTimelineActive() {
        return this.isActive;
    }
} 