import { useState } from 'preact/hooks';
import { ChevronDown, ChevronUp, Play, Wind } from 'lucide-preact';
import { db } from '../db';
import { dayKey, fmtDate, fmtDuration } from '../calc';
import { BREATH_CAUTION, BREATHING, buildBreathSession, type BreathState, type Breathing } from '../breathing';
import { TrackPlayer } from '../track';
import { Ico } from '../icons';
import { Page, Row, Section, SessionRow, Segmented, useLive, useNav } from '../ui';

export const getBreathing = async (): Promise<BreathState> => ({ log: [], ...((await db.kv.get('breathing'))?.value as Partial<BreathState> ?? {}) });

async function logSession(id: string, secs: number) {
  const s = await getBreathing();
  await db.kv.put({ key: 'breathing', value: { ...s, log: [...s.log, { day: dayKey(), time: Date.now(), id, secs }].slice(-1000) } });
}

/** Player for one exercise and duration. */
function BreathPlayer({ ex, minutes, onClose }: { ex: Breathing; minutes: number; onClose: () => void }) {
  const [session] = useState(() => buildBreathSession(ex, minutes));
  return (
    <TrackPlayer {...session}
      yLabels={['Empty', '', 'Half', '', 'Full']}
      valueText={(v) => (v > 0.98 ? 'Full' : v < 0.02 ? 'Empty' : `${Math.round(v * 100)} %`)}
      doneText={`${ex.name}. Notice how you feel before getting up.`}
      muteKey="breathMuted" onClose={onClose} onDone={(secs) => logSession(ex.id, secs)} />
  );
}

/** Panel on the Training home. */
export function BreathingCard() {
  const nav = useNav();
  const st = useLive(() => getBreathing(), [], { log: [] } as BreathState);
  const [playing, setPlaying] = useState<Breathing | null>(null);
  const done = new Set(st.log.filter((l) => l.day === dayKey()).map((l) => l.id));
  const quick = BREATHING.filter((b) => ['cyclic-sigh', 'resonance', 'complete-exhale'].includes(b.id));
  return (
    <Section title="Breathing" icon={Wind} strong right={<button class="link small-link" onClick={() => nav.push(<BreathingScreen />)}>All exercises</button>}>
      {quick.map((b) => (
        <SessionRow key={b.id} title={b.name} sub={done.has(b.id) ? 'Done today' : b.bestFor} done={done.has(b.id)}
          minutes={b.defaultMin} onPlay={() => setPlaying(b)} />
      ))}
      {playing && <BreathPlayer ex={playing} minutes={playing.defaultMin} onClose={() => setPlaying(null)} />}
    </Section>
  );
}

const GROUPS = [
  { key: 'calm' as const, title: 'Calm & focus', footer: undefined as string | undefined },
  { key: 'capacity' as const, title: 'Lung capacity', footer: `Lung capacity itself is mostly set by your body size; these train the breathing muscles, how completely you exhale, chest-wall mobility and CO₂ tolerance. Progress by choosing longer sessions. ${BREATH_CAUTION}` },
];

function BreathingScreen() {
  const st = useLive(() => getBreathing(), [], { log: [] } as BreathState);
  const [open, setOpen] = useState<string | null>(BREATHING[0].id);
  const [mins, setMins] = useState<Record<string, number>>({});
  const [playing, setPlaying] = useState<{ ex: Breathing; minutes: number } | null>(null);
  const weekAgo = dayKey(new Date(Date.now() - 6 * 86400000));
  const week = st.log.filter((l) => l.day >= weekAgo);

  return (
    <Page title="Breathing">
      <div class="stat-tiles">
        <div class="tile"><span class="tile-label">Today</span><b>{st.log.filter((l) => l.day === dayKey()).length}</b></div>
        <div class="tile"><span class="tile-label">This week</span><b>{week.length}</b></div>
        <div class="tile"><span class="tile-label">Minutes</span><b>{Math.round(week.reduce((t, l) => t + l.secs, 0) / 60)}</b></div>
      </div>

      {GROUPS.map((grp) => (
      <Section title={grp.title} footer={grp.footer}>
        {BREATHING.filter((b) => b.group === grp.key).map((b) => {
          const isOpen = open === b.id;
          const m = mins[b.id] ?? b.defaultMin;
          return (
            <div class="breath-item">
              <button class="row tappable expand" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : b.id)}>
                <span class="icon-badge breath"><Ico icon={Wind} size={18} /></span>
                <div class="row-main"><b>{b.name}</b><div class="sub small">{b.bestFor}</div></div>
                <Ico icon={isOpen ? ChevronUp : ChevronDown} size={18} class="chevron" />
              </button>
              {isOpen && (
                <div class="pad breath-detail">
                  <div class="pill">{b.pattern}</div>
                  <p><b>How:</b> {b.how}</p>
                  <p class="sub small"><b>Evidence:</b> {b.evidence}</p>
                  {b.minutes.length > 1 && (
                    <Segmented value={String(m)} onChange={(v) => setMins({ ...mins, [b.id]: Number(v) })}
                      options={b.minutes.map((x) => ({ key: String(x), label: `${x} min` }))} />
                  )}
                  <button class="big-btn green full" onClick={() => setPlaying({ ex: b, minutes: m })}><Ico icon={Play} size={20} />Start · {m} min</button>
                </div>
              )}
            </div>
          );
        })}
      </Section>
      ))}

      {st.log.length > 0 && (
        <Section title="Recent sessions">
          {[...st.log].reverse().slice(0, 7).map((l) => (
            <Row label={BREATHING.find((b) => b.id === l.id)?.name ?? 'Breathing'} sub={fmtDate(l.day)} value={fmtDuration(l.secs)} />
          ))}
        </Section>
      )}

      {playing && <BreathPlayer ex={playing.ex} minutes={playing.minutes} onClose={() => setPlaying(null)} />}
    </Page>
  );
}
