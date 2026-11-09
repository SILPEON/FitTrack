import { useEffect, useRef, useState } from 'preact/hooks';
import { NutritionHome } from './Nutrition';
import { WeightHome } from './Weight';
import { DigestionHome } from './Digestion';

const PAGES = ['Weight', 'Nutrition', 'Digestion'] as const;

/** Weight, Nutrition and Digestion, left to right; swipe between them. */
export function MetabolismHome() {
  const pager = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);

  const go = (i: number) => pager.current?.scrollTo({ left: i * pager.current.clientWidth, behavior: 'smooth' });

  // Keep the visible page when the width changes (rotation, first layout).
  useEffect(() => {
    const el = pager.current;
    if (!el) return;
    const ro = new ResizeObserver(() => { el.scrollLeft = page * el.clientWidth; });
    ro.observe(el);
    return () => ro.disconnect();
  }, [page]);

  return (
    <div class="pager-wrap">
      <div class="pager" ref={pager}
        onScroll={(e) => { const el = e.currentTarget as HTMLDivElement; const p = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1)); if (p !== page) setPage(p); }}>
        <div class="pager-page" aria-hidden={page !== 0}><WeightHome /></div>
        <div class="pager-page" aria-hidden={page !== 1}><NutritionHome /></div>
        <div class="pager-page" aria-hidden={page !== 2}><DigestionHome /></div>
      </div>
      <div class="pager-switch" role="tablist">
        {PAGES.map((p, i) => (
          <button role="tab" aria-selected={page === i} class={page === i ? 'active' : ''} onClick={() => go(i)}>{p}</button>
        ))}
      </div>
    </div>
  );
}
