import { useState } from 'preact/hooks';
import { ChartColumn, Plus, Trash, TriangleExclamationPoint } from 'lucide-preact';
import { db, type Stool } from '../db';
import { dayKey, fmt, fmtDate, shiftDay } from '../calc';
import { BRISTOL, BristolIcon, GROUP_LABEL } from '../bristol';
import { Ico } from '../icons';
import { ActionRow, Page, Row, Section, Sheet, useLive, useNav } from '../ui';

const timeOf = (ts: number) => new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

/** Digestion section shown under the meals of the selected day. */
export function DigestionSection({ day }: { day: string }) {
  const nav = useNav();
  const items = useLive(() => db.stool.where('day').equals(day).sortBy('time'), [day], [] as Stool[]);
  const [editing, setEditing] = useState<Stool | 'new' | null>(null);
  return (
    <Section title="Digestion" right={items.length ? `${items.length}×` : undefined}>
      {items.map((s) => {
        const b = BRISTOL[s.type - 1];
        return (
          <Row key={s.id} onClick={() => setEditing(s)}>
            <BristolIcon type={s.type} size={36} />
            <div class="row-main">
              <b>Type {s.type} · {b.name}</b>
              <div class="sub small">{timeOf(s.time)} · {GROUP_LABEL[b.group]}{flagText(s)}</div>
            </div>
            <span class={`bristol-pill ${b.group}`}>{s.type}</span>
          </Row>
        );
      })}
      <ActionRow icon={Plus} label="Log bowel movement" onClick={() => setEditing('new')} />
      <ActionRow icon={ChartColumn} label="Digestion trends" onClick={() => nav.push(<DigestionTrends />)} />
      {editing && <StoolSheet day={day} entry={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </Section>
  );
}

const flagText = (s: Stool) => {
  const f = [s.urgency && 'urgent', s.strain && 'straining', s.pain && 'pain', s.blood && 'blood'].filter(Boolean);
  return f.length ? ` · ${f.join(', ')}` : '';
};

function StoolSheet({ day, entry, onClose }: { day: string; entry: Stool | null; onClose: () => void }) {
  const initTime = () => {
    const d = entry ? new Date(entry.time) : new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  const [type, setType] = useState<number | null>(entry?.type ?? null);
  const [time, setTime] = useState(initTime);
  const [flags, setFlags] = useState({ urgency: !!entry?.urgency, strain: !!entry?.strain, pain: !!entry?.pain, blood: !!entry?.blood });
  const [note, setNote] = useState(entry?.note ?? '');

  const save = async () => {
    if (!type) return;
    const [h, m] = time.split(':').map(Number);
    const d = new Date(day + 'T12:00:00'); d.setHours(h || 0, m || 0, 0, 0);
    const data = { day, time: d.getTime(), type, ...flags, note: note.trim() || undefined };
    if (entry) await db.stool.update(entry.id, data);
    else await db.stool.add(data as Stool);
    onClose();
  };

  const flag = (k: keyof typeof flags, label: string) => (
    <Row>
      <span class="row-main">{label}</span>
      <input type="checkbox" class="switch" checked={flags[k]} onChange={(e) => setFlags({ ...flags, [k]: (e.target as HTMLInputElement).checked })} />
    </Row>
  );

  return (
    <Sheet open onClose={onClose} title={entry ? 'Edit entry' : 'Bowel movement'}
      actions={<button class="link bold" disabled={!type} onClick={save}>Save</button>}>
      <Section title="Bristol stool scale" footer="Types 3–5 are the healthy range; 4 is ideal. 1–2 suggest constipation, 6–7 diarrhoea.">
        <div class="bristol-grid">
          {BRISTOL.map((b) => (
            <button class={`bristol-card ${b.group} ${type === b.type ? 'selected' : ''}`} onClick={() => setType(b.type)}>
              <span class="bristol-num">{b.type}</span>
              <BristolIcon type={b.type} />
              <span class="bristol-name">{b.name}</span>
              <span class="bristol-desc">{b.desc}</span>
            </button>
          ))}
        </div>
      </Section>
      <Section>
        <Row>
          <span class="row-main">Time</span>
          <input type="time" class="date-input" value={time} onChange={(e) => setTime((e.target as HTMLInputElement).value)} />
        </Row>
        {flag('urgency', 'Urgent')}
        {flag('strain', 'Straining')}
        {flag('pain', 'Pain or cramps')}
        {flag('blood', 'Blood visible')}
        <Row><input class="text-input" placeholder="Note (optional)" value={note} onInput={(e) => setNote((e.target as HTMLInputElement).value)} /></Row>
      </Section>
      {flags.blood && (
        <Section>
          <Row><Ico icon={TriangleExclamationPoint} size={18} class="warn" /><span class="warn small row-main">Blood in the stool should be checked by a doctor, especially if it happens more than once or the stool is black.</span></Row>
        </Section>
      )}
      {entry && (
        <Section>
          <ActionRow icon={Trash} danger label="Delete entry" onClick={async () => { await db.stool.delete(entry.id); onClose(); }} />
        </Section>
      )}
    </Sheet>
  );
}

// ---------- Trends ----------

function DigestionTrends() {
  const from = shiftDay(dayKey(), -13);
  const recent = useLive(() => db.stool.where('day').aboveOrEqual(from).toArray(), [from], [] as Stool[]);
  const days = Array.from({ length: 14 }, (_, i) => shiftDay(from, i));
  const byDay = new Map(days.map((d) => [d, recent.filter((s) => s.day === d)]));
  const total = recent.length;
  const healthy = recent.filter((s) => s.type >= 3 && s.type <= 5).length;
  const avgType = total ? recent.reduce((t, s) => t + s.type, 0) / total : 0;
  const blood = recent.some((s) => s.blood);

  return (
    <Page title="Digestion">
      <div class="stat-tiles">
        <div class="tile"><span class="tile-label">Per day</span><b>{fmt(total / 14, 1)}</b></div>
        <div class="tile"><span class="tile-label">Average type</span><b>{total ? fmt(avgType, 1) : '–'}</b></div>
        <div class="tile"><span class="tile-label">Healthy (3–5)</span><b>{total ? `${Math.round((healthy / total) * 100)} %` : '–'}</b></div>
      </div>

      <Section title="Last 14 days" footer="Each dot is one bowel movement, placed at its Bristol type. Normal frequency ranges from 3× per day to 3× per week.">
        <div class="pad">
          <div class="stool-chart">
            <div class="stool-axis">{[1, 2, 3, 4, 5, 6, 7].map((t) => <span>{t}</span>)}</div>
            <div class="stool-band" />
            {days.map((d) => (
              <div class="stool-col">
                {byDay.get(d)!.map((s) => <i class={`stool-dot ${BRISTOL[s.type - 1].group}`} style={{ top: `${((s.type - 1) / 6) * 100}%` }} />)}
                <span class="stool-day">{new Date(d + 'T12:00:00').getDate()}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Type distribution">
        <div class="pad">
          {BRISTOL.map((b) => {
            const n = recent.filter((s) => s.type === b.type).length;
            return (
              <div class="vol-row">
                <span class="vol-label"><BristolIcon type={b.type} size={22} />Type {b.type}</span>
                <div class="bar"><div class={`bristol-bar ${b.group}`} style={{ width: `${total ? (n / Math.max(1, ...BRISTOL.map((x) => recent.filter((s) => s.type === x.type).length))) * 100 : 0}%` }} /></div>
                <span class="vol-num">{n}</span>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Tips" footer="See a doctor for blood or black stool, unexplained weight loss, or a lasting change in habits (more than 3 weeks).">
        <div class="pad small sub formulas">
          <p>• Mostly types 1–2: drink more water, add fibre gradually (oats, legumes, vegetables, fruit) and stay active.</p>
          <p>• Mostly types 6–7: check for trigger foods; drink enough to replace fluid losses.</p>
          <p>• Fibre target: about 30 g per day. Your daily fibre is tracked in Nutrition.</p>
          {blood && <p class="warn">• You logged blood in the last 14 days. Please get it checked.</p>}
        </div>
      </Section>
      <Section title="History">
        {[...recent].sort((a, b) => b.time - a.time).slice(0, 20).map((s) => (
          <Row label={`${fmtDate(s.day)} · ${timeOf(s.time)}`} value={`Type ${s.type}`} />
        ))}
      </Section>
    </Page>
  );
}
