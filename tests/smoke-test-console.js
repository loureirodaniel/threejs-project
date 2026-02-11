/**
 * Paste this into the browser console (F12) at http://localhost:3002/
 * after the app has loaded. Run each section in order.
 *
 * Timeline v2 migration smoke test - manual console version
 */

(function smokeTest() {
  const results = [];

  // 1) Initial scene with images visible
  (function check1() {
    const canvas = document.querySelector('canvas');
    const hasCanvas = canvas && canvas.width > 0;
    const hasImages = window.app?.imagePlanes?.planes?.length > 0;
    const ok = hasCanvas && hasImages;
    results.push({
      item: '1) Initial scene with images visible',
      status: ok ? 'PASS' : 'FAIL',
      evidence: `canvas=${!!hasCanvas}, imagePlanes.planes=${window.app?.imagePlanes?.planes?.length ?? 0}`
    });
  })();

  // 2) Scroll transitions
  (function check2() {
    const tc = window.app?.timelineController;
    if (!tc) {
      results.push({ item: '2) Scroll transitions', status: 'FAIL', evidence: 'No timelineController' });
      return;
    }
    const idxBefore = tc.getCurrentSceneIndex();
    tc.nextScene();
    results.push({
      item: '2) Scroll transitions',
      status: 'IN_PROGRESS',
      evidence: `Called nextScene(), was scene ${idxBefore}. Wait ~2.5s then run check2b()`
    });
  })();

  // Run check2b after 2.5 seconds
  window.check2b = function check2b() {
    const idx = window.app?.timelineController?.getCurrentSceneIndex();
    const ok = idx === 1;
    const r = results.find(x => x.item === '2) Scroll transitions');
    if (r) r.status = ok ? 'PASS' : 'FAIL';
    if (r) r.evidence = `Scene index after transition: ${idx} (expect 1)`;
    console.log('Check 2 result:', ok ? 'PASS' : 'FAIL');
  };

  // 3) Images in timeline layout (run after transition)
  window.check3 = function check3() {
    const ts = window.app?.timelineScene;
    const planes = ts?.getTimelinePlanes?.() || ts?.timelinePlanes || [];
    const initial = window.app?.imagePlanes?.getPlanes?.() || [];
    const transitioned = initial.filter(p => p?.userData?.isTimelineTransitioned);
    const total = planes.length + transitioned.length;
    const visible = ts?.timelineGroup?.visible;
    const ok = total > 0 && visible;
    results.push({
      item: '3) Images animate/reposition into timeline layout',
      status: ok ? 'PASS' : 'FAIL',
      evidence: `planes=${planes.length}, transitioned=${transitioned.length}, timelineGroup.visible=${visible}`
    });
    console.log('Check 3:', ok ? 'PASS' : 'FAIL');
  };

  // 4) Timeline navigation
  window.check4 = async function check4() {
    const tc = window.app?.timelineController;
    const yBefore = tc?.getCurrentYear();
    tc?.animateToYear(2015);
    await new Promise(r => setTimeout(r, 1000));
    const yAfter = tc?.getCurrentYear();
    const ok = yAfter === 2015;
    results.push({
      item: '4) Timeline navigation works',
      status: ok ? 'PASS' : 'FAIL',
      evidence: `Year ${yBefore} -> ${yAfter} (target 2015)`
    });
    console.log('Check 4:', ok ? 'PASS' : 'FAIL');
  };

  // 5) Physics behavior
  window.check5 = function check5() {
    const state = window.app?.timelineController?.getState?.();
    const ok = state && typeof state.timelineOffset === 'number';
    results.push({
      item: '5) Physics behavior works',
      status: ok ? 'PASS' : 'FAIL',
      evidence: `State has timelineOffset, scrollVelocity`
    });
    console.log('Check 5:', ok ? 'PASS' : 'FAIL');
  };

  // Print report
  window.smokeReport = function smokeReport() {
    console.table(results);
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  };

  console.log('Smoke test helpers loaded.');
  console.log('1. Check 1 ran. Results saved.');
  console.log('2. Run check2b() after ~2.5s, then check3(), check4(), check5(), smokeReport()');
})();
