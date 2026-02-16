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
      vUv = uv;
      vec3 pos = position;
      
      // Convert transition from [0,1] to [0,1,0] for wave peak at middle
      float transition = 1.0 - abs((uTransition * 2.0) - 1.0);
      
      // Convert UV to centered coordinates [-0.5, 0.5]
      vec2 centeredUV = uv - 0.5;
      
      // Mouse position in UV space [-0.5, 0.5]
      vec2 mouseUV = uMousePosition * 0.5;
      
      // Distance from mouse
      float dist = distance(centeredUV, mouseUV);
      
      // Create wave ripple
      float waveSinusoid = cos(5.0 * (dist - (uTime / 30.0)));
      
      // CRITICAL: Much stronger attenuation for visible bulge
      float distanceStrength = (0.4 / (dist + 0.4));
      
      // CRITICAL: Much larger distortion multiplier
      float distortionEffect = distanceStrength * waveSinusoid * 0.33;
      
      // Apply STRONG Z displacement (creates the wobble)
      pos.z += distortionEffect * -transition;
      
      // Pull towards/away from mouse (creates the jiggle)
      pos.x += (distortionEffect * transition * (mouseUV.x - centeredUV.x));
      pos.y += distortionEffect * transition * (mouseUV.y - centeredUV.y);
      
      vPosition = pos;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  
  fragmentShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    
    uniform sampler2D tDiffuse;
    
    void main() {
      vec4 texColor = texture2D(tDiffuse, vUv);
      
      // CRITICAL: Strong lighting based on Z position for depth perception
      // Shadows when pushed back (negative Z)
      texColor.rgb += clamp(vPosition.z, -1.0, 0.0) * 0.75;
      // Highlights when pulled forward (positive Z)
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
