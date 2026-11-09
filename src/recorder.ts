import { db, type Activity, type Pt, type Route } from './db';
import { haversine } from './calc';

export type RecState = 'idle' | 'recording' | 'paused';

interface Saved {
  activity: Activity; points: Pt[]; distance: number; elevation: number; accumulated: number; startDate: number;
}

/**
 * Global GPS recorder. Lives outside the UI so switching tabs doesn't stop it.
 * Web limitation: iOS stops GPS for web apps when the screen locks or the app is in the background,
 * so we hold a screen wake lock while recording and save progress continuously.
 */
class Recorder {
  state: RecState = 'idle';
  activity: Activity = 'run';
  points: Pt[] = [];
  distance = 0;
  elevation = 0;
  startDate = 0;
  current: GeolocationPosition | null = null;
  error: string | null = null;
  restored = false;
  wakeLockActive = false;

  private accumulated = 0;
  private segStart: number | null = null;
  private last: { lat: number; lon: number; t: number } | null = null;
  private lastAlt: number | null = null;
  private jumps = 0;
  private watchId: number | null = null;
  private wakeLock: { release: () => Promise<void> } | null = null;
  private listeners = new Set<() => void>();
  private saveTimer: number | null = null;

  constructor() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.state === 'recording') this.acquireWakeLock();
    });
  }

  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private emit() { this.listeners.forEach((f) => f()); }

  elapsed(now = Date.now()) { return this.accumulated + (this.segStart ? (now - this.segStart) / 1000 : 0); }

  /** Watch position without recording (to show the blue dot before starting). */
  startWatching() {
    if (this.watchId != null || !('geolocation' in navigator)) return;
    this.watchId = navigator.geolocation.watchPosition(
      (p) => this.onPosition(p),
      (e) => { this.error = e.code === e.PERMISSION_DENIED
        ? 'Location access is blocked. Allow it in Settings › Privacy & Security › Location Services › Safari Websites.'
        : 'Waiting for GPS…'; this.emit(); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 },
    );
  }

  stopWatching() {
    if (this.state !== 'idle') return; // keep GPS while recording
    if (this.watchId != null) navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
  }

  start(activity: Activity) {
    this.resetData();
    this.activity = activity;
    this.state = 'recording';
    this.startDate = Date.now();
    this.segStart = Date.now();
    this.startWatching();
    this.acquireWakeLock();
    this.persist();
    this.emit();
  }

  pause() {
    if (this.state !== 'recording') return;
    if (this.segStart) this.accumulated += (Date.now() - this.segStart) / 1000;
    this.segStart = null;
    this.last = null; // don't count the gap as distance
    this.state = 'paused';
    this.releaseWakeLock();
    this.persist();
    this.emit();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.segStart = Date.now();
    this.state = 'recording';
    this.restored = false;
    this.startWatching();
    this.acquireWakeLock();
    this.emit();
  }

  async finish(name: string): Promise<boolean> {
    this.pause();
    if (this.points.length < 2) return false;
    await db.routes.add({
      name, date: this.startDate, activity: this.activity, planned: false,
      distance: this.distance, duration: this.elapsed(), elevation: this.elevation, points: this.points,
    } as Route);
    await this.discard();
    return true;
  }

  async discard() {
    this.resetData();
    this.state = 'idle';
    this.releaseWakeLock();
    await db.kv.delete('activeRecording');
    this.emit();
  }

  /** Called at startup: bring back a recording that was cut off (reload, crash, iOS closing the app). */
  async restore() {
    const row = await db.kv.get('activeRecording');
    const s = row?.value as Saved | undefined;
    if (!s) return;
    Object.assign(this, {
      activity: s.activity, points: s.points, distance: s.distance, elevation: s.elevation,
      accumulated: s.accumulated, startDate: s.startDate, state: 'paused', restored: true,
    });
    this.emit();
  }

  private resetData() {
    this.points = []; this.distance = 0; this.elevation = 0; this.accumulated = 0;
    this.segStart = null; this.last = null; this.lastAlt = null; this.startDate = 0; this.restored = false;
  }

  private onPosition(p: GeolocationPosition) {
    this.current = p;
    this.error = null;
    if (this.state === 'recording') this.addPoint(p);
    this.emit();
  }

  private addPoint(p: GeolocationPosition) {
    const { latitude: lat, longitude: lon, accuracy, altitude, altitudeAccuracy } = p.coords;
    if (accuracy > 30) return; // poor fix
    const t = p.timestamp;
    if (this.last) {
      const d = haversine(this.last.lat, this.last.lon, lat, lon);
      if (d < 4) return; // jitter while standing still
      const dt = (t - this.last.t) / 1000;
      if (dt > 0 && d / dt > 40) {
        // > 144 km/h looks like a GPS jump. If it persists, GPS was off (tunnel, pause in signal):
        // accept the new position as the base without counting the gap as distance.
        if (++this.jumps < 3) return;
        this.jumps = 0;
      } else {
        this.jumps = 0;
        this.distance += d;
      }
    }
    if (altitude != null && altitudeAccuracy != null && altitudeAccuracy < 20) {
      if (this.lastAlt == null) this.lastAlt = altitude;
      else if (Math.abs(altitude - this.lastAlt) >= 3) {
        if (altitude > this.lastAlt) this.elevation += altitude - this.lastAlt;
        this.lastAlt = altitude;
      }
    }
    this.last = { lat, lon, t };
    this.points.push([lat, lon, altitude ?? null, t]);
    this.schedulePersist();
  }

  private schedulePersist() {
    if (this.saveTimer != null) return;
    this.saveTimer = window.setTimeout(() => { this.saveTimer = null; this.persist(); }, 5000);
  }

  private persist() {
    if (this.state === 'idle') return;
    const value: Saved = {
      activity: this.activity, points: this.points, distance: this.distance, elevation: this.elevation,
      accumulated: this.elapsed(), startDate: this.startDate,
    };
    db.kv.put({ key: 'activeRecording', value }).catch(() => {});
  }

  private async acquireWakeLock() {
    try {
      const wl = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void>; addEventListener: (e: string, f: () => void) => void }> } }).wakeLock;
      if (!wl || this.wakeLock) return;
      const lock = await wl.request('screen');
      this.wakeLock = lock;
      this.wakeLockActive = true;
      lock.addEventListener('release', () => { this.wakeLock = null; this.wakeLockActive = false; this.emit(); });
      this.emit();
    } catch { this.wakeLockActive = false; }
  }

  private releaseWakeLock() {
    this.wakeLock?.release().catch(() => {});
    this.wakeLock = null;
    this.wakeLockActive = false;
  }
}

export const recorder = new Recorder();
