/**
 * Integration test: InputSystem → EventBus → State
 */

import { TimelineState } from './timeline-v2/core/TimelineState.js';
import { timelineEventBus } from './timeline-v2/core/EventBus.js';
import { InputSystem } from './timeline-v2/systems/InputSystem.js';

console.log('=== Input Integration Test ===');

// Create state
const state = new TimelineState();
state.setState({ currentSceneIndex: 1 }); // Timeline scene

// Subscribe to state changes
state.subscribe('isDragging', ({ property, newValue }) => {
  console.log(`State changed: ${property} = ${newValue}`);
});

// Listen to input events
let scrollCount = 0;
let dragStartCount = 0;
let dragMoveCount = 0;
let dragEndCount = 0;

timelineEventBus.on('timeline:scroll', () => {
  scrollCount++;
  console.log(`Scroll events: ${scrollCount}`);
});

timelineEventBus.on('timeline:drag:start', () => {
  dragStartCount++;
  console.log(`Drag start events: ${dragStartCount}`);
  state.setState({ isDragging: true });
});

timelineEventBus.on('timeline:drag:move', () => {
  dragMoveCount++;
  if (dragMoveCount % 10 === 0) {
    console.log(`Drag move events: ${dragMoveCount}`);
  }
});

timelineEventBus.on('timeline:drag:end', () => {
  dragEndCount++;
  console.log(`Drag end events: ${dragEndCount}`);
  state.setState({ isDragging: false });
});

// Create and initialize input system
const inputSystem = new InputSystem(state, timelineEventBus);
inputSystem.init();

console.log('✅ Integration test ready');
console.log('Instructions:');
console.log('1. Scroll with mouse wheel - should emit scroll events');
console.log('2. Click and drag - should emit drag events and update state');
console.log('3. Press ESC, Arrow Left, Arrow Right - should emit keyboard events');
console.log('4. Check console for event counts');

// Expose for debugging
window.integrationTest = {
  state,
  inputSystem,
  eventBus: timelineEventBus,
  getCounts: () => ({ scrollCount, dragStartCount, dragMoveCount, dragEndCount })
};
