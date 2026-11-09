/** Yoga, Pilates and mobility routines. Hold times are in seconds; `sides` steps run once per side. */

export interface Pose { name: string; secs: number; sides?: boolean; cue: string; props?: string }
export interface Routine { id: string; name: string; kind: 'Yoga' | 'Pilates' | 'Mobility' | 'Recovery'; purpose: string; poses: Pose[] }

export const ROUTINES: Routine[] = [
  {
    id: 'hamstrings', name: 'Hamstring Release', kind: 'Yoga',
    purpose: 'Gradually lengthens tight hamstrings and calves. Best after lower-body training or on rest days.',
    poses: [
      { name: 'Cat–Cow', secs: 60, cue: 'On all fours. Inhale, drop the belly and lift the chest; exhale, round the back. Move slowly with the breath.' },
      { name: 'Downward Dog, Pedalling', secs: 60, cue: 'Hips high, knees bent as much as needed to keep a long back. Alternate pressing one heel down at a time.' },
      { name: 'Supine Hamstring Stretch with Band', secs: 45, sides: true, props: 'Resistance band',
        cue: 'Lie on your back, band around one foot, leg up towards the ceiling. Other leg long on the floor. Every 15 s: push the foot into the band for 5 s, relax and ease a little higher.' },
      { name: 'Half Split (Ardha Hanumanasana)', secs: 45, sides: true, props: 'Yoga block',
        cue: 'From a low lunge, shift the hips back over the rear knee, front leg straightens, toes up. Hands on the yoga block. Hinge from the hips with a flat back.' },
      { name: 'Low Lunge (Anjaneyasana)', secs: 45, sides: true, cue: 'Back knee down, front knee over the ankle. Tuck the tailbone and shift forward until the front of the rear hip stretches.' },
      { name: 'Ragdoll Forward Fold', secs: 60, props: 'Yoga block', cue: 'Stand, knees generously bent, belly on thighs, let the head hang. Slowly straighten the legs only as far as the belly stays on the thighs.' },
      { name: 'Supine Figure-4', secs: 45, sides: true, cue: 'On your back, right ankle over the left knee, pull the left thigh towards you. Keep the right foot flexed.' },
      { name: 'Seated Forward Fold, Knees Soft', secs: 60, cue: 'Legs long, knees slightly bent, sit tall then fold from the hips. Reach for the shins, not the toes. Breathe into the back.' },
      { name: 'Legs up the Wall', secs: 120, cue: 'Hips close to the wall, legs up, arms relaxed. Let the hamstrings soften with long exhales.' },
    ],
  },
  {
    id: 'legs-daily', name: 'Daily Leg Mobility', kind: 'Mobility',
    purpose: 'A 10-minute daily routine for ankles, hips and hamstrings. The core of the 4-week leg mobility program.',
    poses: [
      { name: 'Knee-to-Wall Ankle Rocks', secs: 45, sides: true, cue: 'Foot a hand-width from the wall, drive the knee towards the wall without the heel lifting. Rock in and out.' },
      { name: '90/90 Hip Switches', secs: 60, cue: 'Sit with both knees bent 90°, one in front, one to the side. Rotate both knees to the other side without using your hands if you can.' },
      { name: 'Deep Squat Hold', secs: 60, props: 'Yoga block', cue: 'Heels on the yoga block if needed, elbows press the knees out, chest up. Hold the pull-up bar or a door frame for balance.' },
      { name: 'Couch Stretch', secs: 45, sides: true, props: 'Yoga mat', cue: 'Back knee on the folded mat against the wall, shin up the wall, front foot forward. Squeeze the glute of the back leg. Great after quad training.' },
      { name: 'Adductor Rock-Backs', secs: 45, sides: true, cue: 'On all fours, one leg straight out to the side. Rock the hips back towards the heel and forward again.' },
      { name: 'Active Straight-Leg Raise', secs: 30, sides: true, cue: 'On your back, one knee bent. Lift the other leg straight as high as possible using the muscles, lower in 3 s. Builds usable hamstring flexibility.' },
      { name: 'Blackroll: Calves', secs: 45, sides: true, props: 'Blackroll', cue: 'Calf on the roller, other leg crossed on top for more pressure. Roll slowly, pause on tender spots for 10 s.' },
    ],
  },
  {
    id: 'pilates-core', name: 'Pilates Core', kind: 'Pilates',
    purpose: 'Deep core, glute medius and posture work. Complements the ab slider without straining the shoulders.',
    poses: [
      { name: 'Breathing & Imprint', secs: 60, cue: 'On your back, knees bent. Breathe wide into the ribs; on each exhale draw the navel in and gently press the lower back into the mat.' },
      { name: 'The Hundred (Modified)', secs: 60, cue: 'Legs in tabletop, head and shoulders lifted, arms pump by the sides: 5 counts in, 5 counts out. Head down if the neck strains.' },
      { name: 'Single-Leg Stretch', secs: 45, cue: 'Head up, pull one knee in while the other leg extends at 45°, switch with control. Lower back stays down.' },
      { name: 'Dead Bug', secs: 60, cue: 'Arms up, legs in tabletop. Extend the opposite arm and leg slowly, exhale fully, return and switch.' },
      { name: 'Shoulder Bridge with March', secs: 60, cue: 'Bridge up, hips level. Lift one foot a few centimetres, set it down, switch. Hips must not drop.' },
      { name: 'Side-Lying Leg Lift', secs: 45, sides: true, props: 'Ankle weights (optional)', cue: 'Lie on your side, bottom knee bent. Top leg straight, toes forward, lift to hip height and lower slowly. Ankle weight for more challenge.' },
      { name: 'Clamshell with Band', secs: 45, sides: true, props: 'Resistance band', cue: 'Band above the knees, heels together. Open the top knee without rolling the pelvis back.' },
      { name: 'Swimming (Arms Low)', secs: 45, cue: 'Face down, arms by your sides, palms up. Lift chest slightly and flutter the legs. The arms-low version spares your shoulders.' },
      { name: 'Side Plank', secs: 30, sides: true, cue: 'Elbow under the shoulder, knees down or legs straight. Hips high, body in one line.' },
      { name: 'Spine Stretch Forward', secs: 60, cue: 'Sit tall, legs apart, knees soft. Exhale and roll forward vertebra by vertebra, inhale and stack back up.' },
    ],
  },
  {
    id: 'shoulders', name: 'Posture Reset (Rounded Shoulders)', kind: 'Mobility',
    purpose: 'Opens the chest and strengthens the upper-back muscles that pull the shoulders back. Stretching plus strengthening together is what improves rounded-shoulder posture.',
    poses: [
      { name: 'Blackroll: Thoracic Extension', secs: 60, props: 'Blackroll', cue: 'Roller across the upper back, hands support the head. Extend gently over the roller, move it a few centimetres, repeat. Not on the lower back.' },
      { name: 'Open Book', secs: 45, sides: true, cue: 'Lie on your side, knees bent 90°. Open the top arm across to the other side, following it with your eyes. Knees stay together.' },
      { name: 'Doorway Pec Stretch, Low', secs: 45, sides: true, cue: 'Forearm on the door frame, elbow below shoulder height. Step through until the chest stretches. Ribs down, no pain in the front of the shoulder.' },
      { name: 'Doorway Pec Stretch, High', secs: 45, sides: true, cue: 'Elbow slightly above shoulder height to reach the lower chest fibres. Same gentle step through.' },
      { name: 'Chin Tucks', secs: 45, cue: 'Back against the wall or lying down. Draw the chin straight back (double chin), hold 3 s, release. Strengthens the deep neck flexors against forward head posture.' },
      { name: 'Wall Angels', secs: 60, cue: 'Back, head and arms against the wall in a "W". Slide up to a "Y" only as far as the forearms stay on the wall, then pull the elbows down and back.' },
      { name: 'Prone Y-T-W', secs: 60, cue: 'Face down, forehead on a folded towel. Lift the arms in a Y, then a T, then a W, thumbs up, 3 s each. Squeeze the shoulder blades down and back.' },
      { name: 'Band Pull-Aparts', secs: 45, props: 'Resistance band', cue: 'Light band, arms straight at chest height. 3 s apart, 3 s back, shoulders away from the ears.' },
      { name: 'Child\'s Pose Side Reach', secs: 45, sides: true, props: 'Yoga block', cue: 'From child\'s pose, walk both hands to one side to stretch the opposite lat. Hands on the yoga block if overhead feels tight.' },
    ],
  },
  {
    id: 'front-split', name: 'Front Split Progression', kind: 'Yoga',
    purpose: 'Hip flexors of the back leg and hamstrings of the front leg, the two limits of the front split. Uses contract-relax (PNF) and blocks to progress safely.',
    poses: [
      { name: 'Cat–Cow', secs: 45, cue: 'On all fours, move the spine with the breath to warm up.' },
      { name: 'Leg Swings, Front–Back', secs: 40, sides: true, cue: 'Hold the wall, swing one straight leg forward and back, gradually higher. Controlled, not flung.' },
      { name: 'Low Lunge, Hip Flexor', secs: 60, sides: true, cue: 'Back knee on the mat, tuck the tailbone, shift forward until the front of the back hip stretches. Squeeze the back glute.' },
      { name: 'Half Split with Contract-Relax', secs: 60, sides: true, props: 'Yoga blocks', cue: 'Hips over the back knee, front leg straight, hands on blocks. Every 20 s: press the front heel into the floor for 5 s (about 30 % effort), relax, and sink a little deeper.' },
      { name: 'Lizard', secs: 45, sides: true, props: 'Yoga block', cue: 'Front foot outside the hand, back knee down. Hips low; forearms on the block if they reach.' },
      { name: 'Front Split on Blocks', secs: 60, sides: true, props: 'Yoga blocks', cue: 'Slide the front heel forward and the back knee back, hips square. Block under the front thigh or hip to take weight. Stay at a 6–7/10 stretch, breathe.' },
      { name: 'Supine Hamstring with Band', secs: 45, sides: true, props: 'Resistance band', cue: 'On your back, band around the foot, leg straight up. Press the foot into the band 5 s, relax, draw it closer.' },
      { name: 'Supine Figure-4', secs: 45, sides: true, cue: 'Cool down: ankle over the opposite knee, pull the thigh towards you.' },
    ],
  },
  {
    id: 'middle-split', name: 'Middle Split Progression', kind: 'Yoga',
    purpose: 'Adductors and hip rotation for the side (middle) split. Combines passive stretching with active strength in the end range, which makes new range usable.',
    poses: [
      { name: 'Adductor Rock-Backs', secs: 45, sides: true, cue: 'On all fours, one leg straight out to the side. Rock the hips back towards the heel and forward again.' },
      { name: 'Frog Pose', secs: 90, cue: 'Knees wide, shins parallel, ankles in line with the knees. Forearms down, slowly rock the hips back. Pad the knees with the mat.' },
      { name: 'Horse Stance Hold', secs: 45, cue: 'Feet wide, toes slightly out, sink into a wide squat with knees over toes. Active strength in the stretched range.' },
      { name: 'Cossack Squat, Slow', secs: 60, cue: 'Wide stance, shift into one deep side squat while the other leg straightens, toes up. Alternate slowly.' },
      { name: 'Wide-Leg Forward Fold', secs: 60, props: 'Yoga block', cue: 'Feet wide, hinge from the hips with a flat back, hands or head on the block.' },
      { name: 'Pancake with Contract-Relax', secs: 60, cue: 'Seated straddle, knees pointing up, fold forward from the hips. Every 20 s: press the heels down into the floor for 5 s, relax and fold deeper.' },
      { name: 'Straddle up the Wall', secs: 120, cue: 'Lie with the hips against the wall, legs up in a wide V. Let gravity open the legs; relax completely.' },
      { name: 'Butterfly', secs: 60, cue: 'Soles together, hold the feet, sit tall and gently lean forward.' },
    ],
  },
  {
    id: 'blackroll', name: 'Blackroll Recovery', kind: 'Recovery',
    purpose: 'Self-massage after training. Slow rolling, pause on tender spots, never on joints or the lower back.',
    poses: [
      { name: 'Quads', secs: 45, sides: true, props: 'Blackroll', cue: 'Face down, roller under the thigh. Roll from hip to just above the knee.' },
      { name: 'Glutes', secs: 45, sides: true, props: 'Blackroll', cue: 'Sit on the roller, cross one ankle over the other knee, lean into that glute.' },
      { name: 'Hamstrings', secs: 45, sides: true, props: 'Blackroll', cue: 'Roller under the back of the thigh, hands behind you. Turn the leg in and out slightly.' },
      { name: 'Calves', secs: 30, sides: true, props: 'Blackroll', cue: 'Roller under the calf, other leg on top for more pressure.' },
      { name: 'Lats', secs: 45, sides: true, props: 'Blackroll', cue: 'Lie on your side, roller under the armpit area, arm extended. Small movements.' },
      { name: 'Upper Back', secs: 60, props: 'Blackroll', cue: 'Roller across the shoulder blades, hug yourself, roll slowly up and down.' },
    ],
  },
  {
    id: 'wind-down', name: 'Evening Wind-Down', kind: 'Yoga',
    purpose: 'Calms the nervous system before sleep. Breathing, gentle stretches and a short body scan.',
    poses: [
      { name: 'Extended-Exhale Breathing', secs: 120, cue: 'Seated or lying. Breathe in through the nose for 4, out for 6–8. Longer exhales calm the nervous system.' },
      { name: 'Child\'s Pose', secs: 60, props: 'Yoga block', cue: 'Knees wide, big toes together, forehead on the mat or the yoga block. Breathe into the back.' },
      { name: 'Supine Twist', secs: 60, sides: true, cue: 'On your back, drop both knees to one side, arms out. Look the other way if the neck allows.' },
      { name: 'Happy Baby', secs: 60, cue: 'On your back, hold the outsides of the feet (or the band), knees towards the armpits. Rock gently.' },
      { name: 'Reclined Butterfly', secs: 90, props: 'Yoga block', cue: 'Soles together, knees open. Rest the yoga block under each knee if the hips are tight.' },
      { name: 'Legs up the Wall', secs: 120, cue: 'Hips near the wall, legs resting up, eyes closed.' },
      { name: 'Body Scan', secs: 180, cue: 'Lie flat. Move your attention slowly from the toes to the head, relaxing each area on an exhale.' },
    ],
  },
];

/** Time to get into position before each new exercise, and to switch sides. */
export const TRANSITION_SECS = 10;
export const SWITCH_SECS = 5;

/** Seconds a routine takes (both sides and transitions counted), with holds scaled for the program week. */
export const routineSecs = (r: Routine, scale = 1) =>
  r.poses.reduce((t, p) => t + TRANSITION_SECS + Math.round(p.secs * scale) * (p.sides ? 2 : 1) + (p.sides ? SWITCH_SECS : 0), 0);

/**
 * 4-week mobility & splits block, meant to be repeated. Built around: leg mobility, rounded shoulders,
 * general mobility and the front and middle splits. Flexibility research points to total weekly
 * stretch time per muscle (≥ 5 min), frequency (5–6 days) and contract-relax as what drives progress.
 */
export const PROGRAM = {
  name: 'Mobility & Splits Program',
  weeks: [
    { week: 1, scale: 1.0, focus: 'Learn the positions. Stretch to about 6/10, never into pain. Measure your splits and toe touch.' },
    { week: 2, scale: 1.15, focus: 'Slightly longer holds. Use the contract-relax cues in the split routines.' },
    { week: 3, scale: 1.3, focus: 'Longer holds. Breathe out slowly into each stretch.' },
    { week: 4, scale: 1.45, focus: 'Longest holds. Measure again and compare; then repeat the block.' },
  ],
  /** 0 = Monday … 6 = Sunday */
  schedule: [
    ['legs-daily', 'front-split'],
    ['legs-daily', 'shoulders'],
    ['legs-daily', 'middle-split'],
    ['legs-daily', 'front-split'],
    ['legs-daily', 'shoulders'],
    ['legs-daily', 'middle-split', 'blackroll'],
    ['hamstrings', 'shoulders', 'wind-down'],
  ] as string[][],
};
