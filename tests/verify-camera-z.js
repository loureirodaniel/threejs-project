/**
 * Verify camera z=5 during and after gathering.
 * Run: node tests/verify-camera-z.js
 * Requires: app at http://localhost:3002/
 */
const { chromium } = require('playwright');

async function run() {
  const logs = [];
  const errors = [];
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', (m) => {
    logs.push(m.text());
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto('http://localhost:3002/', { waitUntil: 'load', timeout: 8000 });
  await page.waitForTimeout(6000); // intro

  // Scroll to trigger gathering
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, 30);
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(3500); // gathering + scene transition

  const cameraZ = await page.evaluate(() => {
    const cam = window.app?.camera;
    return cam ? cam.position.z : null;
  });

  const hasGatheringComplete = logs.some((l) => l.includes('Gathering sequence complete'));
  const zOk = cameraZ !== null && Math.abs(cameraZ - 5) < 0.5;

  console.log('Transition triggers:', hasGatheringComplete ? 'PASS' : 'FAIL');
  console.log('Camera ends at z≈5:', zOk ? 'PASS' : `FAIL (z=${cameraZ})`);
  if (errors.length) console.log('Errors:', errors);
  await browser.close();
}

run().catch((e) => { console.error(e); process.exit(1); });
