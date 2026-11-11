import { useState } from 'preact/hooks';
import { NotebookPen } from 'lucide-preact';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Dumbbell, Ellipsis, Flower2, HeartPulse, Route as RouteIcon, Wind, type LucideIcon } from 'lucide-preact';
import { db, MUSCLES, type Route, type Workout, type YogaSession } from '../db';
import { activityInfo, dayKey, fmt, fmtDistance, fmtDuration } from '../calc';
import { ROUTINES } from '../yoga';
import { Ico } from '../icons';
import { ActionSheet, Empty, Page, Row, Section, Segmented, useLive, useNav } from '../ui';
import { WorkoutScreen, isInProgress, useExerciseMap, repeatWorkout, setCount, volume } from './Training';
import { RouteDetail } from './Routes';
import { getKegel } from './Kegel';
import { getBreathing } from './Breathing';
import { BREATHING, type BreathState } from '../breathing';
import { DEFAULT_KEGEL } from '../kegel';

type Kind = 'workout' | 'yoga' | 'kegel' | 'breath' | 'route';
const KINDS: { key: Kind; label: string; icon: LucideIcon }[] = [
  { key: 'workout', label: 'Workouts', icon: Dumbbell },
  { key: 'yoga', label: 'Yoga', icon: Flower2 },
  { key: 'kegel', label: 'Kegel', icon: HeartPulse },
  { key: 'breath', label: 'Breathing', icon: Wind },
  { key: 'route', label: 'Routes', icon: RouteIcon },
];

interface Item { kind: Kind; day: string; time: number; title: string; sub: string; workout?: Workout; route?: Route }

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function useItems(): Item[] {
  const workouts = useLive(() => db.workouts.toArray(), [], [] as Workout[]);
  const yoga = useLive(() => db.yogaSessions.toArray(), [], [] as YogaSession[]);
  const routes = useLive(() => db.routes.toArray(), [], [] as Route[]);
  const kegel = useLive(() => getKegel(), [], DEFAULT_KEGEL);
  const breath = useLive(() => getBreathing(), [], { log: [] } as BreathState);
  const items: Item[] = [];
  for (const w of workouts) {
    if (isInProgress(w) || !w.entries.length) continue;
    const mins = w.finishedAt ? Math.round((w.finishedAt - w.date) / 60000) : 0;
    items.push({ kind: 'workout', day: dayKey(new Date(w.date)), time: w.date, workout: w, title: w.title || 'Workout',
      sub: `${w.entries.length} exercises · ${setCount(w)} sets · ${fmt(volume(w), 0)} kg${mins > 0 && mins < 300 ? ` · ${mins} min` : ''}` });
  }
  for (const y of yoga) {
    items.push({ kind: 'yoga', day: y.day, time: y.time, title: ROUTINES.find((r) => r.id === y.routineId)?.name ?? 'Yoga', sub: `Yoga · ${fmtDuration(y.secs)}` });
  }
  for (const k of kegel.log) {
    items.push({ kind: 'kegel', day: k.day, time: new Date(k.day + 'T12:00:00').getTime(), title: 'Kegel training', sub: `Level ${k.level} · ${fmtDuration(k.secs)}` });
  }
  for (const b of breath.log) {
    items.push({ kind: 'breath', day: b.day, time: b.time, title: BREATHING.find((x) => x.id === b.id)?.name ?? 'Breathing', sub: `Breathing · ${fmtDuration(b.secs)}` });
  }
  for (const r of routes) {
    if (r.planned) continue;
    items.push({ kind: 'route', day: dayKey(new Date(r.date)), time: r.date, route: r, title: r.name,
      sub: `${activityInfo(r.activity).label} · ${fmtDistance(r.distance)} · ${fmtDuration(r.duration)}` });
  }
  return items.sort((a, b) => b.time - a.time);
}

export function HistoryHome() {
  const nav = useNav();
  const items = useItems();
  const now = new Date();
  const [month, setMonth] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState(dayKey());
  const [menuFor, setMenuFor] = useState<Workout | null>(null);

  const byDay = new Map<string, Item[]>();
  for (const it of items) byDay.set(it.day, [...(byDay.get(it.day) ?? []), it]);

  const first = new Date(month.y, month.m, 1);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((lead + daysInMonth) / 7) * 7 }, (_, i) => {
    const d = i - lead + 1;
    return d >= 1 && d <= daysInMonth ? dayKey(new Date(month.y, month.m, d)) : null;
  });
  const monthPrefix = `${month.y}-${String(month.m + 1).padStart(2, '0')}`;
  const monthItems = items.filter((i) => i.day.startsWith(monthPrefix));
  const activeDays = new Set(monthItems.map((i) => i.day)).size;
  const shift = (n: number) => { const d = new Date(month.y, month.m + n, 1); setMonth({ y: d.getFullYear(), m: d.getMonth() }); };

  const open = (it: Item) => {
    if (it.workout) nav.push(<WorkoutScreen id={it.workout.id} />);
    else if (it.route) nav.push(<RouteDetail id={it.route.id} />);
  };

  const row = (it: Item) => {
    const k = KINDS.find((x) => x.key === it.kind)!;
    return (
      <Row key={`${it.kind}${it.time}${it.title}`} onClick={it.workout || it.route ? () => open(it) : undefined}>
        <span class={`icon-badge hist-${it.kind}`}><Ico icon={k.icon} size={18} /></span>
        <div class="row-main">
          <b>{it.title}</b>
          <div class="sub small">{it.kind !== 'kegel' ? `${new Date(it.time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} · ` : ''}{it.sub}</div>
        </div>
        {it.workout && <span class="icon-btn" onClick={(e) => { e.stopPropagation(); setMenuFor(it.workout!); }}><Ico icon={Ellipsis} size={20} /></span>}
      </Row>
    );
  };

  const dayItems = byDay.get(selected) ?? [];
  const months = new Map<string, Item[]>();
  for (const it of items) { const k = it.day.slice(0, 7); months.set(k, [...(months.get(k) ?? []), it]); }

  return (
    <Page title="History">
      <div class="section">
        <div class="card cal">
          <div class="cal-head">
            <button class="icon-link" aria-label="Previous month" onClick={() => shift(-1)}><Ico icon={ChevronLeft} size={24} grad="main" /></button>
            <b>{first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</b>
            <button class="icon-link" aria-label="Next month" onClick={() => shift(1)}><Ico icon={ChevronRight} size={24} grad="main" /></button>
          </div>
          <div class="cal-grid">
            {WEEKDAYS.map((w) => <span class="cal-wd">{w}</span>)}
            {cells.map((d) => {
              if (!d) return <span />;
              const kinds = new Set((byDay.get(d) ?? []).map((i) => i.kind));
              return (
                <button class={`cal-day ${d === selected ? 'sel' : ''} ${d === dayKey() ? 'today' : ''} ${kinds.size ? 'active' : ''}`} onClick={() => setSelected(d)}>
                  <span class="cal-num">{Number(d.slice(8))}</span>
                  <span class="cal-dots">{KINDS.filter((k) => kinds.has(k.key)).map((k) => <i class={`hist-dot hist-${k.key}`} />)}</span>
                </button>
              );
            })}
          </div>
          <div class="cal-legend">
            {KINDS.map((k) => <span><i class={`hist-dot hist-${k.key}`} />{k.label} {monthItems.filter((i) => i.kind === k.key).length}</span>)}
          </div>
          <div class="cal-foot sub small">{activeDays} active {activeDays === 1 ? 'day' : 'days'} this month</div>
        </div>
      </div>

      <NotesPanel />

      <Section title={new Date(selected + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}>
        {dayItems.length ? dayItems.map(row) : <Row><span class="sub">Rest day: nothing logged.</span></Row>}
      </Section>

      {items.length === 0 && <Section><Empty icon={Dumbbell} title="No training yet" text="Finished workouts, yoga, Kegel sessions and recorded routes appear here." /></Section>}
      {[...months.entries()].map(([k, list]) => (
        <Section key={k} title={new Date(k + '-15T12:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} right={`${list.length}`}>
          {list.map(row)}
        </Section>
      ))}

      <ActionSheet open={!!menuFor} onClose={() => setMenuFor(null)} actions={menuFor ? [
        { label: 'Repeat this workout today', run: async () => nav.push(<WorkoutScreen id={await repeatWorkout(menuFor)} />) },
        { label: 'Delete workout', destructive: true, run: () => { if (confirm('Delete this workout?')) db.workouts.delete(menuFor.id); } },
      ] : []} />
    </Page>
  );
}

// ---------- Notes ----------

interface Note { key: string; workout: Workout; exercise?: string; muscle: string; text: string }
const WHOLE = 'Whole workout';

function useNotes(): Note[] {
  const workouts = useLive(() => db.workouts.orderBy('date').reverse().toArray(), [], [] as Workout[]);
  const exMap = useExerciseMap();
  const notes: Note[] = [];
  for (const w of workouts) {
    w.entries.forEach((e, i) => {
      const text = e.userNote?.trim();
      if (!text) return;
      const ex = exMap.get(e.exerciseId);
      notes.push({ key: `${w.id}-${i}`, workout: w, exercise: ex?.name ?? 'Deleted exercise', muscle: ex?.muscle ?? 'Other', text });
    });
    if (w.notes?.trim()) notes.push({ key: `${w.id}-w`, workout: w, muscle: WHOLE, text: w.notes.trim() });
  }
  return notes;
}

/** Panel on the History home that opens all notes. */
function NotesPanel() {
  const nav = useNav();
  const notes = useNotes();
  const latest = notes[0];
  return (
    <Section>
      <Row onClick={() => nav.push(<NotesScreen />)}>
        <span class="icon-badge"><Ico icon={NotebookPen} size={18} /></span>
        <div class="row-main">
          <b>Workout notes</b>
          <div class="sub small">{latest ? `${notes.length} ${notes.length === 1 ? 'note' : 'notes'} · latest: ${latest.exercise ?? WHOLE}` : 'Notes you add to exercises appear here'}</div>
        </div>
        <Ico icon={ChevronRight} size={18} class="chevron" />
      </Row>
    </Section>
  );
}

function NotesScreen() {
  const nav = useNav();
  const notes = useNotes();
  const [mode, setMode] = useState<'date' | 'muscle'>('date');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (m: string) => { const n = new Set(open); if (n.has(m)) n.delete(m); else n.add(m); setOpen(n); };

  const item = (n: Note, showMuscle: boolean) => (
    <Row key={n.key} onClick={() => nav.push(<WorkoutScreen id={n.workout.id} />)}>
      <div class="row-main note-item">
        <b>{n.exercise ?? WHOLE}</b>
        <div class="sub small">{new Date(n.workout.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · {n.workout.title || 'Workout'}{showMuscle && n.exercise ? ` · ${n.muscle}` : ''}</div>
        <div class="note-text">{n.text}</div>
      </div>
      <Ico icon={ChevronRight} size={18} class="chevron" />
    </Row>
  );

  const order = [...MUSCLES, 'Other', WHOLE] as string[];
  const groups = order.map((m) => ({ m, list: notes.filter((n) => n.muscle === m) })).filter((g) => g.list.length);
  for (const n of notes) if (!order.includes(n.muscle) && !groups.some((g) => g.m === n.muscle)) groups.push({ m: n.muscle, list: notes.filter((x) => x.muscle === n.muscle) });

  const months = new Map<string, Note[]>();
  for (const n of notes) { const k = dayKey(new Date(n.workout.date)).slice(0, 7); months.set(k, [...(months.get(k) ?? []), n]); }

  return (
    <Page title="Workout notes">
      {notes.length === 0 ? (
        <Section><Empty icon={NotebookPen} title="No notes yet" text="During a workout, open an exercise and tap Notes to write down how it felt, technique cues or what to change next time." /></Section>
      ) : (
        <>
          <div class="pad">
            <Segmented value={mode} onChange={setMode} options={[{ key: 'date', label: 'By date' }, { key: 'muscle', label: 'By muscle group' }]} />
          </div>
          {mode === 'date' && [...months.entries()].map(([k, list]) => (
            <Section key={k} title={new Date(k + '-15T12:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} right={`${list.length}`}>
              {list.map((n) => item(n, true))}
            </Section>
          ))}
          {mode === 'muscle' && (
            <Section footer="Each exercise counts toward its main muscle group. Notes for the whole workout are collected at the end.">
              {groups.map(({ m, list }) => (
                <div key={m}>
                  <button class="row tappable expand" aria-expanded={open.has(m)} onClick={() => toggle(m)}>
                    <div class="row-main"><b>{m}</b><div class="sub small">{list.length} {list.length === 1 ? 'note' : 'notes'} · latest {new Date(list[0].workout.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</div></div>
                    <Ico icon={open.has(m) ? ChevronUp : ChevronDown} size={18} class="chevron" />
                  </button>
                  {open.has(m) && <div class="note-group">{list.map((n) => item(n, false))}</div>}
                </div>
              ))}
            </Section>
          )}
        </>
      )}
    </Page>
  );
}
