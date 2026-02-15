/**
 * Ripple/Wave shader effect inspired by CurtainsJS
 * For use with Three.js materials
 */

export const RippleShader = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    
    uniform vec2 uMousePosition;
    uniform float uTime;
    uniform float uTransition;

    void main() {
      vec3 pos = position;
      
      // Convert transition from [0,1] to [0,1,0] for smooth in/out
      float transition = 1.0 - abs((uTransition * 2.0) - 1.0);
      
      // Calculate distance from mouse
      float distanceFromMouse = distance(uMousePosition, vec2(pos.x, pos.y));
      
      // Create wave effect
      float waveSinusoid = cos(5.0 * (distanceFromMouse - (uTime / 30.0)));
      
      // Attenuate based on distance
      float distanceStrength = (0.4 / (distanceFromMouse + 0.4));
      
      // Calculate distortion
      float distortionEffect = distanceStrength * waveSinusoid * 0.33;
      
      // Apply distortion to position
      pos.z += distortionEffect * -transition;
      pos.x += (distortionEffect * transition * (uMousePosition.x - pos.x));
      pos.y += distortionEffect * transition * (uMousePosition.y - pos.y);
      
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTransition;
    
    varying vec2 vUv;
    varying vec3 vPosition;
    
    void main() {
      vec4 texColor = texture2D(tDiffuse, vUv);
      
      // Add fake shadows/lights based on Z position
      texColor.rgb += clamp(vPosition.z, -1.0, 0.0) * 0.75;
      texColor.rgb += clamp(vPosition.z, 0.0, 1.0) * 0.75;
      
      gl_FragColor = texColor;
    }
  `,
  
  uniforms: {
    tDiffuse: { value: null },
    uMousePosition: { value: { x: 0, y: 0 } },
    uTime: { value: 0 },
    uTransition: { value: 0 }
  }
};
