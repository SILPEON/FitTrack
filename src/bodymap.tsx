import type { Muscle } from './plans';

/**
 * Schematic male physique, front and back, white outlines.
 * Each muscle region is drawn for the left half and mirrored for the right.
 * intensity: 1 = primary target (solid red), 0.5 = assisting (light red), 0/undefined = not trained.
 */
type Region = { m: Muscle | null; d: string; mirror?: boolean };

const FRONT: Region[] = [
  { m: 'Neck', d: 'M93,47 L107,47 L109,62 L91,62 Z' },
  { m: 'Upper back', d: 'M91,58 Q82,63 70,70 L82,71 Q89,67 92,63 Z', mirror: true },
  { m: 'Shoulders', d: 'M70,70 Q58,74 56,91 Q56,101 60,108 L68,100 Q71,86 81,73 Z', mirror: true },
  { m: 'Pecs', d: 'M99,74 L83,73 Q73,79 70,95 Q74,107 87,110 Q97,108 99,100 Z', mirror: true },
  { m: 'Arms', d: 'M60,111 L69,103 Q72,127 66,148 L56,147 Q53,128 60,111 Z', mirror: true },
  { m: null, d: 'M56,151 L66,152 Q66,172 60,196 L52,195 Q49,172 56,151 Z', mirror: true },
  { m: null, d: 'M51,198 Q55,196 60,199 Q62,208 57,214 Q50,212 51,198 Z', mirror: true },
  { m: 'Abs', d: 'M89,113 L111,113 L110,171 Q100,178 90,171 Z' },
  { m: 'Abs', d: 'M87,113 Q78,113 74,121 Q76,150 81,170 L88,171 Z', mirror: true },
  { m: 'Quads', d: 'M76,186 Q68,230 74,275 L86,281 Q97,262 98,232 L99,196 Q88,193 76,186 Z', mirror: true },
  { m: null, d: 'M78,288 Q84,284 92,289 Q93,296 86,300 Q78,297 78,288 Z', mirror: true },
  { m: null, d: 'M77,303 Q72,333 78,368 L88,370 Q95,334 93,304 Z', mirror: true },
  { m: null, d: 'M78,373 L90,373 L94,385 L73,385 Z', mirror: true },
];

const BACK: Region[] = [
  { m: 'Neck', d: 'M93,47 L107,47 L108,58 L92,58 Z' },
  { m: 'Lats', d: 'M80,82 Q73,100 76,121 Q82,149 96,165 L100,159 L100,121 L92,93 Z', mirror: true },
  { m: 'Upper back', d: 'M100,52 L92,58 Q82,64 70,70 Q84,78 91,90 L100,117 Z', mirror: true },
  { m: 'Shoulders', d: 'M70,70 Q58,74 56,91 Q56,101 60,108 L70,98 Q75,84 82,76 Z', mirror: true },
  { m: 'Arms', d: 'M60,111 L70,102 Q72,127 66,148 L56,147 Q53,128 60,111 Z', mirror: true },
  { m: null, d: 'M56,151 L66,152 Q66,172 60,196 L52,195 Q49,172 56,151 Z', mirror: true },
  { m: null, d: 'M51,198 Q55,196 60,199 Q62,208 57,214 Q50,212 51,198 Z', mirror: true },
  { m: null, d: 'M94,165 L100,170 L100,184 L93,184 Z', mirror: true },
  { m: 'Glutes', d: 'M77,187 Q73,206 79,220 Q91,228 99,220 L99,189 Q88,183 77,187 Z', mirror: true },
  { m: 'Hamstrings', d: 'M76,226 Q71,256 77,280 L88,282 Q97,262 98,229 Q88,233 76,226 Z', mirror: true },
  { m: null, d: 'M76,296 Q69,321 78,348 L88,351 Q95,322 92,296 Z', mirror: true },
  { m: null, d: 'M78,373 L90,373 L94,385 L73,385 Z', mirror: true },
];

function Figure({ regions, x, intensity, label }: { regions: Region[]; x: number; intensity: Partial<Record<Muscle, number>>; label: string }) {
  const cls = (m: Muscle | null) => {
    const v = m ? intensity[m] ?? 0 : 0;
    return v >= 1 ? 'bm hit' : v > 0 ? 'bm assist' : m ? 'bm idle' : 'bm plain';
  };
  return (
    <g transform={`translate(${x},0)`}>
      <ellipse cx="100" cy="28" rx="14" ry="18" class="bm plain" />
      {regions.map((r) => (
        <>
          <path d={r.d} class={cls(r.m)} />
          {r.mirror && <path d={r.d} class={cls(r.m)} transform="translate(200,0) scale(-1,1)" />}
        </>
      ))}
      {regions === FRONT && (
        <g class="bm-lines">
          <path d="M100,113 L100,175 M90,127 L110,127 M90,141 L110,141 M90,156 L110,156" />
        </g>
      )}
      <text x="100" y="404" text-anchor="middle" class="bm-label">{label}</text>
    </g>
  );
}

export function BodyMap({ intensity }: { intensity: Partial<Record<Muscle, number>> }) {
  return (
    <svg class="bodymap" viewBox="10 0 400 412" role="img" aria-label="Muscles trained in the next workout">
      <Figure regions={FRONT} x={0} intensity={intensity} label="FRONT" />
      <Figure regions={BACK} x={210} intensity={intensity} label="BACK" />
    </svg>
  );
}
