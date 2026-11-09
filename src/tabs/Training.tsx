import { useEffect, useMemo, useState } from 'preact/hooks';
import { db, MUSCLES, type Exercise, type Workout, type WorkoutEntry } from '../db';
import { fmt, fmtDate, oneRepMax, toLocalInput } from '../calc';
import { ActionSheet, ActionRow, Empty, LineChart, NumberInput, Page, Row, Section, Sheet, useLive, useNav } from '../ui';
import { BookOpen, Dumbbell, Ellipsis, Plus, SearchX, Trash, X } from 'lucide-preact';
import { Ico } from '../icons';
import { NextUpCard, PlansScreen } from './Plans';
import { LIBRARY } from '../plans';
import { Check, ClipboardList, Info, Timer } from 'lucide-preact';
import { restTimer } from '../restTimer';

const useExerciseMap = () => {
  const list = useLive(() => db.exercises.toArray(), [], [] as Exercise[]);
  return useMemo(() => new Map(list.map((e) => [e.id, e])), [list]);
};

const volume = (w: Workout) => w.entries.reduce((t, e) => t + e.sets.reduce((s, x) => s + x.reps * x.weight, 0), 0);
const setCount = (w: Workout) => w.entries.reduce((t, e) => t + e.sets.length, 0);
const summary = (e: WorkoutEntry) => e.sets.map((s) => `${s.reps}×${fmt(s.weight)} kg`).join(', ');

/** Most recent earlier entry for the same exercise. */
function previousEntry(all: Workout[], exerciseId: number, before: number, excludeId?: number) {
  let best: { w: Workout; e: WorkoutEntry } | null = null;
  for (const w of all) {
    if (w.id === excludeId || w.date >= before) continue;
    const e = w.entries.find((x) => x.exerciseId === exerciseId && x.sets.length);
    if (e && (!best || w.date > best.w.date)) best = { w, e };
  }
  return best;
}

// ---------- Home ----------

export function TrainingHome() {
  const nav = useNav();
  const workouts = useLive(() => db.workouts.orderBy('date').reverse().toArray(), [], [] as Workout[]);
  const exMap = useExerciseMap();
  const [menuFor, setMenuFor] = useState<Workout | null>(null);

  // Plan day screens ask us to open the workout they just created.
  useEffect(() => {
    const open = (e: Event) => nav.push(<WorkoutScreen id={(e as CustomEvent<number>).detail} />);
    window.addEventListener('open-workout', open);
    return () => window.removeEventListener('open-workout', open);
  }, [nav.push]);

  const newWorkout = async (from?: Workout) => {
    const id = await db.workouts.add({
      date: Date.now(), title: from?.title ?? 'Workout', notes: '',
      entries: from ? structuredClone(from.entries) : [],
    } as Workout);
    nav.push(<WorkoutScreen id={id} />);
  };

  return (
    <Page title="Training" actions={<button class="icon-link" aria-label="New workout" onClick={() => newWorkout()}><Ico icon={Plus} size={26} grad="main" /></button>}>
      <NextUpCard onStart={(id) => nav.push(<WorkoutScreen id={id} />)} />
      <Section>
        <Row chevron onClick={() => nav.push(<PlansScreen />)}>
          <span class="icon-badge violet"><Ico icon={ClipboardList} size={18} /></span>
          <div class="row-main">Training Plans<div class="sub small">3 plans built for your gear, goals and shoulders</div></div>
        </Row>
        <Row chevron onClick={() => nav.push(<ExerciseLibrary />)}>
          <span class="icon-badge"><Ico icon={BookOpen} size={18} /></span>
          <span class="row-main">Exercise Library</span>
        </Row>
      </Section>
      <Section title="Workouts">
        {workouts.length === 0 && <Empty icon={Dumbbell} title="No workouts yet" text="Tap + to log your first workout." />}
        {workouts.map((w) => (
          <Row key={w.id} onClick={() => nav.push(<WorkoutScreen id={w.id} />)}>
            <div class="row-main">
              <div class="row-title-line"><b>{w.title || 'Workout'}</b><span class="sub">{fmtDate(w.date)}</span></div>
              <div class="sub clamp2">{w.entries.map((e) => exMap.get(e.exerciseId)?.name ?? 'Deleted exercise').join(' · ')}</div>
              <div class="sub small">{setCount(w)} {setCount(w) === 1 ? 'set' : 'sets'} · {fmt(volume(w), 0)} kg volume</div>
            </div>
            <span class="icon-btn" onClick={(e) => { e.stopPropagation(); setMenuFor(w); }}><Ico icon={Ellipsis} size={20} /></span>
          </Row>
        ))}
      </Section>
      <ActionSheet open={!!menuFor} onClose={() => setMenuFor(null)} actions={menuFor ? [
        { label: 'Repeat this workout today', run: () => newWorkout(menuFor) },
        { label: 'Delete workout', destructive: true, run: () => { if (confirm('Delete this workout?')) db.workouts.delete(menuFor.id); } },
      ] : []} />
    </Page>
  );
}

// ---------- Workout editor ----------

function WorkoutScreen({ id }: { id: number }) {
  const nav = useNav();
  const workout = useLive(() => db.workouts.get(id), [id], undefined as Workout | undefined);
  const all = useLive(() => db.workouts.toArray(), [], [] as Workout[]);
  const exMap = useExerciseMap();
  const [picker, setPicker] = useState(false);
  const [menuIndex, setMenuIndex] = useState<number | null>(null);
  const [cueFor, setCueFor] = useState<number | null>(null);

  if (!workout) return <Page title="Workout"><div /></Page>;

  const save = (patch: Partial<Workout>) => db.workouts.update(id, patch);
  const setEntries = (fn: (entries: WorkoutEntry[]) => void) => {
    const entries = structuredClone(workout.entries);
    fn(entries);
    save({ entries });
  };

  const addExercise = (ex: Exercise) => {
    setPicker(false);
    const prev = previousEntry(all, ex.id, workout.date, id);
    // Prefill with last time's sets so you only adjust numbers.
    setEntries((en) => en.push({ exerciseId: ex.id, sets: prev ? structuredClone(prev.e.sets) : [{ reps: 10, weight: 0 }] }));
  };

  return (
    <Page title={workout.title || 'Workout'}>
      <Section>
        <Row><input class="text-input" value={workout.title} placeholder="Workout name"
          onInput={(e) => save({ title: (e.target as HTMLInputElement).value })} /></Row>
        <Row label="Date">
          <span class="row-main">Date</span>
          <input type="datetime-local" class="date-input" value={toLocalInput(workout.date)}
            onChange={(e) => { const v = (e.target as HTMLInputElement).value; if (v) save({ date: new Date(v).getTime() }); }} />
        </Row>
      </Section>

      {workout.entries.map((entry, ei) => {
        const ex = exMap.get(entry.exerciseId);
        const prev = previousEntry(all, entry.exerciseId, workout.date, id);
        return (
          <Section key={ei} title={ex?.name ?? 'Deleted exercise'}
            right={<button class="icon-link" aria-label="Exercise options" onClick={() => setMenuIndex(ei)}><Ico icon={Ellipsis} size={20} grad="main" /></button>}>
            {entry.target && (
              <div class="target-line">
                <span class="pill"><Ico icon={ClipboardList} size={13} />{entry.target}</span>
                {entry.rest && <span class="pill"><Ico icon={Timer} size={13} />rest {entry.rest >= 60 ? `${fmt(entry.rest / 60, 1)} min` : `${entry.rest} s`}</span>}
                {ex && LIBRARY.some((l) => l.name === ex.name) && (
                  <button class="pill tappable-pill" onClick={() => setCueFor(cueFor === ei ? null : ei)}><Ico icon={Info} size={13} />How to</button>
                )}
              </div>
            )}
            {entry.note && <div class="hint accent">{entry.note}</div>}
            {cueFor === ei && ex && (() => {
              const l = LIBRARY.find((x) => x.name === ex.name);
              return l ? <div class="hint cue">{l.cue}{l.shoulder && <div class="warn">{l.shoulder}</div>}</div> : null;
            })()}
            {prev && <div class="hint">Last time ({fmtDate(prev.w.date)}): {summary(prev.e)}</div>}
            <div class="set-head"><span>Set</span><span>Reps</span><span>kg</span><span>Rest</span><span /></div>
            {entry.sets.map((s, si) => (
              <div class="set-row" key={si}>
                <span class="set-no">{si + 1}</span>
                <NumberInput value={s.reps} decimals={false} onChange={(v) => setEntries((en) => { en[ei].sets[si].reps = Math.round(v ?? 0); })} />
                <NumberInput value={s.weight} onChange={(v) => setEntries((en) => { en[ei].sets[si].weight = v ?? 0; })} />
                <RestButton timerKey={`${id}:${ei}:${si}`} done={!!s.done} seconds={entry.rest ?? DEFAULT_REST}
                  label={`${ex?.name ?? 'Exercise'} · set ${si + 1}`}
                  onDone={(d) => setEntries((en) => { en[ei].sets[si].done = d; })} />
                <button class="icon-btn danger" aria-label="Delete set"
                  onClick={() => setEntries((en) => { en[ei].sets.splice(si, 1); })}><Ico icon={X} size={16} /></button>
              </div>
            ))}
            <ActionRow icon={Plus} label="Add set" onClick={() => setEntries((en) => {
              const last = en[ei].sets[en[ei].sets.length - 1];
              en[ei].sets.push(last ? { reps: last.reps, weight: last.weight } : { reps: 10, weight: 0 });
            })} />
          </Section>
        );
      })}

      <Section>
        <ActionRow icon={Plus} label="Add exercise" bold onClick={() => setPicker(true)} />
      </Section>

      <Section title="Notes">
        <textarea class="textarea" rows={3} placeholder="How did it go?" value={workout.notes}
          onInput={(e) => save({ notes: (e.target as HTMLTextAreaElement).value })} />
      </Section>

      <Section>
        <Row label="Total sets" value={setCount(workout)} />
        <Row label="Total volume" value={`${fmt(volume(workout), 0)} kg`} />
      </Section>

      <Section>
        <ActionRow icon={Trash} danger label="Delete workout" onClick={() => { if (confirm('Delete this workout?')) { db.workouts.delete(id); nav.pop(); } }} />
      </Section>

      <Sheet open={picker} onClose={() => setPicker(false)} title="Add Exercise">
        <ExerciseList onPick={addExercise} />
      </Sheet>

      <ActionSheet open={menuIndex != null} onClose={() => setMenuIndex(null)} actions={menuIndex == null ? [] : [
        ...(menuIndex > 0 ? [{ label: 'Move up', run: () => setEntries((en) => { const [x] = en.splice(menuIndex, 1); en.splice(menuIndex - 1, 0, x); }) }] : []),
        ...(menuIndex < workout.entries.length - 1 ? [{ label: 'Move down', run: () => setEntries((en) => { const [x] = en.splice(menuIndex, 1); en.splice(menuIndex + 1, 0, x); }) }] : []),
        { label: 'Remove exercise', destructive: true, run: () => setEntries((en) => { en.splice(menuIndex, 1); }) },
      ]} />
    </Page>
  );
}

// ---------- Exercise database ----------

function ExerciseList({ onPick }: { onPick: (e: Exercise) => void }) {
  const exercises = useLive(() => db.exercises.orderBy('name').toArray(), [], [] as Exercise[]);
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const filtered = exercises.filter((e) => (!muscle || e.muscle === muscle) && e.name.toLowerCase().includes(q.toLowerCase()));
  const groups = MUSCLES.map((m) => ({ m, items: filtered.filter((e) => e.muscle === m) })).filter((g) => g.items.length);

  return (
    <>
      <div class="search-bar">
        <input type="search" placeholder="Search exercises" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
      </div>
      <div class="chips">
        <button class={!muscle ? 'chip active' : 'chip'} onClick={() => setMuscle(null)}>All</button>
        {MUSCLES.map((m) => <button class={muscle === m ? 'chip active' : 'chip'} onClick={() => setMuscle(m)}>{m}</button>)}
      </div>
      <Section><ActionRow icon={Plus} label="New custom exercise" onClick={() => setAdding(true)} /></Section>
      {groups.length === 0 && <Empty icon={SearchX} title="No exercises found" />}
      {groups.map((g) => (
        <Section key={g.m} title={g.m}>
          {g.items.map((e) => (
            <Row key={e.id} onClick={() => onPick(e)} chevron
              label={<>{e.name}{e.custom && <span class="tag">Custom</span>}</>} sub={e.equipment} />
          ))}
        </Section>
      ))}
      <AddExerciseSheet open={adding} onClose={() => setAdding(false)} defaultMuscle={muscle ?? 'Chest'} />
    </>
  );
}

function AddExerciseSheet({ open, onClose, defaultMuscle }: { open: boolean; onClose: () => void; defaultMuscle: string }) {
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState(defaultMuscle);
  const [equipment, setEquipment] = useState('Barbell');
  const save = async () => {
    await db.exercises.add({ name: name.trim(), muscle, equipment: equipment.trim(), custom: true } as Exercise);
    setName('');
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="New Exercise"
      actions={<button class="link bold" disabled={!name.trim()} onClick={save}>Save</button>}>
      <Section>
        <Row><input class="text-input" placeholder="Name" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} /></Row>
        <Row>
          <span class="row-main">Muscle group</span>
          <select value={muscle} onChange={(e) => setMuscle((e.target as HTMLSelectElement).value)}>
            {MUSCLES.map((m) => <option value={m}>{m}</option>)}
          </select>
        </Row>
        <Row><input class="text-input" placeholder="Equipment" value={equipment} onInput={(e) => setEquipment((e.target as HTMLInputElement).value)} /></Row>
      </Section>
    </Sheet>
  );
}

function ExerciseLibrary() {
  const nav = useNav();
  return (
    <Page title="Exercise Library">
      <ExerciseList onPick={(e) => nav.push(<ExerciseDetail id={e.id} />)} />
    </Page>
  );
}

function ExerciseDetail({ id }: { id: number }) {
  const nav = useNav();
  const ex = useLive(() => db.exercises.get(id), [id], undefined as Exercise | undefined);
  const workouts = useLive(() => db.workouts.orderBy('date').reverse().toArray(), [], [] as Workout[]);
  if (!ex) return <Page title="Exercise"><div /></Page>;

  const history = workouts.flatMap((w) => w.entries
    .filter((e) => e.exerciseId === id && e.sets.length)
    .map((e) => ({
      date: w.date, e,
      e1rm: Math.max(...e.sets.map((s) => oneRepMax(s.weight, s.reps))),
      top: Math.max(...e.sets.map((s) => s.weight)),
    })));

  return (
    <Page title={ex.name}>
      <Section>
        <Row label="Muscle group" value={ex.muscle} />
        <Row label="Equipment" value={ex.equipment} />
      </Section>
      {history.length > 0 && (
        <Section title="Personal records">
          <Row label="Heaviest weight" value={`${fmt(Math.max(...history.map((h) => h.top)))} kg`} />
          <Row label="Best estimated 1RM" value={`${fmt(Math.max(...history.map((h) => h.e1rm)))} kg`} />
        </Section>
      )}
      {history.length >= 2 && (
        <Section title="Estimated 1RM progress">
          <div class="chart-wrap"><LineChart points={[...history].reverse().map((h) => ({ x: h.date, y: h.e1rm }))} unit=" kg" /></div>
        </Section>
      )}
      <Section title="History">
        {history.length === 0 && <Row><span class="sub">No sets logged yet.</span></Row>}
        {history.map((h) => <Row label={<b>{fmtDate(h.date)}</b>} sub={summary(h.e)} />)}
      </Section>
      <Section footer="1RM is estimated with the Epley formula: weight × (1 + reps ÷ 30). It gets less accurate above about 10 reps.">
        {ex.custom
          ? <ActionRow icon={Trash} danger label="Delete custom exercise" onClick={() => { if (confirm('Delete this exercise? Logged sets stay in your workouts.')) { db.exercises.delete(id); nav.pop(); } }} />
          : <Row><span class="sub">Built-in exercise</span></Row>}
      </Section>
    </Page>
  );
}

// ---------- Rest timer button (one per set) ----------

const DEFAULT_REST = 90;

function useRestTimer() {
  const [, force] = useState(0);
  useEffect(() => restTimer.subscribe(() => force((n) => n + 1)), []);
  return restTimer;
}

/**
 * Tap after finishing a set: marks it done and starts the rest countdown.
 * While this set's timer runs it shows the seconds left; tap again to stop it.
 */
function RestButton({ timerKey, done, seconds, label, onDone }: {
  timerKey: string; done: boolean; seconds: number; label: string; onDone: (done: boolean) => void;
}) {
  const t = useRestTimer();
  const mine = t.running && t.key === timerKey;
  const left = mine ? t.remaining() : 0;
  const pct = mine ? left / Math.max(t.total, 1) : 0;
  const tap = () => {
    if (mine) { t.stop(); return; }
    if (!done) onDone(true);
    t.start(seconds, label, timerKey);
  };
  return (
    <button class={`rest-btn ${mine ? 'running' : done ? 'done' : ''}`} onClick={tap}
      onContextMenu={(e) => { e.preventDefault(); if (done) onDone(false); }}
      aria-label={mine ? `Stop rest timer, ${left} seconds left` : `Set done, start ${seconds} s rest`}
      style={mine ? { '--p': `${pct * 360}deg` } as Record<string, string> : undefined}>
      {mine
        ? <span class="rest-num">{left}</span>
        : <Ico icon={done ? Check : Timer} size={18} />}
    </button>
  );
}
