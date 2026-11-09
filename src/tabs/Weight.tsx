import { useState } from 'preact/hooks';
import { db, getProfile, DEFAULT_PROFILE, type Profile, type WeightEntry } from '../db';
import { bmi, bmiCategory, dayKey, fmt, fmtDate, healthyRange } from '../calc';
import { Empty, LineChart, NumberInput, Page, Row, Section, Segmented, Sheet, useLive } from '../ui';

type Range = '30' | '90' | '365' | 'all';

export function WeightHome() {
  const entries = useLive(() => db.weights.orderBy('day').reverse().toArray(), [], [] as WeightEntry[]);
  const profile = useLive(() => getProfile(), [], DEFAULT_PROFILE as Profile);
  const [range, setRange] = useState<Range>('90');
  const [adding, setAdding] = useState(false);

  const latest = entries[0];
  const first = entries[entries.length - 1];
  const cutoff = range === 'all' ? '' : dayKey(new Date(Date.now() - Number(range) * 86400000));
  const chartData = entries.filter((e) => e.day >= cutoff).reverse()
    .map((e) => ({ x: new Date(e.day + 'T12:00:00').getTime(), y: e.kg }));
  const weekAgo = dayKey(new Date(Date.now() - 7 * 86400000));
  const recent = entries.filter((e) => e.day > weekAgo);
  const avg7 = recent.length ? recent.reduce((s, e) => s + e.kg, 0) / recent.length : null;

  return (
    <Page title="Weight" actions={<button class="link big" onClick={() => setAdding(true)}>＋</button>}>
      {latest && (
        <Section>
          <div class="hero">
            <div><span class="hero-num">{fmt(latest.kg)}</span><span class="hero-unit"> kg</span></div>
            {entries.length > 1 && (() => {
              const diff = latest.kg - first.kg;
              return (
                <div class="hero-side">
                  <div class={diff <= 0 ? 'good bold' : 'warn bold'}>{diff > 0 ? '+' : ''}{fmt(diff)} kg</div>
                  <div class="sub small">since {fmtDate(first.day)}</div>
                </div>
              );
            })()}
          </div>
          {avg7 != null && <Row label="7-day average" value={`${fmt(avg7)} kg`} />}
          {(() => {
            const b = bmi(latest.kg, profile.heightCm);
            const [lo, hi] = healthyRange(profile.heightCm);
            return (
              <>
                <Row label="BMI" value={`${fmt(b, 1, 1)} · ${bmiCategory(b)}`} />
                <Row label={`Healthy range for ${fmt(profile.heightCm, 0)} cm`} value={`${fmt(lo)}–${fmt(hi)} kg`} />
                {profile.goal !== 'maintain' && (
                  <Row label="Target" value={`${fmt(profile.targetKg)} kg (${profile.targetKg - latest.kg >= 0 ? '+' : ''}${fmt(profile.targetKg - latest.kg)})`} />
                )}
              </>
            );
          })()}
        </Section>
      )}

      {chartData.length >= 2 || entries.length >= 2 ? (
        <Section title="Trend">
          <div class="pad">
            <Segmented value={range} onChange={setRange} options={[
              { key: '30', label: '1M' }, { key: '90', label: '3M' }, { key: '365', label: '1Y' }, { key: 'all', label: 'All' },
            ]} />
          </div>
          {chartData.length >= 2
            ? <div class="chart-wrap"><LineChart points={chartData} target={profile.goal !== 'maintain' ? profile.targetKg : null} unit=" kg" /></div>
            : <Row><span class="sub">Not enough entries in this range.</span></Row>}
        </Section>
      ) : null}

      <Section title="Log">
        {entries.length === 0 && <Empty icon="⚖️" title="No weight logged" text="Tap ＋ to add your first weigh-in." />}
        {entries.map((e) => (
          <Row key={e.id}>
            <span class="row-main">{fmtDate(e.day)}</span>
            <span class="row-value">{fmt(e.kg)} kg</span>
            <button class="icon-btn danger" aria-label="Delete" onClick={() => { if (confirm('Delete this entry?')) db.weights.delete(e.id); }}>✕</button>
          </Row>
        ))}
      </Section>

      <AddWeight open={adding} onClose={() => setAdding(false)} last={latest?.kg ?? null} />
    </Page>
  );
}

function AddWeight({ open, onClose, last }: { open: boolean; onClose: () => void; last: number | null }) {
  const [day, setDay] = useState(dayKey());
  const [kg, setKg] = useState<number | null>(null);
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
