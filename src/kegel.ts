/**
 * Pelvic-floor muscle training (Kegels) for men.
 *
 * Structure follows common evidence-based PFMT protocols:
 *  - slow, sustained contractions (endurance) + quick contractions (fast-twitch / reflex)
 *  - full relaxation for at least as long as each contraction (prevents an over-tight pelvic floor)
 *  - progression: longer holds, more repetitions, higher effort, harder positions
 *    (lying → sitting → standing), then combined and functional contractions
 *  - about 3 short sessions per day; noticeable results usually after 6–12 weeks
 *
 * A session is a timeline of target tension (0–1) that the user follows.
 */

export interface Segment { start: number; end: number; from: number; to: number; label: string; phase: Phase }
export type Phase = 'warmup' | 'slow' | 'elevator' | 'quick' | 'combo' | 'relax';

export interface Level {
  level: number;
  name: string;
  position: string;
  weeks: string;
  slow: { reps: number; hold: number; effort: number; rest: number };
  quick: { reps: number; on: number; off: number };
  elevator: number;
  combo: number;
  focus: string;
}

export const LEVELS: Level[] = [
  { level: 1, name: 'Foundation', position: 'Lying on your back, knees bent', weeks: 'Week 1–2',
    slow: { reps: 8, hold: 3, effort: 0.7, rest: 6 }, quick: { reps: 8, on: 1, off: 2 }, elevator: 0, combo: 0,
    focus: 'Find the right muscles and learn to relax them fully between contractions.' },
  { level: 2, name: 'Building', position: 'Lying or sitting', weeks: 'Week 3–4',
    slow: { reps: 10, hold: 5, effort: 0.8, rest: 8 }, quick: { reps: 10, on: 1, off: 2 }, elevator: 1, combo: 0,
    focus: 'Longer holds and your first "elevator": tensing in four controlled steps.' },
  { level: 3, name: 'Control', position: 'Sitting upright', weeks: 'Week 5–6',
    slow: { reps: 10, hold: 6, effort: 0.85, rest: 8 }, quick: { reps: 12, on: 1, off: 1.5 }, elevator: 2, combo: 0,
    focus: 'Sitting makes the muscles work against more gravity. Keep the buttocks and thighs relaxed.' },
  { level: 4, name: 'Strength', position: 'Sitting or standing', weeks: 'Week 7–8',
    slow: { reps: 12, hold: 8, effort: 0.9, rest: 8 }, quick: { reps: 15, on: 1, off: 1.5 }, elevator: 2, combo: 0,
    focus: 'Close to maximal holds. Quality over quantity: stop a set early if the squeeze fades.' },
  { level: 5, name: 'Endurance', position: 'Standing', weeks: 'Week 9–10',
    slow: { reps: 12, hold: 10, effort: 0.9, rest: 10 }, quick: { reps: 15, on: 1, off: 1.5 }, elevator: 1, combo: 3,
    focus: '10-second holds standing, plus combinations: a hold that finishes with quick extra squeezes.' },
  { level: 6, name: 'Functional', position: 'Standing, then during daily life', weeks: 'Week 11+',
    slow: { reps: 15, hold: 10, effort: 1, rest: 10 }, quick: { reps: 20, on: 1, off: 1.5 }, elevator: 2, combo: 4,
    focus: 'Maximal holds and fast reflexes. Also practise "the knack": squeeze just before you cough, sneeze or lift.' },
];

/** Builds the tension timeline for a level. Ramps make the target move smoothly. */
export function buildSession(lv: Level): { segments: Segment[]; total: number } {
  const segs: Segment[] = [];
  let t = 0;
  const seg = (dur: number, from: number, to: number, label: string, phase: Phase) => {
    segs.push({ start: t, end: t + dur, from, to, label, phase });
    t += dur;
  };
  const hold = (secs: number, effort: number, label: string, phase: Phase, rampUp = 1, rampDown = 1) => {
    seg(rampUp, 0, effort, 'Squeeze & lift', phase);
    seg(secs, effort, effort, label, phase);
    seg(rampDown, effort, 0, 'Let go', phase);
  };

  seg(4, 0, 0, 'Get ready · breathe normally', 'warmup');
  for (let i = 0; i < 2; i++) { hold(3, 0.5, 'Gentle hold', 'warmup'); seg(4, 0, 0, 'Relax', 'warmup'); }

  for (let i = 0; i < lv.slow.reps; i++) {
    hold(lv.slow.hold, lv.slow.effort, `Hold · ${i + 1}/${lv.slow.reps}`, 'slow');
    seg(Math.max(lv.slow.rest, lv.slow.hold + 1), 0, 0, 'Relax completely', 'slow');
  }

  for (let e = 0; e < lv.elevator; e++) {
    seg(3, 0, 0, 'Elevator: up in four floors', 'elevator');
    [0.25, 0.5, 0.75, 1].forEach((v, k) => { seg(0.8, k ? [0.25, 0.5, 0.75][k - 1] : 0, v, `Floor ${k + 1}`, 'elevator'); seg(1.6, v, v, `Floor ${k + 1}`, 'elevator'); });
    [0.75, 0.5, 0.25, 0].forEach((v, k) => { seg(0.8, [1, 0.75, 0.5, 0.25][k], v, 'Down, slowly', 'elevator'); seg(1.2, v, v, 'Down, slowly', 'elevator'); });
    seg(14, 0, 0, 'Relax completely', 'elevator');
  }

  for (let c = 0; c < lv.combo; c++) {
    seg(1, 0, 0.7, 'Squeeze & lift', 'combo');
    seg(5, 0.7, 0.7, `Hold, then pulse · ${c + 1}/${lv.combo}`, 'combo');
    for (let p = 0; p < 3; p++) { seg(0.3, 0.7, 1, 'Pulse!', 'combo'); seg(0.6, 1, 0.7, 'Pulse!', 'combo'); }
    seg(1, 0.7, 0, 'Let go', 'combo');
    seg(9, 0, 0, 'Relax completely', 'combo');
  }

  seg(3, 0, 0, 'Quick squeezes coming', 'quick');
  for (let q = 0; q < lv.quick.reps; q++) {
    seg(0.25, 0, 1, `Quick · ${q + 1}/${lv.quick.reps}`, 'quick');
    seg(Math.max(lv.quick.on - 0.25, 0.25), 1, 1, `Quick · ${q + 1}/${lv.quick.reps}`, 'quick');
    seg(0.3, 1, 0, 'Release', 'quick');
    seg(Math.max(lv.quick.off - 0.3, lv.quick.on), 0, 0, 'Release', 'quick');
  }

  seg(20, 0, 0, 'Down-train: breathe into the belly, let everything soften', 'relax');
  return { segments: segs, total: t };
}

/** Target tension at time t (seconds). */
export function tensionAt(segments: Segment[], t: number): number {
  if (t <= 0 || !segments.length) return 0;
  // Binary search for the active segment.
  let lo = 0, hi = segments.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid].end <= t) lo = mid + 1; else hi = mid;
  }
  const s = segments[lo];
  if (t >= s.end) return s.to;
  const k = (t - s.start) / (s.end - s.start);
  // Smoothstep ramps feel more natural than linear ones.
  const e = k * k * (3 - 2 * k);
  return s.from + (s.to - s.from) * e;
}

export const segmentAt = (segments: Segment[], t: number) =>
  segments.find((s) => t >= s.start && t < s.end) ?? segments[segments.length - 1];

export const SESSIONS_PER_DAY = 3;
/** Completed sessions at a level before the next level is suggested (~1 week at 2–3 per day). */
export const SESSIONS_TO_ADVANCE = 14;

export interface KegelState { level: number; atLevel: number; log: { day: string; level: number; secs: number }[] }
export const DEFAULT_KEGEL: KegelState = { level: 1, atLevel: 0, log: [] };

export const KEGEL_GUIDE: { title: string; text: string }[] = [
  { title: 'Finding the right muscles', text: 'Squeeze as if you were stopping the flow of urine and holding in wind at the same time. You should feel a lift behind the scrotum and the base of the penis draw slightly in and up. Only use the stop-the-flow test once to find the muscles. Don\'t train while urinating.' },
  { title: 'Do it right', text: 'Keep breathing normally. Buttocks, thighs and belly stay relaxed. The relaxation after each squeeze matters as much as the squeeze itself: let go completely before the next one.' },
  { title: 'How often', text: 'Up to three short sessions a day. Most men notice better control after 4–6 weeks; full results take about 3 months. After that, 1 session a day keeps the gains.' },
  { title: 'When not to', text: 'If you have pelvic or testicle pain, pain when urinating or ejaculating, or constipation, see a doctor or pelvic-floor physiotherapist first. Those can come from an overly tight pelvic floor, which needs relaxation training rather than more squeezing.' },
  { title: 'About the tension line', text: 'Your phone can\'t measure the muscle. The circle shows the target tension: follow it with your muscles. The tone rises as the target gets closer to 100 %.' },
];
