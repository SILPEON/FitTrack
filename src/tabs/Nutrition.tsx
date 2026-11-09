import { useEffect, useState } from 'preact/hooks';
import { db, getProfile, MEALS, type Food, type FoodLog, type Meal, type Profile, type WeightEntry } from '../db';
import { dayKey, fmt, shiftDay, targets, type Targets } from '../calc';
import { ActionRow, Bar, NumberInput, Page, Row, Section, Segmented, Sheet, useLive } from '../ui';
import { ChevronLeft, ChevronRight, Plus, ScanBarcode, Trash } from 'lucide-preact';
import { Ico } from '../icons';
import type { BarcodeScanner as ScannerType } from '../scanner';
import { lookupBarcode } from '../off';

/** Meal suggestion for a scan started from the top bar, based on the time of day. */
const mealNow = (): Meal => {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  return h < 10.5 ? 'breakfast' : h < 15 ? 'lunch' : h >= 17.5 && h < 21.5 ? 'dinner' : 'snack';
};

interface Totals { kcal: number; protein: number; carbs: number; fat: number; fiber: number }
const sum = (items: FoodLog[]): Totals => items.reduce((t, e) => ({
  kcal: t.kcal + e.kcal, protein: t.protein + e.protein, carbs: t.carbs + e.carbs, fat: t.fat + e.fat, fiber: t.fiber + e.fiber,
}), { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

function dayLabel(day: string) {
  const today = dayKey();
  if (day === today) return 'Today';
  if (day === shiftDay(today, -1)) return 'Yesterday';
  return new Date(day + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function NutritionHome() {
  const [day, setDay] = useState(dayKey());
  const entries = useLive(() => db.foodLog.where('day').equals(day).sortBy('time'), [day], [] as FoodLog[]);
  const t = useLive(async () => {
    const [p, w]: [Profile, WeightEntry | undefined] = await Promise.all([getProfile(), db.weights.orderBy('day').last()]);
    return w ? targets(p, w.kg) : null;
  }, [], null as Targets | null);
  const [addMeal, setAddMeal] = useState<Meal | null>(null);
  const [editing, setEditing] = useState<FoodLog | null>(null);
  const [scanning, setScanning] = useState(false);
  const totals = sum(entries);

  return (
    <Page title="Nutrition" actions={<button class="icon-link" aria-label="Scan barcode" onClick={() => setScanning(true)}><Ico icon={ScanBarcode} size={26} grad="main" /></button>}>
      <div class="day-nav">
        <button class="icon-link" aria-label="Previous day" onClick={() => setDay(shiftDay(day, -1))}><Ico icon={ChevronLeft} size={26} grad="main" /></button>
        <label class="day-label">
          {dayLabel(day)}
          <input type="date" value={day} onChange={(e) => setDay((e.target as HTMLInputElement).value || dayKey())} />
        </label>
        <button class="icon-link" aria-label="Next day" onClick={() => setDay(shiftDay(day, 1))}><Ico icon={ChevronRight} size={26} grad="main" /></button>
      </div>

      <Section>
        <div class="pad">
          {t ? (
            <>
              <div class="hero">
                <div><span class="hero-num grad-text">{fmt(totals.kcal, 0)}</span><span class="hero-unit"> / {fmt(t.calories, 0)} kcal</span></div>
                <div class={t.calories - totals.kcal >= 0 ? 'good bold' : 'bad bold'}>
                  {t.calories - totals.kcal >= 0 ? `${fmt(t.calories - totals.kcal, 0)} left` : `${fmt(totals.kcal - t.calories, 0)} over`}
                </div>
              </div>
              <Bar value={totals.kcal} max={t.calories} color={totals.kcal <= t.calories ? 'var(--grad-main)' : 'var(--grad-over)'} />
              <Macro label="Protein" v={totals.protein} max={t.protein} color="var(--grad-cool)" />
              <Macro label="Carbs" v={totals.carbs} max={t.carbs} color="var(--grad-warm)" />
              <Macro label="Fat" v={totals.fat} max={t.fat} color="var(--grad-pink)" />
              <Macro label="Fiber" v={totals.fiber} max={t.fiber} color="var(--grad-fresh)" />
            </>
          ) : (
            <>
              <div class="hero-num">{fmt(totals.kcal, 0)} kcal</div>
              <div class="sub">P {fmt(totals.protein, 0)} g · C {fmt(totals.carbs, 0)} g · F {fmt(totals.fat, 0)} g · Fiber {fmt(totals.fiber, 0)} g</div>
              <div class="sub small">Fill in the Profile tab and log your weight to get daily targets.</div>
            </>
          )}
        </div>
      </Section>

      {MEALS.map((m) => {
        const items = entries.filter((e) => e.meal === m.key);
        return (
          <Section key={m.key} title={m.label} right={`${fmt(sum(items).kcal, 0)} kcal`}>
            {items.map((e) => (
              <Row key={e.id} onClick={() => setEditing(e)} label={e.name}
                sub={`${fmt(e.grams, 0)} ${e.unit ?? 'g'} · P ${fmt(e.protein, 0)} · C ${fmt(e.carbs, 0)} · F ${fmt(e.fat, 0)}`}
                value={`${fmt(e.kcal, 0)} kcal`} />
            ))}
            <ActionRow icon={Plus} label="Add food" onClick={() => setAddMeal(m.key)} />
          </Section>
        );
      })}

      {addMeal && <AddFood meal={addMeal} day={day} onClose={() => setAddMeal(null)} />}
      {editing && <EditEntry entry={editing} onClose={() => setEditing(null)} />}
      {scanning && <ScanFlow meal={mealNow()} day={day} onClose={() => setScanning(false)} />}
    </Page>
  );
}

const Macro = ({ label, v, max, color }: { label: string; v: number; max: number; color: string }) => (
  <div class="macro">
    <div class="macro-head"><span>{label}</span><span class="sub">{fmt(v, 0)} / {fmt(max, 0)} g</span></div>
    <Bar value={v} max={max} color={color} />
  </div>
);

function timeFor(day: string) {
  return day === dayKey() ? Date.now() : new Date(day + 'T12:00:00').getTime();
}

function AddFood({ meal, day, onClose }: { meal: Meal; day: string; onClose: () => void }) {
  const [mode, setMode] = useState<'db' | 'manual'>('db');
  const [picked, setPicked] = useState<Food | null>(null);
  const [scan, setScan] = useState(false);
  const mealLabel = MEALS.find((m) => m.key === meal)!.label;

  if (scan) return <ScanFlow meal={meal} day={day} onClose={() => setScan(false)} onDone={onClose} />;
  if (picked) return <FoodAmount food={picked} meal={meal} day={day} onBack={() => setPicked(null)} onDone={onClose} />;

  return (
    <Sheet open onClose={onClose} title={`Add to ${mealLabel}`}>
      <div class="pad">
        <Segmented value={mode} onChange={setMode} options={[{ key: 'db', label: 'Food database' }, { key: 'manual', label: 'Manual entry' }]} />
      </div>
      {mode === 'db' && (
        <Section><ActionRow icon={ScanBarcode} label="Scan barcode" bold onClick={() => setScan(true)} /></Section>
      )}
      {mode === 'db' ? <FoodSearch onPick={setPicked} /> : <ManualFood meal={meal} day={day} onDone={onClose} />}
    </Sheet>
  );
}

function FoodSearch({ onPick }: { onPick: (f: Food) => void }) {
  const foods = useLive(() => db.foods.orderBy('name').toArray(), [], [] as Food[]);
  const [q, setQ] = useState('');
  const recent = foods.filter((f) => f.lastUsed).sort((a, b) => (b.lastUsed ?? 0) - (a.lastUsed ?? 0)).slice(0, 8);
  const filtered = q ? foods.filter((f) => f.name.toLowerCase().includes(q.toLowerCase())) : foods;
  const row = (f: Food) => (
    <Row key={f.id} chevron onClick={() => onPick(f)} label={<>{f.name}{f.custom && <span class="tag">Mine</span>}</>}
      sub={`${fmt(f.kcal, 0)} kcal${f.unit === 'ml' ? ' /100 ml' : ''} · P ${fmt(f.protein)} · C ${fmt(f.carbs)} · F ${fmt(f.fat)}`} />
  );
  return (
    <>
      <div class="search-bar">
        <input type="search" placeholder="Search foods" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
      </div>
      {!q && recent.length > 0 && <Section title="Recent">{recent.map(row)}</Section>}
      <Section title={q ? 'Results' : 'All foods (per 100 g)'}>
        {filtered.length === 0 && <Row><span class="sub">No match. Use Manual entry to add it.</span></Row>}
        {filtered.map(row)}
      </Section>
    </>
  );
}

function FoodAmount({ food, meal: initialMeal, day, onBack, onDone, chooseMeal }: {
  food: Food; meal: Meal; day: string; onBack: () => void; onDone: () => void; chooseMeal?: boolean;
}) {
  const [grams, setGrams] = useState<number | null>(food.servingG ?? 100);
  const [meal, setMeal] = useState<Meal>(initialMeal);
  const unit = food.unit ?? 'g';
  const f = (grams ?? 0) / 100;
  const quick: { label: string; g: number }[] = [
    ...(food.servingG ? [{ label: `1 serving (${fmt(food.servingG)} ${unit})`, g: food.servingG }] : []),
    ...(food.packageG ? [{ label: `Whole pack (${fmt(food.packageG)} ${unit})`, g: food.packageG }] : []),
    ...[30, 50, 100, 150, 200, 250].map((g) => ({ label: `${g} ${unit}`, g })),
  ];
  const add = async () => {
    await db.foodLog.add({
      day, meal, name: food.name, grams: grams ?? 0, unit, time: timeFor(day),
      kcal: food.kcal * f, protein: food.protein * f, carbs: food.carbs * f, fat: food.fat * f, fiber: food.fiber * f,
    } as FoodLog);
    await db.foods.update(food.id, { lastUsed: Date.now() });
    onDone();
  };
  return (
    <Sheet open onClose={onBack} title={food.barcode ? 'Scanned product' : food.name}
      actions={<button class="link bold" disabled={!grams || grams <= 0} onClick={add}>Add</button>}>
      {food.barcode && (
        <Section>
          <Row label={<b>{food.name}</b>} sub={`Barcode ${food.barcode} · per 100 ${unit}: ${fmt(food.kcal, 0)} kcal`} />
        </Section>
      )}
      {chooseMeal && (
        <div class="pad">
          <Segmented value={meal} onChange={setMeal} options={MEALS.map((m) => ({ key: m.key, label: m.label }))} />
        </div>
      )}
      <Section title="Amount">
        <Row>
          <NumberInput value={grams} onChange={setGrams} class="wide big-input" />
          <span class="unit">{unit}</span>
        </Row>
        <div class="chips pad wrap">
          {quick.map((q) => <button class={grams === q.g ? 'chip active' : 'chip'} onClick={() => setGrams(q.g)}>{q.label}</button>)}
        </div>
      </Section>
      <Section title="Nutrients for this amount">
        <Row label="Calories" value={`${fmt(food.kcal * f, 0)} kcal`} />
        <Row label="Protein" value={`${fmt(food.protein * f)} g`} />
        <Row label="Carbohydrates" value={`${fmt(food.carbs * f)} g`} />
        <Row label="Fat" value={`${fmt(food.fat * f)} g`} />
        <Row label="Fiber" value={`${fmt(food.fiber * f)} g`} />
      </Section>
      <Section footer={food.barcode ? 'Product data from Open Food Facts (community-maintained). Check it against the label the first time; if it is wrong, delete it below and enter it manually.' : undefined}>
        <Row onClick={add}><span class="accent bold">Add to {MEALS.find((m) => m.key === meal)!.label}</span></Row>
        {food.custom && (
          <ActionRow icon={Trash} danger label="Delete from my foods" onClick={async () => { if (confirm(`Delete "${food.name}" from your foods?`)) { await db.foods.delete(food.id); onBack(); } }} />
        )}
      </Section>
    </Sheet>
  );
}

/** Scan → look up → choose amount. Falls back to manual entry when the product is unknown. */
function ScanFlow({ meal, day, onClose, onDone }: { meal: Meal; day: string; onClose: () => void; onDone?: () => void }) {
  type Step =
    | { s: 'scan' } | { s: 'loading'; code: string } | { s: 'amount'; food: Food }
    | { s: 'manual'; code: string; name: string; unit: 'g' | 'ml'; note: string };
  const [step, setStep] = useState<Step>({ s: 'scan' });
  // The scanner library is large, so it's only downloaded when you first tap scan.
  const [Scanner, setScanner] = useState<typeof ScannerType | null>(null);
  useEffect(() => {
    import('../scanner').then((m) => setScanner(() => m.BarcodeScanner)).catch(() => {
      alert('Could not load the scanner. Check your internet connection and try again.');
      onClose();
    });
  }, []);
  const finish = onDone ?? onClose;

  const onCode = async (code: string) => {
    setStep({ s: 'loading', code });
    const r = await lookupBarcode(code);
    if (r.status === 'found') setStep({ s: 'amount', food: r.food });
    else if (r.status === 'incomplete') setStep({ s: 'manual', code, name: r.brand ? `${r.name} (${r.brand})` : r.name, unit: r.unit,
      note: 'Open Food Facts knows this product but has no complete nutrition values. Enter them from the label once; next time the scan fills them in.' });
    else if (r.status === 'not-found') setStep({ s: 'manual', code, name: '', unit: 'g',
      note: 'This product is not in Open Food Facts yet. Enter it from the label once; next time the scan finds it in your foods.' });
    else {
      alert('No internet connection, and this product is not saved on your phone yet. Try again when you are online, or enter it manually.');
      setStep({ s: 'scan' });
    }
  };

  if (step.s === 'scan') {
    return Scanner
      ? <Scanner onCode={onCode} onClose={onClose} />
      : <Sheet open onClose={onClose} title="Starting camera…"><div class="empty"><span class="spinner" /></div></Sheet>;
  }
  if (step.s === 'loading') {
    return (
      <Sheet open onClose={onClose} title="Looking up…">
        <div class="empty"><span class="spinner" /><div class="sub">Barcode {step.code}</div></div>
      </Sheet>
    );
  }
  if (step.s === 'amount') {
    return <FoodAmount food={step.food} meal={meal} day={day} chooseMeal onBack={onClose} onDone={finish} />;
  }
  return (
    <Sheet open onClose={onClose} title="New product">
      <div class="hint">{step.note}</div>
      <ManualFood meal={meal} day={day} onDone={finish} barcode={step.code} initialName={step.name} unit={step.unit} />
    </Sheet>
  );
}

function ManualFood({ meal, day, onDone, barcode, initialName = '', unit = 'g' }: {
  meal: Meal; day: string; onDone: () => void; barcode?: string; initialName?: string; unit?: 'g' | 'ml';
}) {
  const [name, setName] = useState(initialName);
  const [v, setV] = useState<Record<string, number | null>>({ grams: 100, kcal: null, protein: null, carbs: null, fat: null, fiber: null });
  const [saveFood, setSaveFood] = useState(true);
  const set = (k: string) => (x: number | null) => setV((o) => ({ ...o, [k]: x }));
  const n = (k: string) => v[k] ?? 0;
  const valid = name.trim() && v.kcal != null;

  const add = async () => {
    if (!valid) return;
    await db.foodLog.add({
      day, meal, name: name.trim(), grams: n('grams'), unit, time: timeFor(day),
      kcal: n('kcal'), protein: n('protein'), carbs: n('carbs'), fat: n('fat'), fiber: n('fiber'),
    } as FoodLog);
    if (saveFood && n('grams') > 0) {
      const k = 100 / n('grams');
      await db.foods.add({
        name: name.trim(), kcal: n('kcal') * k, protein: n('protein') * k, carbs: n('carbs') * k,
        fat: n('fat') * k, fiber: n('fiber') * k, custom: true, lastUsed: Date.now(), barcode, unit,
      } as Food);
    }
    onDone();
  };

  const field = (label: string, key: string, unit: string) => (
    <Row>
      <span class="row-main">{label}</span>
      <NumberInput value={v[key]} onChange={set(key)} placeholder="0" />
      <span class="unit">{unit}</span>
    </Row>
  );

  return (
    <>
      <Section>
        <Row><input class="text-input" placeholder="Food name" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} /></Row>
        {field('Amount', 'grams', unit)}
      </Section>
      <Section title="Nutrients for this amount (from the label)">
        {field('Calories', 'kcal', 'kcal')}
        {field('Protein', 'protein', 'g')}
        {field('Carbohydrates', 'carbs', 'g')}
        {field('Fat', 'fat', 'g')}
        {field('Fiber', 'fiber', 'g')}
      </Section>
      <Section footer="Saved foods are stored per 100 g so you can log any amount later.">
        {barcode && <Row label="Barcode" value={barcode} />}
        <Row>
          <span class="row-main">Save to my food database</span>
          <input type="checkbox" class="switch" checked={saveFood} onChange={(e) => setSaveFood((e.target as HTMLInputElement).checked)} />
        </Row>
      </Section>
      <Section>
        <Row onClick={add}><span class={valid ? 'accent bold' : 'sub'}>Add</span></Row>
      </Section>
    </>
  );
}

function EditEntry({ entry, onClose }: { entry: FoodLog; onClose: () => void }) {
  const [grams, setGrams] = useState<number | null>(entry.grams);
  const k = entry.grams > 0 ? (grams ?? 0) / entry.grams : 1;
  const save = async () => {
    if (entry.grams > 0 && grams != null) {
      await db.foodLog.update(entry.id, {
        grams, kcal: entry.kcal * k, protein: entry.protein * k, carbs: entry.carbs * k, fat: entry.fat * k, fiber: entry.fiber * k,
      });
    }
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={entry.name} actions={<button class="link bold" onClick={save}>Save</button>}>
      {entry.grams > 0 && (
        <Section title="Amount">
          <Row><NumberInput value={grams} onChange={setGrams} class="wide big-input" /><span class="unit">{entry.unit ?? 'g'}</span></Row>
        </Section>
      )}
      <Section>
        <Row label="Calories" value={`${fmt(entry.kcal * k, 0)} kcal`} />
        <Row label="Protein" value={`${fmt(entry.protein * k)} g`} />
        <Row label="Carbohydrates" value={`${fmt(entry.carbs * k)} g`} />
        <Row label="Fat" value={`${fmt(entry.fat * k)} g`} />
      </Section>
      <Section>
        <ActionRow icon={Trash} danger label="Delete entry" onClick={async () => { await db.foodLog.delete(entry.id); onClose(); }} />
      </Section>
    </Sheet>
  );
}
