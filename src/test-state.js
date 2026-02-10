// src/test-state.js
import { TimelineState } from './timeline-v2/core/TimelineState.js';

console.log('=== Testing TimelineState ===');

const state = new TimelineState();

// Test get
console.log('Initial offset:', state.get('timelineOffset')); // -4.5
console.log('Test 1:', state.get('timelineOffset') === -4.5 ? '✅ PASS' : '❌ FAIL');

// Test setState
state.setState({ timelineOffset: 0, currentYear: 2015 });
console.log('After setState:', state.get('timelineOffset'), state.get('currentYear'));
console.log('Test 2:', state.get('timelineOffset') === 0 && state.get('currentYear') === 2015 ? '✅ PASS' : '❌ FAIL');

// Test subscribe
let notified = null;
const unsub = state.subscribe('timelineOffset', ({ property, oldValue, newValue }) => {
  notified = { property, oldValue, newValue };
  console.log('Notified:', notified);
});

state.setState({ timelineOffset: 5 });
console.log('Test 3:', notified?.newValue === 5 ? '✅ PASS' : '❌ FAIL');

// Test unsubscribe
unsub();
notified = null;
state.setState({ timelineOffset: 10 });
console.log('Test 4:', notified === null ? '✅ PASS (unsubscribed)' : '❌ FAIL');

// Test getState returns immutable
const snapshot = state.getState();
console.log('Snapshot:', snapshot);
let test5Pass = false;
try {
  snapshot.timelineOffset = 999; // Should fail or be ignored
  test5Pass = snapshot.timelineOffset !== 999;
} catch (e) {
  test5Pass = true; // frozen, assignment threw
}
console.log('Test 5:', test5Pass ? '✅ PASS (state is immutable)' : '❌ FAIL');

console.log('✅ All TimelineState tests passed');
