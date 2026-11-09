import { useState } from 'preact/hooks';
import { ChevronDown, ChevronUp, HeartPulse, Play } from 'lucide-preact';
import { db } from '../db';
import { TrackPlayer } from '../track';
import { dayKey, fmtDate, fmtDuration } from '../calc';
import { DEFAULT_KEGEL, KEGEL_GUIDE, LEVELS, SESSIONS_PER_DAY, SESSIONS_TO_ADVANCE, buildSession, type KegelState, type Level } from '../kegel';
import { Ico } from '../icons';
import { ActionRow, Page, Row, Section, useLive, useNav } from '../ui';

export const getKegel = async (): Promise<KegelState> => ({ ...DEFAULT_KEGEL, ...((await db.kv.get('kegel'))?.value as Partial<KegelState> ?? {}) });
const saveKegel = (s: KegelState) => db.kv.put({ key: 'kegel', value: s });
const minutes = (lv: Level) => Math.round(buildSession(lv).total / 60);

// ---------- Card on the Training home ----------

export function KegelCard() {
  const nav = useNav();
  const st = useLive(() => getKegel(), [], DEFAULT_KEGEL);
  const lv = LEVELS[st.level - 1];
  const today = st.log.filter((l) => l.day === dayKey()).length;
  return (
    <Section title="Pelvic floor">
      <Row chevron onClick={() => nav.push(<KegelScreen />)}>
        <span class="icon-badge violet"><Ico icon={HeartPulse} size={18} /></span>
        <div class="row-main">
          <b>Kegel trainer</b>
          <div class="sub small">Level {lv.level} · {lv.name} · {minutes(lv)} min</div>
        </div>
        <span class="kegel-dots" aria-label={`${today} of ${SESSIONS_PER_DAY} sessions today`}>
          {Array.from({ length: SESSIONS_PER_DAY }, (_, i) => <i class={i < today ? 'on' : ''} />)}
        </span>
      </Row>
    </Section>
  );
}

// ---------- Trainer screen ----------

function KegelScreen() {
  const st = useLive(() => getKegel(), [], DEFAULT_KEGEL);
  const [playing, setPlaying] = useState<Level | null>(null);
  const [guide, setGuide] = useState<number | null>(0);
  const lv = LEVELS[st.level - 1];
  const today = st.log.filter((l) => l.day === dayKey()).length;
  const weekAgo = dayKey(new Date(Date.now() - 6 * 86400000));
  const week = st.log.filter((l) => l.day >= weekAgo).length;
  const ready = st.atLevel >= SESSIONS_TO_ADVANCE && st.level < LEVELS.length;

  const setLevel = (level: number) => saveKegel({ ...st, level, atLevel: level === st.level ? st.atLevel : 0 });

  return (
    <Page title="Kegel Trainer">
      <div class="section">
        <div class="bodymap-card kegel-hero">
          <div class="bm-kicker">Level {lv.level} of {LEVELS.length} · {lv.weeks}</div>
          <div class="next-title">{lv.name}</div>
          <div class="kegel-hero-sub">{lv.position}</div>
          <p class="kegel-focus">{lv.focus}</p>
          <div class="kegel-stats">
            <span><b>{today}/{SESSIONS_PER_DAY}</b> today</span>
            <span><b>{week}</b> this week</span>
            <span><b>{Math.min(st.atLevel, SESSIONS_TO_ADVANCE)}/{SESSIONS_TO_ADVANCE}</b> at this level</span>
          </div>
          <button class="big-btn green full" onClick={() => setPlaying(lv)}><Ico icon={Play} size={20} />Start · {minutes(lv)} min</button>
        </div>
      </div>

      {ready && (
        <Section footer="You've completed enough sessions at this level. Move up if every hold felt controlled and you could relax fully in between; otherwise stay a little longer.">
          <ActionRow icon={ChevronUp} bold label={`Move up to Level ${st.level + 1} · ${LEVELS[st.level].name}`} onClick={() => setLevel(st.level + 1)} />
        </Section>
      )}

      <Section title="Levels" footer="Each level: slow holds for endurance, quick squeezes for fast reflexes, and at least as much relaxation as tension.">
        {LEVELS.map((l) => (
          <Row key={l.level} onClick={() => setLevel(l.level)}>
            <span class={`day-no ${l.level === st.level ? '' : 'muted'}`}>{l.level}</span>
            <div class="row-main">
              <b>{l.name}</b>{l.level === st.level && <span class="tag">Current</span>}
              <div class="sub small">{l.weeks} · {l.position}</div>
              <div class="sub small">
                {l.slow.reps} × {l.slow.hold} s hold at {Math.round(l.slow.effort * 100)} % · {l.quick.reps} quick
                {l.elevator ? ` · ${l.elevator} elevator` : ''}{l.combo ? ` · ${l.combo} combos` : ''} · {minutes(l)} min
              </div>
            </div>
          </Row>
        ))}
      </Section>

      <Section title="How to train">
        {KEGEL_GUIDE.map((g, k) => (
          <button class="row tappable expand" onClick={() => setGuide(guide === k ? null : k)}>
            <div class="row-main"><b>{g.title}</b>{guide === k && <div class="sub small expand-text">{g.text}</div>}</div>
            <Ico icon={guide === k ? ChevronUp : ChevronDown} size={18} class="chevron" />
          </button>
        ))}
      </Section>

      {st.log.length > 0 && (
        <Section title="Recent sessions">
          {[...st.log].reverse().slice(0, 7).map((l) => (
            <Row label={fmtDate(l.day)} value={`Level ${l.level} · ${fmtDuration(l.secs)}`} />
          ))}
        </Section>
      )}

      {playing && <TrackPlayer {...buildSession(playing)}
        doneText={`Level ${playing.level}. Remember: relaxed, normal breathing for the rest of the day.`}
        muteKey="kegelMuted" onClose={() => setPlaying(null)} onDone={async (secs) => {
        const s = await getKegel();
        await saveKegel({ ...s, atLevel: s.atLevel + 1, log: [...s.log, { day: dayKey(), level: playing.level, secs }].slice(-400) });
      }} />}
    </Page>
  );
}

