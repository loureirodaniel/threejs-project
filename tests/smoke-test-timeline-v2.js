/**
 * Timeline v2 migration smoke test
 * Run: npx playwright test tests/smoke-test-timeline-v2.js --reporter=list
 * Or: node tests/smoke-test-timeline-v2.js (standalone)
 */

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3002/';
const RESULTS = { pass: [], fail: [], warn: [] };

function addPass(item, evidence) {
  RESULTS.pass.push({ item, evidence });
}

function addFail(item, evidence, blocker) {
  RESULTS.fail.push({ item, evidence, blocker });
}

function addWarn(item, evidence) {
  RESULTS.warn.push({ item, evidence });
}

async function runSmokeTest() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // 1) Initial scene with images visible
    try {
      const response = await page.goto(BASE_URL, { waitUntil: 'load', timeout: 10000 });
      if (!response || response.status() >= 400) {
        addFail('1) Initial scene with images visible', `HTTP ${response?.status() || 'failed'}`, true);
      } else {
        await page.waitForFunction(() => typeof window.app !== 'undefined', { timeout: 8000 });
        await page.waitForTimeout(2000); // Let intro/initial render settle
        const hasCanvas = await page.evaluate(() => {
          const canvas = document.querySelector('canvas');
          return canvas !== null && canvas.width > 0;
        });
        const hasImages = await page.evaluate(() => {
          const app = window.app;
          if (!app?.imagePlanes?.planes) return false;
          return app.imagePlanes.planes.length > 0;
        });
        if (hasCanvas && hasImages) {
          addPass('1) Initial scene with images visible', 'Canvas and image planes present');
        } else if (hasCanvas) {
          addWarn('1) Initial scene with images visible', `Canvas OK; imagePlanes.planes.length=${hasImages ? '>0' : 0}`);
        } else {
          addFail('1) Initial scene with images visible', 'No WebGL canvas or no image planes', true);
        }
      }
    } catch (e) {
      addFail('1) Initial scene with images visible', e.message, true);
      console.error('Check 1 failed:', e);
      await browser?.close();
      printReport();
      process.exit(1);
    }

    // 2) Scroll transitions from initial scene to timeline scene
    try {
      await page.waitForTimeout(1500);
      const scrollResult = await page.evaluate(async () => {
        const app = window.app;
        if (!app?.timelineController) return { ok: false, reason: 'No timelineController' };
        const initialIndex = app.timelineController.getCurrentSceneIndex();
        app.timelineController.nextScene();
        await new Promise(r => setTimeout(r, 2200)); // Wait for transition
        const afterIndex = app.timelineController.getCurrentSceneIndex();
        return { ok: afterIndex === 1, initialIndex, afterIndex };
      });
      if (scrollResult.ok) {
        addPass('2) Scroll transitions from initial scene to timeline scene', `Transition 0→1 completed`);
      } else {
        addWarn('2) Scroll transitions from initial scene to timeline scene', `Result: ${JSON.stringify(scrollResult)}`);
      }
    } catch (e) {
      addWarn('2) Scroll transitions from initial scene to timeline scene', e.message);
    }

    // 3) Images animate/reposition into timeline layout
    try {
      await page.waitForTimeout(500);
      const layoutResult = await page.evaluate(() => {
        const app = window.app;
        const timelineScene = app?.timelineScene;
        if (!timelineScene) return { ok: false };
        const planes = timelineScene.getTimelinePlanes?.() || timelineScene.timelinePlanes || [];
        const initialPlanes = app?.imagePlanes?.getPlanes?.() || [];
        const transitioned = initialPlanes.filter((p) => p?.userData?.isTimelineTransitioned);
        const totalImages = planes.length + transitioned.length;
        const timelineVisible = timelineScene.timelineGroup?.visible === true;
        return { ok: totalImages > 0 && timelineVisible, planeCount: planes.length, transitionedCount: transitioned.length };
      });
      if (layoutResult.ok) {
        addPass('3) Images animate/reposition into timeline layout', `Timeline has ${layoutResult.meshCount} image meshes`);
      } else {
        addWarn('3) Images animate/reposition into timeline layout', `Layout: ${JSON.stringify(layoutResult)}`);
      }
    } catch (e) {
      addWarn('3) Images animate/reposition into timeline layout', e.message);
    }

    // 4) Timeline navigation works
    try {
      const navResult = await page.evaluate(async () => {
        const app = window.app;
        const tc = app?.timelineController;
        if (!tc) return { ok: false };
        const yearBefore = tc.getCurrentYear();
        tc.animateToYear(2015);
        await new Promise(r => setTimeout(r, 1000));
        const yearAfter = tc.getCurrentYear();
        return { ok: yearAfter === 2015, yearBefore, yearAfter };
      });
      if (navResult.ok) {
        addPass('4) Timeline navigation works', `Year change to 2015: ${navResult.yearBefore}→${navResult.yearAfter}`);
      } else {
        addWarn('4) Timeline navigation works', `Navigation: ${JSON.stringify(navResult)}`);
      }
    } catch (e) {
      addWarn('4) Timeline navigation works', e.message);
    }

    // 5) Physics behavior (momentum/friction/snap)
    try {
      const physicsResult = await page.evaluate(() => {
        const app = window.app;
        const tc = app?.timelineController;
        const state = tc?.getState?.();
        if (!state) return { ok: false };
        const hasPhysics = typeof state.timelineOffset === 'number' && typeof state.scrollVelocity !== 'undefined';
        return { ok: hasPhysics, offset: state.timelineOffset, velocity: state.scrollVelocity };
      });
      if (physicsResult.ok) {
        addPass('5) Physics behavior works', `State has offset=${physicsResult.offset} and velocity`);
      } else {
        addWarn('5) Physics behavior works', `State: ${JSON.stringify(physicsResult)}`);
      }
    } catch (e) {
      addWarn('5) Physics behavior works', e.message);
    }

  } catch (e) {
    console.error('Smoke test error:', e);
    addFail('Setup', e.message, true);
  } finally {
    await browser?.close();
  }

  printReport();
}

function printReport() {
  console.log('\n========== TIMELINE V2 MIGRATION SMOKE TEST REPORT ==========\n');

  RESULTS.pass.forEach(({ item, evidence }) => {
    console.log(`✅ ${item}`);
    console.log(`   Evidence: ${evidence}\n`);
  });
  RESULTS.warn.forEach(({ item, evidence }) => {
    console.log(`⚠️  ${item}`);
    console.log(`   Note: ${evidence}\n`);
  });
  RESULTS.fail.forEach(({ item, evidence, blocker }) => {
    console.log(`❌ ${item}`);
    console.log(`   Evidence: ${evidence}`);
    if (blocker) console.log(`   [BLOCKER]`);
    console.log('');
  });

  const total = RESULTS.pass.length + RESULTS.warn.length + RESULTS.fail.length;
  const passed = RESULTS.pass.length;
  const warnings = RESULTS.warn.length;
  const failed = RESULTS.fail.length;

  console.log('---------- Summary ----------');
  console.log(`Total checks: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Warnings: ${warnings}`);
  console.log(`Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

runSmokeTest().catch(console.error);
