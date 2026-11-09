/**
 * Home-gym training plans for hypertrophy, built for:
 *  - priority order: Glutes, Quads, Pecs, Shoulders, Neck, Arms, Lats, Abs
 *  - gear: long barbell (no rack), 2 adjustable dumbbells, 5 kg kettlebell, push-up handles, bands,
 *    1 kg ankle weights, wall pull-up bar, bench (0/20/40/60°), ab slider, yoga mat/block, Blackroll
 *  - plates: 1×10, 1×5, 2×2.5, 4×2, 2×1.25, 8×1 kg (38.5 kg)
 *  - shoulder pain when pressing isn't balanced by pulling, tight hamstrings
 *
 * One fixed plate setup is used for every session so nothing is restacked.
 */

export type Muscle = 'Glutes' | 'Quads' | 'Pecs' | 'Shoulders' | 'Neck' | 'Arms' | 'Lats' | 'Abs' | 'Hamstrings' | 'Upper back';
/** The user's priority order, followed by supporting muscles. */
export const PRIORITY: Muscle[] = ['Glutes', 'Quads', 'Pecs', 'Shoulders', 'Neck', 'Arms', 'Lats', 'Abs', 'Hamstrings', 'Upper back'];

export type Load = 'bar' | 'db' | 'kb' | 'bw' | 'band' | 'ankle';

export interface PlanExercise {
  name: string;
  /** Group used by the exercise library. */
  group: string;
  equipment: string;
  load: Load;
  /** Weekly-volume credit per set: 1 = primary target, 0.5 = strong secondary. */
  targets: Partial<Record<Muscle, number>>;
  /** Counts towards the shoulder-balance ratio. */
  pattern?: 'push' | 'pull';
  cue: string;
  shoulder?: string;
  perSide?: boolean;
}

export const LIBRARY: PlanExercise[] = [
  // ---------- Glutes ----------
  { name: 'Barbell Hip Thrust', group: 'Glutes', equipment: 'Barbell, bench', load: 'bar', targets: { Glutes: 1, Hamstrings: 0.25 },
    cue: 'Upper back on the flat bench edge, feet hip-width, shins vertical at the top. Tuck chin and ribs, drive through heels, squeeze 1 s at the top. Pad the bar with the folded yoga mat.' },
  { name: 'B-Stance Hip Thrust (Barbell)', group: 'Glutes', equipment: 'Barbell, bench', load: 'bar', targets: { Glutes: 1 }, perSide: true,
    cue: 'Like a hip thrust, but the working foot is planted and the other heel rests lightly ahead of it (kickstand). About 80% of the load goes through the working leg.' },
  { name: 'Single-Leg Hip Thrust', group: 'Glutes', equipment: 'Bench (+ dumbbell on hip)', load: 'db', targets: { Glutes: 1 }, perSide: true,
    cue: 'Upper back on the bench, one foot planted, other knee pulled in. Hold one dumbbell on the working hip once bodyweight gets easy. Pause 1 s at the top.' },
  { name: 'Frog Pump', group: 'Glutes', equipment: 'Mat (+ dumbbell)', load: 'db', targets: { Glutes: 1 },
    cue: 'Lie on your back, soles together, knees out. Dumbbell on hips. Short, fast, hard squeezes. Burner at the end of a session.' },
  { name: 'Banded Hip Abduction', group: 'Glutes', equipment: 'Resistance band', load: 'band', targets: { Glutes: 1 },
    cue: 'Sit on the bench edge, band just above the knees. Lean slightly forward and push knees out against the band; control the way back.' },
  { name: 'Glute Kickback (Ankle Weight)', group: 'Glutes', equipment: 'Ankle weights, mat', load: 'ankle', targets: { Glutes: 1 }, perSide: true,
    cue: 'On all fours, 1 kg ankle weight on the working leg. Knee bent 90°, press the sole towards the ceiling without arching the lower back.' },
  // ---------- Quads ----------
  { name: 'Bulgarian Split Squat – Quad Focus', group: 'Quads', equipment: 'Dumbbells, bench', load: 'db', targets: { Quads: 1, Glutes: 0.5 }, perSide: true,
    cue: 'Rear foot on the bench seat, shorter stance, torso upright. Let the front knee travel forward over the toes. Lower slowly (2–3 s), drive up.' },
  { name: 'Bulgarian Split Squat – Glute Focus', group: 'Glutes', equipment: 'Dumbbells, bench', load: 'db', targets: { Glutes: 1, Quads: 0.5 }, perSide: true,
    cue: 'Longer stance, lean the torso forward ~30°, front shin stays more vertical. Sink deep into the front hip, push up through the heel.' },
  { name: 'Heel-Elevated Goblet Squat', group: 'Quads', equipment: 'Dumbbell, yoga block', load: 'db', targets: { Quads: 1, Glutes: 0.25 },
    cue: 'Heels on the yoga block, hold one dumbbell vertically at the chest. Sit straight down between the heels, knees far forward, torso tall. 3 s down.' },
  { name: 'Dumbbell Step-Up', group: 'Quads', equipment: 'Dumbbells, bench', load: 'db', targets: { Quads: 0.75, Glutes: 0.75 }, perSide: true,
    cue: 'Whole foot on the flat bench. Drive through the working leg only; don\'t push off the floor foot. Lower slowly.' },
  { name: 'Sissy Squat (Wall-Assisted)', group: 'Quads', equipment: 'Bodyweight, wall', load: 'bw', targets: { Quads: 1 },
    cue: 'Hold the wall or door frame, rise onto the balls of your feet, lean back and let the knees travel forward. Only as deep as your knees feel good.' },
  // ---------- Hamstrings (supporting; tight hamstrings) ----------
  { name: 'Barbell Romanian Deadlift', group: 'Hamstrings', equipment: 'Barbell', load: 'bar', targets: { Hamstrings: 1, Glutes: 0.5 },
    cue: 'Soft knees, push the hips back, bar slides down the thighs. Stop where your back would start to round: with tight hamstrings that\'s around mid-shin, and that\'s fine. The loaded stretch improves flexibility over time.' },
  { name: 'Single-Leg Dumbbell RDL', group: 'Hamstrings', equipment: 'Dumbbell', load: 'db', targets: { Hamstrings: 0.75, Glutes: 0.75 }, perSide: true,
    cue: 'Dumbbell in the opposite hand, hinge on one leg, hips square to the floor. Touch the wall with a fingertip for balance if needed.' },
  { name: 'Banded Lying Leg Curl', group: 'Hamstrings', equipment: 'Resistance band, bench', load: 'band', targets: { Hamstrings: 1 },
    cue: 'Face down on the bench, band anchored low behind you (bench leg) and looped around the ankles. Curl heels to glutes, 2 s back.' },
  // ---------- Pecs ----------
  { name: 'Incline Dumbbell Press (20°)', group: 'Chest', equipment: 'Dumbbells, bench 20°', load: 'db', targets: { Pecs: 1, Shoulders: 0.25, Arms: 0.25 }, pattern: 'push',
    cue: 'Bench at 20°, shoulder blades pulled back and down. Palms turned slightly in (about 45°), elbows ~45° from the body. 3 s down.',
    shoulder: 'Stop when the upper arms are level with your torso. Going deeper is where sensitive shoulders get irritated.' },
  { name: 'Flat Dumbbell Press (Neutral Grip)', group: 'Chest', equipment: 'Dumbbells, bench', load: 'db', targets: { Pecs: 1, Arms: 0.25 }, pattern: 'push',
    cue: 'Palms facing each other, dumbbells touch lightly at the top. Elbows tucked ~30–45°.',
    shoulder: 'Neutral grip is the most shoulder-friendly press. Same depth rule: upper arms level with the torso.' },
  { name: 'Push-Up on Handles', group: 'Chest', equipment: 'Push-up handles', load: 'bw', targets: { Pecs: 1, Arms: 0.25, Shoulders: 0.25 }, pattern: 'push',
    cue: 'Body in one line, squeeze glutes. Lower until the chest is level with the handles, 2 s down. Too easy: feet on the bench. Too hard: knees down.',
    shoulder: 'Handles let you keep wrists neutral. Don\'t sink deeper than pain-free.' },
  { name: 'Dumbbell Fly (Short Range)', group: 'Chest', equipment: 'Dumbbells, bench', load: 'db', targets: { Pecs: 1 }, pattern: 'push',
    cue: 'Slight bend in the elbows, open the arms in an arc. Stop with the elbows at bench height.',
    shoulder: 'Never let the dumbbells drop below the bench. The stretched position stresses the front of the shoulder.' },
  // ---------- Shoulders ----------
  { name: 'Half-Kneeling One-Arm Dumbbell Press', group: 'Shoulders', equipment: 'Dumbbell', load: 'db', targets: { Shoulders: 1, Arms: 0.25 }, pattern: 'push',
    cue: 'Kneel on one knee, press with the same-side arm as the down knee. Neutral grip, press up and slightly forward, ribs down.',
    shoulder: 'Shoulder-friendlier than two-arm overhead pressing. If it pinches, skip it: lateral raises cover the delts.' },
  { name: 'Lateral Raise (Kettlebell, One Arm)', group: 'Shoulders', equipment: 'Kettlebell 5 kg', load: 'kb', targets: { Shoulders: 1 }, perSide: true,
    cue: 'Hold the wall with the free hand, lean slightly away. Raise in the scapular plane (about 30° in front of you) to shoulder height. 2 s down.',
    shoulder: 'Thumb neutral or slightly up, never "pouring a jug". Stop at shoulder height.' },
  { name: 'Band Lateral Raise', group: 'Shoulders', equipment: 'Resistance band', load: 'band', targets: { Shoulders: 1 },
    cue: 'Stand on the band, raise both arms in the scapular plane to shoulder height. Constant tension, slow negatives.' },
  { name: 'Band Face Pull', group: 'Upper back', equipment: 'Band on pull-up bar', load: 'band', targets: { Shoulders: 0.5, 'Upper back': 1 }, pattern: 'pull',
    cue: 'Band anchored at face height. Pull to the forehead, elbows high, finish by rotating the hands back (double-biceps pose). Hold 1 s.',
    shoulder: 'Your best shoulder-health exercise. Rear delts and rotator cuff balance out all the pressing.' },
  { name: 'Band Pull-Apart', group: 'Upper back', equipment: 'Resistance band', load: 'band', targets: { Shoulders: 0.25, 'Upper back': 1 }, pattern: 'pull',
    cue: 'Arms straight at chest height, pull the band apart until it touches your chest, squeeze the shoulder blades.' },
  { name: 'Prone Y-Raise (40° Incline)', group: 'Shoulders', equipment: 'Bench 40°, ankle weights', load: 'ankle', targets: { Shoulders: 0.5, 'Upper back': 0.75 }, pattern: 'pull',
    cue: 'Chest on the bench at 40°, 1 kg ankle weights around the wrists. Raise arms in a Y, thumbs up, shoulder blades down and back.',
    shoulder: 'Strengthens the lower traps, which stabilise the shoulder blade. Keep it light and strict.' },
  // ---------- Neck ----------
  { name: 'Lying Neck Flexion', group: 'Neck', equipment: 'Bench, towel (+ ankle weight)', load: 'ankle', targets: { Neck: 1 },
    cue: 'On your back, head just off the end of the bench. Tuck the chin, then curl the head up towards the chest; slow down. Start with bodyweight; later a 1 kg ankle weight on a folded towel on the forehead.',
    shoulder: 'Neck work: always slow, no jerking, small loads. Stop immediately with dizziness, tingling or sharp pain.' },
  { name: 'Lying Neck Extension', group: 'Neck', equipment: 'Bench, towel (+ ankle weight)', load: 'ankle', targets: { Neck: 1 },
    cue: 'Face down, head off the end of the bench. Lower the chin towards the chest, then lift the head back to neutral; no further. Ankle weight on a towel on the back of the head when ready.' },
  { name: 'Neck Isometrics (4 Directions)', group: 'Neck', equipment: 'Hand or band', load: 'bw', targets: { Neck: 1 },
    cue: 'Press head into your palm forward, back, left and right, about 50–70% effort, 15–20 s each. Head stays still. One "rep" = all four directions.' },
  { name: 'Dumbbell Shrug', group: 'Neck', equipment: 'Dumbbells', load: 'db', targets: { Neck: 0.5, 'Upper back': 0.5 },
    cue: 'Straight up towards the ears, hold 1 s, slow down. No rolling.' },
  // ---------- Arms ----------
  { name: 'Incline Dumbbell Curl (60°)', group: 'Biceps', equipment: 'Dumbbells, bench 60°', load: 'db', targets: { Arms: 1 },
    cue: 'Back on the bench at 60°, arms hanging. Curl without moving the elbows forward. 3 s down.',
    shoulder: '60° (not 40°) keeps the stretch on the front of the shoulder moderate.' },
  { name: 'Hammer Curl', group: 'Biceps', equipment: 'Dumbbells', load: 'db', targets: { Arms: 1 },
    cue: 'Palms facing each other, elbows pinned to the sides, alternate arms.' },
  { name: 'Lying Dumbbell Triceps Extension', group: 'Triceps', equipment: 'Dumbbells, bench', load: 'db', targets: { Arms: 1 },
    cue: 'On the flat bench, neutral grip, upper arms angled slightly back towards the head. Lower beside the ears, extend.' },
  { name: 'Band Triceps Pushdown', group: 'Triceps', equipment: 'Band on pull-up bar', load: 'band', targets: { Arms: 1 },
    cue: 'Band over the pull-up bar, elbows pinned to the sides, push down to full lockout, 2 s up.' },
  { name: 'Close-Grip Push-Up on Handles', group: 'Triceps', equipment: 'Push-up handles', load: 'bw', targets: { Arms: 1, Pecs: 0.5 }, pattern: 'push',
    cue: 'Handles directly under the shoulders, elbows brush the ribs on the way down.' },
  // ---------- Lats ----------
  { name: 'Pull-Up (Band-Assisted if Needed)', group: 'Back', equipment: 'Pull-up bar, band', load: 'bw', targets: { Lats: 1, Arms: 0.5 }, pattern: 'pull',
    cue: 'Use parallel handles if your bar has them. Start from a dead hang with shoulders pulled down, chest to the bar. Can\'t do 5? Loop a band under the knees or do 4 s negatives.',
    shoulder: 'Neutral or shoulder-width grip; avoid very wide grips.' },
  { name: 'One-Arm Dumbbell Row', group: 'Back', equipment: 'Dumbbell, bench', load: 'db', targets: { Lats: 1, Arms: 0.25 }, pattern: 'pull', perSide: true,
    cue: 'Hand and knee on the bench, back flat. Pull the dumbbell towards the hip pocket (not the chest) to target the lats. Stretch at the bottom.' },
  { name: 'Chest-Supported Dumbbell Row (40°)', group: 'Back', equipment: 'Dumbbells, bench 40°', load: 'db', targets: { Lats: 0.5, 'Upper back': 1, Arms: 0.25 }, pattern: 'pull',
    cue: 'Chest on the bench at 40°. Row both dumbbells, squeeze the shoulder blades together for 1 s.' },
  { name: 'Band Straight-Arm Pulldown', group: 'Back', equipment: 'Band on pull-up bar', load: 'band', targets: { Lats: 1 }, pattern: 'pull',
    cue: 'Band over the pull-up bar, arms straight, hinge slightly. Sweep the hands down to the thighs, feel the lats, slow return.' },
  { name: 'Barbell Bent-Over Row', group: 'Back', equipment: 'Barbell', load: 'bar', targets: { Lats: 0.75, 'Upper back': 0.75, Arms: 0.25 }, pattern: 'pull',
    cue: 'Hinge to ~45°, bar hangs from straight arms. Pull to the lower ribs. Stop the hinge where your hamstrings allow a flat back.' },
  // ---------- Abs ----------
  { name: 'Ab Slider Rollout', group: 'Core', equipment: 'Ab slider (FLYBIRD)', load: 'bw', targets: { Abs: 1 },
    cue: 'Ribs down, glutes squeezed, roll out only as far as you can keep the lower back from sagging. Pull back with the abs, not the hips.' },
  { name: 'Lying Leg Raise', group: 'Core', equipment: 'Mat (+ ankle weights)', load: 'ankle', targets: { Abs: 1 },
    cue: 'Hands under the hips, lower back pressed into the mat. Lower the legs only as far as the back stays down. Ankle weights once 15 is easy.' },
  { name: 'Dead Bug', group: 'Core', equipment: 'Mat', load: 'bw', targets: { Abs: 1 },
    cue: 'Opposite arm and leg extend slowly while the lower back stays glued to the floor. Exhale fully on each rep.' },
  { name: 'Pallof Press', group: 'Core', equipment: 'Resistance band', load: 'band', targets: { Abs: 1 }, perSide: true,
    cue: 'Band anchored at chest height to the side. Press the hands straight out and resist the rotation, 2 s hold.' },
];

export const EX = (name: string) => {
  const e = LIBRARY.find((x) => x.name === name);
  if (!e) throw new Error(`Unknown plan exercise ${name}`);
  return e;
};

// ---------- Plans ----------

export interface PlanItem { name: string; sets: number; reps: string; rest: number; note?: string }
export interface PlanDay { id: string; name: string; focus: string; minutes: number; warmup: string[]; items: PlanItem[] }
export interface Plan { id: string; name: string; short: string; perWeek: number; level: string; summary: string; schedule: string; days: PlanDay[]; recommended?: boolean }

const LOWER_WARMUP = [
  '3 min easy movement (marching, jumping jacks)',
  'Glute bridge ×15, hold the last one 10 s',
  'Kettlebell goblet squat (5 kg) ×10, pause at the bottom',
  'Leg swings front/back + side ×10 each leg',
  'First exercise: 1–2 lighter ramp-up sets',
];
const UPPER_WARMUP = [
  'Band pull-apart ×15',
  'Band face pull ×15',
  'Band external rotation ×12 each arm (elbow at the side)',
  'Scapular push-up ×10',
  'Wall slide ×10, slow',
  'First press: 1–2 lighter ramp-up sets',
];
const FULL_WARMUP = [
  '3 min easy movement',
  'Glute bridge ×15',
  'Kettlebell goblet squat (5 kg) ×10',
  'Band pull-apart ×15 and face pull ×15',
  'Scapular push-up ×10',
];

const i = (name: string, sets: number, reps: string, rest: number, note?: string): PlanItem => ({ name, sets, reps, rest, note });

export const PLANS: Plan[] = [
  {
    id: 'fb3', name: 'Full Body 3× per week', short: 'Full Body', perWeek: 3, level: 'Beginner–intermediate · ~60 min',
    summary: 'Every muscle group twice to three times per week with fewer sets per session. Best if you can only train 3 days or are coming back from a break.',
    schedule: 'Mon · Wed · Fri (A, B, C)',
    days: [
      { id: 'A', name: 'Full Body A', focus: 'Hip thrust · split squat · incline press', minutes: 60, warmup: FULL_WARMUP, items: [
        i('Barbell Hip Thrust', 4, '10–20', 120),
        i('Bulgarian Split Squat – Quad Focus', 3, '8–15', 90),
        i('Incline Dumbbell Press (20°)', 3, '8–15', 90),
        i('One-Arm Dumbbell Row', 3, '10–15', 75),
        i('Band Face Pull', 2, '15–20', 45),
        i('Lateral Raise (Kettlebell, One Arm)', 2, '12–20', 45),
        i('Lying Neck Flexion', 3, '15–25', 45),
        i('Ab Slider Rollout', 3, '6–15', 60),
      ] },
      { id: 'B', name: 'Full Body B', focus: 'Goblet squat · RDL · push-ups · pull-ups', minutes: 60, warmup: FULL_WARMUP, items: [
        i('Heel-Elevated Goblet Squat', 4, '12–20', 90),
        i('Barbell Romanian Deadlift', 3, '8–12', 120),
        i('Push-Up on Handles', 3, '8–20', 90),
        i('Dumbbell Fly (Short Range)', 2, '12–15', 60),
        i('Pull-Up (Band-Assisted if Needed)', 3, '5–12', 120),
        i('Half-Kneeling One-Arm Dumbbell Press', 2, '8–12', 75),
        i('Incline Dumbbell Curl (60°)', 2, '10–15', 60),
        i('Band Pull-Apart', 2, '15–25', 45),
        i('Lying Neck Extension', 3, '15–25', 45),
        i('Lying Leg Raise', 2, '10–15', 45),
      ] },
      { id: 'C', name: 'Full Body C', focus: 'B-stance thrust · step-up · flat press · rows', minutes: 60, warmup: FULL_WARMUP, items: [
        i('B-Stance Hip Thrust (Barbell)', 3, '10–15', 90),
        i('Dumbbell Step-Up', 3, '10–15', 75),
        i('Sissy Squat (Wall-Assisted)', 2, '8–15', 60),
        i('Banded Hip Abduction', 2, '20–30', 45),
        i('Flat Dumbbell Press (Neutral Grip)', 3, '10–15', 90),
        i('Chest-Supported Dumbbell Row (40°)', 3, '10–15', 75),
        i('Band Face Pull', 2, '15–20', 45),
        i('Lateral Raise (Kettlebell, One Arm)', 2, '12–20', 45),
        i('Neck Isometrics (4 Directions)', 3, '1', 45, '15–20 s per direction'),
        i('Ab Slider Rollout', 2, '6–15', 60),
      ] },
    ],
  },
  {
    id: 'ul4', name: 'Upper / Lower 4× per week', short: 'Upper/Lower', perWeek: 4, level: 'Intermediate · ~60–70 min', recommended: true,
    summary: 'The best fit for your goals: two lower days that hammer glutes and quads, two upper days with more pulling than pressing to protect your shoulders.',
    schedule: 'Mon Lower A · Tue Upper A · Thu Lower B · Fri Upper B',
    days: [
      { id: 'LA', name: 'Lower A – Glutes', focus: 'Hip thrust · glute split squat · RDL', minutes: 65, warmup: LOWER_WARMUP, items: [
        i('Barbell Hip Thrust', 4, '8–15', 120, 'Above 15 reps on all sets: switch to B-stance'),
        i('Bulgarian Split Squat – Glute Focus', 3, '8–12', 90),
        i('Heel-Elevated Goblet Squat', 2, '12–20', 75),
        i('Barbell Romanian Deadlift', 3, '8–12', 120),
        i('Banded Hip Abduction', 3, '15–30', 45),
        i('Neck Isometrics (4 Directions)', 2, '1', 45, '15–20 s per direction'),
        i('Ab Slider Rollout', 3, '6–15', 60),
      ] },
      { id: 'UA', name: 'Upper A – Chest & Lats', focus: 'Incline press · rows · pull-ups', minutes: 65, warmup: UPPER_WARMUP, items: [
        i('Incline Dumbbell Press (20°)', 4, '8–15', 90),
        i('One-Arm Dumbbell Row', 4, '8–12', 75),
        i('Half-Kneeling One-Arm Dumbbell Press', 3, '8–12', 75),
        i('Pull-Up (Band-Assisted if Needed)', 3, '5–12', 120),
        i('Dumbbell Fly (Short Range)', 2, '12–15', 60),
        i('Lateral Raise (Kettlebell, One Arm)', 2, '12–20', 45),
        i('Band Face Pull', 3, '15–20', 45),
        i('Lying Neck Flexion', 2, '15–25', 45),
        i('Lying Neck Extension', 2, '15–25', 45),
        i('Incline Dumbbell Curl (60°)', 2, '10–15', 60),
      ] },
      { id: 'LB', name: 'Lower B – Quads', focus: 'Goblet squat · quad split squat · single-leg thrust', minutes: 60, warmup: LOWER_WARMUP, items: [
        i('Heel-Elevated Goblet Squat', 4, '10–20', 90),
        i('Bulgarian Split Squat – Quad Focus', 4, '8–15', 90),
        i('Single-Leg Hip Thrust', 3, '10–20', 75),
        i('Sissy Squat (Wall-Assisted)', 3, '8–15', 60),
        i('Banded Lying Leg Curl', 2, '12–20', 60),
        i('Lying Leg Raise', 3, '10–15', 45),
      ] },
      { id: 'UB', name: 'Upper B – Shoulders & Arms', focus: 'Push-ups · flat press · rows · laterals', minutes: 65, warmup: UPPER_WARMUP, items: [
        i('Push-Up on Handles', 3, '8–20', 90),
        i('Flat Dumbbell Press (Neutral Grip)', 3, '10–15', 90),
        i('Chest-Supported Dumbbell Row (40°)', 4, '10–15', 75),
        i('Band Straight-Arm Pulldown', 3, '12–20', 45),
        i('Lateral Raise (Kettlebell, One Arm)', 2, '12–20', 45),
        i('Prone Y-Raise (40° Incline)', 2, '10–15', 45),
        i('Dumbbell Shrug', 2, '12–15', 60),
        i('Neck Isometrics (4 Directions)', 2, '1', 45, '15–20 s per direction'),
        i('Band Triceps Pushdown', 2, '15–20', 45),
      ] },
    ],
  },
  {
    id: 'gq5', name: 'Glute & Quad Priority 5× per week', short: 'Glute Priority', perWeek: 5, level: 'Intermediate–advanced · ~50–65 min',
    summary: 'Upper/Lower plus a fifth day for extra glute, arm and neck work. Most volume for your top priorities. Only worth it if you recover well and sleep 7+ hours.',
    schedule: 'Mon Lower A · Tue Upper A · Wed Glutes & Arms · Fri Lower B · Sat Upper B',
    days: [] as PlanDay[],
  },
];

// The 5-day plan reuses the 4 Upper/Lower days and adds a pump day.
{
  const ul = PLANS[1].days;
  PLANS[2].days = [
    ul[0], ul[1],
    { id: 'GA', name: 'Glutes, Arms & Neck', focus: 'B-stance thrust · step-ups · arms', minutes: 50, warmup: LOWER_WARMUP, items: [
      i('B-Stance Hip Thrust (Barbell)', 3, '10–15', 90),
      i('Dumbbell Step-Up', 3, '10–15', 75),
      i('Glute Kickback (Ankle Weight)', 2, '15–25', 45),
      i('Frog Pump', 2, '20–30', 45),
      i('Push-Up on Handles', 3, '8–20', 75),
      i('Band Face Pull', 3, '15–20', 45),
      i('Hammer Curl', 2, '10–15', 60),
      i('Lying Neck Flexion', 2, '15–25', 45),
      i('Lying Neck Extension', 2, '15–25', 45),
      i('Pallof Press', 2, '10–12', 45),
    ] },
    ul[2], ul[3],
  ];
}

// ---------- Analysis ----------

/** Weekly hard sets per muscle (primary = 1 per set, secondary = fraction). */
export function weeklyVolume(plan: Plan) {
  const v: Record<Muscle, number> = Object.fromEntries(PRIORITY.map((m) => [m, 0])) as Record<Muscle, number>;
  let push = 0, pull = 0;
  for (const day of plan.days) for (const it of day.items) {
    const ex = EX(it.name);
    for (const [m, w] of Object.entries(ex.targets)) v[m as Muscle] += it.sets * (w ?? 0);
    if (ex.pattern === 'push') push += it.sets;
    if (ex.pattern === 'pull') pull += it.sets;
  }
  return { volume: v, push, pull };
}

// ---------- Plate setup ----------

export const PLATES = '1×10, 1×5, 2×2.5, 4×2, 2×1.25, 8×1 kg (38.5 kg)';
export const SETUP = {
  barPlates: 22.5,
  barText: 'Side A: 10 + 1.25 · Side B: 5 + 2.5 + 2.5 + 1.25 (both sides 11.25 kg)',
  dbPlates: 8,
  dbText: 'Each end: 2 + 1 + 1 (+8 kg per dumbbell)',
};

export interface Gear { barKg: number; handleKg: number }
export const DEFAULT_GEAR: Gear = { barKg: 10, handleKg: 2 };

/** Default weight to prefill when a plan workout starts. */
export function defaultLoad(load: Load, gear: Gear) {
  switch (load) {
    case 'bar': return gear.barKg + SETUP.barPlates;
    case 'db': return gear.handleKg + SETUP.dbPlates;
    case 'kb': return 5;
    default: return 0;
  }
}

export const PRINCIPLES: { title: string; text: string }[] = [
  { title: 'One plate setup, no restacking', text: `Load the barbell and both dumbbells once and leave them. Barbell: ${SETUP.barText}. Dumbbells: ${SETUP.dbText}. This uses all your plates. Lighter work uses the 5 kg kettlebell, bands and ankle weights.` },
  { title: 'Progress without more weight', text: 'Every exercise has a rep range. Train each set to 1–3 reps short of failure. When you hit the top of the range on all sets, make it harder: add reps, slow the lowering to 3–4 s, add a 2 s pause, or switch to the one-leg/one-arm version. Muscle grows well anywhere from about 6 to 30 reps when you train close to failure.' },
  { title: 'Shoulders: pull at least as much as you push', text: 'Every plan has more pulling sets than pressing sets (see the balance on each plan). Do the shoulder warm-up before every upper session. Use neutral grips and stop presses when the upper arms are level with the torso. Pain that sharpens or lingers into the next day means skip that exercise and see a physiotherapist.' },
  { title: 'Tight hamstrings', text: 'Romanian deadlifts are trained only as deep as your back stays flat. That depth will grow. Pair the plan with the Hamstring Release routine in the Yoga tab 2–3× per week.' },
  { title: 'When the fixed loads get too easy', text: 'Your plates will eventually limit hip thrusts and RDLs. The single most useful purchase: 2×10 kg or 4×5 kg plates for the barbell.' },
];
