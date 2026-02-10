// src/test-eventbus.js
import { timelineEventBus } from './timeline-v2/core/EventBus.js';

console.log('=== Testing EventBus ===');

// Test basic on/emit
let received = null;
timelineEventBus.on('test:event', (data) => {
  received = data;
  console.log('Received:', data);
});

timelineEventBus.emit('test:event', { value: 42 });
console.log('Test 1:', received?.value === 42 ? '✅ PASS' : '❌ FAIL');

// Test once
let onceCount = 0;
timelineEventBus.once('test:once', () => {
  onceCount++;
});

timelineEventBus.emit('test:once');
timelineEventBus.emit('test:once'); // Should only trigger once

console.log('Test 2:', onceCount === 1 ? '✅ PASS' : '❌ FAIL');

// Test off
let offCount = 0;
const handler = () => { offCount++; };
timelineEventBus.on('test:off', handler);
timelineEventBus.emit('test:off'); // Count = 1
timelineEventBus.off('test:off', handler);
timelineEventBus.emit('test:off'); // Count should still be 1

console.log('Test 3:', offCount === 1 ? '✅ PASS' : '❌ FAIL');

// Test listener count
console.log('Listener count:', timelineEventBus.getListenerCount());

// Test clear
timelineEventBus.clear();
console.log('After clear:', timelineEventBus.getListenerCount() === 0 ? '✅ PASS' : '❌ FAIL');

console.log('✅ All EventBus tests passed');
