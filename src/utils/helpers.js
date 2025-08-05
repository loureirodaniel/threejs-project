// Utility functions for common operations

export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

export function lerp(start, end, factor) {
    return start + (end - start) * factor;
}

export function mapRange(value, inMin, inMax, outMin, outMax) {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

export function createGradientTexture(width, height, gradientFunction) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    gradientFunction(ctx, width, height);
    
    return canvas;
}

export function createRadialGradient(ctx, width, height, stops) {
    const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/2);
    
    stops.forEach(stop => {
        gradient.addColorStop(stop.offset, stop.color);
    });
    
    return gradient;
} 