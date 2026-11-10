import type { LucideIcon } from 'lucide-preact';

/**
 * Gradients taken from the app icon (cyan → violet → pink → orange).
 * Defined once in the document and referenced by every icon and chart via url(#id).
 * userSpaceOnUse keeps straight icon strokes visible (a bounding-box gradient on a flat line has zero size).
 */
export function GradientDefs() {
  const stops = {
    main: ['--p1', '--p2', '--p3'],
    warm: ['--p3', '--p4', '--p5'],
    cool: ['--p1', '--p7', '--p2'],
    fresh: ['--p6', '--p1'],
  };
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        {Object.entries(stops).map(([id, colors]) => (
          <linearGradient id={`g-${id}`} gradientUnits="userSpaceOnUse" x1="2" y1="2" x2="22" y2="22">
            {colors.map((c, i) => <stop offset={i / (colors.length - 1)} style={{ stopColor: `var(${c})` }} />)}
          </linearGradient>
        ))}
      </defs>
    </svg>
  );
}

export type Grad = 'main' | 'warm' | 'cool' | 'fresh';

export const Ico = ({ icon: I, size = 20, grad, class: cls, strokeWidth = 2 }: {
  icon: LucideIcon; size?: number; grad?: Grad; class?: string; strokeWidth?: number;
}) => <I size={size} color={grad ? `url(#g-${grad})` : 'currentColor'} strokeWidth={strokeWidth} class={`ico ${cls ?? ''}`} aria-hidden="true" />;
