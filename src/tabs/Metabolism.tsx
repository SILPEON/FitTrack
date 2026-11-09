import { useEffect, useRef, useState } from 'preact/hooks';
import { NutritionHome } from './Nutrition';
import { WeightHome } from './Weight';
import { DigestionHome } from './Digestion';

const PAGES = ['Weight', 'Nutrition', 'Digestion'] as const;

/** Weight, Nutrition and Digestion, left to right; swipe between them. */
export function MetabolismHome() {
  const pager = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);

  // While a tap-triggered scroll runs, ignore scroll events so the pill doesn't flicker through the middle page.
  const jumping = useRef(false);
  const [fade, setFade] = useState(false);
  const go = (i: number) => {
    const el = pager.current;
    if (!el || i === page) return;
    jumping.current = true;
    setPage(i);
    if (Math.abs(i - page) > 1) {
      // Not a neighbour: fade out, jump straight there, fade back in.
      setFade(true);
      setTimeout(() => { el.scrollTo({ left: i * el.clientWidth, behavior: 'instant' as ScrollBehavior }); setFade(false); setTimeout(() => { jumping.current = false; }, 50); }, 130);
    } else {
      el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
      setTimeout(() => { jumping.current = false; }, 600);
    }
  };

  // Keep the visible page when the width changes (rotation, first layout) — not on page changes.
  const pageRef = useRef(page);
  pageRef.current = page;
  useEffect(() => {
    const el = pager.current;
    if (!el) return;
    let width = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      el.scrollLeft = pageRef.current * width;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div class="pager-wrap">
      <div class="pager" ref={pager}
        style={{ opacity: fade ? 0 : 1, transition: 'opacity .13s ease' }}
        onScroll={(e) => { if (jumping.current) return; const el = e.currentTarget as HTMLDivElement; const p = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1)); if (p !== page) setPage(p); }}>
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
