import { useMemo } from 'preact/hooks';
import type { Muscle } from './plans';

/**
 * Schematic male physique, front and back, white outlines.
 * Each muscle region is drawn for the left half and mirrored for the right.
 *
 * intensity: 0..1 per muscle (share of the session's work). Trained muscles are filled with a
 * gradient that runs along the muscle's fibre direction: lighter at the tendons, saturated in the
 * belly, with faint striations in the same direction. Higher intensity = deeper, brighter red.
 *
 * `fiber` is [x1, y1, x2, y2]: origin → insertion in figure coordinates (left half).
 * Gradients and patterns use userSpaceOnUse, so the mirrored copy mirrors them automatically.
 */
type Region = { m: Muscle | null; d: string; mirror?: boolean; fiber?: [number, number, number, number] };

const FRONT: Region[] = [
  { m: 'Neck', d: 'M93,47 L107,47 L109,62 L91,62 Z', fiber: [100, 47, 100, 62] },
  { m: 'Upper back', d: 'M91,58 Q82,63 70,70 L82,71 Q89,67 92,63 Z', mirror: true, fiber: [91, 58, 70, 71] },
  { m: 'Shoulders', d: 'M70,70 Q58,74 56,91 Q56,101 60,108 L68,100 Q71,86 81,73 Z', mirror: true, fiber: [70, 70, 62, 107] },
  // Pec fibres fan from the breastbone out to the upper arm.
  { m: 'Pecs', d: 'M99,74 L83,73 Q73,79 70,95 Q74,107 87,110 Q97,108 99,100 Z', mirror: true, fiber: [99, 97, 71, 80] },
  { m: 'Arms', d: 'M60,111 L69,103 Q72,127 66,148 L56,147 Q53,128 60,111 Z', mirror: true, fiber: [65, 104, 61, 148] },
  { m: null, d: 'M56,151 L66,152 Q66,172 60,196 L52,195 Q49,172 56,151 Z', mirror: true },
  { m: null, d: 'M51,198 Q55,196 60,199 Q62,208 57,214 Q50,212 51,198 Z', mirror: true },
  { m: 'Abs', d: 'M89,113 L111,113 L110,171 Q100,178 90,171 Z', fiber: [100, 113, 100, 176] },
  // External obliques run down and in, like hands in pockets.
  { m: 'Abs', d: 'M87,113 Q78,113 74,121 Q76,150 81,170 L88,171 Z', mirror: true, fiber: [74, 117, 89, 168] },
  { m: 'Quads', d: 'M76,186 Q68,230 74,275 L86,281 Q97,262 98,232 L99,196 Q88,193 76,186 Z', mirror: true, fiber: [80, 187, 87, 281] },
  { m: null, d: 'M78,288 Q84,284 92,289 Q93,296 86,300 Q78,297 78,288 Z', mirror: true },
  { m: null, d: 'M77,303 Q72,333 78,368 L88,370 Q95,334 93,304 Z', mirror: true },
  { m: null, d: 'M78,373 L90,373 L94,385 L73,385 Z', mirror: true },
];

const BACK: Region[] = [
  { m: 'Neck', d: 'M93,47 L107,47 L108,58 L92,58 Z', fiber: [100, 47, 100, 58] },
  // Lats sweep from the lower spine up to the armpit.
  { m: 'Lats', d: 'M80,82 Q73,100 76,121 Q82,149 96,165 L100,159 L100,121 L92,93 Z', mirror: true, fiber: [98, 162, 78, 86] },
  // Trapezius fibres run from the spine out to the shoulder blade.
  { m: 'Upper back', d: 'M100,52 L92,58 Q82,64 70,70 Q84,78 91,90 L100,117 Z', mirror: true, fiber: [100, 98, 71, 70] },
  { m: 'Shoulders', d: 'M70,70 Q58,74 56,91 Q56,101 60,108 L70,98 Q75,84 82,76 Z', mirror: true, fiber: [70, 70, 62, 107] },
  { m: 'Arms', d: 'M60,111 L70,102 Q72,127 66,148 L56,147 Q53,128 60,111 Z', mirror: true, fiber: [65, 103, 61, 148] },
  { m: null, d: 'M56,151 L66,152 Q66,172 60,196 L52,195 Q49,172 56,151 Z', mirror: true },
  { m: null, d: 'M51,198 Q55,196 60,199 Q62,208 57,214 Q50,212 51,198 Z', mirror: true },
  { m: null, d: 'M94,165 L100,170 L100,184 L93,184 Z', mirror: true },
  // Gluteus maximus runs diagonally from the sacrum down and out to the thigh.
  { m: 'Glutes', d: 'M77,187 Q73,206 79,220 Q91,228 99,220 L99,189 Q88,183 77,187 Z', mirror: true, fiber: [99, 187, 76, 221] },
  { m: 'Hamstrings', d: 'M76,226 Q71,256 77,280 L88,282 Q97,262 98,229 Q88,233 76,226 Z', mirror: true, fiber: [86, 226, 83, 282] },
  { m: null, d: 'M76,296 Q69,321 78,348 L88,351 Q95,322 92,296 Z', mirror: true },
  { m: null, d: 'M78,373 L90,373 L94,385 L73,385 Z', mirror: true },
];

/** Colours for an intensity 0..1: deep wine red → vivid red-coral. */
function shades(t: number) {
  const k = Math.max(0, Math.min(1, t));
  const mix = (a: number[], b: number[]) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  const belly = mix([122, 28, 52], [255, 45, 74]);
  const tendon = mix([150, 80, 104], [255, 150, 140]);
  return {
    belly: `rgb(${belly.join(',')})`,
    tendon: `rgb(${tendon.join(',')})`,
    opacity: 0.55 + 0.45 * k,
  };
}

function Figure({ regions, x, intensity, label, uid }: {
  regions: Region[]; x: number; intensity: Partial<Record<Muscle, number>>; label: string; uid: string;
}) {
  const level = (m: Muscle | null) => (m ? intensity[m] ?? 0 : 0);
  return (
    <g transform={`translate(${x},0)`}>
      <defs>
        {regions.map((r, i) => {
          const t = level(r.m);
          if (!r.fiber || t <= 0) return null;
          const [x1, y1, x2, y2] = r.fiber;
          const c = shades(t);
          const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
          return (
            <>
              <linearGradient id={`${uid}-g${i}`} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
                <stop offset="0" stop-color={c.tendon} />
                <stop offset="0.22" stop-color={c.belly} />
                <stop offset="0.7" stop-color={c.belly} />
                <stop offset="1" stop-color={c.tendon} />
              </linearGradient>
              {/* Striations parallel to the fibres */}
              <pattern id={`${uid}-p${i}`} patternUnits="userSpaceOnUse" width="3.2" height="3.2" patternTransform={`rotate(${angle} ${x1} ${y1})`}>
                <line x1="0" y1="1.6" x2="3.2" y2="1.6" class="bm-fiber" />
              </pattern>
            </>
          );
        })}
      </defs>
      <ellipse cx="100" cy="28" rx="14" ry="18" class="bm plain" />
      {regions.map((r, i) => {
        const t = level(r.m);
        const active = !!r.fiber && t > 0;
        const fill = active ? `url(#${uid}-g${i})` : undefined;
        const cls = active ? `bm hit ${t >= 0.7 ? 'glow' : ''}` : r.m ? 'bm idle' : 'bm plain';
        const style = active ? { fillOpacity: shades(t).opacity } : undefined;
        const shape = (mirror: boolean) => (
          <g transform={mirror ? 'translate(200,0) scale(-1,1)' : undefined}>
            <path d={r.d} class={cls} fill={fill} style={style} />
            {active && <path d={r.d} fill={`url(#${uid}-p${i})`} class="bm-striation" />}
          </g>
        );
        return <>{shape(false)}{r.mirror && shape(true)}</>;
      })}
      {regions === FRONT && (
        <g class="bm-lines">
          <path d="M100,113 L100,175 M90,127 L110,127 M90,141 L110,141 M90,156 L110,156" />
        </g>
      )}
      <text x="100" y="404" text-anchor="middle" class="bm-label">{label}</text>
    </g>
  );
}

let seq = 0;

export function BodyMap({ intensity }: { intensity: Partial<Record<Muscle, number>> }) {
  // Unique ids: several maps can be in the page at once (home card, workout summary).
  const uid = useMemo(() => `bm${++seq}`, []);
  return (
    <svg class="bodymap" viewBox="10 0 400 412" role="img" aria-label="Muscles trained, coloured by intensity">
      <Figure regions={FRONT} x={0} intensity={intensity} label="FRONT" uid={`${uid}f`} />
      <Figure regions={BACK} x={210} intensity={intensity} label="BACK" uid={`${uid}b`} />
    </svg>
  );
}

/** Legend bar matching the fill colours. */
export function IntensityLegend() {
  return (
    <span class="bm-scale">
      <span>Light</span>
      <i style={{ background: `linear-gradient(90deg, ${shades(0.1).belly}, ${shades(0.55).belly}, ${shades(1).belly})` }} />
      <span>Intense</span>
    </span>
  );
}
