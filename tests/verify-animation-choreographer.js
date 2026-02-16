/**
 * Verification script for AnimationChoreographer flow
 * Captures console output and verifies expected logs and behavior.
 *
 * Run: npx playwright test tests/verify-animation-choreographer.js
 * Or: node tests/verify-animation-choreographer.js (standalone)
 */

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3002/';

// Expected console log patterns
const INIT_LOGS = [
  'AnimationChoreographer initialized',
  'NEW TimelineController initialized',
  'InputSystem ready',
  'PhysicsSystem ready',
  'RenderSystem ready',
  'CameraSystem ready',
  'AnimationChoreographer ready',
];

const SCROLL_LOGS = [
  'InputSystem: Scroll threshold reached',
  'AnimationChoreographer: Starting gathering sequence',
  'Spacing Calculation:',
  'Image 0: target x=',
  'Total animation duration:',
  'Gathering sequence complete',
];

async function run() {
  const logs = { init: [], scroll: [], errors: [], all: [] };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture all console messages
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    logs.all.push({ type, text });

    if (type === 'error') {
      logs.errors.push(text);
    }
  });

  try {
    // --- 1. Load app ---
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 8000 });

    // Wait for intro scramble + input blocker removal (~5s)
    await page.waitForTimeout(5500);

    // --- 2. Check init logs ---
    const initResults = {};
    for (const pattern of INIT_LOGS) {
      const found = logs.all.some((l) => l.text.includes(pattern));
      initResults[pattern] = found;
    }

    // --- 3. Scroll to ~25% ---
    // Threshold is 100px, so 25px = 25%. Need to scroll the document/body.
    // The app uses wheel events - we need to simulate wheel on the page.
    await page.evaluate(() => {
      // Ensure we're on initial scene (scene 0)
      const app = window.app;
      if (app?.timelineController?.state) {
        const idx = app.timelineController.state.get('currentSceneIndex');
        if (idx !== 0) return; // Already past initial
      }
      // Dispatch wheel events to accumulate scroll
      const target = document.body;
      const deltaY = 15; // First scroll
      target.dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true }));
    });
    await page.waitForTimeout(300);

    await page.evaluate(() => {
      const target = document.body;
      target.dispatchEvent(new WheelEvent('wheel', { deltaY: 20, bubbles: true }));
    });
    await page.waitForTimeout(300);

    await page.evaluate(() => {
      const target = document.body;
      target.dispatchEvent(new WheelEvent('wheel', { deltaY: 15, bubbles: true }));
    });

    // Wait for gathering animation to complete (~2.5s)
    await page.waitForTimeout(2800);

    // --- 4. Check scroll/gathering logs ---
    const scrollResults = {};
    for (const pattern of SCROLL_LOGS) {
      const found = logs.all.some((l) => l.text.includes(pattern));
      scrollResults[pattern] = found;
    }

    // --- Report ---
    const initPass = Object.values(initResults).every(Boolean);
    const scrollPass = Object.values(scrollResults).every(Boolean);
    const noErrors = logs.errors.length === 0;

    console.log('\n========== AnimationChoreographer Verification Report ==========\n');

    // Section 1
    console.log('1) INIT CONSOLE LOGS ON APP LOAD');
    console.log('   Expected: AnimationChoreographer initialized, NEW TimelineController, systems ready\n');
    for (const [pattern, found] of Object.entries(initResults)) {
      console.log(`   ${found ? '✅' : '❌'} ${pattern}`);
    }
    console.log(`\n   Section 1: ${initPass ? 'PASS' : 'FAIL'}\n`);

    // Section 2
    console.log('2) SCROLL TO ~25% PROGRESS');
    console.log('   Simulated wheel scroll (15+20+15 = 50px, threshold 100)\n');
    const scrollLines = logs.all
      .filter((l) => l.text.includes('Initial scene scroll') || l.text.includes('Scroll'))
      .map((l) => l.text);
    scrollLines.forEach((line) => console.log(`   Captured: ${line}`));
    console.log(`\n   Section 2: (scroll simulated) DONE\n`);

    // Section 3
    console.log('3) SCROLL/GATHERING CONSOLE LOGS');
    for (const [pattern, found] of Object.entries(scrollResults)) {
      console.log(`   ${found ? '✅' : '❌'} ${pattern}`);
    }
    const matchingLogs = logs.all.filter((l) =>
      SCROLL_LOGS.some((p) => l.text.includes(p.replace(':', '').split(' ')[0]))
    );
    console.log('\n   Captured log lines (scroll flow):');
    logs.all
      .filter(
        (l) =>
          l.text.includes('InputSystem') ||
          l.text.includes('AnimationChoreographer') ||
          l.text.includes('Spacing') ||
          l.text.includes('Image ') ||
          l.text.includes('duration') ||
          l.text.includes('Gathering')
      )
      .forEach((l) => console.log(`   - [${l.type}] ${l.text}`));
    console.log(`\n   Section 3: ${scrollPass ? 'PASS' : 'FAIL'}\n`);

    // Section 4
    console.log('4) BEHAVIOR CHECKS');
    console.log(`   - No console errors: ${noErrors ? '✅ PASS' : '❌ FAIL'}`);
    if (!noErrors) {
      logs.errors.forEach((e) => console.log(`     ERROR: ${e}`));
    }
    console.log(`   - (Smooth movement, camera zoom: manual verification needed)\n`);
    console.log(`   Section 4: ${noErrors ? 'PASS' : 'FAIL'}\n`);

    // Summary
    const allPass = initPass && scrollPass && noErrors;
    console.log('========== SUMMARY ==========');
    console.log(`Overall: ${allPass ? 'PASS' : 'FAIL'}`);
    console.log(`Section 1 (init): ${initPass ? 'PASS' : 'FAIL'}`);
    console.log(`Section 2 (scroll): DONE`);
    console.log(`Section 3 (scroll logs): ${scrollPass ? 'PASS' : 'FAIL'}`);
    console.log(`Section 4 (no errors): ${noErrors ? 'PASS' : 'FAIL'}`);
    if (logs.errors.length) {
      console.log('\nErrors:');
      logs.errors.forEach((e) => console.log('  -', e));
    }
  } catch (err) {
    console.error('Verification failed:', err.message);
    throw err;
  } finally {
    await browser.close();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
