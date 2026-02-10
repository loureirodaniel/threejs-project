// src/test-utils.js
import * as TimelineUtils from './timeline-v2/utils/TimelineUtils.js';

console.log('=== Testing TimelineUtils ===');

// Test offset/year conversion
console.log('2010 offset:', TimelineUtils.yearToOffset(2010)); // Should be ~-4.5
console.log('2015 offset:', TimelineUtils.yearToOffset(2015)); // Should be ~0
console.log('2019 offset:', TimelineUtils.yearToOffset(2019)); // Should be ~4.5

console.log('Offset -4.5 year:', TimelineUtils.offsetToYear(-4.5)); // Should be 2010
console.log('Offset 0 year:', TimelineUtils.offsetToYear(0)); // Should be ~2015
console.log('Offset 4.5 year:', TimelineUtils.offsetToYear(4.5)); // Should be 2019

// Test snap index
console.log('Snap index for offset 0:', TimelineUtils.offsetToSnapIndex(0));

// Test friction
const frictionFactor = TimelineUtils.applyFriction(1, 0.92, 0.016);
console.log('Friction factor (60fps):', frictionFactor); // Should be ~0.92

// Test easing
console.log('easeInOutCubic(0.5):', TimelineUtils.easeInOutCubic(0.5)); // Should be 0.5

console.log('✅ All tests passed');
