import type { Segment } from './kegel';

/**
 * Guided breathing. The track shows lung volume (0 = comfortably empty, 1 = comfortably full);
 * follow it with your breath. Only techniques with research support are included.
 */
export interface Phase { secs: number; to: number; label: string }
export interface Breathing {
  id: string;
  name: string;
  bestFor: string;
  pattern: string;
  minutes: number[];
  defaultMin: number;
  cycle: Phase[];
  how: string;
  evidence: string;
}

const IN = 'Breathe in through the nose';
const OUT = 'Breathe out slowly';

export const BREATHING: Breathing[] = [
  {
    id: 'cyclic-sigh', name: 'Cyclic Sighing', bestFor: 'Calm down fast, better mood',
    pattern: '2 s in · 1 s top-up · 6 s long exhale', minutes: [1, 3, 5], defaultMin: 5,
    cycle: [
      { secs: 2, to: 0.72, label: 'Inhale through the nose' },
      { secs: 1, to: 1, label: 'Top up: one more short sip' },
      { secs: 6, to: 0, label: 'Long, slow exhale through the mouth' },
    ],
    how: 'Two inhales through the nose (a full one, then a short top-up to fully inflate the lungs), then a long, relaxed exhale through the mouth. The long exhale is what calms you.',
    evidence: 'In a randomised study (Balban et al., Cell Reports Medicine, 2023), 5 minutes a day for a month improved mood and lowered resting breathing rate more than mindfulness meditation; it was the most effective of the techniques tested.',
  },
  {
    id: 'resonance', name: 'Resonance Breathing', bestFor: 'Heart-rate variability, calm focus',
    pattern: '5.5 s in · 5.5 s out (about 5.5 breaths a minute)', minutes: [5, 10, 15, 20], defaultMin: 10,
    cycle: [
      { secs: 5.5, to: 1, label: IN },
      { secs: 5.5, to: 0, label: OUT },
    ],
    how: 'Smooth, even breaths through the nose, low into the belly, without pauses. Don\'t breathe deeper than comfortable: slow, not big.',
    evidence: 'Breathing at about 6 breaths per minute brings heart rate and breathing into resonance and maximises heart-rate variability via the baroreflex. Reviews link regular practice to lower anxiety and better stress regulation (Lehrer & Gevirtz, 2014; Zaccaro et al., 2018).',
  },
  {
    id: 'box', name: 'Box Breathing', bestFor: 'Focus under pressure',
    pattern: '4 s in · 4 s hold · 4 s out · 4 s hold', minutes: [3, 5, 10], defaultMin: 5,
    cycle: [
      { secs: 4, to: 1, label: IN },
      { secs: 4, to: 1, label: 'Hold, relaxed' },
      { secs: 4, to: 0, label: OUT },
      { secs: 4, to: 0, label: 'Hold, empty' },
    ],
    how: 'Four equal sides. Keep the holds soft: the throat stays open, the shoulders relaxed.',
    evidence: 'Slow breathing with breath holds; in the same 2023 study it also improved mood, slightly less than cyclic sighing. Widely used to stay composed under pressure.',
  },
  {
    id: 'extended-exhale', name: 'Extended Exhale', bestFor: 'Winding down, falling asleep',
    pattern: '4 s in · 8 s out', minutes: [3, 5, 10], defaultMin: 5,
    cycle: [
      { secs: 4, to: 1, label: IN },
      { secs: 8, to: 0, label: 'Long exhale, like through a straw' },
    ],
    how: 'Breathe in through the nose, out twice as long through slightly pursed lips. Lying down in bed works well.',
    evidence: 'Breathing with longer exhalations than inhalations increases parasympathetic (rest-and-digest) activity, measurable as higher heart-rate variability, and is a common part of sleep-onset routines.',
  },
  {
    id: 'diaphragm', name: 'Diaphragmatic Breathing', bestFor: 'Belly breathing, posture, pelvic floor',
    pattern: '4 s in · 6 s out', minutes: [3, 5, 10], defaultMin: 5,
    cycle: [
      { secs: 4, to: 1, label: 'Belly rises · chest stays still' },
      { secs: 6, to: 0, label: 'Belly falls · let go' },
    ],
    how: 'One hand on the chest, one on the belly. Breathe so only the lower hand moves. Rounded shoulders often go with chest breathing; this retrains the diaphragm, which works together with the pelvic floor.',
    evidence: 'Diaphragmatic breathing training has been shown to lower stress markers such as cortisol and improve sustained attention (e.g. Ma et al., Frontiers in Psychology, 2017).',
  },
  {
    id: 'sigh-reset', name: 'Quick Sigh Reset', bestFor: 'One-minute reset during the day',
    pattern: '3 sighs, then natural breathing', minutes: [1], defaultMin: 1,
    cycle: [
      { secs: 2, to: 0.72, label: 'Inhale through the nose' },
      { secs: 1, to: 1, label: 'Top up: one more sip' },
      { secs: 6, to: 0, label: 'Long sigh out' },
      { secs: 2, to: 0.72, label: 'Inhale through the nose' },
      { secs: 1, to: 1, label: 'Top up' },
      { secs: 6, to: 0, label: 'Long sigh out' },
      { secs: 2, to: 0.72, label: 'Inhale through the nose' },
      { secs: 1, to: 1, label: 'Top up' },
      { secs: 6, to: 0, label: 'Long sigh out' },
      { secs: 30, to: 0, label: 'Breathe naturally, notice the calm' },
    ],
    how: 'Three physiological sighs in a row: the quickest known way to lower arousal in real time.',
    evidence: 'The physiological sigh (double inhale, long exhale) re-inflates collapsed air sacs and offloads CO₂; it is the building block of cyclic sighing (Balban et al., 2023).',
  },
];

export const BREATH_CAUTION = 'Stop and breathe normally if you feel dizzy, tingly or short of breath. Never practise breath holds in water or while driving. With heart or lung conditions, ask your doctor first.';

/** Repeats the breathing cycle for the chosen minutes (finishing the last full cycle). */
export function buildBreathSession(ex: Breathing, minutes: number): { segments: Segment[]; total: number } {
  const segs: Segment[] = [];
  let t = 0, v = 0;
  const add = (secs: number, to: number, label: string, phase: string) => { segs.push({ start: t, end: t + secs, from: v, to, label, phase }); t += secs; v = to; };
  add(5, 0, 'Get comfortable · breathe out', 'ready');
  const target = minutes * 60;
  do { for (const p of ex.cycle) add(p.secs, p.to, p.label, 'breath'); } while (t < target && ex.id !== 'sigh-reset');
  add(4, 0, 'Breathe naturally', 'end');
  return { segments: segs, total: t };
}

export interface BreathState { log: { day: string; time: number; id: string; secs: number }[] }
