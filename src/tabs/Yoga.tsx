import { useEffect, useRef, useState } from 'preact/hooks';
import { CalendarCheck, CircleCheck, Flower2, Leaf, Moon, Pause, Play, Ruler, SkipBack, SkipForward, Sparkles, Timer, Trash, Volume2, VolumeX, Wind, X } from 'lucide-preact';
import type { LucideIcon } from 'lucide-preact';
import { db, type MobilityTest, type YogaSession } from '../db';
import { dayKey, fmt, fmtDate, fmtDuration } from '../calc';
import { PROGRAM, ROUTINES, routineSecs, type Routine } from '../yoga';
import { Ico } from '../icons';
import { ActionRow, Empty, LineChart, NumberInput, Page, Row, Section, Sheet, useLive, useNav } from '../ui';

const KIND_ICON: Record<Routine['kind'], LucideIcon> = { Yoga: Flower2, Pilates: Sparkles, Mobility: Leaf, Recovery: Wind };
const routineIcon = (r: Routine) => (r.id === 'wind-down' ? Moon : KIND_ICON[r.kind]);
const byId = (id: string) => ROUTINES.find((r) => r.id === id)!;

async function programState() {
  const start = (await db.kv.get('yogaProgramStart'))?.value as string | undefined;
  if (!start) return null;
  const days = Math.floor((new Date(dayKey() + 'T12:00:00').getTime() - new Date(start + 'T12:00:00').getTime()) / 86400000);
  const week = Math.floor(days / 7) + 1;
  return { start, week, done: week > PROGRAM.weeks.length };
}
const scaleFor = (week: number | undefined) => PROGRAM.weeks[Math.min(Math.max((week ?? 1) - 1, 0), PROGRAM.weeks.length - 1)].scale;

export function YogaHome() {
  const nav = useNav();
  const program = useLive(() => programState(), [], null as Awaited<ReturnType<typeof programState>>);
  const today = dayKey();
  const weekStart = (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dayKey(d); })();
  const sessions = useLive(() => db.yogaSessions.where('day').aboveOrEqual(weekStart).toArray(), [weekStart], [] as YogaSession[]);
  const tests = useLive(() => db.mobility.orderBy('day').toArray(), [], [] as MobilityTest[]);
  const [playing, setPlaying] = useState<Routine | null>(null);
  const [testing, setTesting] = useState(false);

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
        <div class="tile"><span class="tile-label">Toe touch</span><b>{tests.length ? `${fmt(tests[tests.length - 1].toeTouchCm)} cm` : '–'}</b></div>
      </div>

      {activeProgram ? (
        <Section title={`${PROGRAM.name} · Week ${program.week} of 4`} footer={PROGRAM.weeks[program.week - 1].focus}>
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
        <Section title={PROGRAM.name} footer="A 10-minute daily leg routine plus one focused session per day. Hold times grow each week. Measure your toe touch before you start and again in week 4.">
          {program?.done && <Row><Ico icon={CalendarCheck} size={20} grad="fresh" /><span class="row-main good bold">Program completed. Start again for another round.</span></Row>}
          <ActionRow icon={CalendarCheck} bold label={program?.done ? 'Restart the program' : 'Start the 4-week program today'}
            onClick={() => db.kv.put({ key: 'yogaProgramStart', value: today })} />
        </Section>
      )}

      {activeProgram && (
        <Section title="This week's plan">
          <div class="pad week-grid">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, k) => (
              <div class={`week-day ${k === (new Date().getDay() + 6) % 7 ? 'today' : ''}`}>
                <b>{d}</b>
                {PROGRAM.schedule[k].map((id) => <span>{byId(id).name.replace('Shoulder-Friendly ', '').replace('Daily ', '')}</span>)}
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

      <Section title="Hamstring flexibility test"
        footer="Stand with feet together, knees straight, and slowly reach down. Measure fingertips to floor in cm (0 = touching the floor, negative = past the floor). Test after a short warm-up, same time of day.">
        {tests.length >= 2 && (
          <div class="chart-wrap"><LineChart points={tests.map((t) => ({ x: new Date(t.day + 'T12:00:00').getTime(), y: t.toeTouchCm }))} unit=" cm" height={160} /></div>
        )}
        {tests.length === 0 && <Empty icon={Ruler} title="No measurements yet" text="Smaller numbers = more flexible hamstrings." />}
        {[...tests].reverse().slice(0, 5).map((t) => (
          <Row key={t.id}>
            <span class="row-main">{fmtDate(t.day)}</span>
            <span class="row-value strong">{fmt(t.toeTouchCm)} cm</span>
            <button class="icon-btn" aria-label="Delete" onClick={() => { if (confirm('Delete this measurement?')) db.mobility.delete(t.id); }}><Ico icon={Trash} size={16} /></button>
          </Row>
        ))}
        <ActionRow icon={Ruler} label="Add measurement" onClick={() => setTesting(true)} />
      </Section>

      {playing && <Player routine={playing} scale={scale} onClose={() => setPlaying(null)} />}
      {testing && <MobilitySheet onClose={() => setTesting(false)} />}
    </Page>
  );
}

function MobilitySheet({ onClose }: { onClose: () => void }) {
  const [cm, setCm] = useState<number | null>(null);
  const save = async () => {
    if (cm == null) return;
    const day = dayKey();
    const existing = await db.mobility.where('day').equals(day).first();
    if (existing) await db.mobility.update(existing.id, { toeTouchCm: cm });
    else await db.mobility.add({ day, toeTouchCm: cm } as MobilityTest);
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title="Toe-Touch Test" actions={<button class="link bold" disabled={cm == null} onClick={save}>Save</button>}>
      <Section footer="Fingertips to floor. 0 = touching, negative = reaching past the floor.">
        <Row>
          <span class="row-main">Distance to floor</span>
          <NumberInput value={cm} onChange={setCm} placeholder="0" />
          <span class="unit">cm</span>
        </Row>
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

interface Step { name: string; secs: number; side?: 'Left' | 'Right'; cue: string; props?: string }

function Player({ routine, scale, onClose }: { routine: Routine; scale: number; onClose: () => void }) {
  const steps: Step[] = [
    { name: 'Get ready', secs: 8, cue: `Lay out your mat${routine.poses.some((p) => p.props) ? ' and props' : ''}. First: ${routine.poses[0].name}.` },
    ...routine.poses.flatMap((p): Step[] => {
      const secs = Math.round(p.secs * scale);
      return p.sides
        ? [{ ...p, secs, side: 'Left' }, { ...p, secs, side: 'Right' }]
        : [{ ...p, secs }];
    }),
  ];
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
  const next = steps[idx + 1];
  const progress = Math.min(1, Math.max(0, 1 - left / step.secs));
  const C = 2 * Math.PI * 10;

  return (
    <div class="player">
      <header class="player-top">
        <button class="icon-link" aria-label="Close" onClick={onClose}><Ico icon={X} size={26} /></button>
        <span class="sub small">{routine.name} · {Math.min(idx + 1, steps.length)}/{steps.length}</span>
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
        <div class="player-body">
          {step.side && <div class="side-pill">{step.side} side</div>}
          <div class="player-title">{step.name}</div>
          <div class="ring">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" class="ring-bg" />
              <circle cx="12" cy="12" r="10" class="ring-fg" stroke="url(#g-main)"
                stroke-dasharray={C} stroke-dashoffset={C * (1 - progress)} transform="rotate(-90 12 12)" />
            </svg>
            <div class="ring-num">{Math.max(left, 0)}</div>
          </div>
          {step.props && <div class="pill"><Ico icon={Timer} size={13} />{step.props}</div>}
          <p class="player-cue">{step.cue}</p>
          {next && <div class="sub small">Next: {next.name}{next.side ? ` (${next.side.toLowerCase()})` : ''}</div>}
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
    </div>
  );
}
