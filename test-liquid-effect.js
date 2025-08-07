// Test file for liquid distortion effect
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

console.log('Testing liquid distortion effect imports...');

// Test if all required modules are available
console.log('THREE:', THREE);
console.log('EffectComposer:', EffectComposer);
console.log('RenderPass:', RenderPass);
console.log('ShaderPass:', ShaderPass);

console.log('All imports successful!'); 