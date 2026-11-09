import { useEffect, useRef, useState } from 'preact/hooks';
import { ChevronDown, ChevronUp, CircleCheck, HeartPulse, Pause, Play, Volume2, VolumeX, X } from 'lucide-preact';
import { db } from '../db';
import { dayKey, fmtDate, fmtDuration } from '../calc';
import { DEFAULT_KEGEL, KEGEL_GUIDE, LEVELS, SESSIONS_PER_DAY, SESSIONS_TO_ADVANCE, buildSession, segmentAt, tensionAt, type KegelState, type Level } from '../kegel';
import { Ico } from '../icons';
import { ActionRow, Page, Row, Section, useLive, useNav, Overlay } from '../ui';

export const getKegel = async (): Promise<KegelState> => ({ ...DEFAULT_KEGEL, ...((await db.kv.get('kegel'))?.value as Partial<KegelState> ?? {}) });
const saveKegel = (s: KegelState) => db.kv.put({ key: 'kegel', value: s });
const minutes = (lv: Level) => Math.round(buildSession(lv).total / 60);

/** Cyan → violet → pink, matching the app icon. */
function tensionColor(v: number, alpha = 1) {
  const stops = [[54, 198, 255], [139, 92, 246], [255, 79, 154]];
  const x = Math.max(0, Math.min(1, v)) * 2;
  const i = Math.min(1, Math.floor(x));
  const k = x - i;
  const c = stops[i].map((a, j) => Math.round(a + (stops[i + 1][j] - a) * k));
  return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}

// ---------- Card on the Training home ----------

export function KegelCard() {
  const nav = useNav();
  const st = useLive(() => getKegel(), [], DEFAULT_KEGEL);
  const lv = LEVELS[st.level - 1];
  const today = st.log.filter((l) => l.day === dayKey()).length;
  return (
    <Section title="Pelvic floor">
      <Row chevron onClick={() => nav.push(<KegelScreen />)}>
        <span class="icon-badge violet"><Ico icon={HeartPulse} size={18} /></span>
        <div class="row-main">
          <b>Kegel trainer</b>
          <div class="sub small">Level {lv.level} · {lv.name} · {minutes(lv)} min</div>
        </div>
        <span class="kegel-dots" aria-label={`${today} of ${SESSIONS_PER_DAY} sessions today`}>
          {Array.from({ length: SESSIONS_PER_DAY }, (_, i) => <i class={i < today ? 'on' : ''} />)}
        </span>
      </Row>
    </Section>
  );
}

// ---------- Trainer screen ----------

function KegelScreen() {
  const st = useLive(() => getKegel(), [], DEFAULT_KEGEL);
  const [playing, setPlaying] = useState<Level | null>(null);
  const [guide, setGuide] = useState<number | null>(0);
  const lv = LEVELS[st.level - 1];
  const today = st.log.filter((l) => l.day === dayKey()).length;
  const weekAgo = dayKey(new Date(Date.now() - 6 * 86400000));
  const week = st.log.filter((l) => l.day >= weekAgo).length;
  const ready = st.atLevel >= SESSIONS_TO_ADVANCE && st.level < LEVELS.length;

  const setLevel = (level: number) => saveKegel({ ...st, level, atLevel: level === st.level ? st.atLevel : 0 });

  return (
    <Page title="Kegel Trainer">
      <div class="section">
        <div class="bodymap-card kegel-hero">
          <div class="bm-kicker">Level {lv.level} of {LEVELS.length} · {lv.weeks}</div>
          <div class="next-title">{lv.name}</div>
          <div class="kegel-hero-sub">{lv.position}</div>
          <p class="kegel-focus">{lv.focus}</p>
          <div class="kegel-stats">
            <span><b>{today}/{SESSIONS_PER_DAY}</b> today</span>
            <span><b>{week}</b> this week</span>
            <span><b>{Math.min(st.atLevel, SESSIONS_TO_ADVANCE)}/{SESSIONS_TO_ADVANCE}</b> at this level</span>
          </div>
          <button class="big-btn green full" onClick={() => setPlaying(lv)}><Ico icon={Play} size={20} />Start · {minutes(lv)} min</button>
        </div>
      </div>

      {ready && (
        <Section footer="You've completed enough sessions at this level. Move up if every hold felt controlled and you could relax fully in between; otherwise stay a little longer.">
          <ActionRow icon={ChevronUp} bold label={`Move up to Level ${st.level + 1} · ${LEVELS[st.level].name}`} onClick={() => setLevel(st.level + 1)} />
        </Section>
      )}

      <Section title="Levels" footer="Each level: slow holds for endurance, quick squeezes for fast reflexes, and at least as much relaxation as tension.">
        {LEVELS.map((l) => (
          <Row key={l.level} onClick={() => setLevel(l.level)}>
            <span class={`day-no ${l.level === st.level ? '' : 'muted'}`}>{l.level}</span>
            <div class="row-main">
              <b>{l.name}</b>{l.level === st.level && <span class="tag">Current</span>}
              <div class="sub small">{l.weeks} · {l.position}</div>
              <div class="sub small">
                {l.slow.reps} × {l.slow.hold} s hold at {Math.round(l.slow.effort * 100)} % · {l.quick.reps} quick
                {l.elevator ? ` · ${l.elevator} elevator` : ''}{l.combo ? ` · ${l.combo} combos` : ''} · {minutes(l)} min
              </div>
            </div>
          </Row>
        ))}
      </Section>

      <Section title="How to train">
        {KEGEL_GUIDE.map((g, k) => (
          <button class="row tappable expand" onClick={() => setGuide(guide === k ? null : k)}>
            <div class="row-main"><b>{g.title}</b>{guide === k && <div class="sub small expand-text">{g.text}</div>}</div>
            <Ico icon={guide === k ? ChevronUp : ChevronDown} size={18} class="chevron" />
          </button>
        ))}
      </Section>

      {st.log.length > 0 && (
        <Section title="Recent sessions">
          {[...st.log].reverse().slice(0, 7).map((l) => (
            <Row label={fmtDate(l.day)} value={`Level ${l.level} · ${fmtDuration(l.secs)}`} />
          ))}
        </Section>
      )}

      {playing && <KegelPlayer level={playing} onClose={() => setPlaying(null)} onDone={async (secs) => {
        const s = await getKegel();
        await saveKegel({ ...s, atLevel: s.atLevel + 1, log: [...s.log, { day: dayKey(), level: playing.level, secs }].slice(-400) });
      }} />}
    </Page>
  );
}

// ---------- Player: scrolling tension track + tone ----------

const HISTORY_SECS = 7;

function KegelPlayer({ level, onClose, onDone }: { level: Level; onClose: () => void; onDone: (secs: number) => void }) {
  const { segments, total } = useState(() => buildSession(level))[0];
  const canvas = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(true);
  const [muted, setMuted] = useState(() => { try { return localStorage.getItem('kegelMuted') === '1'; } catch { return false; } });
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

  useEffect(() => { try { localStorage.setItem('kegelMuted', muted ? '1' : '0'); } catch { /* ignore */ } }, [muted]);

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
      draw(canvas.current, segments, t, v);
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
        <span class="small kegel-top">Level {level.level} · {level.name} · {level.position}</span>
        <button class="icon-link light" aria-label={muted ? 'Sound on' : 'Sound off'} onClick={() => setMuted(!muted)}><Ico icon={muted ? VolumeX : Volume2} size={22} /></button>
      </header>
      <div class="player-bar"><div style={{ width: `${Math.min(100, (t / total) * 100)}%` }} /></div>

      {finished ? (
        <div class="player-body">
          <Ico icon={CircleCheck} size={88} grad="fresh" strokeWidth={1.4} />
          <div class="player-title">Session complete</div>
          <div class="kegel-muted">{fmtDuration(total)} · Level {level.level}. Remember: relaxed, normal breathing for the rest of the day.</div>
          <button class="big-btn green player-done" onClick={onClose}>Done</button>
        </div>
      ) : (
        <>
          <div class="kegel-phase">
            <div class="kegel-label">{seg.label}</div>
            <div class="kegel-sub"><span class="kegel-pct" style={{ color: tensionColor(v) }}>{Math.round(v * 100)} %</span> · {left} s</div>
          </div>
          <canvas ref={canvas} class="kegel-canvas" aria-label={`Target tension ${Math.round(v * 100)} percent`} />
          <div class="kegel-hint">Follow the circle with your pelvic floor. Breathe normally; keep buttocks and thighs relaxed.</div>
          <div class="player-controls">
            <button class="ctrl main" aria-label={running ? 'Pause' : 'Resume'} onClick={togglePause}><Ico icon={running ? Pause : Play} size={32} /></button>
          </div>
        </>
      )}
    </div></Overlay>
  );
}

function draw(el: HTMLCanvasElement | null, segments: ReturnType<typeof buildSession>['segments'], t: number, v: number) {
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
  for (const g of [0, 0.25, 0.5, 0.75, 1]) {
    ctx.strokeStyle = g === 0 || g === 1 ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.07)';
    ctx.lineWidth = 1; ctx.setLineDash(g === 0 || g === 1 ? [] : [3, 5]);
    ctx.beginPath(); ctx.moveTo(L, y(g)); ctx.lineTo(w - R, y(g)); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.fillText(`${g * 100}%`, L - 8, y(g));
  }
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
