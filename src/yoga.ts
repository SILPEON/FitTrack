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
    id: 'shoulders', name: 'Shoulder-Friendly Upper Mobility', kind: 'Mobility',
    purpose: 'Thoracic spine, lats and shoulder blades. Do it before upper-body days or whenever the shoulders feel stiff.',
    poses: [
      { name: 'Blackroll: Thoracic Extension', secs: 60, props: 'Blackroll', cue: 'Roller across the upper back, hands support the head. Extend gently over the roller, move it a few centimetres, repeat. Not on the lower back.' },
      { name: 'Open Book', secs: 45, sides: true, cue: 'Lie on your side, knees bent 90°. Open the top arm across to the other side, following it with your eyes. Knees stay together.' },
      { name: 'Thread the Needle', secs: 45, sides: true, cue: 'On all fours, slide one arm under the body until the shoulder and head rest on the mat. Breathe into the upper back.' },
      { name: 'Wall Slides', secs: 60, cue: 'Back to the wall, forearms on the wall in a "W". Slide up only as far as the forearms stay in contact, pain-free.' },
      { name: 'Slow Band Pull-Aparts', secs: 45, props: 'Resistance band', cue: 'Light band, arms straight. 3 s apart, 3 s back. Feel the muscles between the shoulder blades.' },
      { name: 'Doorway Pec Stretch (Low)', secs: 45, sides: true, cue: 'Forearm on the door frame with the elbow below shoulder height. Step through gently until the chest stretches. No pain in the front of the shoulder.' },
      { name: 'Child\'s Pose Side Reach', secs: 45, sides: true, props: 'Yoga block', cue: 'From child\'s pose, walk both hands to one side to stretch the opposite lat. Hands on the yoga block if overhead feels tight.' },
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

/** Seconds a routine takes (both sides counted), with hold times scaled for the program week. */
export const routineSecs = (r: Routine, scale = 1) =>
  r.poses.reduce((t, p) => t + Math.round(p.secs * scale) * (p.sides ? 2 : 1), 0);

/** 4-week leg mobility & wellbeing program. Holds get longer as the weeks progress. */
export const PROGRAM = {
  name: '4-Week Leg Mobility Program',
  weeks: [
    { week: 1, scale: 1.0, focus: 'Learn the poses. Gentle holds, never more than a 6/10 stretch.' },
    { week: 2, scale: 1.15, focus: 'Slightly longer holds. Add contract-relax in the band hamstring stretch.' },
    { week: 3, scale: 1.3, focus: 'Longer holds. Focus on breathing into tight spots.' },
    { week: 4, scale: 1.45, focus: 'Longest holds. Retest your toe-touch and compare with week 1.' },
  ],
  /** 0 = Monday … 6 = Sunday */
  schedule: [
    ['legs-daily', 'hamstrings'],
    ['legs-daily', 'shoulders'],
    ['legs-daily', 'pilates-core'],
    ['legs-daily', 'hamstrings'],
    ['legs-daily', 'shoulders'],
    ['legs-daily', 'pilates-core', 'blackroll'],
    ['legs-daily', 'wind-down'],
  ] as string[][],
};
