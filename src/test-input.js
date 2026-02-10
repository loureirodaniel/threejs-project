// src/test-input.js
import { InputSystem } from './timeline-v2/systems/InputSystem.js';
import { TimelineState } from './timeline-v2/core/TimelineState.js';
import { timelineEventBus } from './timeline-v2/core/EventBus.js';

console.log('=== Testing InputSystem ===');

const state = new TimelineState();
const inputSystem = new InputSystem(state, timelineEventBus);

// Listen to events
timelineEventBus.on('timeline:scroll', (data) => {
  console.log('Scroll event:', data);
});

timelineEventBus.on('timeline:drag:start', (data) => {
  console.log('Drag start:', data);
});

timelineEventBus.on('timeline:drag:move', (data) => {
  console.log('Drag move:', data);
});

timelineEventBus.on('timeline:drag:end', (data) => {
  console.log('Drag end:', data);
});

// Initialize
inputSystem.init();

// Set to timeline scene for testing
state.setState({ currentSceneIndex: 1 });

console.log('✅ InputSystem initialized');
console.log('Try scrolling, dragging, or pressing arrow keys');
console.log('Check console for emitted events');

// Expose for manual testing
window.testInputSystem = inputSystem;
window.testState = state;
