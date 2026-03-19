export const GlitchShader = {
  uniforms: {
    tDiffuse: { value: null },
    uGlitchIntensity: { value: 0.0 },
    uTime: { value: 0.0 },
    uResolution: { value: { x: 1.0, y: 1.0 } },
    uFocusRect: { value: { x: -1.0, y: -1.0, z: -1.0, w: -1.0 } },
    uFocusFeather: { value: 0.03 },
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
    uniform vec4 uFocusRect;   // (minU, minV, maxU, maxV) – region to protect from glitch
    uniform float uFocusFeather;
    varying vec2 vUv;

    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      float i = clamp(uGlitchIntensity, 0.0, 1.0);

      // Determine how much this pixel is inside the protected focus region.
      // 0 = fully inside (no glitch), 1 = fully outside (full glitch).
      float focusMask = 1.0;
      if (uFocusRect.z > uFocusRect.x && uFocusRect.w > uFocusRect.y) {
        float feather = max(0.001, uFocusFeather);
        float dLeft   = smoothstep(uFocusRect.x - feather, uFocusRect.x + feather, uv.x);
        float dRight  = smoothstep(uFocusRect.z + feather, uFocusRect.z - feather, uv.x);
        float dBottom = smoothstep(uFocusRect.y - feather, uFocusRect.y + feather, uv.y);
        float dTop    = smoothstep(uFocusRect.w + feather, uFocusRect.w - feather, uv.y);
        float inside  = dLeft * dRight * dBottom * dTop;
        focusMask = 1.0 - inside;
      }

      float effectiveIntensity = i * focusMask;

      // Early out: no glitch needed
      if (effectiveIntensity < 0.001) {
        gl_FragColor = texture2D(tDiffuse, uv);
        return;
      }

      // Pixelation grid: higher intensity -> larger pixel blocks
      float blockCountX = mix(420.0, 70.0, effectiveIntensity);
      float aspect = max(0.0001, uResolution.y / max(0.0001, uResolution.x));
      vec2 grid = vec2(blockCountX, blockCountX * aspect);
      vec2 pixelUV = (floor(uv * grid) + 0.5) / grid;

      // Horizontal row jitter for digital breakup
      float row = floor(pixelUV.y * grid.y);
      float rowPulse = rand(vec2(row, floor(uTime * 11.0)));
      if (rowPulse > (0.94 - effectiveIntensity * 0.35)) {
        float rowShift = (rand(vec2(row, floor(uTime * 17.0))) - 0.5) * effectiveIntensity * 0.05;
        pixelUV.x += rowShift;
      }

      // Slight channel separation on the pixel grid
      float rgbShift = effectiveIntensity * 0.006;
      vec4 r = texture2D(tDiffuse, pixelUV + vec2(rgbShift, 0.0));
      vec4 g = texture2D(tDiffuse, pixelUV);
      vec4 b = texture2D(tDiffuse, pixelUV - vec2(rgbShift, 0.0));
      vec3 glitchColor = vec3(r.r, g.g, b.b);

      // Color quantization to enhance "pixel computer" feel
      float levels = mix(256.0, 44.0, effectiveIntensity);
      glitchColor = floor(glitchColor * levels) / levels;

      // Blend between clean and glitched based on focus mask
      vec3 cleanColor = texture2D(tDiffuse, uv).rgb;
      vec3 finalColor = mix(cleanColor, glitchColor, focusMask);

      gl_FragColor = vec4(finalColor, g.a);
    }
  `,
};
