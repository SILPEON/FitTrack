import { useMemo } from 'preact/hooks';
import type { Muscle } from './plans';
import { CENTERS, OUTLINE, REGIONS, VIEWBOX } from './bodyart';

/**
 * Front and back physique traced from the user's line drawing (see bodyart.ts), white outlines.
 *
 * intensity: 0..1 per muscle (share of the session's work). Trained muscles are filled with a
 * gradient along the muscle's fibre direction (lighter at the tendons, saturated in the belly) and
 * faint striations in the same direction. Light load = soft light red, intense load = deep crimson.
 */
/** Colours for an intensity 0..1: light load = soft light red, intense load = deep crimson. */
function shades(t: number) {
  const k = Math.max(0, Math.min(1, t));
  const mix = (a: number[], b: number[]) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  const belly = mix([255, 140, 152], [172, 8, 38]);
  const tendon = mix([255, 196, 202], [222, 92, 112]);
  return {
    belly: `rgb(${belly.join(',')})`,
    tendon: `rgb(${tendon.join(',')})`,
    opacity: 0.95,
  };
}

let seq = 0;

export function BodyMap({ intensity }: { intensity: Partial<Record<Muscle, number>> }) {
  // Unique ids: several maps can be in the page at once (home card, workout summary).
  const uid = useMemo(() => `bm${++seq}`, []);
  const [vx, vy, vw, vh] = VIEWBOX;
  return (
    <svg class="bodymap" viewBox={`${vx} ${vy} ${vw} ${vh + 14}`} role="img" aria-label="Muscles trained, coloured by intensity">
      <defs>
        {REGIONS.map((r, i) => {
          const t = intensity[r.m] ?? 0;
          if (t <= 0) return null;
          const c = shades(t);
          const [x1, y1, x2, y2] = r.g;
          return (
            <>
              <linearGradient id={`${uid}-g${i}`} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
                <stop offset="0" stop-color={c.tendon} />
                <stop offset="0.22" stop-color={c.belly} />
                <stop offset="0.7" stop-color={c.belly} />
                <stop offset="1" stop-color={c.tendon} />
              </linearGradient>
              {/* Striations parallel to the fibres */}
              <pattern id={`${uid}-p${i}`} patternUnits="userSpaceOnUse" width="2.4" height="2.4" patternTransform={`rotate(${r.a} ${x1} ${y1})`}>
                <line x1="0" y1="1.2" x2="2.4" y2="1.2" class="bm-fiber" />
              </pattern>
            </>
          );
        })}
      </defs>
      {REGIONS.map((r, i) => {
        const t = intensity[r.m] ?? 0;
        if (t <= 0) return null;
        return (
          <g class={t >= 0.7 ? 'bm-glow' : undefined}>
            <path d={r.d} style={{ fill: `url(#${uid}-g${i})`, fillOpacity: shades(t).opacity }} />
            <path d={r.d} fill={`url(#${uid}-p${i})`} class="bm-striation" />
          </g>
        );
      })}
      <path d={OUTLINE} class="bm-outline" fill-rule="evenodd" />
      <text x={CENTERS[0]} y={vy + vh + 10} text-anchor="middle" class="bm-label">FRONT</text>
      <text x={CENTERS[1]} y={vy + vh + 10} text-anchor="middle" class="bm-label">BACK</text>
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
