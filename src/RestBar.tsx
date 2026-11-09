import { useEffect, useState } from 'preact/hooks';
import { BellRing, Timer, X } from 'lucide-preact';
import { restTimer } from './restTimer';
import { fmtDuration } from './calc';
import { Ico } from './icons';

/** Rest countdown shown above the tab bar on every screen while a rest is running. */
export function RestBar() {
  const [, force] = useState(0);
  useEffect(() => restTimer.subscribe(() => force((n) => n + 1)), []);
  const t = restTimer;

  if (!t.running && t.finishedAt) {
    return (
      <div class="rest-bar over" onClick={() => { t.finishedAt = null; force((n) => n + 1); }}>
        <Ico icon={BellRing} size={20} />
        <span class="rest-over-text">Rest over · next set!</span>
      </div>
    );
  }
  if (!t.running) return null;

  const left = t.remaining();
  const pct = Math.min(100, (1 - left / Math.max(t.total, 1)) * 100);
  return (
    <div class="rest-bar" role="timer" aria-live="off">
      <div class="rest-progress" style={{ width: `${pct}%` }} />
      <Ico icon={Timer} size={20} grad="main" />
      <div class="rest-info">
        <span class="rest-time">{fmtDuration(left)}</span>
        <span class="rest-label">{t.label}</span>
      </div>
      <button class="rest-adj" onClick={() => t.adjust(-15)} aria-label="15 seconds less">−15</button>
      <button class="rest-adj" onClick={() => t.adjust(15)} aria-label="15 seconds more">+15</button>
      <button class="rest-skip" onClick={() => t.stop()} aria-label="Skip rest"><Ico icon={X} size={18} /></button>
    </div>
  );
}
