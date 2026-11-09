import { useState } from 'preact/hooks';
import { ChevronLeft, ChevronRight, Dumbbell, Ellipsis, Flower2, HeartPulse, Route as RouteIcon, type LucideIcon } from 'lucide-preact';
import { db, type Route, type Workout, type YogaSession } from '../db';
import { activityInfo, dayKey, fmt, fmtDistance, fmtDuration } from '../calc';
import { ROUTINES } from '../yoga';
import { Ico } from '../icons';
import { ActionSheet, Empty, Page, Row, Section, useLive, useNav } from '../ui';
import { WorkoutScreen, isInProgress, repeatWorkout, setCount, volume } from './Training';
import { RouteDetail } from './Routes';
import { getKegel } from './Kegel';
import { DEFAULT_KEGEL } from '../kegel';

type Kind = 'workout' | 'yoga' | 'kegel' | 'route';
const KINDS: { key: Kind; label: string; icon: LucideIcon }[] = [
  { key: 'workout', label: 'Workouts', icon: Dumbbell },
  { key: 'yoga', label: 'Yoga', icon: Flower2 },
  { key: 'kegel', label: 'Kegel', icon: HeartPulse },
  { key: 'route', label: 'Routes', icon: RouteIcon },
];

interface Item { kind: Kind; day: string; time: number; title: string; sub: string; workout?: Workout; route?: Route }

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function useItems(): Item[] {
  const workouts = useLive(() => db.workouts.toArray(), [], [] as Workout[]);
  const yoga = useLive(() => db.yogaSessions.toArray(), [], [] as YogaSession[]);
  const routes = useLive(() => db.routes.toArray(), [], [] as Route[]);
  const kegel = useLive(() => getKegel(), [], DEFAULT_KEGEL);
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
