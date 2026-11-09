import { useEffect, useRef, useState } from 'preact/hooks';
import { CalendarCheck, CircleCheck, Flower2, Leaf, Moon, Pause, Play, Ruler, SkipBack, SkipForward, Sparkles, Timer, Trash, Volume2, VolumeX, Wind, X } from 'lucide-preact';
import type { LucideIcon } from 'lucide-preact';
import { db, type MobilityTest, type YogaSession } from '../db';
import { dayKey, fmt, fmtDate, fmtDuration } from '../calc';
import { PROGRAM, ROUTINES, SWITCH_SECS, TRANSITION_SECS, routineSecs, type Routine } from '../yoga';
import { Ico } from '../icons';
import { ActionRow, Empty, LineChart, NumberInput, Page, Row, Section, Segmented, Sheet, useLive, useNav, Overlay } from '../ui';

const KIND_ICON: Record<Routine['kind'], LucideIcon> = { Yoga: Flower2, Pilates: Sparkles, Mobility: Leaf, Recovery: Wind };
const routineIcon = (r: Routine) => (r.id === 'wind-down' ? Moon : KIND_ICON[r.kind]);
const byId = (id: string) => ROUTINES.find((r) => r.id === id)!;
const SHORT: Record<string, string> = {
  'legs-daily': 'Legs', 'front-split': 'Front split', 'middle-split': 'Middle split', shoulders: 'Posture',
  hamstrings: 'Hamstrings', 'pilates-core': 'Pilates', blackroll: 'Blackroll', 'wind-down': 'Wind-down',
};

async function programState() {
  const start = (await db.kv.get('yogaProgramStart'))?.value as string | undefined;
  if (!start) return null;
  const days = Math.floor((new Date(dayKey() + 'T12:00:00').getTime() - new Date(start + 'T12:00:00').getTime()) / 86400000);
  // The block repeats: week 1–4, then again from week 1 (round 2, 3, …).
  const week = (Math.floor(days / 7) % PROGRAM.weeks.length) + 1;
  const round = Math.floor(days / (7 * PROGRAM.weeks.length)) + 1;
  return { start, week, round, done: false };
}
const scaleFor = (week: number | undefined) => PROGRAM.weeks[Math.min(Math.max((week ?? 1) - 1, 0), PROGRAM.weeks.length - 1)].scale;

/** Compact yoga panel for the Training home: today's program routines with one-tap start. */
export function YogaCard() {
  const nav = useNav();
  const program = useLive(() => programState(), [], null as Awaited<ReturnType<typeof programState>>);
  const today = dayKey();
  const sessions = useLive(() => db.yogaSessions.where('day').equals(today).toArray(), [today], [] as YogaSession[]);
  const [playing, setPlaying] = useState<Routine | null>(null);
  const active = program && !program.done;
  const scale = active ? scaleFor(program.week) : 1;
  const ids = active ? PROGRAM.schedule[(new Date().getDay() + 6) % 7] : ['legs-daily', 'hamstrings'];
  const done = new Set(sessions.map((s) => s.routineId));
  return (
    <Section title={active ? `Yoga & mobility · week ${program.week} of 4` : 'Yoga & mobility'}
      right={<button class="link small-link" onClick={() => nav.push(<YogaHome />)}>All routines</button>}>
      {ids.map((id) => {
        const r = byId(id);
        const isDone = done.has(id);
        return (
          <Row key={id} onClick={() => setPlaying(r)}>
            <span class={`icon-badge ${isDone ? 'done' : 'violet'}`}><Ico icon={isDone ? CircleCheck : routineIcon(r)} size={18} /></span>
            <div class="row-main"><b>{r.name}</b><div class="sub small">{isDone ? 'Done today' : `${Math.round(routineSecs(r, scale) / 60)} min · ${r.kind}`}</div></div>
            <Ico icon={Play} size={20} grad="main" />
          </Row>
        );
      })}
      {!active && <ActionRow icon={CalendarCheck} label="Start the mobility & splits program" onClick={() => db.kv.put({ key: 'yogaProgramStart', value: today })} />}
      {playing && <Player routine={playing} scale={scale} onClose={() => setPlaying(null)} />}
    </Section>
  );
}

export function YogaHome() {
  const nav = useNav();
  const program = useLive(() => programState(), [], null as Awaited<ReturnType<typeof programState>>);
  const today = dayKey();
  const weekStart = (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dayKey(d); })();
  const sessions = useLive(() => db.yogaSessions.where('day').aboveOrEqual(weekStart).toArray(), [weekStart], [] as YogaSession[]);
  const tests = useLive(() => db.mobility.orderBy('day').toArray(), [], [] as MobilityTest[]);
  const [playing, setPlaying] = useState<Routine | null>(null);
  const [testing, setTesting] = useState(false);
  const [metric, setMetric] = useState<MetricKey>('frontLCm');
  const series = tests.filter((t) => t[metric] != null);

  const todayIds = PROGRAM.schedule[(new Date().getDay() + 6) % 7];
  const doneToday = new Set(sessions.filter((s) => s.day === today).map((s) => s.routineId));
  const activeProgram = program && !program.done;
  const scale = activeProgram ? scaleFor(program.week) : 1;
  const weekMins = Math.round(sessions.reduce((t, s) => t + s.secs, 0) / 60);

  return (
    <Page title="Yoga & Mobility">
      <div class="stat-tiles">
        <div class="tile"><span class="tile-label">This week</span><b>{sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}</b></div>
        <div class="tile"><span class="tile-label">Minutes</span><b>{weekMins}</b></div>
        <div class="tile"><span class="tile-label">Front split L/R</span><b>{(() => { const l = [...tests].reverse().find((t) => t.frontLCm != null)?.frontLCm; const r = [...tests].reverse().find((t) => t.frontRCm != null)?.frontRCm; return l == null && r == null ? '–' : `${l != null ? fmt(l) : '–'}/${r != null ? fmt(r) : '–'}`; })()}</b></div>
      </div>

      {activeProgram ? (
        <Section title={`${PROGRAM.name} · Week ${program.week} of 4${program.round > 1 ? ` · round ${program.round}` : ''}`} footer={PROGRAM.weeks[program.week - 1].focus}>
          {todayIds.map((id) => {
            const r = byId(id);
            const done = doneToday.has(id);
            return (
              <Row key={id} onClick={() => setPlaying(r)}>
                <span class={`icon-badge ${done ? 'done' : ''}`}><Ico icon={done ? CircleCheck : routineIcon(r)} size={18} /></span>
                <div class="row-main"><b>{r.name}</b><div class="sub small">{done ? 'Done today' : `${Math.round(routineSecs(r, scale) / 60)} min · ${r.kind}`}</div></div>
                <Ico icon={Play} size={20} grad="main" />
              </Row>
            );
          })}
        </Section>
      ) : (
        <Section title={PROGRAM.name} footer="Daily leg mobility plus focused sessions for the front split, the middle split and rounded shoulders. Hold times grow each week; the 4-week block then repeats. Measure your splits before you start.">
          {program?.done && <Row><Ico icon={CalendarCheck} size={20} grad="fresh" /><span class="row-main good bold">Program completed. Start again for another round.</span></Row>}
          <ActionRow icon={CalendarCheck} bold label={program ? 'Restart the program from week 1' : 'Start the program today'}
            onClick={() => db.kv.put({ key: 'yogaProgramStart', value: today })} />
        </Section>
      )}

      {activeProgram && (
        <Section title="This week's plan">
          <div class="pad week-grid">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, k) => (
              <div class={`week-day ${k === (new Date().getDay() + 6) % 7 ? 'today' : ''}`}>
                <b>{d}</b>
                {PROGRAM.schedule[k].map((id) => <span>{SHORT[id] ?? byId(id).name}</span>)}
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="All routines">
        {ROUTINES.map((r) => (
          <Row key={r.id} chevron onClick={() => nav.push(<RoutineScreen routine={r} scale={scale} onPlay={() => setPlaying(r)} />)}>
            <span class="icon-badge violet"><Ico icon={routineIcon(r)} size={18} /></span>
            <div class="row-main"><b>{r.name}</b><div class="sub small">{r.kind} · {Math.round(routineSecs(r, scale) / 60)} min · {r.poses.length} poses</div></div>
          </Row>
        ))}
      </Section>

      <Section title="Flexibility tests" footer={METRICS.find((x) => x.key === metric)!.help}>
        <div class="pad"><Segmented value={metric} onChange={setMetric} options={METRICS.map((x) => ({ key: x.key, label: x.short }))} /></div>
        {series.length >= 2 && (
          <div class="chart-wrap"><LineChart points={series.map((t) => ({ x: new Date(t.day + 'T12:00:00').getTime(), y: t[metric] as number }))} unit=" cm" height={160} /></div>
        )}
        {series.length === 0 && <Empty icon={Ruler} title="No measurements yet" text="Smaller numbers = more flexible. Measure every 1–2 weeks." />}
        {[...series].reverse().slice(0, 5).map((t) => (
          <Row key={t.id}>
            <span class="row-main">{fmtDate(t.day)}</span>
            <span class="row-value strong">{fmt(t[metric] as number)} cm</span>
            <button class="icon-btn" aria-label="Delete" onClick={() => { if (confirm('Delete this measurement?')) db.mobility.update(t.id, { [metric]: undefined }); }}><Ico icon={Trash} size={16} /></button>
          </Row>
        ))}
        <ActionRow icon={Ruler} label="Add measurements" onClick={() => setTesting(true)} />
      </Section>

      {playing && <Player routine={playing} scale={scale} onClose={() => setPlaying(null)} />}
      {testing && <MobilitySheet onClose={() => setTesting(false)} />}
    </Page>
  );
}

type MetricKey = 'frontLCm' | 'frontRCm' | 'middleCm' | 'toeTouchCm';
const METRICS: { key: MetricKey; short: string; label: string; help: string }[] = [
  { key: 'frontLCm', short: 'Front L', label: 'Front split, left leg forward', help: 'Slide into the front split with the left leg forward, hips square, on a warm body. Measure the lowest point of the hips/crotch to the floor. 0 = full split.' },
  { key: 'frontRCm', short: 'Front R', label: 'Front split, right leg forward', help: 'Same with the right leg forward. A few cm difference between sides is common; give the tighter side extra time.' },
  { key: 'middleCm', short: 'Middle', label: 'Middle split', help: 'Slide into the middle split facing forward, toes up, hips in line with the feet. Measure crotch to floor. 0 = full split.' },
  { key: 'toeTouchCm', short: 'Toe touch', label: 'Toe touch', help: 'Feet together, knees straight, reach down. Fingertips to floor in cm; 0 = touching, negative = past the floor.' },
];

function MobilitySheet({ onClose }: { onClose: () => void }) {
  const [v, setV] = useState<Partial<Record<MetricKey, number | null>>>({});
  const any = Object.values(v).some((x) => x != null);
  const save = async () => {
    if (!any) return;
    const day = dayKey();
    const data: Partial<MobilityTest> = {};
    for (const m of METRICS) if (v[m.key] != null) data[m.key] = v[m.key] as number;
    const existing = await db.mobility.where('day').equals(day).first();
    if (existing) await db.mobility.update(existing.id, data);
    else await db.mobility.add({ day, ...data } as MobilityTest);
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title="Flexibility Tests" actions={<button class="link bold" disabled={!any} onClick={save}>Save</button>}>
      <Section footer="Fill in what you measured today; leave the rest empty. Measure after a short warm-up, at the same time of day.">
        {METRICS.map((m) => (
          <Row key={m.key}>
            <span class="row-main">{m.label}</span>
            <NumberInput value={v[m.key] ?? null} onChange={(x) => setV({ ...v, [m.key]: x })} placeholder="–" />
            <span class="unit">cm</span>
          </Row>
        ))}
      </Section>
    </Sheet>
  );
}

function RoutineScreen({ routine, scale, onPlay }: { routine: Routine; scale: number; onPlay: () => void }) {
  return (
    <Page title={routine.name}>
      <Section>
        <div class="pad">
          <div class="sub small">{routine.kind} · {Math.round(routineSecs(routine, scale) / 60)} min</div>
          <p class="plan-summary">{routine.purpose}</p>
        </div>
        <ActionRow icon={Play} bold label="Start guided session" onClick={onPlay} />
      </Section>
      <Section title="Poses">
        {routine.poses.map((p, k) => (
          <Row key={k}>
            <span class="day-no">{k + 1}</span>
            <div class="row-main">
              <b>{p.name}</b>
              <div class="sub small">{Math.round(p.secs * scale)} s{p.sides ? ' per side' : ''}{p.props ? ` · ${p.props}` : ''}</div>
              <div class="small cue-text">{p.cue}</div>
            </div>
          </Row>
        ))}
      </Section>
    </Page>
  );
}

// ---------- Guided player ----------

interface Step { name: string; secs: number; side?: 'Left' | 'Right'; cue: string; props?: string; transition?: 'first' | 'next' | 'switch'; pose: number }

function Player({ routine, scale, onClose }: { routine: Routine; scale: number; onClose: () => void }) {
  // Every exercise starts with time to read it and get into position; sided poses get a short switch.
  const steps: Step[] = routine.poses.flatMap((p, i): Step[] => {
    const secs = Math.round(p.secs * scale);
    const intro: Step = { name: p.name, secs: TRANSITION_SECS, cue: p.cue, props: p.props, side: p.sides ? 'Left' : undefined, transition: i === 0 ? 'first' : 'next', pose: i };
    return p.sides
      ? [intro, { ...p, secs, side: 'Left', pose: i }, { name: p.name, secs: SWITCH_SECS, cue: p.cue, side: 'Right', transition: 'switch', pose: i }, { ...p, secs, side: 'Right', pose: i }]
      : [intro, { ...p, secs, pose: i }];
  });
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(steps[0].secs);
  const [running, setRunning] = useState(true);
  const [sound, setSound] = useState(true);
  const [finished, setFinished] = useState(false);
  const elapsed = useRef(0);
  const audio = useRef<AudioContext | null>(null);
  const wake = useRef<{ release: () => Promise<void> } | null>(null);

  const beep = (freq = 880, ms = 160) => {
    if (!sound) return;
    try {
      audio.current ??= new AudioContext();
      const ctx = audio.current, o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = freq; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
      o.start(); o.stop(ctx.currentTime + ms / 1000 + 0.05);
    } catch { /* audio unavailable */ }
  };

  // Keep the screen on during the session.
  useEffect(() => {
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request('screen').then((l) => { wake.current = l; }).catch(() => {});
    return () => { wake.current?.release().catch(() => {}); audio.current?.close().catch(() => {}); };
  }, []);

  // Tick once per second while running.
  useEffect(() => {
    if (!running || finished) return;
    const t = setInterval(() => { elapsed.current += 1; setLeft((s) => s - 1); }, 1000);
    return () => clearInterval(t);
  }, [running, finished]);

  // React to the countdown: short beeps for the last 3 seconds, then move on.
  useEffect(() => {
    if (finished || !running) return;
    if (left >= 1 && left <= 3) beep(660, 90);
    if (left <= 0) go(idx + 1);
  }, [left]);

  const go = (n: number) => {
    if (n >= steps.length) { finish(); return; }
    if (n < 0) n = 0;
    beep(n > idx ? 988 : 740, 220);
    setIdx(n);
    setLeft(steps[n].secs);
  };

  const finish = async () => {
    setFinished(true);
    beep(1175, 400);
    if (elapsed.current >= 60) {
      await db.yogaSessions.add({ day: dayKey(), time: Date.now(), routineId: routine.id, secs: elapsed.current } as YogaSession);
    }
  };

  const step = steps[idx];
  const next = steps.slice(idx + 1).find((x) => !x.transition);
  const progress = Math.min(1, Math.max(0, 1 - left / step.secs));
  const C = 2 * Math.PI * 10;

  return (
    <Overlay><div class="player">
      <header class="player-top">
        <button class="icon-link" aria-label="Close" onClick={onClose}><Ico icon={X} size={26} /></button>
        <span class="sub small">{routine.name} · {step.pose + 1}/{routine.poses.length}</span>
        <button class="icon-link" aria-label="Sound" onClick={() => setSound(!sound)}><Ico icon={sound ? Volume2 : VolumeX} size={22} /></button>
      </header>
      <div class="player-bar"><div style={{ width: `${((idx + progress) / steps.length) * 100}%` }} /></div>

      {finished ? (
        <div class="player-body">
          <Ico icon={CircleCheck} size={88} grad="fresh" strokeWidth={1.4} />
          <div class="player-title">Session complete</div>
          <div class="sub">{fmtDuration(elapsed.current)} · {routine.name}</div>
          <button class="big-btn green player-done" onClick={onClose}>Done</button>
        </div>
      ) : (
        <div class={`player-body ${step.transition ? 'transition' : ''}`}>
          {step.transition && <div class="transition-kicker">{step.transition === 'switch' ? 'Switch sides' : step.transition === 'first' ? 'Get into position' : 'Next exercise · get into position'}</div>}
          {step.side && <div class="side-pill">{step.side} side</div>}
          <div class="player-title">{step.name}</div>
          <div class="ring">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" class="ring-bg" />
              <circle cx="12" cy="12" r="10" class="ring-fg" stroke="url(#g-main)"
                stroke-dasharray={C} stroke-dashoffset={C * (1 - progress)} transform="rotate(-90 12 12)"
                style={step.transition ? { stroke: 'url(#g-cool)' } : undefined} />
            </svg>
            <div class="ring-num">{Math.max(left, 0)}</div>
          </div>
          {step.props && <div class="pill"><Ico icon={Timer} size={13} />{step.props}</div>}
          <p class="player-cue">{step.cue}</p>
          {!step.transition && next && <div class="sub small">Next: {next.name}{next.side ? ` (${next.side.toLowerCase()})` : ''}</div>}
        </div>
      )}

      {!finished && (
        <div class="player-controls">
          <button class="ctrl" aria-label="Previous" onClick={() => go(idx - 1)}><Ico icon={SkipBack} size={26} /></button>
          <button class="ctrl main" aria-label={running ? 'Pause' : 'Play'} onClick={() => { beep(880, 60); setRunning(!running); }}>
            <Ico icon={running ? Pause : Play} size={32} />
          </button>
          <button class="ctrl" aria-label="Next" onClick={() => go(idx + 1)}><Ico icon={SkipForward} size={26} /></button>
        </div>
      )}
    </div></Overlay>
  );
}
