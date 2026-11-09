/** Bristol Stool Scale (Lewis & Heaton, 1997). */
export interface BristolType { type: number; name: string; desc: string; group: 'hard' | 'ideal' | 'loose' }

export const BRISTOL: BristolType[] = [
  { type: 1, name: 'Separate hard lumps', desc: 'Like nuts, hard to pass', group: 'hard' },
  { type: 2, name: 'Lumpy sausage', desc: 'Sausage-shaped but lumpy', group: 'hard' },
  { type: 3, name: 'Cracked sausage', desc: 'Like a sausage with cracks on the surface', group: 'ideal' },
  { type: 4, name: 'Smooth snake', desc: 'Like a sausage or snake, smooth and soft', group: 'ideal' },
  { type: 5, name: 'Soft blobs', desc: 'Soft blobs with clear-cut edges, passed easily', group: 'ideal' },
  { type: 6, name: 'Mushy', desc: 'Fluffy pieces with ragged edges', group: 'loose' },
  { type: 7, name: 'Watery', desc: 'Entirely liquid, no solid pieces', group: 'loose' },
];

export const GROUP_LABEL = { hard: 'Constipated', ideal: 'Healthy range', loose: 'Loose' } as const;

/** Small schematic drawing of each type, in a warm brown gradient. */
export function BristolIcon({ type, size = 44 }: { type: number; size?: number }) {
  const id = `bs${type}`;
  const fill = `url(#${id})`;
  const shapes: Record<number, preact.JSX.Element> = {
    1: <g>{[[12, 22, 5], [24, 18, 5.5], [36, 23, 5], [18, 32, 4.5], [31, 32, 5]].map(([x, y, r]) => <circle cx={x} cy={y} r={r} fill={fill} />)}</g>,
    2: <path d="M6,26 q3,-9 9,-6 q4,-6 9,-1 q5,-6 9,0 q7,-3 9,6 q-1,8 -8,7 q-4,5 -9,1 q-5,5 -9,0 q-8,3 -10,-7 z" fill={fill} />,
    3: <g><rect x="5" y="19" width="38" height="12" rx="6" fill={fill} /><path d="M14,19 l2,4 M22,31 l2,-4 M30,19 l1,4 M36,31 l-2,-4" stroke="rgba(255,255,255,.55)" stroke-width="1.3" stroke-linecap="round" /></g>,
    4: <path d="M5,30 C12,18 20,34 28,24 S40,16 43,22" stroke={fill} stroke-width="9" stroke-linecap="round" fill="none" />,
    5: <g>{[[11, 25, 7, 6], [25, 22, 7.5, 6.5], [37, 27, 6.5, 5.5]].map(([x, y, rx, ry]) => <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={fill} />)}</g>,
    6: <path d="M6,30 q2,-8 7,-6 q1,-7 7,-4 q3,-6 8,-1 q5,-4 7,2 q7,0 6,7 q2,6 -6,6 q-3,4 -8,1 q-5,3 -8,-1 q-6,2 -7,-2 q-6,1 -6,-2 z" fill={fill} opacity=".9" />,
    7: <g><path d="M4,32 q10,-6 20,-1 t20,-1 v3 q-10,5 -20,1 t-20,1 z" fill={fill} opacity=".85" /><circle cx="15" cy="20" r="2.5" fill={fill} /><circle cx="30" cy="17" r="2" fill={fill} /></g>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-label={`Bristol type ${type}`} class="bristol-icon">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#b07a52" />
          <stop offset="1" stop-color="#6e4428" />
        </linearGradient>
      </defs>
      {shapes[type]}
    </svg>
  );
}
