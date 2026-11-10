import { createContext, type ComponentChildren, type VNode } from 'preact';
import { createPortal } from 'preact/compat';
import { useContext, useEffect, useRef, useState } from 'preact/hooks';
import { liveQuery } from 'dexie';
import { fmt, parseNum } from './calc';
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-preact';
import { Ico, type Grad } from './icons';

/** Number for an editable field: locale decimal separator, no thousands grouping. */
const fieldText = (v: number | null | undefined) =>
  v == null ? '' : v.toLocaleString(undefined, { maximumFractionDigits: 2, useGrouping: false });

// ---------- Live database queries ----------

/** Re-runs `query` whenever the tables it reads change. */
export function useLive<T>(query: () => Promise<T> | T, deps: unknown[], initial: T): T {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    const sub = liveQuery(query).subscribe({ next: setValue, error: (e) => console.error(e) });
    return () => sub.unsubscribe();
  }, deps);
  return value;
}

// ---------- Stack navigation (one stack per tab) ----------

interface Nav { push: (el: VNode) => void; pop: () => void; depth: number }
const NavContext = createContext<Nav>({ push: () => {}, pop: () => {}, depth: 0 });
export const useNav = () => useContext(NavContext);

export function Stack({ root }: { root: VNode }) {
  const [stack, setStack] = useState<VNode[]>([]);
  const nav: Nav = {
    push: (el) => setStack((s) => [...s, el]),
    pop: () => setStack((s) => s.slice(0, -1)),
    depth: stack.length,
  };
  const all = [root, ...stack];
  return (
    <NavContext.Provider value={nav}>
      {all.map((el, i) => (
        <div key={i} class="stack-layer" style={{ display: i === all.length - 1 ? 'flex' : 'none' }}>{el}</div>
      ))}
    </NavContext.Provider>
  );
}

export function Page({ title, actions, left, children, noScroll }: {
  title: string; actions?: ComponentChildren; left?: ComponentChildren; children: ComponentChildren; noScroll?: boolean;
}) {
  const nav = useNav();
  return (
    <div class="page">
      <header class="topbar">
        <div class="topbar-side">
          {left ?? (nav.depth > 0 && <button class="link back" onClick={nav.pop}><Ico icon={ChevronLeft} size={24} />Back</button>)}
        </div>
        <h1>{title}</h1>
        <div class="topbar-side right">{actions}</div>
      </header>
      <main class={noScroll ? 'content no-scroll' : 'content'}>{children}</main>
    </div>
  );
}

// ---------- Layout primitives ----------

export const Section = ({ title, right, footer, children }: {
  title?: ComponentChildren; right?: ComponentChildren; footer?: ComponentChildren; children: ComponentChildren;
}) => (
  <section class="section">
    {(title || right) && <div class="section-head"><span>{title}</span><span>{right}</span></div>}
    <div class="card">{children}</div>
    {footer && <div class="section-foot">{footer}</div>}
  </section>
);

export const Row = ({ label, value, sub, onClick, chevron, children, class: cls }: {
  label?: ComponentChildren; value?: ComponentChildren; sub?: ComponentChildren; onClick?: () => void;
  chevron?: boolean; children?: ComponentChildren; class?: string;
}) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag class={`row ${onClick ? 'tappable' : ''} ${cls ?? ''}`} onClick={onClick}>
      {children ?? (
        <>
          <div class="row-main">
            <div>{label}</div>
            {sub && <div class="sub">{sub}</div>}
          </div>
          {value != null && <div class="row-value">{value}</div>}
        </>
      )}
      {chevron && <Ico icon={ChevronRight} size={18} class="chevron" />}
    </Tag>
  );
};

/** Tappable row with a gradient icon, used for actions like "Add set". */
export const ActionRow = ({ icon, label, onClick, danger, grad = 'main', bold }: {
  icon: LucideIcon; label: ComponentChildren; onClick: () => void; danger?: boolean; grad?: Grad; bold?: boolean;
}) => (
  <button class="row tappable action-row" onClick={onClick}>
    <Ico icon={icon} size={20} grad={danger ? undefined : grad} class={danger ? 'danger-text' : ''} />
    <span class={`${danger ? 'danger-text' : 'accent'} ${bold ? 'bold' : ''}`}>{label}</span>
  </button>
);

export const Empty = ({ icon, title, text }: { icon: LucideIcon; title: string; text?: string }) => (
  <div class="empty"><div class="empty-icon"><Ico icon={icon} size={44} grad="main" strokeWidth={1.5} /></div><div class="empty-title">{title}</div>{text && <div class="sub">{text}</div>}</div>
);

export function Segmented<T extends string>({ value, options, onChange }: {
  value: T; options: { key: T; label: ComponentChildren }[]; onChange: (v: T) => void;
}) {
  return (
    <div class="segmented">
      {options.map((o) => (
        <button key={o.key} class={o.key === value ? 'active' : ''} onClick={() => onChange(o.key)}>{o.label}</button>
      ))}
    </div>
  );
}

export const Bar = ({ value, max, color }: { value: number; max: number; color: string }) => (
  <div class="bar"><div style={{ width: `${Math.min(100, (value / Math.max(max, 1)) * 100)}%`, background: color }} /></div>
);

// ---------- Inputs ----------

/** Text input for numbers that accepts a comma or a dot and keeps half-typed values like "72,". */
export function NumberInput({ value, onChange, placeholder, decimals = true, class: cls, zeroAsEmpty }: {
  value: number | null | undefined; onChange: (v: number | null) => void; placeholder?: string; decimals?: boolean; class?: string;
  /** Show 0 as an empty field so the placeholder (e.g. "bodyweight") is visible. */
  zeroAsEmpty?: boolean;
}) {
  const show = (v: number | null | undefined) => (zeroAsEmpty && v === 0 ? '' : fieldText(v));
  const [text, setText] = useState(show(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(show(value));
  }, [value]);
  return (
    <input
      class={`num ${cls ?? ''}`}
      type="text"
      inputMode={decimals ? 'decimal' : 'numeric'}
      placeholder={placeholder}
      value={text}
      onFocus={(e) => { focused.current = true; (e.target as HTMLInputElement).select(); }}
      onBlur={() => { focused.current = false; setText(show(value)); }}
      onInput={(e) => {
        const t = (e.target as HTMLInputElement).value;
        setText(t);
        onChange(t.trim() === '' ? null : parseNum(t));
      }}
    />
  );
}

// ---------- Full-screen overlays ----------

/**
 * Renders children directly into <body>. Full-screen layers must not live inside the scrolling
 * content area: iOS Safari confines position:fixed children of scroll containers to that area.
 */
export const Overlay = ({ children }: { children: ComponentChildren }) => createPortal(<>{children}</>, document.body);

// ---------- Sheets (modals) ----------

export function Sheet({ open, onClose, title, children, actions }: {
  open: boolean; onClose: () => void; title: string; children: ComponentChildren; actions?: ComponentChildren;
}) {
  if (!open) return null;
  return (
    <Overlay><div class="sheet-backdrop" onClick={onClose}>
      <div class="sheet" onClick={(e) => e.stopPropagation()}>
        <header class="topbar">
          <div class="topbar-side"><button class="link" onClick={onClose}>Cancel</button></div>
          <h1>{title}</h1>
          <div class="topbar-side right">{actions}</div>
        </header>
        <div class="sheet-content">{children}</div>
      </div>
    </div></Overlay>
  );
}

export function ActionSheet({ open, onClose, actions }: {
  open: boolean; onClose: () => void; actions: { label: string; destructive?: boolean; run: () => void }[];
}) {
  if (!open) return null;
  return (
    <Overlay><div class="sheet-backdrop" onClick={onClose}>
      <div class="action-sheet" onClick={(e) => e.stopPropagation()}>
        <div class="card">
          {actions.map((a) => (
            <button class={`action ${a.destructive ? 'danger' : ''}`} onClick={() => { onClose(); a.run(); }}>{a.label}</button>
          ))}
        </div>
        <div class="card"><button class="action bold" onClick={onClose}>Cancel</button></div>
      </div>
    </div></Overlay>
  );
}

// ---------- Line chart (SVG) ----------

export function LineChart({ points, target, height = 200, unit = '' }: {
  points: { x: number; y: number }[]; target?: number | null; height?: number; unit?: string;
}) {
  const W = 340, H = height, padL = 36, padR = 8, padT = 14, padB = 22;
  if (points.length < 2) return null;
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  if (target != null) ys.push(target);
  let minY = Math.min(...ys), maxY = Math.max(...ys);
  const span = Math.max(maxY - minY, 1);
  minY -= span * 0.1; maxY += span * 0.1;
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const sx = (x: number) => padL + ((x - minX) / Math.max(maxX - minX, 1)) * (W - padL - padR);
  const sy = (y: number) => padT + (1 - (y - minY) / (maxY - minY)) * (H - padT - padB);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const area = `${d} L${sx(points[points.length - 1].x).toFixed(1)},${H - padB} L${sx(points[0].x).toFixed(1)},${H - padB} Z`;
  const id = `c${Math.round(minX % 1e6)}${points.length}`;
  const ticks = [maxY - (maxY - minY) * 0.1, (maxY + minY) / 2, minY + (maxY - minY) * 0.1];
  const dateLabel = (x: number) => new Date(x).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return (
    <svg class="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height: `${H}px` }}>
      <defs>
        <linearGradient id={`${id}-l`} gradientUnits="userSpaceOnUse" x1={padL} y1="0" x2={W - padR} y2="0">
          <stop offset="0" style={{ stopColor: 'var(--p1)' }} /><stop offset="0.5" style={{ stopColor: 'var(--p2)' }} /><stop offset="1" style={{ stopColor: 'var(--p3)' }} />
        </linearGradient>
        <linearGradient id={`${id}-a`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--p2)', stopOpacity: 0.28 }} /><stop offset="1" style={{ stopColor: 'var(--p2)', stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g>
          <line x1={padL} x2={W - padR} y1={sy(t)} y2={sy(t)} class="grid" />
          <text x={padL - 4} y={sy(t) + 3} text-anchor="end" class="axis">{fmt(t, 0)}</text>
        </g>
      ))}
      {target != null && (
        <g>
          <line x1={padL} x2={W - padR} y1={sy(target)} y2={sy(target)} class="target" />
          <text x={W - padR} y={sy(target) - 4} text-anchor="end" class="target-label">Goal {fmt(target)}{unit}</text>
        </g>
      )}
      <path d={area} fill={`url(#${id}-a)`} stroke="none" />
      <path d={d} class="line" stroke={`url(#${id}-l)`} />
      {points.length <= 60 && points.map((p) => <circle cx={sx(p.x)} cy={sy(p.y)} r={2.8} class="dot" fill={`url(#${id}-l)`} />)}
      {(() => { const p = points[points.length - 1]; return <circle cx={sx(p.x)} cy={sy(p.y)} r={4.5} class="dot-last" />; })()}
      <text x={padL} y={H - 6} class="axis">{dateLabel(minX)}</text>
      <text x={W - padR} y={H - 6} text-anchor="end" class="axis">{dateLabel(maxX)}</text>
    </svg>
  );
}
