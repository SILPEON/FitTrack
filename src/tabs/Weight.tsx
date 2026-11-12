import { useEffect, useState } from 'preact/hooks';
import { Plus, Scale, Trash, TrendingDown, TrendingUp } from 'lucide-preact';
import { db, getProfile, DEFAULT_PROFILE, type Profile, type WeightEntry } from '../db';
import { bmi, bmiCategory, dayKey, fmt, fmtDate, healthyRange } from '../calc';
import { Ico } from '../icons';
import { PhotosCard } from './Photos';
import { Empty, LineChart, NumberInput, Page, Row, Section, Segmented, Sheet, useLive } from '../ui';

type Range = '30' | '90' | '365' | 'all';
const LOG_PREVIEW = 5;

export function WeightHome() {
  const entries = useLive(() => db.weights.orderBy('day').reverse().toArray(), [], [] as WeightEntry[]);
  const profile = useLive(() => getProfile(), [], DEFAULT_PROFILE as Profile);
  const [range, setRange] = useState<Range>('90');
  const [adding, setAdding] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const latest = entries[0];
  const cutoff = range === 'all' ? '' : dayKey(new Date(Date.now() - Number(range) * 86400000));
  const inRange = entries.filter((e) => e.day >= cutoff);
  const chartData = [...inRange].reverse().map((e) => ({ x: new Date(e.day + 'T12:00:00').getTime(), y: e.kg }));
  const rangeStart = inRange[inRange.length - 1];
  const change = latest && rangeStart && inRange.length > 1 ? latest.kg - rangeStart.kg : null;
  const weekAgo = dayKey(new Date(Date.now() - 7 * 86400000));
  const recent = entries.filter((e) => e.day > weekAgo);
  const avg7 = recent.length ? recent.reduce((s, e) => s + e.kg, 0) / recent.length : null;
  const target = profile.goal !== 'maintain' ? profile.targetKg : null;
  const log = showAll ? entries : entries.slice(0, LOG_PREVIEW);

  return (
    <Page title="Weight">
      {entries.length === 0 ? (<>
        <Section>
          <Empty icon={Scale} title="No weight logged" text="Add your first weigh-in below. Your trend graph appears here." />
        </Section>
        <div class="section"><button class="big-btn green full log-weight-btn" onClick={() => setAdding(true)}><Ico icon={Plus} size={20} />Log weight</button></div>
        <PhotosCard />
      </>) : (
        <>
          {/* Graph first */}
          <Section>
            <div class="chart-head">
              <div>
                <span class="hero-num grad-text">{fmt(latest.kg)}</span><span class="hero-unit"> kg</span>
                <div class="sub small">{fmtDate(latest.day)}</div>
              </div>
              {change != null && (
                <div class={`trend-pill ${change <= 0 ? 'down' : 'up'}`}>
                  <Ico icon={change <= 0 ? TrendingDown : TrendingUp} size={16} />
                  {change > 0 ? '+' : ''}{fmt(change)} kg
                </div>
              )}
            </div>
            <div class="chart-wrap">
              {chartData.length >= 2
                ? <LineChart points={chartData} target={target} unit=" kg" height={220} />
                : <div class="chart-empty sub">Log at least two weigh-ins in this period to see your trend.</div>}
            </div>
            <div class="pad">
              <Segmented value={range} onChange={setRange} options={[
                { key: '30', label: '1M' }, { key: '90', label: '3M' }, { key: '365', label: '1Y' }, { key: 'all', label: 'All' },
              ]} />
            </div>
          </Section>

          {/* Key numbers */}
          <div class="stat-tiles">
            <div class="tile"><span class="tile-label">7-day avg</span><b>{avg7 != null ? `${fmt(avg7)} kg` : '–'}</b></div>
            <div class="tile"><span class="tile-label">BMI</span><b>{fmt(bmi(latest.kg, profile.heightCm), 1, 1)}</b></div>
            <div class="tile">
              <span class="tile-label">{target != null ? 'To goal' : 'Entries'}</span>
              <b>{target != null ? `${target - latest.kg > 0 ? '+' : ''}${fmt(target - latest.kg)} kg` : entries.length}</b>
            </div>
          </div>

          <div class="section"><button class="big-btn green full log-weight-btn" onClick={() => setAdding(true)}><Ico icon={Plus} size={20} />Log weight</button></div>

          <Section title="Details">
            <Row label="BMI category" value={bmiCategory(bmi(latest.kg, profile.heightCm))} />
            <Row label={`Healthy range for ${fmt(profile.heightCm, 0)} cm`}
              value={`${fmt(healthyRange(profile.heightCm)[0])}–${fmt(healthyRange(profile.heightCm)[1])} kg`} />
            {target != null && <Row label="Target weight" value={`${fmt(target)} kg`} />}
          </Section>

          <PhotosCard />

          {/* Detailed list last */}
          <Section title="All weigh-ins" right={`${entries.length}`}>
            {log.map((e) => {
              const prev = entries[entries.indexOf(e) + 1];
              const diff = prev ? e.kg - prev.kg : null;
              return (
                <Row key={e.id}>
                  <span class="row-main">{fmtDate(e.day)}</span>
                  {diff != null && <span class={`diff ${diff <= 0 ? 'down' : 'up'}`}>{diff > 0 ? '+' : ''}{fmt(diff)}</span>}
                  <span class="row-value strong">{fmt(e.kg)} kg</span>
                  <button class="icon-btn" aria-label="Delete" onClick={() => { if (confirm('Delete this entry?')) db.weights.delete(e.id); }}>
                    <Ico icon={Trash} size={16} />
                  </button>
                </Row>
              );
            })}
            {entries.length > LOG_PREVIEW && (
              <button class="row tappable center-row" onClick={() => setShowAll(!showAll)}>
                <span class="accent">{showAll ? 'Show less' : `Show all ${entries.length}`}</span>
              </button>
            )}
          </Section>
        </>
      )}

      <AddWeight open={adding} onClose={() => setAdding(false)} last={latest?.kg ?? null} />
    </Page>
  );
}

function AddWeight({ open, onClose, last }: { open: boolean; onClose: () => void; last: number | null }) {
  const [day, setDay] = useState(dayKey());
  const [kg, setKg] = useState<number | null>(null);
  // Reset when the sheet closes, so the next entry starts on today's date with the last weight prefilled.
  useEffect(() => { if (!open) { setDay(dayKey()); setKg(null); } }, [open]);
  const value = kg ?? last;
  const save = async () => {
    if (!value || value <= 0) return;
    // One entry per day: replace an existing one.
    const existing = await db.weights.where('day').equals(day).first();
    if (existing) await db.weights.update(existing.id, { kg: value });
    else await db.weights.add({ day, kg: value } as WeightEntry);
    setKg(null);
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Log Weight"
      actions={<button class="link bold" disabled={!value || value <= 0} onClick={save}>Save</button>}>
      <Section>
        <Row>
          <span class="row-main">Date</span>
          <input type="date" class="date-input" value={day} max={dayKey()} onChange={(e) => setDay((e.target as HTMLInputElement).value || dayKey())} />
        </Row>
        <Row>
          <span class="row-main">Weight</span>
          <NumberInput value={value} onChange={setKg} placeholder="0,0" class="wide" />
          <span class="unit">kg</span>
        </Row>
      </Section>
    </Sheet>
  );
}
