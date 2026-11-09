import type { LucideIcon } from 'lucide-preact';

/**
 * Gradients taken from the app icon (cyan → violet → pink → orange).
 * Defined once in the document and referenced by every icon and chart via url(#id).
 * userSpaceOnUse keeps straight icon strokes visible (a bounding-box gradient on a flat line has zero size).
 */
export function GradientDefs() {
  const stops = {
    main: ['#36c6ff', '#8b5cf6', '#ff4f9a'],
    warm: ['#ff4f9a', '#ff8a4c', '#ffbe55'],
    cool: ['#36c6ff', '#5b7bff', '#8b5cf6'],
    fresh: ['#2ee6b0', '#36c6ff'],
  };
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        {Object.entries(stops).map(([id, colors]) => (
          <linearGradient id={`g-${id}`} gradientUnits="userSpaceOnUse" x1="2" y1="2" x2="22" y2="22">
            {colors.map((c, i) => <stop offset={i / (colors.length - 1)} stop-color={c} />)}
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
