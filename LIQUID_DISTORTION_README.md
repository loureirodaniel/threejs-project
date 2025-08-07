# Liquid Distortion Effect

A WebGL-based liquid distortion effect that responds to cursor movement, creating fluid-like ripples and swirls across the entire Three.js scene.

## Features

- **Cursor-responsive distortion**: The effect follows your mouse cursor and creates ripples around it
- **Multiple distortion types**: Combines ripple effects, swirling motion, and organic noise
- **Real-time parameter control**: Adjust all effect parameters through the debug panel
- **Post-processing pipeline**: Uses Three.js EffectComposer for high-quality rendering
- **Performance optimized**: Efficient shader implementation with falloff distance

## How It Works

The liquid distortion effect uses a fragment shader that:

1. **Tracks cursor position**: Converts mouse coordinates to normalized UV space
2. **Calculates distance**: Measures distance from each pixel to the cursor
3. **Applies multiple distortions**:
   - **Ripple effect**: Sine wave distortion that radiates from the cursor
   - **Swirling motion**: Based on cursor velocity, creating fluid-like movement
   - **Organic noise**: Fractal noise for natural, organic distortion
4. **Falloff distance**: Distortion strength decreases with distance from cursor
5. **Color enhancement**: Subtle color shifts based on distortion magnitude

## Usage

### Enabling the Effect

1. Open the debug panel (top-right corner)
2. Expand the "Liquid Distortion" section
3. Click "Enable Liquid Effect" to activate
4. Move your cursor around the scene to see the distortion

### Parameters

- **Distortion Strength**: Controls the overall intensity of the distortion (0.001 - 0.1)
- **Ripple Speed**: How fast the ripples animate (0.5 - 5.0)
- **Ripple Scale**: The frequency/density of ripples (10 - 100)
- **Falloff Distance**: How quickly the effect fades with distance (0.1 - 1.0)
- **Noise Scale**: The scale of the organic noise pattern (1 - 20)
- **Noise Strength**: The intensity of the organic noise (0.001 - 0.05)

### Technical Implementation

The effect is implemented in `src/effects/LiquidDistortionEffect.js` and includes:

- **EffectComposer integration**: Uses Three.js post-processing pipeline
- **Custom shader**: GLSL fragment shader with multiple distortion techniques
- **Mouse tracking**: Real-time cursor position and velocity calculation
- **Parameter system**: Dynamic uniform updates for real-time control
- **Window resize handling**: Automatic canvas resizing

## Shader Details

### Vertex Shader
Simple pass-through shader that provides UV coordinates to the fragment shader.

### Fragment Shader
The main distortion logic includes:

1. **Noise functions**: Hash-based noise for organic patterns
2. **Smooth noise**: Interpolated noise for smooth transitions
3. **Fractal noise**: Multi-octave noise for natural complexity
4. **Distance calculations**: Euclidean distance from cursor
5. **Distortion combination**: Merges ripple, swirl, and noise effects
6. **Color enhancement**: Adds subtle color shifts

## Integration

The effect is fully integrated into the main application:

- **App.js**: Initializes and manages the effect
- **DebugPanel.js**: Provides UI controls
- **SceneManager.js**: Compatible with existing rendering pipeline
- **Animation loop**: Updates effect parameters each frame

## Performance Considerations

- **Falloff distance**: Limits distortion to cursor vicinity for performance
- **Efficient noise**: Uses optimized hash-based noise functions
- **Shader optimization**: Minimal texture lookups and calculations
- **Conditional rendering**: Only renders when effect is active

## Customization

You can easily customize the effect by:

1. **Modifying shader code**: Edit the fragment shader in `createLiquidPass()`
2. **Adding new parameters**: Extend the uniform system
3. **Changing distortion types**: Modify the distortion calculation
4. **Adjusting color effects**: Modify the color enhancement section

## Demo

A standalone demo is available in `demo-liquid-effect.html` that shows the effect on a simple scene with rotating cubes.

## Browser Compatibility

- Requires WebGL 2.0 support
- Works in all modern browsers
- Optimized for desktop cursor interaction
- Mobile touch support can be added by extending mouse tracking 