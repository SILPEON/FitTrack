import { useState } from 'preact/hooks';
import { CalendarDays, ChevronDown, ChevronUp, ClipboardList, Dumbbell, Info, Play, ShieldCheck, Star, Timer } from 'lucide-preact';
import { db, type Exercise, type SetEntry, type Workout, type WorkoutEntry } from '../db';
import { BodyMap } from '../bodymap';
import { fmt } from '../calc';
import { DEFAULT_GEAR, EX, LIBRARY, PLANS, PLATES, PRINCIPLES, PRIORITY, SETUP, defaultLoad, weeklyVolume, type Gear, type Muscle, type Plan, type PlanDay } from '../plans';
import { Ico } from '../icons';
import { ActionRow, Bar, NumberInput, Page, Row, Section, useLive, useNav } from '../ui';

export const getGear = async (): Promise<Gear> => ({ ...DEFAULT_GEAR, ...((await db.kv.get('gear'))?.value as Partial<Gear> ?? {}) });
export const getActivePlan = async () => (await db.kv.get('activePlan'))?.value as string | undefined;

/** The next day of the active plan: the one after the most recently trained day of that plan. */
export async function nextPlanDay(): Promise<{ plan: Plan; day: PlanDay; last?: Workout } | null> {
  const planId = await getActivePlan();
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) return null;
  const last = await db.workouts.orderBy('date').reverse().filter((w) => w.planId === plan.id).first();
  const idx = last ? plan.days.findIndex((d) => d.id === last.dayId) : -1;
  return { plan, day: plan.days[(idx + 1) % plan.days.length], last };
}

async function exerciseId(name: string): Promise<number> {
  const found = await db.exercises.where('name').equals(name).first();
  if (found) return found.id;
  const e = EX(name);
  return db.exercises.add({ name, muscle: e.group, equipment: e.equipment, custom: false } as Exercise);
}

/** Creates a workout from a plan day, prefilled with your last numbers (or the plate-setup weight). */
export async function startPlanDay(plan: Plan, day: PlanDay): Promise<number> {
  const gear = await getGear();
  const all = await db.workouts.orderBy('date').reverse().toArray();
  const entries: WorkoutEntry[] = [];
  for (const item of day.items) {
    const ex = EX(item.name);
    const id = await exerciseId(item.name);
    const prev = all.flatMap((w) => w.entries).find((e) => e.exerciseId === id && e.sets.length);
    const low = parseInt(item.reps, 10) || 10;
    const fresh = { reps: low, weight: defaultLoad(ex.load, gear) };
    // One-sided exercises get a Left and a Right row per set.
    const rows = ex.perSide ? item.sets * 2 : item.sets;
    const sets: SetEntry[] = Array.from({ length: rows }, (_, k) => {
      const p = prev?.sets[Math.min(k, prev.sets.length - 1)];
      const base = p ? { reps: p.reps, weight: p.weight } : { ...fresh };
      return ex.perSide ? { ...base, side: k % 2 === 0 ? 'L' : 'R' } : base;
    });
    entries.push({
      exerciseId: id, sets, rest: item.rest,
      target: item.reps === '1' ? `${item.sets} rounds` : `${item.sets} × ${item.reps} reps${ex.perSide ? ' per side' : ''}`,
      note: item.note,
    });
  }
  return db.workouts.add({ date: Date.now(), title: day.name, notes: '', entries, planId: plan.id, dayId: day.id } as Workout);
}

/** Muscles hit by a plan day: 1 = primary target of at least one exercise, 0.5 = only assisting. */
export function dayIntensity(day: PlanDay): Partial<Record<Muscle, number>> {
  const out: Partial<Record<Muscle, number>> = {};
  for (const it of day.items) {
    for (const [m, w] of Object.entries(EX(it.name).targets)) {
      const v = (w ?? 0) >= 0.75 ? 1 : 0.5;
      out[m as Muscle] = Math.max(out[m as Muscle] ?? 0, v);
    }
  }
  return out;
}

// ---------- Next-up card (Training home) ----------

export function NextUpCard({ onStart }: { onStart: (workoutId: number) => void }) {
  const nav = useNav();
  const next = useLive(() => nextPlanDay(), [], null as Awaited<ReturnType<typeof nextPlanDay>>);
  const intensity = next ? dayIntensity(next.day) : {};
  const primary = PRIORITY.filter((m) => intensity[m] === 1);
  return (
    <div class="section">
      <div class="bodymap-card">
        {next ? (
          <div class="next-head">
            <div>
              <div class="bm-kicker">Next up · {next.plan.short} · Day {next.plan.days.indexOf(next.day) + 1}/{next.plan.days.length}</div>
              <div class="next-title">{next.day.name}</div>
            </div>
            <span class="pill dark-pill"><Ico icon={Timer} size={14} />{next.day.minutes} min</span>
          </div>
        ) : (
          <div class="next-head"><div><div class="bm-kicker">No plan selected</div><div class="next-title">Pick a training plan</div></div></div>
        )}
        <BodyMap intensity={intensity} />
        {next && (
          <div class="bm-legend">
            {primary.map((m) => <span class="bm-chip">{m}</span>)}
            <span class="bm-key"><i class="hit" />Main</span><span class="bm-key"><i class="assist" />Assisting</span>
          </div>
        )}
        <div class="btn-row">
          {next ? (
            <>
              <button class="big-btn green" onClick={async () => onStart(await startPlanDay(next.plan, next.day))}><Ico icon={Play} size={20} />Start workout</button>
              <button class="big-btn gray narrow" aria-label="Preview workout" onClick={() => nav.push(<DayScreen plan={next.plan} day={next.day} />)}><Ico icon={ClipboardList} size={20} /></button>
            </>
          ) : (
            <button class="big-btn green" onClick={() => nav.push(<PlansScreen />)}><Ico icon={ClipboardList} size={20} />Choose a plan</button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Label for the implement an exercise uses, with its fixed weight (e.g. "Barbell · 32,5 kg"). */
export function equipmentTag(name: string, equipment: string, gear: Gear): { text: string; bodyweight: boolean; band: boolean } {
  const lib = LIBRARY.find((l) => l.name === name);
  const load = lib?.load ?? (/barbell/i.test(equipment) ? 'bar' : /dumbbell/i.test(equipment) ? 'db' : /kettlebell/i.test(equipment) ? 'kb'
    : /band|cable/i.test(equipment) ? 'band' : /bodyweight|pull-up|ab wheel/i.test(equipment) ? 'bw' : null);
  const eq = lib?.equipment ?? equipment;
  switch (load) {
    case 'bar': return { text: `Barbell · ${fmt(gear.barKg + SETUP.barPlates)} kg`, bodyweight: false, band: false };
    case 'db': return { text: `${/dumbbells/i.test(eq) ? '2 × Dumbbell' : 'Dumbbell'} · ${fmt(gear.handleKg + SETUP.dbPlates)} kg`, bodyweight: false, band: false };
    case 'kb': return { text: 'Kettlebell · 5 kg', bodyweight: false, band: false };
    case 'band': return { text: /pull-up bar/i.test(eq) ? 'Band on pull-up bar' : 'Resistance band', bodyweight: false, band: true };
    case 'ankle': return { text: 'Bodyweight (+ 1 kg ankle weights)', bodyweight: true, band: false };
    case 'bw': return { text: 'Bodyweight', bodyweight: true, band: false };
    default: return { text: equipment, bodyweight: false, band: false };
  }
}

// ---------- Plans list ----------

export function PlansScreen() {
  const nav = useNav();
  const active = useLive(() => getActivePlan(), [], undefined as string | undefined);
  const gear = useLive(() => getGear(), [], DEFAULT_GEAR);
  const saveGear = (g: Partial<Gear>) => db.kv.put({ key: 'gear', value: { ...gear, ...g } });

  return (
    <Page title="Training Plans">
      <Section footer="Ranked by your priorities: Glutes, Quads, Pecs, Shoulders, Neck, Arms, Lats, Abs.">
        {PLANS.map((p) => {
          const { push, pull } = weeklyVolume(p);
          return (
            <Row key={p.id} chevron onClick={() => nav.push(<PlanScreen planId={p.id} />)}>
              <span class={`icon-badge ${p.recommended ? '' : 'violet'}`}><Ico icon={p.recommended ? Star : CalendarDays} size={18} /></span>
              <div class="row-main">
                <b>{p.name}</b>{p.recommended && <span class="tag">Recommended</span>}{active === p.id && <span class="tag">Active</span>}
                <div class="sub small">{p.level} · pull : push {fmt(pull / push, 2, 2)} : 1</div>
              </div>
            </Row>
          );
        })}
      </Section>

      <Section title="Your plate setup" footer={`Plates: ${PLATES}. Set it up once; every plan uses only this. Lighter work: 5 kg kettlebell, bands, 1 kg ankle weights.`}>
        <Row label="Barbell" sub={SETUP.barText} value={<b class="strong">{fmt(gear.barKg + SETUP.barPlates)} kg</b>} />
        <Row label="Each dumbbell" sub={SETUP.dbText} value={<b class="strong">{fmt(gear.handleKg + SETUP.dbPlates)} kg</b>} />
        <Row>
          <span class="row-main">Empty barbell weighs</span>
          <NumberInput value={gear.barKg} onChange={(v) => v != null && saveGear({ barKg: v })} />
          <span class="unit">kg</span>
        </Row>
        <Row>
          <span class="row-main">Each dumbbell handle weighs</span>
          <NumberInput value={gear.handleKg} onChange={(v) => v != null && saveGear({ handleKg: v })} />
          <span class="unit">kg</span>
        </Row>
      </Section>

      <Section title="How these plans work">
        {PRINCIPLES.map((p) => <Expandable title={p.title} text={p.text} />)}
      </Section>
    </Page>
  );
}

function Expandable({ title, text }: { title: string; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button class="row tappable expand" onClick={() => setOpen(!open)}>
      <div class="row-main">
        <b>{title}</b>
        {open && <div class="sub small expand-text">{text}</div>}
      </div>
      <Ico icon={open ? ChevronUp : ChevronDown} size={18} class="chevron" />
    </button>
  );
}

// ---------- Plan detail ----------

function PlanScreen({ planId }: { planId: string }) {
  const nav = useNav();
  const plan = PLANS.find((p) => p.id === planId)!;
  const active = useLive(() => getActivePlan(), [], undefined as string | undefined);
  const { volume, push, pull } = weeklyVolume(plan);
  const max = Math.max(...Object.values(volume));

  return (
    <Page title={plan.short}>
      <Section>
        <div class="pad">
          <div class="next-title">{plan.name}</div>
          <div class="sub small">{plan.level}</div>
          <p class="plan-summary">{plan.summary}</p>
          <div class="pill wrap-pill"><Ico icon={CalendarDays} size={14} />{plan.schedule}</div>
        </div>
        {active === plan.id
          ? <Row><Ico icon={ShieldCheck} size={20} grad="fresh" /><span class="row-main good bold">This is your active plan</span></Row>
          : <ActionRow icon={Star} bold label="Make this my plan" onClick={() => db.kv.put({ key: 'activePlan', value: plan.id })} />}
      </Section>

      <Section title="Days">
        {plan.days.map((d, k) => (
          <Row key={d.id} chevron onClick={() => nav.push(<DayScreen plan={plan} day={d} />)}>
            <span class="day-no">{k + 1}</span>
            <div class="row-main"><b>{d.name}</b><div class="sub small">{d.focus} · {d.items.reduce((t, x) => t + x.sets, 0)} sets · ~{d.minutes} min</div></div>
          </Row>
        ))}
      </Section>

      <Section title="Weekly sets per muscle" footer="Direct sets count fully; muscles that only assist (e.g. triceps in presses) count partly. 10–20 weekly sets is the usual range for growth in priority muscles.">
        <div class="pad">
          {PRIORITY.map((m, k) => (
            <div class="vol-row">
              <span class="vol-label">{k < 8 && <span class="vol-rank">{k + 1}</span>}{m}</span>
              <Bar value={volume[m]} max={max} color={k < 2 ? 'var(--grad-main)' : k < 8 ? 'var(--grad-cool)' : 'var(--grad-fresh)'} />
              <span class="vol-num">{fmt(volume[m], 0)}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Shoulder balance" footer="Rows, pull-ups, face pulls and Y-raises vs. all pressing. Above 1:1 protects your shoulders.">
        <Row label="Pulling sets per week" value={pull} />
        <Row label="Pressing sets per week" value={push} />
        <Row label="Pull : push" value={<b class={pull >= push ? 'good' : 'bad'}>{fmt(pull / push, 2, 2)} : 1</b>} />
      </Section>
    </Page>
  );
}

// ---------- Day detail ----------

function DayScreen({ plan, day }: { plan: Plan; day: PlanDay }) {
  const nav = useNav();
  const [open, setOpen] = useState<number | null>(null);
  const gear = useLive(() => getGear(), [], DEFAULT_GEAR);

  const start = async () => {
    const id = await startPlanDay(plan, day);
    nav.pop();
    // The Training tab listens for this to open the new workout.
    window.dispatchEvent(new CustomEvent('open-workout', { detail: id }));
  };

  return (
    <Page title={day.name}>
      <Section>
        <div class="pad">
          <div class="sub small">{plan.short} · ~{day.minutes} min</div>
          <div class="next-title">{day.focus}</div>
        </div>
        <ActionRow icon={Play} bold label="Start this workout" onClick={start} />
      </Section>

      <Section title="Warm-up (5–8 min)">
        <div class="pad warmup">{day.warmup.map((w) => <div>• {w}</div>)}</div>
      </Section>

      <Section title="Exercises" footer="Tap an exercise for technique cues. Train each set to 1–3 reps short of failure.">
        {day.items.map((it, k) => {
          const ex = EX(it.name);
          const load = defaultLoad(ex.load, gear);
          return (
            <button class="row tappable expand" onClick={() => setOpen(open === k ? null : k)}>
              <span class="day-no">{k + 1}</span>
              <div class="row-main">
                <b>{it.name}</b>
                <div class="sub small">
                  {it.sets} × {it.reps}{ex.perSide ? ' / side' : ''} · rest {it.rest >= 60 ? `${fmt(it.rest / 60, 1)} min` : `${it.rest} s`}
                  {load > 0 ? ` · ${fmt(load)} kg` : ''}
                </div>
                {it.note && <div class="small accent">{it.note}</div>}
                {open === k && (
                  <div class="expand-text small">
                    <div class="sub">{ex.equipment}</div>
                    <p>{ex.cue}</p>
                    {ex.shoulder && <p class="warn"><Ico icon={Info} size={14} class="inline-ico" /> {ex.shoulder}</p>}
                  </div>
                )}
              </div>
              <Ico icon={open === k ? ChevronUp : ChevronDown} size={18} class="chevron" />
            </button>
          );
        })}
      </Section>
      <Section>
        <ActionRow icon={Dumbbell} bold label="Start this workout" onClick={start} />
      </Section>
    </Page>
  );
}
