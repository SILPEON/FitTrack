import type { Segment } from './kegel';

/**
 * Guided breathing. The track shows lung volume (0 = comfortably empty, 1 = comfortably full);
 * follow it with your breath. Only techniques with research support are included.
 */
export interface Phase { secs: number; to: number; label: string }
export interface Breathing {
  id: string;
  group: 'calm' | 'capacity';
  name: string;
  bestFor: string;
  pattern: string;
  minutes: number[];
  defaultMin: number;
  cycle: Phase[];
  how: string;
  evidence: string;
}

const IN = 'Breathe in';
const OUT = 'Breathe out';

export const BREATHING: Breathing[] = [
  {
    id: 'cyclic-sigh', group: 'calm', name: 'Cyclic Sighing', bestFor: 'Calm down fast, better mood',
    pattern: '2 s in · 1 s top-up · 6 s long exhale', minutes: [1, 3, 5], defaultMin: 5,
    cycle: [
      { secs: 2, to: 0.72, label: 'Inhale · nose' },
      { secs: 1, to: 1, label: 'Top up · one more sip' },
      { secs: 6, to: 0, label: 'Long exhale · mouth' },
    ],
    how: 'Two inhales through the nose (a full one, then a short top-up to fully inflate the lungs), then a long, relaxed exhale through the mouth. The long exhale is what calms you.',
    evidence: 'In a randomised study (Balban et al., Cell Reports Medicine, 2023), 5 minutes a day for a month improved mood and lowered resting breathing rate more than mindfulness meditation; it was the most effective of the techniques tested.',
  },
  {
    id: 'resonance', group: 'calm', name: 'Resonance Breathing', bestFor: 'Heart-rate variability, calm focus',
    pattern: '5.5 s in · 5.5 s out (about 5.5 breaths a minute)', minutes: [5, 10, 15, 20], defaultMin: 10,
    cycle: [
      { secs: 5.5, to: 1, label: IN },
      { secs: 5.5, to: 0, label: OUT },
    ],
    how: 'Smooth, even breaths through the nose, low into the belly, without pauses. Don\'t breathe deeper than comfortable: slow, not big.',
    evidence: 'Breathing at about 6 breaths per minute brings heart rate and breathing into resonance and maximises heart-rate variability via the baroreflex. Reviews link regular practice to lower anxiety and better stress regulation (Lehrer & Gevirtz, 2014; Zaccaro et al., 2018).',
  },
  {
    id: 'box', group: 'calm', name: 'Box Breathing', bestFor: 'Focus under pressure',
    pattern: '4 s in · 4 s hold · 4 s out · 4 s hold', minutes: [3, 5, 10], defaultMin: 5,
    cycle: [
      { secs: 4, to: 1, label: IN },
      { secs: 4, to: 1, label: 'Hold' },
      { secs: 4, to: 0, label: OUT },
      { secs: 4, to: 0, label: 'Hold empty' },
    ],
    how: 'Four equal sides. Keep the holds soft: the throat stays open, the shoulders relaxed.',
    evidence: 'Slow breathing with breath holds; in the same 2023 study it also improved mood, slightly less than cyclic sighing. Widely used to stay composed under pressure.',
  },
  {
    id: 'extended-exhale', group: 'calm', name: 'Extended Exhale', bestFor: 'Winding down, falling asleep',
    pattern: '4 s in · 8 s out', minutes: [3, 5, 10], defaultMin: 5,
    cycle: [
      { secs: 4, to: 1, label: IN },
      { secs: 8, to: 0, label: 'Long exhale · straw' },
    ],
    how: 'Breathe in through the nose, out twice as long through slightly pursed lips. Lying down in bed works well.',
    evidence: 'Breathing with longer exhalations than inhalations increases parasympathetic (rest-and-digest) activity, measurable as higher heart-rate variability, and is a common part of sleep-onset routines.',
  },
  {
    id: 'diaphragm', group: 'calm', name: 'Diaphragmatic Breathing', bestFor: 'Belly breathing, posture, pelvic floor',
    pattern: '4 s in · 6 s out', minutes: [3, 5, 10], defaultMin: 5,
    cycle: [
      { secs: 4, to: 1, label: 'Belly rises' },
      { secs: 6, to: 0, label: 'Belly falls' },
    ],
    how: 'One hand on the chest, one on the belly. Breathe so only the lower hand moves. Rounded shoulders often go with chest breathing; this retrains the diaphragm, which works together with the pelvic floor.',
    evidence: 'Diaphragmatic breathing training has been shown to lower stress markers such as cortisol and improve sustained attention (e.g. Ma et al., Frontiers in Psychology, 2017).',
  },
  {
    id: 'sigh-reset', group: 'calm', name: 'Quick Sigh Reset', bestFor: 'One-minute reset during the day',
    pattern: '3 sighs, then natural breathing', minutes: [1], defaultMin: 1,
    cycle: [
      { secs: 2, to: 0.72, label: 'Inhale · nose' },
      { secs: 1, to: 1, label: 'Top up' },
      { secs: 6, to: 0, label: 'Long sigh out' },
      { secs: 2, to: 0.72, label: 'Inhale · nose' },
      { secs: 1, to: 1, label: 'Top up' },
      { secs: 6, to: 0, label: 'Long sigh out' },
      { secs: 2, to: 0.72, label: 'Inhale · nose' },
      { secs: 1, to: 1, label: 'Top up' },
      { secs: 6, to: 0, label: 'Long sigh out' },
      { secs: 30, to: 0, label: 'Breathe naturally' },
    ],
    how: 'Three physiological sighs in a row: the quickest known way to lower arousal in real time.',
    evidence: 'The physiological sigh (double inhale, long exhale) re-inflates collapsed air sacs and offloads CO₂; it is the building block of cyclic sighing (Balban et al., 2023).',
  },
  // ---------- Lung capacity ----------
  {
    id: 'complete-exhale', group: 'capacity', name: 'Complete Exhale', bestFor: 'Deeper exhale, stronger breathing muscles',
    pattern: '4 s in · 10 s out · 3 s squeeze out the rest', minutes: [3, 5, 8], defaultMin: 5,
    cycle: [
      { secs: 4, to: 1, label: 'Full breath in' },
      { secs: 10, to: 0.12, label: 'Slow exhale · pursed lips' },
      { secs: 3, to: 0, label: 'Squeeze out the rest' },
      { secs: 2, to: 0, label: 'Relax' },
    ],
    how: 'Inhale fully through the nose. Exhale slowly through pursed lips, then gently draw the belly in to push out the last air. Let the next breath come in by itself.',
    evidence: 'Long exhales through pursed lips are used in pulmonary rehabilitation to empty the lungs more completely; the final squeeze trains the abdominal and rib muscles that drive forced exhalation.',
  },
  {
    id: 'exhale-ladder', group: 'capacity', name: 'Exhale Ladder', bestFor: 'Step by step longer exhales',
    pattern: '4 s in · exhale 6 → 8 → 10 → 12 → 14 s', minutes: [3, 5, 8], defaultMin: 5,
    cycle: [
      { secs: 4, to: 1, label: IN }, { secs: 6, to: 0, label: 'Out · 6 s' },
      { secs: 4, to: 1, label: IN }, { secs: 8, to: 0, label: 'Out · 8 s' },
      { secs: 4, to: 1, label: IN }, { secs: 10, to: 0, label: 'Out · 10 s' },
      { secs: 4, to: 1, label: IN }, { secs: 12, to: 0, label: 'Out · 12 s' },
      { secs: 4, to: 1, label: IN }, { secs: 14, to: 0, label: 'Out · 14 s' },
      { secs: 8, to: 0, label: 'Breathe freely' },
    ],
    how: 'Each round the exhale gets 2 seconds longer. Control the outflow with slightly pursed lips so the air lasts. If you run out early, finish the time relaxed with an empty chest.',
    evidence: 'Progressive overload applied to breathing: controlled, lengthening exhales train the expiratory muscles and breath control, the same principle used in respiratory muscle training.',
  },
  {
    id: 'three-part', group: 'capacity', name: 'Three-Part Breath', bestFor: 'Use the whole lung, open the chest',
    pattern: 'belly · ribs · chest (2 s each) · 2 s hold · 8 s out', minutes: [3, 5, 8], defaultMin: 5,
    cycle: [
      { secs: 2, to: 0.35, label: 'Fill the belly' },
      { secs: 2, to: 0.7, label: 'Widen the ribs' },
      { secs: 2, to: 1, label: 'Lift the chest' },
      { secs: 2, to: 1, label: 'Hold softly' },
      { secs: 8, to: 0, label: 'Empty top to bottom' },
    ],
    how: 'Fill the lungs in three layers: belly, then the sides of the ribs, then the upper chest (shoulders stay down). Exhale slowly in reverse. Great before the Posture Reset routine.',
    evidence: 'Yogic full breathing (dirga pranayama) trains the diaphragm and intercostal muscles; several trials of regular pranayama report improvements in lung function measures such as peak flow and vital capacity, though study quality varies.',
  },
  {
    id: 'full-hold', group: 'capacity', name: 'Full-Lung Hold', bestFor: 'Stretch the chest wall, comfort at full volume',
    pattern: '5 s in · 1 s top-up · 6 s hold full · 8 s out · rest', minutes: [3, 5], defaultMin: 3,
    cycle: [
      { secs: 5, to: 0.9, label: 'Deep breath in' },
      { secs: 1, to: 1, label: 'Top up' },
      { secs: 6, to: 1, label: 'Hold full · relax shoulders' },
      { secs: 8, to: 0, label: 'Slow exhale' },
      { secs: 8, to: 0, label: 'Breathe easy' },
    ],
    how: 'Fill up to your comfortable maximum, add a small top-up sip, then hold with a relaxed throat and soft shoulders. Never strain or bear down.',
    evidence: 'A held maximal inhale (sustained maximal inspiration, as in incentive spirometry) keeps the small air sacs open and stretches the chest wall and rib muscles.',
  },
  {
    id: 'co2-tolerance', group: 'capacity', name: 'Empty-Lung Hold', bestFor: 'CO₂ tolerance, calmer breathing under effort',
    pattern: '4 s in · 6 s out · 10 s hold empty · recovery', minutes: [3, 5], defaultMin: 3,
    cycle: [
      { secs: 4, to: 1, label: IN },
      { secs: 6, to: 0, label: OUT },
      { secs: 10, to: 0, label: 'Hold empty · stay relaxed' },
      { secs: 4, to: 0.6, label: 'Calm breath in' },
      { secs: 4, to: 0, label: 'Calm breath out' },
      { secs: 4, to: 0.6, label: 'Calm breath in' },
      { secs: 4, to: 0, label: 'Calm breath out' },
    ],
    how: 'After a normal exhale, hold with empty lungs and stay loose. The urge to breathe is CO₂, not lack of oxygen; staying calm through it is the training. Recover with two calm breaths.',
    evidence: 'Breath-hold training raises tolerance to carbon dioxide, which lowers breathlessness and the urge to over-breathe during exercise, the approach used by freedivers and in breathing re-training.',
  },
];

export const BREATH_CAUTION = 'Stop and breathe normally if you feel dizzy, tingly or short of breath. Holds and forced exhales should feel challenging, never straining. Never practise breath holds in water or while driving. With heart or lung conditions, ask your doctor first.';

/** Repeats the breathing cycle for the chosen minutes (finishing the last full cycle). */
export function buildBreathSession(ex: Breathing, minutes: number): { segments: Segment[]; total: number } {
  const segs: Segment[] = [];
  let t = 0, v = 0;
  const add = (secs: number, to: number, label: string, phase: string) => { segs.push({ start: t, end: t + secs, from: v, to, label, phase }); t += secs; v = to; };
  add(5, 0, 'Get comfortable', 'ready');
  const target = minutes * 60;
  do { for (const p of ex.cycle) add(p.secs, p.to, p.label, 'breath'); } while (t < target && ex.id !== 'sigh-reset');
  add(4, 0, 'Breathe naturally', 'end');
  return { segments: segs, total: t };
}

export interface BreathState { log: { day: string; time: number; id: string; secs: number }[] }
