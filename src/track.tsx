import { useEffect, useRef, useState } from 'preact/hooks';
import { CircleCheck, Pause, Play, Volume2, VolumeX, X } from 'lucide-preact';
import { fmtDuration } from './calc';
import { segmentAt, tensionAt, type Segment } from './kegel';
import { Ico } from './icons';
import { Overlay } from './ui';
import { rgbOf } from './theme';

export /** The theme's main gradient (cyan → violet → pink in Aurora). */
function tensionColor(v: number, alpha = 1) {
  const stops = [rgbOf('--p1'), rgbOf('--p2'), rgbOf('--p3')];
  const x = Math.max(0, Math.min(1, v)) * 2;
  const i = Math.min(1, Math.floor(x));
  const k = x - i;
  const c = stops[i].map((a, j) => Math.round(a + (stops[i + 1][j] - a) * k));
  return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}



const HISTORY_SECS = 7;

export interface TrackProps {
  segments: Segment[];
  total: number;
  /** Labels for 0, 25, 50, 75 and 100 % on the y axis. */
  yLabels?: string[];
  /** How the current value is shown next to the countdown. */
  valueText?: (v: number) => string;
  doneText: string;
  /** localStorage key for the mute setting. */
  muteKey: string;
  onClose: () => void;
  onDone: (secs: number) => void;
}

/** Guided session: the target value scrolls by as a track, with a soft tone that rises with it. */
export function TrackPlayer({ segments, total, yLabels = ['0%', '25%', '50%', '75%', '100%'], valueText = (v) => `${Math.round(v * 100)} %`, doneText, muteKey, onClose, onDone }: TrackProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(true);
  const [muted, setMuted] = useState(() => { try { return localStorage.getItem(muteKey) === '1'; } catch { return false; } });
  const [finished, setFinished] = useState(false);
  const [, setFrame] = useState(0);
  const clock = useRef({ base: performance.now(), pausedAt: 0 as number | 0, elapsed: 0 });
  const audio = useRef<{ ctx: AudioContext; osc: OscillatorNode; osc2: OscillatorNode; gain: GainNode } | null>(null);
  const wake = useRef<{ release: () => Promise<void> } | null>(null);

  // Soft sine tone (plus a quiet octave for warmth) through a low-pass filter.
  // Created on the Start tap so iOS allows audio.
  useEffect(() => {
    try {
      const ctx = new AudioContext();
      const gain = ctx.createGain(); gain.gain.value = 0;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
      const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 220;
      const osc2 = ctx.createOscillator(); osc2.type = 'sine'; osc2.frequency.value = 440;
      const g2 = ctx.createGain(); g2.gain.value = 0.18;
      osc.connect(gain); osc2.connect(g2); g2.connect(gain); gain.connect(lp); lp.connect(ctx.destination);
      osc.start(); osc2.start();
      audio.current = { ctx, osc, osc2, gain };
    } catch { /* no audio */ }
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request('screen').then((l) => { wake.current = l; }).catch(() => {});
    return () => {
      audio.current?.ctx.close().catch(() => {});
      wake.current?.release().catch(() => {});
    };
  }, []);

  const elapsed = () => clock.current.pausedAt ? clock.current.elapsed : clock.current.elapsed + (performance.now() - clock.current.base) / 1000;

  const togglePause = () => {
    const c = clock.current;
    if (running) { c.elapsed = elapsed(); c.pausedAt = performance.now(); }
    else { c.base = performance.now(); c.pausedAt = 0; }
    setRunning(!running);
  };

  useEffect(() => { try { localStorage.setItem(muteKey, muted ? '1' : '0'); } catch { /* ignore */ } }, [muted]);

  // Animation loop.
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const t = elapsed();
      if (t >= total && !finished) {
        setFinished(true);
        audio.current?.gain.gain.setTargetAtTime(0, audio.current.ctx.currentTime, 0.1);
        onDone(Math.round(total));
        return;
      }
      const v = tensionAt(segments, t);
      draw(canvas.current, segments, t, v, yLabels);
      const a = audio.current;
      if (a) {
        const now = a.ctx.currentTime;
        // One octave, A3 (220 Hz) at rest → A4 (440 Hz) at 100 %, exponential like musical pitch.
        const f = 220 * Math.pow(2, v);
        a.osc.frequency.setTargetAtTime(f, now, 0.06);
        a.osc2.frequency.setTargetAtTime(f * 2, now, 0.06);
        // Silent when relaxed; fades in with tension. The smoothing below avoids clicks.
        const vol = muted || !running || v < 0.01 ? 0 : 0.012 + 0.076 * v;
        a.gain.gain.setTargetAtTime(vol, now, 0.08);
      }
      setFrame((n) => (n + 1) % 1e6);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, muted, finished]);

  const t = elapsed();
  const seg = segmentAt(segments, t);
  const left = Math.max(0, Math.ceil(seg.end - t));
  const v = tensionAt(segments, t);

  return (
    <Overlay><div class="player kegel-player">
      <header class="player-top">
        <button class="icon-link light" aria-label="Close" onClick={onClose}><Ico icon={X} size={26} /></button>
        <button class="icon-link light" aria-label={muted ? 'Sound on' : 'Sound off'} onClick={() => setMuted(!muted)}><Ico icon={muted ? VolumeX : Volume2} size={22} /></button>
      </header>
      <div class="player-bar"><div style={{ width: `${Math.min(100, (t / total) * 100)}%` }} /></div>

      {finished ? (
        <div class="player-body">
          <Ico icon={CircleCheck} size={88} grad="fresh" strokeWidth={1.4} />
          <div class="player-title">Session complete</div>
          <div class="kegel-muted">{fmtDuration(total)} · {doneText}</div>
          <button class="big-btn green player-done" onClick={onClose}>Done</button>
        </div>
      ) : (
        <>
          <div class="kegel-phase">
            {/* Fixed-height block (max. two lines) so the track below never changes size. */}
            <div class="kegel-label">{seg.label}</div>
            <div class="kegel-sub"><span class="kegel-pct" style={{ color: tensionColor(v) }}>{valueText(v)}</span> · {left} s</div>
          </div>
          <canvas ref={canvas} class="kegel-canvas" aria-label={`Target ${valueText(v)}`} />
          <div class="player-controls">
            <button class="ctrl main" aria-label={running ? 'Pause' : 'Resume'} onClick={togglePause}><Ico icon={running ? Pause : Play} size={32} /></button>
          </div>
        </>
      )}
    </div></Overlay>
  );
}

function draw(el: HTMLCanvasElement | null, segments: Segment[], t: number, v: number, labels: string[]) {
  if (!el) return;
  const dpr = window.devicePixelRatio || 1;
  const w = el.clientWidth, h = el.clientHeight;
  if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) { el.width = Math.round(w * dpr); el.height = Math.round(h * dpr); }
  const ctx = el.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const L = 44, R = 14, T = 18, B = 18;
  const pw = w - L - R, ph = h - T - B;
  const y = (val: number) => T + (1 - val) * ph;
  const cx = L + pw * 0.62;
  const pps = (cx - L) / HISTORY_SECS;

  // Trail to the left, drawn first on the empty canvas as one continuous path.
  // Colour depends only on tension = height, so a vertical gradient colours it exactly.
  const grad = ctx.createLinearGradient(0, y(0), 0, y(1));
  grad.addColorStop(0, tensionColor(0)); grad.addColorStop(0.5, tensionColor(0.5)); grad.addColorStop(1, tensionColor(1));
  ctx.beginPath();
  for (let x = L; x <= cx; x += 2) {
    const val = tensionAt(segments, t - (cx - x) / pps);
    if (x === L) ctx.moveTo(x, y(val)); else ctx.lineTo(x, y(val));
  }
  ctx.lineTo(cx, y(v));
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = grad;
  ctx.globalAlpha = 0.18; ctx.lineWidth = 16; ctx.stroke();   // soft glow
  ctx.globalAlpha = 1; ctx.lineWidth = 6; ctx.stroke();        // core line
  // Fade older parts out to the left (mask keeps everything right of the circle).
  ctx.globalCompositeOperation = 'destination-in';
  const fade = ctx.createLinearGradient(L, 0, cx, 0);
  fade.addColorStop(0, 'rgba(0,0,0,0.05)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
  // One fill over the whole canvas: destination-in clears everything outside the drawn shape.
  // The gradient clamps, so everything right of the circle stays fully visible.
  ctx.fillStyle = fade; ctx.fillRect(0, 0, w, h);

  // Grid 0–100 % goes underneath the trail.
  ctx.globalCompositeOperation = 'destination-over';
  ctx.font = '600 11px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  [0, 0.25, 0.5, 0.75, 1].forEach((g, gi) => {
    ctx.strokeStyle = g === 0 || g === 1 ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.07)';
    ctx.lineWidth = 1; ctx.setLineDash(g === 0 || g === 1 ? [] : [3, 5]);
    ctx.beginPath(); ctx.moveTo(L, y(g)); ctx.lineTo(w - R, y(g)); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.fillText(labels[gi] ?? '', L - 8, y(g));
  });
  ctx.setLineDash([]);
  ctx.globalCompositeOperation = 'source-over';

  // Upcoming target (faint dashed guide to the right).
  ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
  ctx.beginPath();
  for (let x = cx; x <= w - R; x += 3) {
    const val = tensionAt(segments, t + (x - cx) / pps);
    if (x === cx) ctx.moveTo(x, y(val)); else ctx.lineTo(x, y(val));
  }
  ctx.stroke(); ctx.setLineDash([]);

  // The circle.
  const cy = y(v);
  ctx.shadowColor = tensionColor(v, 0.9); ctx.shadowBlur = 24;
  ctx.fillStyle = tensionColor(v);
  ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.stroke();
}
