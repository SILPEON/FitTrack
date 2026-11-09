import { useEffect, useRef, useState } from 'preact/hooks';
import { db, exportBackup, getProfile, importBackup, saveProfile, DEFAULT_PROFILE, type Profile, type WeightEntry } from '../db';
import { ACTIVITY_LEVELS, age, bmi, bmiCategory, dayKey, fmt, fmtDate, healthyRange, shareFile, targets } from '../calc';
import { ActionRow, NumberInput, Page, Row, Section, Segmented, useLive } from '../ui';
import { Download, Minus, Plus, TriangleExclamationPoint, Upload } from 'lucide-preact';
import { Ico } from '../icons';

export function ProfileHome() {
  const stored = useLive(() => getProfile(), [], null as Profile | null);
  const latest = useLive(() => db.weights.orderBy('day').last(), [], undefined as WeightEntry | undefined);
  const [p, setP] = useState<Profile>(DEFAULT_PROFILE);
  const loaded = useRef(false);

  useEffect(() => {
    if (stored && !loaded.current) { setP(stored); loaded.current = true; }
  }, [stored]);

  const update = (patch: Partial<Profile>) => {
    const next = { ...p, ...patch };
    setP(next);
    saveProfile(next);
  };

  const t = latest ? targets(p, latest.kg) : null;

  return (
    <Page title="Profile & Goals">
      <Section title="About you">
        <div class="pad">
          <Segmented value={p.sex} onChange={(sex) => update({ sex })} options={[{ key: 'male', label: 'Male' }, { key: 'female', label: 'Female' }]} />
        </div>
        <Row>
          <span class="row-main">Birthday</span>
          <input type="date" class="date-input" value={p.birthDate} max={dayKey()}
            onChange={(e) => { const v = (e.target as HTMLInputElement).value; if (v) update({ birthDate: v }); }} />
        </Row>
        <Row>
          <span class="row-main">Height</span>
          <NumberInput value={p.heightCm} onChange={(v) => v && v > 50 && update({ heightCm: v })} />
          <span class="unit">cm</span>
        </Row>
        <Row>
          <span class="row-main">Activity</span>
          <select value={p.activity} onChange={(e) => update({ activity: (e.target as HTMLSelectElement).value as Profile['activity'] })}>
            {ACTIVITY_LEVELS.map((a) => <option value={a.key}>{a.label}</option>)}
          </select>
        </Row>
        <div class="hint">{ACTIVITY_LEVELS.find((a) => a.key === p.activity)?.detail}</div>
      </Section>

      <Section title="Goal">
        <div class="pad">
          <Segmented value={p.goal} onChange={(goal) => update({ goal })} options={[
            { key: 'lose', label: 'Lose' }, { key: 'maintain', label: 'Maintain' }, { key: 'gain', label: 'Gain' },
          ]} />
        </div>
        {p.goal !== 'maintain' && (
          <>
            <Row>
              <span class="row-main">Target weight</span>
              <NumberInput value={p.targetKg} onChange={(v) => v && v > 20 && update({ targetKg: v })} />
              <span class="unit">kg</span>
            </Row>
            <Stepper label="Rate per week" value={p.weeklyKg} step={0.05} min={0.1} max={1}
              display={`${fmt(p.weeklyKg, 2, 2)} kg`} onChange={(weeklyKg) => update({ weeklyKg })} />
          </>
        )}
      </Section>

      <Section title="Macro settings"
        footer="1.6–2.2 g protein per kg supports muscle gain and keeps muscle during a diet. Fat between 20 and 35 % of calories is the usual recommendation. Carbs fill the rest.">
        <Stepper label="Protein" value={p.proteinPerKg} step={0.1} min={1.2} max={2.6}
          display={`${fmt(p.proteinPerKg, 1, 1)} g/kg`} onChange={(proteinPerKg) => update({ proteinPerKg })} />
        <Stepper label="Fat" value={p.fatPercent} step={5} min={20} max={40}
          display={`${p.fatPercent} % of kcal`} onChange={(fatPercent) => update({ fatPercent })} />
      </Section>

      {latest && t ? (
        <>
          <Section title="Body">
            <Row label="Current weight" value={`${fmt(latest.kg)} kg`} sub={`logged ${fmtDate(latest.day)}`} />
            <Row label="Age" value={age(p.birthDate)} />
            <Row label="BMI" value={fmt(bmi(latest.kg, p.heightCm), 1, 1)} />
            <Row label="Category" value={bmiCategory(bmi(latest.kg, p.heightCm))} />
            <Row label="Healthy weight range" value={`${fmt(healthyRange(p.heightCm)[0])}–${fmt(healthyRange(p.heightCm)[1])} kg`} />
          </Section>
          <Section title="Daily energy">
            <Row label="BMR (at rest)" value={`${fmt(t.bmr, 0)} kcal`} />
            <Row label="Maintenance" value={`${fmt(t.tdee, 0)} kcal`} />
            <Row label="Your target" value={<b class="grad-text big-value">{fmt(t.calories, 0)} kcal</b>} />
            {p.goal !== 'maintain' && p.weeklyKg > 0 && (() => {
              const weeks = Math.abs(latest.kg - p.targetKg) / p.weeklyKg;
              return (
                <>
                  <Row label="Time to goal" value={`≈ ${Math.round(weeks)} weeks`} />
                  <Row label="Estimated date" value={fmtDate(Date.now() + weeks * 7 * 86400000)} />
                </>
              );
            })()}
          </Section>
          <Section title="Daily macros">
            <Row label="Protein" value={`${fmt(t.protein, 0)} g`} />
            <Row label="Carbohydrates" value={`${fmt(t.carbs, 0)} g`} />
            <Row label="Fat" value={`${fmt(t.fat, 0)} g`} />
            <Row label="Fiber (min.)" value={`${fmt(t.fiber, 0)} g`} />
          </Section>
          {t.warnings.length > 0 && (
            <Section title="Heads up">
              {t.warnings.map((w) => <Row><Ico icon={TriangleExclamationPoint} size={18} class="warn" /><span class="warn small row-main">{w}</span></Row>)}
            </Section>
          )}
        </>
      ) : (
        <Section><Row><span class="sub">Log your weight in the Weight tab to see your BMI and calorie targets.</span></Row></Section>
      )}

      <Section title="How this is calculated">
        <div class="pad small sub formulas">
          <p>• BMI = weight ÷ height² (WHO categories). BMI doesn't account for muscle mass, so it overrates heavily muscled people.</p>
          <p>• BMR uses the Mifflin-St Jeor equation, generally the most accurate prediction equation for adults.</p>
          <p>• Maintenance (TDEE) = BMR × activity factor (1.2–1.9).</p>
          <p>• Goal calories = maintenance ± (weekly rate × 7700 kcal ÷ 7).</p>
          <p>• These are estimates: adjust after 2–3 weeks based on your real weight trend.</p>
        </div>
      </Section>

      <BackupSection />
    </Page>
  );
}

function Stepper({ label, value, step, min, max, display, onChange }: {
  label: string; value: number; step: number; min: number; max: number; display: string; onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.round(Math.min(max, Math.max(min, v)) * 100) / 100;
  return (
    <Row>
      <span class="row-main">{label}</span>
      <span class="row-value">{display}</span>
      <span class="stepper">
        <button onClick={() => onChange(clamp(value - step))} disabled={value <= min} aria-label="Decrease"><Ico icon={Minus} size={18} /></button>
        <button onClick={() => onChange(clamp(value + step))} disabled={value >= max} aria-label="Increase"><Ico icon={Plus} size={18} /></button>
      </span>
    </Row>
  );
}

function BackupSection() {
  const lastBackup = useLive(async () => (await db.kv.get('lastBackup'))?.value as number | undefined, [], undefined as number | undefined);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { navigator.storage?.persisted?.().then(setPersisted).catch(() => {}); }, []);

  const doExport = async () => {
    const json = await exportBackup();
    await shareFile(`FitTrack-backup-${dayKey()}.json`, json, 'application/json');
    await db.kv.put({ key: 'lastBackup', value: Date.now() });
  };

  const doImport = async (file: File) => {
    if (!confirm('Restoring replaces ALL data in the app with the backup. Continue?')) return;
    try {
      await importBackup(await file.text());
      alert('Backup restored.');
      location.reload();
    } catch (e) {
      alert(`Restore failed: ${(e as Error).message}`);
    }
  };

  const stale = !lastBackup || Date.now() - lastBackup > 14 * 86400000;

  return (
    <Section title="Your data"
      footer="All data is stored only on this phone, inside this home-screen app. Deleting the app icon deletes the data. Save a backup to Files or iCloud Drive regularly.">
      <Row label="Last backup" value={lastBackup ? fmtDate(lastBackup) : 'Never'} sub={stale ? <span class="warn">Older than 2 weeks: back up soon</span> : undefined} />
      {persisted != null && <Row label="Protected from automatic cleanup" value={persisted ? 'Yes' : 'No'} />}
      <ActionRow icon={Upload} label="Save backup…" onClick={doExport} />
      <ActionRow icon={Download} label="Restore from backup…" onClick={() => fileRef.current?.click()} />
      <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }}
        onChange={(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) doImport(f); (e.target as HTMLInputElement).value = ''; }} />
    </Section>
  );
}
