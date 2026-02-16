/**
 * Quick verification - load page, collect init logs, exit quickly
 */
const { chromium } = require('playwright');

async function run() {
  const logs = [];
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', (msg) => logs.push({ type: msg.type(), text: msg.text() }));

  console.log('Navigating...');
  await page.goto('http://localhost:3002/', { waitUntil: 'load', timeout: 10000 });
  await page.waitForTimeout(2000);

  console.log('Init logs found:');
  const initPatterns = [
    'AnimationChoreographer initialized',
    'NEW TimelineController',
    'InputSystem ready',
    'PhysicsSystem ready',
    'RenderSystem ready',
    'CameraSystem ready',
    'AnimationChoreographer ready',
  ];
  initPatterns.forEach((p) => {
    const found = logs.some((l) => l.text.includes(p));
    console.log(`  ${found ? 'OK' : 'MISS'}: ${p}`);
  });
  console.log('Errors:', logs.filter((l) => l.type === 'error').map((l) => l.text));

  await browser.close();
  console.log('Done');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
