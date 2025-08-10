import * as THREE from 'three';

// Simple particle-like dissolve/distortion shader that simulates velocity-driven settling
// Note: This operates in fragment space to avoid heavy geometry requirements

export function createParticleFallMaterial(texture, options = {}) {
  const uniforms = {
    uTexture: { value: texture },
    uTime: { value: 0 },
    uProgress: { value: 0 }, // 0 -> scattered, 1 -> fully assembled
    uVelocityMagnitude: { value: options.velocityMagnitude ?? 0.25 },
    uGravity: { value: options.gravity ?? 0.6 },
    uSeed: { value: options.seed ?? Math.random() * 1000 },
    uOpacity: { value: options.opacity ?? 0.9 },
    uResolution: { value: new THREE.Vector2(1, 1) },
  };

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  // Utility hash/noise for pseudo-random per-fragment behavior
  const fragmentShader = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float uTime;
    uniform float uProgress;
    uniform float uVelocityMagnitude;
    uniform float uGravity;
    uniform float uSeed;
    uniform float uOpacity;
    
    float hash(vec2 p) {
      // Cheap hash
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    vec2 rand2(vec2 p) {
      float n = sin(dot(p, vec2(41.0, 289.0)) + uSeed);
      return vec2(fract(n * 43758.5453), fract(n * 138.5453) - 0.5);
    }

    void main() {
      // Scatter strength decreases as uProgress -> 1.0
      float invP = 1.0 - clamp(uProgress, 0.0, 1.0);

      // Per-fragment pseudo-velocity direction
      vec2 dir = rand2(floor(vUv * 200.0));
      // Add gravity-like downward pull predominately on Y
      vec2 velocity = normalize(dir + vec2(0.0, -uGravity)) * (uVelocityMagnitude * invP);

      // Use uTime to add a slight temporal wobble so motion feels organic
      float wobble = sin(uTime * 6.2831 + dir.x * 10.0) * 0.002;

      // Offset UVs opposite to the settling direction when scattered
      vec2 displacedUv = vUv + (velocity * invP) + vec2(0.0, wobble);

      // Particle reveal mask: as progress increases, more fragments appear
      float grain = hash(floor(vUv * 200.0));
      float reveal = step(grain, 1.0 - invP); // 0 -> sparse, 1 -> full

      vec4 color = texture2D(uTexture, displacedUv);
      // Fade edges when outside 0-1 to avoid hard wrap artifacts
      float inBounds = step(0.0, displacedUv.x) * step(displacedUv.x, 1.0) * step(0.0, displacedUv.y) * step(displacedUv.y, 1.0);
      color.a *= inBounds * reveal * uOpacity;

      if (color.a < 0.01) discard;
      gl_FragColor = color;
    }
  `;

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
  });

  return material;
}

