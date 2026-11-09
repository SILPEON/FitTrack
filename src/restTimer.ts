/**
 * Rest timer between sets. Global (survives navigation and tab switches) and based on an end
 * timestamp, so it shows the right time even after iOS paused the app in the background.
 */
type WakeLock = { release: () => Promise<void> };

class RestTimer {
  endsAt: number | null = null;
  total = 0;
  label = '';
  /** Identifies the set that started the timer. */
  key = '';
  finishedAt: number | null = null;
  private listeners = new Set<() => void>();
  private tick: number | null = null;
  private audio: AudioContext | null = null;
  private wake: WakeLock | null = null;

  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private emit() { this.listeners.forEach((f) => f()); }

  get running() { return this.endsAt != null; }
  remaining(now = Date.now()) { return this.endsAt ? Math.max(0, Math.ceil((this.endsAt - now) / 1000)) : 0; }

  /** Must be called from a tap so iOS allows sound later. */
  start(seconds: number, label: string, key = '') {
    this.unlockAudio();
    this.key = key;
    this.total = seconds;
    this.label = label;
    this.endsAt = Date.now() + seconds * 1000;
    this.finishedAt = null;
    this.keepAwake();
    this.loop();
    this.emit();
  }

  adjust(delta: number) {
    if (!this.endsAt) return;
    this.endsAt = Math.max(Date.now() + 1000, this.endsAt + delta * 1000);
    this.total = Math.max(1, this.total + delta);
    this.emit();
  }

  stop() {
    this.endsAt = null;
    this.finishedAt = null;
    if (this.tick) clearInterval(this.tick);
    this.tick = null;
    this.wake?.release().catch(() => {});
    this.wake = null;
    this.emit();
  }

  private loop() {
    if (this.tick) clearInterval(this.tick);
    let lastBeep = -1;
    this.tick = window.setInterval(() => {
      const left = this.remaining();
      if (left <= 3 && left >= 1 && left !== lastBeep) { lastBeep = left; this.beep(660, 90); }
      if (left <= 0) {
        this.beep(988, 180); setTimeout(() => this.beep(1319, 260), 220);
        navigator.vibrate?.([200, 100, 200]);
        this.endsAt = null;
        this.finishedAt = Date.now();
        if (this.tick) clearInterval(this.tick);
        this.tick = null;
        this.wake?.release().catch(() => {});
        this.wake = null;
        // Hide the "Rest over" banner after a few seconds.
        setTimeout(() => { if (this.finishedAt && Date.now() - this.finishedAt >= 5900) { this.finishedAt = null; this.emit(); } }, 6000);
      }
      this.emit();
    }, 250);
  }

  private unlockAudio() {
    try {
      this.audio ??= new AudioContext();
      if (this.audio.state === 'suspended') this.audio.resume();
    } catch { /* no audio */ }
  }

  private beep(freq: number, ms: number) {
    const ctx = this.audio;
    if (!ctx) return;
    try {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = freq; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
      o.start(); o.stop(ctx.currentTime + ms / 1000 + 0.05);
    } catch { /* ignore */ }
  }

  private keepAwake() {
    if (this.wake) return;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLock> } };
    nav.wakeLock?.request('screen').then((l) => { this.wake = l; }).catch(() => {});
  }
}

export const restTimer = new RestTimer();

// After iOS resumes the app, re-check immediately so an expired timer finishes right away.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') restTimer.adjust(0);
});
