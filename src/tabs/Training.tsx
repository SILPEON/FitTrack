import { useEffect, useMemo, useState } from 'preact/hooks';
import { db, MUSCLES, type Exercise, type SetEntry, type Workout, type WorkoutEntry } from '../db';
import { fmt, fmtDate, fmtDuration, oneRepMax, toLocalInput } from '../calc';
import { ActionSheet, ActionRow, Empty, LineChart, NumberInput, Page, Row, Section, Sheet, useLive, useNav } from '../ui';
import { BookOpen, Dumbbell, Ellipsis, Plus, SearchX, Trash, X } from 'lucide-preact';
import { Ico } from '../icons';
import { NextUpCard, PlansScreen, equipmentTag, getGear, normalise } from './Plans';
import { BodyMap, IntensityLegend } from '../bodymap';
import { DEFAULT_GEAR, LIBRARY, type Muscle } from '../plans';
import { Check, PenLine, ChevronDown, ChevronUp, CircleCheck, ClipboardList, Info, Medal, PersonStanding, Timer, Trophy } from 'lucide-preact';
import { restTimer } from '../restTimer';

const useExerciseMap = () => {
  const list = useLive(() => db.exercises.toArray(), [], [] as Exercise[]);
  return useMemo(() => new Map(list.map((e) => [e.id, e])), [list]);
};

const volume = (w: Workout) => w.entries.reduce((t, e) => t + e.sets.reduce((s, x) => s + x.reps * x.weight, 0), 0);
const setCount = (w: Workout) => w.entries.reduce((t, e) => t + e.sets.length, 0);
const summary = (e: WorkoutEntry) => e.sets.map((s) => `${s.side ? s.side + ' ' : ''}${s.reps}×${s.weight ? `${fmt(s.weight)} kg` : 'BW'}`).join(', ');

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
    // Repeating copies exercises and numbers but not the "done" marks.
    const entries: WorkoutEntry[] = from
      ? from.entries.map((e) => ({ ...structuredClone(e), done: false, sets: e.sets.map((x) => ({ reps: x.reps, weight: x.weight, ...(x.side ? { side: x.side } : {}) })) }))
      : [];
    const id = await db.workouts.add({
      date: Date.now(), title: from?.title ?? 'Workout', notes: '', entries,
      ...(from?.planId ? { planId: from.planId, dayId: from.dayId } : {}),
    } as Workout);
    nav.push(<WorkoutScreen id={id} />);
  };

  return (
    <Page title="Training"
      left={
        <span class="topbar-icons">
          <button class="icon-link" aria-label="Training plans" onClick={() => nav.push(<PlansScreen />)}><Ico icon={ClipboardList} size={24} grad="main" /></button>
          <button class="icon-link" aria-label="Exercise library" onClick={() => nav.push(<ExerciseLibrary />)}><Ico icon={BookOpen} size={24} grad="main" /></button>
        </span>
      }
      actions={<button class="icon-link" aria-label="New empty workout" onClick={() => newWorkout()}><Ico icon={Plus} size={26} grad="main" /></button>}>
      <NextUpCard onStart={(id) => nav.push(<WorkoutScreen id={id} />)} />
      <Section title="Workouts">
        {workouts.length === 0 && <Empty icon={Dumbbell} title="No workouts yet" text="Start your plan above, or tap + for an empty workout." />}
        {workouts.map((w) => (
          <Row key={w.id} onClick={() => nav.push(<WorkoutScreen id={w.id} />)}>
            <div class="row-main">
              <div class="row-title-line"><b>{w.title || 'Workout'}{w.finishedAt && <Ico icon={CircleCheck} size={15} grad="fresh" class="inline-ico title-check" />}</b><span class="sub">{fmtDate(w.date)}</span></div>
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

const SWITCH_SIDES_REST = 10;
const sideLabel = { L: 'Left', R: 'Right' } as const;

function WorkoutScreen({ id }: { id: number }) {
  const nav = useNav();
  const workout = useLive(() => db.workouts.get(id), [id], undefined as Workout | undefined);
  const all = useLive(() => db.workouts.toArray(), [], [] as Workout[]);
  const gear = useLive(() => getGear(), [], DEFAULT_GEAR);
  const exMap = useExerciseMap();
  const [picker, setPicker] = useState(false);
  const [menuIndex, setMenuIndex] = useState<number | null>(null);
  const [cueFor, setCueFor] = useState<number | null>(null);
  /** undefined = automatic (first exercise not yet done), null = all folded. */
  const [openIdx, setOpenIdx] = useState<number | null | undefined>(undefined);
  const [showSummary, setSummary] = useState(false);
  const [details, setDetails] = useState(false);

  if (!workout) return <Page title="Workout"><div /></Page>;

  const save = (patch: Partial<Workout>) => db.workouts.update(id, patch);
  const setEntries = (fn: (entries: WorkoutEntry[]) => void) => {
    const entries = structuredClone(workout.entries);
    fn(entries);
    save({ entries });
    return entries;
  };

  const autoOpen = workout.entries.findIndex((e) => !e.done);
  const current = openIdx === undefined ? (autoOpen === -1 ? null : autoOpen) : openIdx;
  const scrollTo = (i: number) => setTimeout(() => document.getElementById(`ex-${id}-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);

  const addExercise = (ex: Exercise) => {
    setPicker(false);
    const prev = previousEntry(all, ex.id, workout.date, id);
    const perSide = LIBRARY.find((l) => l.name === ex.name)?.perSide;
    const fresh: SetEntry[] = perSide ? [{ reps: 10, weight: 0, side: 'L' }, { reps: 10, weight: 0, side: 'R' }] : [{ reps: 10, weight: 0 }];
    // Prefill with last time's sets so you only adjust numbers.
    const sets = prev ? prev.e.sets.map((x) => ({ reps: x.reps, weight: x.weight, ...(x.side ? { side: x.side } : {}) })) : fresh;
    const entries = setEntries((en) => en.push({ exerciseId: ex.id, sets }));
    setOpenIdx(entries.length - 1);
    scrollTo(entries.length - 1);
  };

  const completeExercise = (ei: number) => {
    const entries = setEntries((en) => { en[ei].done = true; en[ei].sets.forEach((x) => { x.done = true; }); });
    const next = entries.findIndex((e, k) => k > ei && !e.done);
    const any = next !== -1 ? next : entries.findIndex((e) => !e.done);
    setOpenIdx(any === -1 ? null : any);
    if (any !== -1) scrollTo(any);
  };

  const finish = () => {
    const open = workout.entries.filter((e) => !e.done).length;
    if (open && !confirm(`${open} exercise${open === 1 ? ' is' : 's are'} not marked done. Finish anyway?`)) return;
    restTimer.stop();
    save({ finishedAt: Date.now() });
    setSummary(true);
  };

  return (
    <Page title={workout.title || 'Workout'}
      actions={<button class="icon-link" aria-label="Workout name and start time" onClick={() => setDetails(true)}><Ico icon={PenLine} size={22} grad="main" /></button>}>
      <Sheet open={details} onClose={() => setDetails(false)} title="Workout details"
        actions={<button class="link bold" onClick={() => setDetails(false)}>Done</button>}>
        <Section>
          <Row><input class="text-input" value={workout.title} placeholder="Workout name"
            onInput={(e) => save({ title: (e.target as HTMLInputElement).value })} /></Row>
          <Row>
            <span class="row-main">Started</span>
            <input type="datetime-local" class="date-input" value={toLocalInput(workout.date)}
              onChange={(e) => { const v = (e.target as HTMLInputElement).value; if (v) save({ date: new Date(v).getTime() }); }} />
          </Row>
        </Section>
      </Sheet>
      <div class="workout-meta sub small">Started {fmtDate(workout.date, true)}</div>

      {workout.entries.map((entry, ei) => {
        const ex = exMap.get(entry.exerciseId);
        const lib = ex ? LIBRARY.find((l) => l.name === ex.name) : undefined;
        const tag = equipmentTag(ex?.name ?? '', ex?.equipment ?? '', gear);
        const prev = previousEntry(all, entry.exerciseId, workout.date, id);
        const isOpen = current === ei;
        const doneSets = entry.sets.filter((x) => x.done).length;
        const kgPlaceholder = tag.bodyweight ? 'bodyweight' : tag.band ? 'band' : '0';
        return (
          <section class="section" id={`ex-${id}-${ei}`} key={ei}>
            <div class={`card ex-card ${isOpen ? 'open' : ''} ${entry.done ? 'is-done' : ''}`}>
              <div class="ex-head" role="button" tabIndex={0} aria-expanded={isOpen} onClick={() => setOpenIdx(isOpen ? null : ei)}>
                <span class={`ex-badge ${entry.done ? 'done' : ''}`}>{entry.done ? <Ico icon={Check} size={16} /> : ei + 1}</span>
                <div class="row-main">
                  <b class="ex-name">{ex?.name ?? 'Deleted exercise'}</b>
                  <div class="sub small">{entry.target ? `${entry.target} · ` : ''}{tag.text}</div>
                </div>
                <span class="ex-progress">{doneSets}/{entry.sets.length}</span>
                <button class="icon-link" aria-label="Exercise options" onClick={(e) => { e.stopPropagation(); setMenuIndex(ei); }}><Ico icon={Ellipsis} size={20} /></button>
                <Ico icon={isOpen ? ChevronUp : ChevronDown} size={18} class="chevron" />
              </div>

              {isOpen && (
                <div class="ex-body">
                  <div class="target-line">
                    <span class="pill equip-pill"><Ico icon={tag.bodyweight ? PersonStanding : Dumbbell} size={13} />{tag.text}</span>
                    {entry.target && <span class="pill"><Ico icon={ClipboardList} size={13} />{entry.target}</span>}
                    <span class="pill"><Ico icon={Timer} size={13} />rest {fmtRest(entry.rest ?? DEFAULT_REST)}</span>
                    {lib && <button class="pill tappable-pill" onClick={() => setCueFor(cueFor === ei ? null : ei)}><Ico icon={Info} size={13} />How to</button>}
                  </div>
                  {entry.note && <div class="hint accent">{entry.note}</div>}
                  {cueFor === ei && lib && <div class="hint cue">{lib.cue}{lib.shoulder && <div class="warn">{lib.shoulder}</div>}</div>}
                  {prev && <div class="hint">Last time ({fmtDate(prev.w.date)}): {summary(prev.e)}</div>}

                  <div class="set-head"><span>Set</span><span>Reps</span><span /><span>kg</span><span>Rest</span><span /></div>
                  {entry.sets.map((st, si) => {
                    const n = st.side ? entry.sets.slice(0, si + 1).filter((x) => x.side === st.side).length : si + 1;
                    const restSecs = st.side === 'L' ? SWITCH_SIDES_REST : entry.rest ?? DEFAULT_REST;
                    return (
                      <div class={`set-row ${st.side === 'L' ? 'pair-start' : ''} ${st.done ? 'set-done' : ''}`} key={si}>
                        <span class="set-no">{n}{st.side && <small class={`side side-${st.side}`}>{sideLabel[st.side]}</small>}</span>
                        <NumberInput value={st.reps} decimals={false} onChange={(v) => setEntries((en) => { en[ei].sets[si].reps = Math.round(v ?? 0); })} />
                        <span class="times">×</span>
                        <NumberInput value={st.weight} zeroAsEmpty={tag.bodyweight || tag.band} placeholder={kgPlaceholder}
                          class={tag.bodyweight || tag.band ? 'bw' : ''}
                          onChange={(v) => setEntries((en) => { en[ei].sets[si].weight = v ?? 0; })} />
                        <RestButton timerKey={`${id}:${ei}:${si}`} done={!!st.done} seconds={restSecs}
                          label={`${ex?.name ?? 'Exercise'} · ${st.side ? `${sideLabel[st.side]} ${n}${st.side === 'L' ? ' · switch sides' : ''}` : `set ${n}`}`}
                          onDone={(d) => setEntries((en) => { en[ei].sets[si].done = d; })} />
                        <button class="icon-btn danger" aria-label={st.side ? 'Delete this left/right pair' : 'Delete set'}
                          onClick={() => setEntries((en) => {
                            const sets = en[ei].sets;
                            if (st.side) {
                              const start = st.side === 'R' && sets[si - 1]?.side === 'L' ? si - 1 : si;
                              const count = sets[start + 1]?.side === 'R' && sets[start].side === 'L' ? 2 : 1;
                              sets.splice(start, count);
                            } else sets.splice(si, 1);
                          })}><Ico icon={X} size={16} /></button>
                      </div>
                    );
                  })}
                  <ActionRow icon={Plus} label={entry.sets.some((x) => x.side) ? 'Add set (left + right)' : 'Add set'} onClick={() => setEntries((en) => {
                    const sets = en[ei].sets;
                    const last = sets[sets.length - 1];
                    if (last?.side) {
                      const l = [...sets].reverse().find((x) => x.side === 'L') ?? last;
                      const r = [...sets].reverse().find((x) => x.side === 'R') ?? last;
                      sets.push({ reps: l.reps, weight: l.weight, side: 'L' }, { reps: r.reps, weight: r.weight, side: 'R' });
                    } else sets.push(last ? { reps: last.reps, weight: last.weight } : { reps: 10, weight: 0 });
                  })} />
                  <div class="ex-done-wrap">
                    {entry.done
                      ? <button class="done-btn undo" onClick={() => setEntries((en) => { en[ei].done = false; })}><Ico icon={Check} size={18} />Completed · tap to undo</button>
                      : <button class="done-btn" onClick={() => completeExercise(ei)}><Ico icon={Check} size={18} />Done{ei < workout.entries.length - 1 ? ' · next exercise' : ''}</button>}
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      })}

      <Section>
        <ActionRow icon={Plus} label="Add exercise" bold onClick={() => setPicker(true)} />
      </Section>

      <Section title="Notes">
        <textarea class="textarea" rows={3} placeholder="How did it go?" value={workout.notes}
          onInput={(e) => save({ notes: (e.target as HTMLTextAreaElement).value })} />
      </Section>

      <div class="section">
        {workout.finishedAt ? (
          <button class="finish-btn finished" onClick={() => setSummary(true)}>
            <Ico icon={Trophy} size={22} />
            <span><b>Finished at {new Date(workout.finishedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</b><small>Tap to see your summary</small></span>
          </button>
        ) : (
          <button class="finish-btn" onClick={finish}>
            <Ico icon={Trophy} size={26} />
            <span>
              <b>Finish workout</b>
              <small>{workout.entries.filter((e) => e.done).length} of {workout.entries.length} exercises done · {fmtDuration((Date.now() - workout.date) / 1000)} so far</small>
            </span>
          </button>
        )}
      </div>

      <Section>
        <ActionRow icon={Trash} danger label="Delete workout" onClick={() => { if (confirm('Delete this workout?')) { db.workouts.delete(id); nav.pop(); } }} />
      </Section>

      <Sheet open={picker} onClose={() => setPicker(false)} title="Add Exercise">
        <ExerciseList onPick={addExercise} />
      </Sheet>

      {showSummary && <WorkoutSummary workout={workout} all={all} exMap={exMap} onClose={() => { setSummary(false); nav.pop(); }} onBack={() => setSummary(false)} />}

      <ActionSheet open={menuIndex != null} onClose={() => setMenuIndex(null)} actions={menuIndex == null ? [] : [
        ...(menuIndex > 0 ? [{ label: 'Move up', run: () => setEntries((en) => { const [x] = en.splice(menuIndex, 1); en.splice(menuIndex - 1, 0, x); }) }] : []),
        ...(menuIndex < workout.entries.length - 1 ? [{ label: 'Move down', run: () => setEntries((en) => { const [x] = en.splice(menuIndex, 1); en.splice(menuIndex + 1, 0, x); }) }] : []),
        { label: 'Remove exercise', destructive: true, run: () => setEntries((en) => { en.splice(menuIndex, 1); }) },
      ]} />
    </Page>
  );
}

const fmtRest = (s: number) => (s >= 60 ? `${fmt(s / 60, 1)} min` : `${s} s`);

/** End-of-workout summary: time, sets, volume, personal records, muscles trained. */
function WorkoutSummary({ workout, all, exMap, onClose, onBack }: {
  workout: Workout; all: Workout[]; exMap: Map<number, Exercise>; onClose: () => void; onBack: () => void;
}) {
  const end = workout.finishedAt ?? Date.now();
  const mins = (end - workout.date) / 60000;
  const anyDone = workout.entries.some((e) => e.sets.some((x) => x.done));
  const counted = (e: WorkoutEntry) => (anyDone ? e.sets.filter((x) => x.done) : e.sets);
  const sets = workout.entries.reduce((t, e) => t + counted(e).length, 0);
  const vol = workout.entries.reduce((t, e) => t + counted(e).reduce((s, x) => s + x.reps * x.weight, 0), 0);
  const reps = workout.entries.reduce((t, e) => t + counted(e).reduce((s, x) => s + x.reps, 0), 0);

  // Personal records: best estimated 1RM (weighted) or most reps (bodyweight) vs. all earlier workouts.
  const prs: { name: string; text: string }[] = [];
  for (const e of workout.entries) {
    const ex = exMap.get(e.exerciseId);
    const mine = counted(e);
    if (!ex || !mine.length) continue;
    const earlier = all.filter((w) => w.id !== workout.id && w.date < workout.date).flatMap((w) => w.entries.filter((x) => x.exerciseId === e.exerciseId)).flatMap((x) => x.sets);
    if (!earlier.length) continue;
    const weighted = mine.some((x) => x.weight > 0);
    if (weighted) {
      const best = Math.max(...mine.map((x) => oneRepMax(x.weight, x.reps)));
      const before = Math.max(...earlier.map((x) => oneRepMax(x.weight, x.reps)));
      const top = mine.reduce((a, b) => (oneRepMax(b.weight, b.reps) > oneRepMax(a.weight, a.reps) ? b : a));
      if (best > before + 0.01) prs.push({ name: ex.name, text: `${top.reps} × ${fmt(top.weight)} kg` });
    } else {
      const best = Math.max(...mine.map((x) => x.reps));
      if (best > Math.max(...earlier.map((x) => x.reps))) prs.push({ name: ex.name, text: `${best} reps` });
    }
  }

  const raw: Partial<Record<Muscle, number>> = {};
  for (const e of workout.entries) {
    const lib = LIBRARY.find((l) => l.name === exMap.get(e.exerciseId)?.name);
    const n = counted(e).length / (lib?.perSide ? 2 : 1);
    if (!lib || !n) continue;
    for (const [m, w] of Object.entries(lib.targets)) raw[m as Muscle] = (raw[m as Muscle] ?? 0) + n * (w ?? 0);
  }
  const intensity = normalise(raw);
  const hasMap = Object.keys(intensity).length > 0;

  return (
    <Sheet open onClose={onBack} title="Workout complete" actions={<button class="link bold" onClick={onClose}>Close</button>}>
      <div class="summary-hero">
        <Ico icon={Trophy} size={54} grad="warm" strokeWidth={1.6} />
        <div class="next-title">{workout.title || 'Workout'}</div>
        <div class="sub">{fmtDate(workout.date, true)}</div>
      </div>
      <div class="stat-tiles four">
        <div class="tile"><span class="tile-label">Time</span><b>{mins > 0 && mins < 300 ? `${Math.round(mins)} min` : '–'}</b></div>
        <div class="tile"><span class="tile-label">Sets</span><b>{sets}</b></div>
        <div class="tile"><span class="tile-label">Reps</span><b>{reps}</b></div>
        <div class="tile"><span class="tile-label">Volume</span><b>{fmt(vol, 0)} kg</b></div>
      </div>
      {prs.length > 0 && (
        <Section title={`New personal records · ${prs.length}`}>
          {prs.map((p) => <Row><Ico icon={Medal} size={20} grad="warm" /><span class="row-main">{p.name}</span><span class="row-value strong">{p.text}</span></Row>)}
        </Section>
      )}
      {hasMap && <div class="section"><div class="bodymap-card"><div class="bm-kicker">Muscles trained</div><BodyMap intensity={intensity} /><div class="bm-legend"><IntensityLegend /></div></div></div>}
      <Section title="Exercises">
        {workout.entries.map((e) => (
          <Row label={<span class="inline-icon">{e.done ? <Ico icon={CircleCheck} size={16} grad="fresh" /> : <Ico icon={X} size={16} class="sub" />}{exMap.get(e.exerciseId)?.name ?? 'Exercise'}</span>}
            sub={summary(e)} />
        ))}
      </Section>
      <div class="section"><button class="big-btn green full" onClick={onClose}>Back to Training</button></div>
    </Sheet>
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
        : done ? <Ico icon={Check} size={20} strokeWidth={3} grad="fresh" /> : <Ico icon={Timer} size={18} />}
    </button>
  );
}
