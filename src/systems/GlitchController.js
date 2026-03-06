export class GlitchController {
  constructor() {
    this._intensity = 0;
    this._target = 0;
    this._raf = null;
    this._active = false;
    this._timelineUnsubs = [];
    this._attachedTimelineBus = null;
    this._config = {
      navPeak: 1.0,
      scrollPeak: 0.85,
      lerp: 0.18,
      decay: 0.85
    };

    this._onNav = () => {
      if (!this._active) return;
      this._target = Math.max(this._target, this._config.navPeak);
      this._startDecay();
    };

    this._onTimelineActivity = () => {
      if (!this._active) return;
      this._target = Math.max(this._target, this._config.scrollPeak);
      this._startDecay();
    };

    this._onScene = (e) => {
      const name = e?.detail?.sceneName || e?.detail?.scene;
      this._active = (name === 'timeline');
      this._attachTimelineBus();
      if (!this._active) {
        this._target = 0;
        this._getRenderSystem()?.setGlitchIntensity(0);
      }
    };

    window.addEventListener('timelineNavigation', this._onNav);
    window.addEventListener('sceneChange', this._onScene);
    window.addEventListener('sceneTransitionComplete', this._onScene);
    const currentSceneName = window.app?.timelineController?.getCurrentSceneName?.();
    this._active = currentSceneName === 'timeline';
    this._attachTimelineBus();
  }

  _getRenderSystem() {
    return window.app?.timelineController?.renderSystem ?? null;
  }

  _attachTimelineBus() {
    const bus = window.app?.timelineController?.eventBus || null;
    if (bus === this._attachedTimelineBus) return;

    this._timelineUnsubs.forEach((unsubscribe) => unsubscribe());
    this._timelineUnsubs = [];
    this._attachedTimelineBus = bus;

    if (!bus || typeof bus.on !== 'function') return;

    this._timelineUnsubs.push(
      bus.on('timeline:scroll', this._onTimelineActivity),
      bus.on('timeline:drag:move', this._onTimelineActivity)
    );
  }

  _startDecay() {
    if (this._raf) cancelAnimationFrame(this._raf);
    const tick = () => {
      this._intensity += (this._target - this._intensity) * this._config.lerp;
      this._target *= this._config.decay;
      this._getRenderSystem()?.setGlitchIntensity(this._intensity);
      if (this._intensity > 0.002) {
        this._raf = requestAnimationFrame(tick);
      } else {
        this._intensity = 0;
        this._getRenderSystem()?.setGlitchIntensity(0);
      }
    };
    this._raf = requestAnimationFrame(tick);
  }

  setConfig(partialConfig = {}) {
    this._config = {
      ...this._config,
      ...partialConfig
    };
  }

  getConfig() {
    return { ...this._config };
  }

  destroy() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._timelineUnsubs.forEach((unsubscribe) => unsubscribe());
    this._timelineUnsubs = [];
    this._attachedTimelineBus = null;
    window.removeEventListener('timelineNavigation', this._onNav);
    window.removeEventListener('sceneChange', this._onScene);
    window.removeEventListener('sceneTransitionComplete', this._onScene);
  }
}
