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
  /** "Position || Movement": how to set up, then how to move. */
  cue: string;
  shoulder?: string;
  perSide?: boolean;
}

export const LIBRARY: PlanExercise[] = [
  // ---------- Glutes ----------
  { name: 'Barbell Hip Thrust', group: 'Glutes', equipment: 'Barbell, bench', load: 'bar', targets: { Glutes: 1, Hamstrings: 0.25 },
    cue: 'Sit on the floor with your upper back (just below the shoulder blades) against the long side of the flat bench. Roll the bar, padded with the folded yoga mat, over your hips. Feet flat and hip-width apart, about a foot in front of your bum. || Tuck your chin and ribs, then drive through your heels and push your hips up until your body is straight from shoulders to knees and your shins are vertical. Squeeze your glutes for 1 s, then lower in 2 s until your bum almost touches the floor.' },
  { name: 'B-Stance Hip Thrust (Barbell)', group: 'Glutes', equipment: 'Barbell, bench', load: 'bar', targets: { Glutes: 1 }, perSide: true,
    cue: 'Same setup as the hip thrust, but move the non-working foot one step forward so only its heel touches the floor, toes up (like a kickstand). || Push up mainly through the heel of the working leg (it carries about 80% of the load) until your hips are fully straight. Squeeze 1 s, lower slowly. Finish all reps, then switch sides.' },
  { name: 'Single-Leg Hip Thrust', group: 'Glutes', equipment: 'Bench (+ dumbbell on hip)', load: 'db', targets: { Glutes: 1 }, perSide: true,
    cue: 'Upper back against the long side of the flat bench, one foot flat on the floor under your knee, the other knee pulled towards your chest. Once bodyweight is easy, hold a dumbbell on the working hip. || Drive through the heel of the planted foot and lift your hips until your body is straight. Pause 1 s, lower slowly. Keep both hips level: don\'t let one side drop.' },
  { name: 'Frog Pump', group: 'Glutes', equipment: 'Mat (+ dumbbell)', load: 'db', targets: { Glutes: 1 },
    cue: 'Lie on your back on the mat, soles of your feet pressed together, knees falling out to the sides, heels close to your bum. Rest a dumbbell on your hips and hold it with both hands. || Push your hips up with short, fast, hard glute squeezes, lowering only a little between reps. Use it as a burner at the end of the session.' },
  { name: 'Banded Hip Abduction', group: 'Glutes', equipment: 'Resistance band', load: 'band', targets: { Glutes: 1 },
    cue: 'Sit on the edge of the bench with the band looped just above your knees, feet flat and hip-width apart. Lean your torso slightly forward. || Push both knees out against the band as far as you can, hold 1 s, then let them come back slowly while resisting the pull.' },
  { name: 'Glute Kickback (Ankle Weight)', group: 'Glutes', equipment: 'Ankle weights, mat', load: 'ankle', targets: { Glutes: 1 }, perSide: true,
    cue: 'Kneel on all fours on the mat, hands under your shoulders and knees under your hips, with the 1 kg ankle weight on the working leg. || Keep that knee bent at 90° and press the sole of the foot up towards the ceiling until the thigh is level with your back, without arching your lower back. Lower slowly. Finish all reps, then switch legs.' },
  // ---------- Quads ----------
  { name: 'Bulgarian Split Squat – Quad Focus', group: 'Quads', equipment: 'Dumbbells, bench', load: 'db', targets: { Quads: 1, Glutes: 0.5 }, perSide: true,
    cue: 'Stand about one big step in front of the flat bench, facing away from it, with a dumbbell in each hand. Put the top of your rear foot on the bench. Short stance, torso upright. || Lower straight down in 2–3 s, letting the front knee travel forward over your toes, until the rear knee nearly touches the floor. Drive back up through the whole front foot.' },
  { name: 'Bulgarian Split Squat – Glute Focus', group: 'Glutes', equipment: 'Dumbbells, bench', load: 'db', targets: { Glutes: 1, Quads: 0.5 }, perSide: true,
    cue: 'Same as the quad version, but stand a bit further from the bench (longer stance) and lean your torso forward about 30°. || Sink deep into the front hip while the front shin stays close to vertical, then push up through the front heel. You should feel a stretch in the glute at the bottom.' },
  { name: 'Heel-Elevated Goblet Squat', group: 'Quads', equipment: 'Dumbbell, yoga block', load: 'db', targets: { Quads: 1, Glutes: 0.25 },
    cue: 'Stand with both heels on the yoga block, feet shoulder-width apart. Hold one dumbbell vertically against your chest, both hands cupping the top end. || Sit straight down between your heels in 3 s, knees travelling far forward, torso tall. Go as deep as you can with a straight back, then stand up.' },
  { name: 'Dumbbell Step-Up', group: 'Quads', equipment: 'Dumbbells, bench', load: 'db', targets: { Quads: 0.75, Glutes: 0.75 }, perSide: true,
    cue: 'Stand facing the flat bench with a dumbbell in each hand at your sides. Put the whole working foot on the bench. || Push through the foot on the bench to stand up on it, without pushing off with the foot on the floor. Lower back down slowly with the same leg. Finish all reps, then switch.' },
  { name: 'Sissy Squat (Wall-Assisted)', group: 'Quads', equipment: 'Bodyweight, wall', load: 'bw', targets: { Quads: 1 },
    cue: 'Stand next to a wall or door frame, holding on with one hand, feet hip-width apart. Rise up onto the balls of your feet. || Lean your torso back while your knees travel forward and down, keeping a straight line from knees to shoulders. Go only as deep as your knees feel good, then push back up.' },
  // ---------- Hamstrings (supporting; tight hamstrings) ----------
  { name: 'Barbell Romanian Deadlift', group: 'Hamstrings', equipment: 'Barbell', load: 'bar', targets: { Hamstrings: 1, Glutes: 0.5 },
    cue: 'Stand tall, feet hip-width apart, holding the barbell in front of your thighs with an overhand grip, hands just outside your legs. Knees slightly bent. || Push your hips back so the bar slides down your thighs while your back stays flat. Stop where your back would start to round (with tight hamstrings that\'s around mid-shin, and that\'s fine), then drive your hips forward to stand up. The loaded stretch improves flexibility over time.' },
  { name: 'Single-Leg Dumbbell RDL', group: 'Hamstrings', equipment: 'Dumbbell', load: 'db', targets: { Hamstrings: 0.75, Glutes: 0.75 }, perSide: true,
    cue: 'Stand on the working leg with the dumbbell in the opposite hand. Touch a wall with the fingertips of your free hand for balance if needed. || Hinge forward at the hip while the free leg extends behind you, hips square to the floor, until you feel the stretch in the hamstring. Return to standing by squeezing the glute of the standing leg.' },
  { name: 'Banded Lying Leg Curl', group: 'Hamstrings', equipment: 'Resistance band, bench', load: 'band', targets: { Hamstrings: 1 },
    cue: 'Lie face down on the flat bench with your knees just past the end. Anchor the band low behind you (around a bench leg) and loop it around both ankles. || Curl your heels towards your bum against the band, squeeze 1 s, then let your legs straighten in 2 s.' },
  // ---------- Pecs ----------
  { name: 'Incline Dumbbell Press (20°)', group: 'Chest', equipment: 'Dumbbells, bench 20°', load: 'db', targets: { Pecs: 1, Shoulders: 0.25, Arms: 0.25 }, pattern: 'push',
    cue: 'Set the bench to 20°. Sit with the dumbbells on your thighs, lie back and bring them to chest level. Pull your shoulder blades back and down into the bench, feet flat on the floor. || Press up with your palms turned slightly in (about 45°) and elbows about 45° from your body until your arms are straight. Lower in 3 s to the sides of your chest.',
    shoulder: 'Stop when the upper arms are level with your torso. Going deeper is where sensitive shoulders get irritated.' },
  { name: 'Flat Dumbbell Press (Neutral Grip)', group: 'Chest', equipment: 'Dumbbells, bench', load: 'db', targets: { Pecs: 1, Arms: 0.25 }, pattern: 'push',
    cue: 'Lie on the flat bench, feet flat, shoulder blades pulled back and down, dumbbells at chest level with your palms facing each other. || Press up until the dumbbells lightly touch above your chest. Lower in 2 s with your elbows tucked about 30–45° from your body.',
    shoulder: 'Neutral grip is the most shoulder-friendly press. Same depth rule: upper arms level with the torso.' },
  { name: 'Push-Up on Handles', group: 'Chest', equipment: 'Push-up handles', load: 'bw', targets: { Pecs: 1, Arms: 0.25, Shoulders: 0.25 }, pattern: 'push',
    cue: 'Put the handles on the floor a bit wider than your shoulders and get into a plank on them: body in one straight line, glutes squeezed. || Lower in 2 s until your chest is level with the handles, then push back up. Too easy: feet on the bench. Too hard: knees on the floor.',
    shoulder: 'Handles let you keep wrists neutral. Don\'t sink deeper than pain-free.' },
  { name: 'Dumbbell Fly (Short Range)', group: 'Chest', equipment: 'Dumbbells, bench', load: 'db', targets: { Pecs: 1 }, pattern: 'push',
    cue: 'Lie on the flat bench with the dumbbells above your chest, palms facing each other, elbows slightly bent. || Open your arms in a wide arc, keeping the elbow bend fixed, until your elbows reach bench height (no lower). Bring them back up along the same arc, squeezing your chest.',
    shoulder: 'Never let the dumbbells drop below the bench. The stretched position stresses the front of the shoulder.' },
  // ---------- Shoulders ----------
  { name: 'Half-Kneeling One-Arm Dumbbell Press', group: 'Shoulders', equipment: 'Dumbbell', load: 'db', targets: { Shoulders: 1, Arms: 0.25 }, pattern: 'push', perSide: true,
    cue: 'Kneel on one knee on the mat with the other foot flat in front. Hold the dumbbell at shoulder height on the same side as the knee that\'s down, palm facing in. || Press up and slightly forward until your arm is straight, ribs down and glutes tight, then lower slowly. Finish all reps, then switch sides.',
    shoulder: 'Shoulder-friendlier than two-arm overhead pressing. If it pinches, skip it: lateral raises cover the delts.' },
  { name: 'Lateral Raise (Kettlebell, One Arm)', group: 'Shoulders', equipment: 'Kettlebell 5 kg', load: 'kb', targets: { Shoulders: 1 }, perSide: true,
    cue: 'Stand next to a wall, hold it with your free hand and lean slightly away from it. The kettlebell hangs at your side in the working hand. || Raise your arm out to shoulder height, about 30° in front of your body (the angle your shoulder naturally moves in). Lower in 2 s.',
    shoulder: 'Thumb neutral or slightly up, never "pouring a jug". Stop at shoulder height.' },
  { name: 'Band Lateral Raise', group: 'Shoulders', equipment: 'Resistance band', load: 'band', targets: { Shoulders: 1 },
    cue: 'Stand on the middle of the band, feet hip-width apart, holding one end in each hand at your sides. || Raise both arms out to shoulder height, about 30° in front of your body, keeping tension on the band. Lower slowly.' },
  { name: 'Band Face Pull', group: 'Upper back', equipment: 'Band on pull-up bar', load: 'band', targets: { Shoulders: 0.5, 'Upper back': 1 }, pattern: 'pull',
    cue: 'Loop the band around the pull-up bar so the ends hang at face height. Hold one end in each hand, palms down, and step back until the band is tight. || Pull towards your forehead with your elbows high and wide, and finish by rotating your hands back (like a double-biceps pose). Hold 1 s, return slowly.',
    shoulder: 'Your best shoulder-health exercise. Rear delts and rotator cuff balance out all the pressing.' },
  { name: 'Band Pull-Apart', group: 'Upper back', equipment: 'Resistance band', load: 'band', targets: { Shoulders: 0.25, 'Upper back': 1 }, pattern: 'pull',
    cue: 'Stand tall with your arms straight in front of you at chest height, holding the band with your hands shoulder-width apart. || Pull the band apart until it touches your chest, squeezing your shoulder blades together. Return slowly.' },
  { name: 'Prone Y-Raise (40° Incline)', group: 'Shoulders', equipment: 'Bench 40°, ankle weights', load: 'ankle', targets: { Shoulders: 0.5, 'Upper back': 0.75 }, pattern: 'pull',
    cue: 'Set the bench to 40°. Lie chest-down on it with your feet on the floor, 1 kg ankle weights strapped around your wrists, arms hanging down. || Raise both arms forward and up into a Y, thumbs pointing up, pulling your shoulder blades down and back. Hold 1 s at the top, lower slowly.',
    shoulder: 'Strengthens the lower traps, which stabilise the shoulder blade. Keep it light and strict.' },
  // ---------- Neck ----------
  { name: 'Lying Neck Flexion', group: 'Neck', equipment: 'Bench, towel (+ ankle weight)', load: 'ankle', targets: { Neck: 1 },
    cue: 'Lie on your back on the flat bench with your head and neck past the end. Later: a 1 kg ankle weight on a folded towel on your forehead, held in place with your hands. || Tuck your chin, then curl your head up towards your chest. Lower slowly back to neutral.',
    shoulder: 'Neck work: always slow, no jerking, small loads. Stop immediately with dizziness, tingling or sharp pain.' },
  { name: 'Lying Neck Extension', group: 'Neck', equipment: 'Bench, towel (+ ankle weight)', load: 'ankle', targets: { Neck: 1 },
    cue: 'Lie face down on the flat bench with your head past the end. Later: an ankle weight on a folded towel on the back of your head, held in place with your hands. || Let your chin drop towards your chest, then lift your head back up until it\'s in line with your body, no further. Lower slowly.' },
  { name: 'Neck Isometrics (4 Directions)', group: 'Neck', equipment: 'Hand or band', load: 'bw', targets: { Neck: 1 },
    cue: 'Sit or stand tall and place your palm (or a band) against your forehead. || Push your head into your hand at about 50–70% effort for 15–20 s without letting your head move. Repeat pushing backwards, left and right. One rep = all four directions.' },
  { name: 'Dumbbell Shrug', group: 'Neck', equipment: 'Dumbbells', load: 'db', targets: { Neck: 0.5, 'Upper back': 0.5 },
    cue: 'Stand tall with a dumbbell in each hand at your sides, arms straight. || Lift your shoulders straight up towards your ears, hold 1 s, lower slowly. No rolling.' },
  // ---------- Arms ----------
  { name: 'Incline Dumbbell Curl (60°)', group: 'Biceps', equipment: 'Dumbbells, bench 60°', load: 'db', targets: { Arms: 1 },
    cue: 'Set the bench to 60°. Sit back against it with a dumbbell in each hand, arms hanging straight down, palms facing forward. || Curl both dumbbells up without moving your elbows forward. Lower in 3 s to a full stretch.',
    shoulder: '60° (not 40°) keeps the stretch on the front of the shoulder moderate.' },
  { name: 'Hammer Curl', group: 'Biceps', equipment: 'Dumbbells', load: 'db', targets: { Arms: 1 },
    cue: 'Stand tall with a dumbbell in each hand at your sides, palms facing your body, elbows pinned to your sides. || Curl one dumbbell up with the palm still facing in, lower it slowly, then do the other arm.' },
  { name: 'Lying Dumbbell Triceps Extension', group: 'Triceps', equipment: 'Dumbbells, bench', load: 'db', targets: { Arms: 1 },
    cue: 'Lie on the flat bench with the dumbbells held above your chest, palms facing each other, upper arms angled slightly back towards your head. || Bend only at the elbows to lower the dumbbells beside your ears, then straighten your arms. Your upper arms stay still.' },
  { name: 'Band Triceps Pushdown', group: 'Triceps', equipment: 'Band on pull-up bar', load: 'band', targets: { Arms: 1 },
    cue: 'Loop the band over the pull-up bar and hold the ends at chest height, elbows pinned to your sides. || Push down until your arms are fully straight, then let them come back up in 2 s. Elbows stay at your sides.' },
  { name: 'Close-Grip Push-Up on Handles', group: 'Triceps', equipment: 'Push-up handles', load: 'bw', targets: { Arms: 1, Pecs: 0.5 }, pattern: 'push',
    cue: 'Put the handles directly under your shoulders and get into a plank on them, body in one straight line. || Lower until your chest is level with the handles, elbows brushing your ribs, then push back up.' },
  // ---------- Lats ----------
  { name: 'Pull-Up (Band-Assisted if Needed)', group: 'Back', equipment: 'Pull-up bar, band', load: 'bw', targets: { Lats: 1, Arms: 0.5 }, pattern: 'pull',
    cue: 'Hang from the bar with straight arms (on parallel handles if your bar has them), then pull your shoulders down away from your ears. Loop a band under your knees if you need help. || Pull until your chest nears the bar, then lower under control to a full hang. Can\'t do 5? Do 4 s lowering-only reps instead.',
    shoulder: 'Neutral or shoulder-width grip; avoid very wide grips.' },
  { name: 'One-Arm Dumbbell Row', group: 'Back', equipment: 'Dumbbell, bench', load: 'db', targets: { Lats: 1, Arms: 0.25 }, pattern: 'pull', perSide: true,
    cue: 'Put the knee and hand of one side on the flat bench, the other foot on the floor, back flat. The dumbbell hangs from your free hand. || Pull the dumbbell towards your hip pocket (not your chest) to target the lats, then lower to a full stretch. Finish all reps, then switch sides.' },
  { name: 'Chest-Supported Dumbbell Row (40°)', group: 'Back', equipment: 'Dumbbells, bench 40°', load: 'db', targets: { Lats: 0.5, 'Upper back': 1, Arms: 0.25 }, pattern: 'pull',
    cue: 'Set the bench to 40°. Lie chest-down on it with your feet on the floor, a dumbbell in each hand hanging straight down. || Row both dumbbells up towards your lower ribs, squeeze your shoulder blades together for 1 s, lower slowly.' },
  { name: 'Band Straight-Arm Pulldown', group: 'Back', equipment: 'Band on pull-up bar', load: 'band', targets: { Lats: 1 }, pattern: 'pull',
    cue: 'Loop the band over the pull-up bar, hold the ends with straight arms in front of you at head height, step back and hinge slightly at the hips. || Keeping your arms straight, sweep your hands down to your thighs; you should feel your lats. Return slowly.' },
  { name: 'Barbell Bent-Over Row', group: 'Back', equipment: 'Barbell', load: 'bar', targets: { Lats: 0.75, 'Upper back': 0.75, Arms: 0.25 }, pattern: 'pull',
    cue: 'Hold the barbell with an overhand grip slightly wider than your shoulders. Hinge forward to about 45° with a flat back and soft knees, the bar hanging from straight arms. || Pull the bar to your lower ribs, squeeze 1 s, lower slowly. Only hinge as far as your hamstrings allow a flat back.' },
  // ---------- Abs ----------
  { name: 'Ab Slider Rollout', group: 'Core', equipment: 'Ab slider (FLYBIRD)', load: 'bw', targets: { Abs: 1 },
    cue: 'Kneel on the mat with your hands on the slider under your shoulders. Pull your ribs down and squeeze your glutes. || Roll forward slowly, only as far as you can without your lower back sagging, then pull back with your abs, not your hips.' },
  { name: 'Lying Leg Raise', group: 'Core', equipment: 'Mat (+ ankle weights)', load: 'ankle', targets: { Abs: 1 },
    cue: 'Lie on your back on the mat with your hands under your hips, legs pointing straight up and lower back pressed into the floor. || Lower your legs slowly, only as far as your lower back stays down, then lift them back up. Add ankle weights once 15 reps is easy.' },
  { name: 'Dead Bug', group: 'Core', equipment: 'Mat', load: 'bw', targets: { Abs: 1 },
    cue: 'Lie on your back with your arms pointing at the ceiling, hips and knees bent at 90°, lower back pressed into the floor. || Slowly stretch one arm overhead and the opposite leg out while exhaling fully, without your lower back lifting. Come back and switch sides.' },
  { name: 'Pallof Press', group: 'Core', equipment: 'Resistance band', load: 'band', targets: { Abs: 1 }, perSide: true,
    cue: 'Anchor the band at chest height to your side. Stand side-on to it, feet shoulder-width apart, holding the band with both hands against your chest. || Press your hands straight out in front, resist the band pulling you round, hold 2 s and bring them back. Finish all reps, then face the other way.' },
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
        i('Pull-Up (Band-Assisted if Needed)', 3, '5–12', 120),
        i('Dumbbell Fly (Short Range)', 2, '12–15', 60),
        i('Band Pull-Apart', 2, '15–25', 45),
        i('Half-Kneeling One-Arm Dumbbell Press', 2, '8–12', 75),
        i('Band Face Pull', 2, '15–20', 45),
        i('Incline Dumbbell Curl (60°)', 2, '10–15', 60),
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
        i('Band Face Pull', 3, '15–20', 45),
        i('Lateral Raise (Kettlebell, One Arm)', 2, '12–20', 45),
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
        i('Chest-Supported Dumbbell Row (40°)', 4, '10–15', 75),
        i('Flat Dumbbell Press (Neutral Grip)', 3, '10–15', 90),
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

/**
 * Back-rest angle of the adjustable bench for each exercise that uses it (0° = flat, 90° = upright).
 * If your bench has no notch at exactly this angle, use the nearest lower one.
 */
const BENCH: Record<string, number | 'decline'> = {
  'Barbell Hip Thrust': 0, 'B-Stance Hip Thrust (Barbell)': 0, 'Single-Leg Hip Thrust': 0,
  'Bulgarian Split Squat – Quad Focus': 0, 'Bulgarian Split Squat – Glute Focus': 0, 'Dumbbell Step-Up': 0,
  'Banded Lying Leg Curl': 0, 'Incline Dumbbell Press (20°)': 20, 'Flat Dumbbell Press (Neutral Grip)': 0, 'Dumbbell Fly (Short Range)': 0,
  'Prone Y-Raise (40° Incline)': 40, 'Lying Neck Flexion': 0, 'Lying Neck Extension': 0, 'Incline Dumbbell Curl (60°)': 60,
  'Lying Dumbbell Triceps Extension': 0, 'One-Arm Dumbbell Row': 0, 'Chest-Supported Dumbbell Row (40°)': 40,
  // General exercise library
  'Barbell Bench Press': 0, 'Incline Barbell Bench Press': 30, 'Decline Bench Press': 'decline', 'Dumbbell Bench Press': 0,
  'Incline Dumbbell Press': 30, 'Dumbbell Fly': 0, 'Close-Grip Bench Press': 0, 'Seated Dumbbell Shoulder Press': 90,
  'Incline Dumbbell Curl': 60, 'Concentration Curl': 0, 'Skull Crusher': 0, 'Triceps Dip': 0,
  'Bulgarian Split Squat': 0, 'Step-Up': 0,
};

/** Short label for the bench setting, e.g. "Bench 40°" or "Bench flat 0°"; undefined if no bench is used. */
export function benchAngle(name: string): string | undefined {
  const a = BENCH[name];
  if (a === undefined) return undefined;
  if (a === 'decline') return 'Bench decline';
  return a === 0 ? 'Bench flat 0°' : a === 90 ? 'Bench upright 90°' : `Bench ${a}°`;
}

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

/**
 * Shoulder-safety rule: after every pressing exercise, a pulling exercise must come
 * before the next press. Returns the violations (empty = OK).
 */
export function pushPullOrderIssues(plan: Plan): string[] {
  const issues: string[] = [];
  for (const d of plan.days) {
    let pendingPush: string | null = null;
    for (const it of d.items) {
      const pat = EX(it.name).pattern;
      if (pat === 'push') {
        if (pendingPush) issues.push(`${plan.id}/${d.id}: ${pendingPush} → ${it.name} without a pull in between`);
        pendingPush = it.name;
      } else if (pat === 'pull') pendingPush = null;
    }
    if (pendingPush) issues.push(`${plan.id}/${d.id}: ${pendingPush} is the last press with no pull after it`);
  }
  return issues;
}
