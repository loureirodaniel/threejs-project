export const GlitchShader = {
  uniforms: {
    tDiffuse: { value: null },
    uGlitchIntensity: { value: 0.0 },
    uTime: { value: 0.0 },
    uResolution: { value: { x: 1.0, y: 1.0 } },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uGlitchIntensity;
    uniform float uTime;
    uniform vec2 uResolution;
    varying vec2 vUv;

    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      float i = clamp(uGlitchIntensity, 0.0, 1.0);

      // Pixelation grid: higher intensity -> larger pixel blocks
      float blockCountX = mix(420.0, 70.0, i);
      float aspect = max(0.0001, uResolution.y / max(0.0001, uResolution.x));
      vec2 grid = vec2(blockCountX, blockCountX * aspect);
      vec2 pixelUV = (floor(uv * grid) + 0.5) / grid;

      // Horizontal row jitter for digital breakup
      float row = floor(pixelUV.y * grid.y);
      float rowPulse = rand(vec2(row, floor(uTime * 11.0)));
      if (rowPulse > (0.94 - i * 0.35)) {
        float rowShift = (rand(vec2(row, floor(uTime * 17.0))) - 0.5) * i * 0.05;
        pixelUV.x += rowShift;
      }

      // Slight channel separation on the pixel grid
      float rgbShift = i * 0.006;
      vec4 r = texture2D(tDiffuse, pixelUV + vec2(rgbShift, 0.0));
      vec4 g = texture2D(tDiffuse, pixelUV);
      vec4 b = texture2D(tDiffuse, pixelUV - vec2(rgbShift, 0.0));
      vec3 color = vec3(r.r, g.g, b.b);

      // Color quantization to enhance "pixel computer" feel
      float levels = mix(256.0, 44.0, i);
      color = floor(color * levels) / levels;

      gl_FragColor = vec4(color, g.a);
    }
  `,
};
