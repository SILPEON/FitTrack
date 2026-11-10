import { render } from 'preact';
import { useState } from 'preact/hooks';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import { Stack } from './ui';
import { TrainingHome } from './tabs/Training';
import { RoutesHome } from './tabs/Routes';
import { ProfileHome } from './tabs/Profile';
import { HistoryHome } from './tabs/History';
import { MetabolismHome } from './tabs/Metabolism';
import { recorder } from './recorder';
import { CalendarDays, Dumbbell, Flame, Map as MapIcon, UserRound, type LucideIcon } from 'lucide-preact';
import { GradientDefs, Ico } from './icons';
import { RestBar } from './RestBar';
import { applyTheme, savedTheme } from './theme';

type TabKey = 'history' | 'routes' | 'training' | 'metabolism' | 'profile';

const TABS: { key: TabKey; label: string; icon: LucideIcon; root: () => preact.VNode }[] = [
  { key: 'history', label: 'History', icon: CalendarDays, root: () => <HistoryHome /> },
  { key: 'routes', label: 'Routes', icon: MapIcon, root: () => <RoutesHome /> },
  { key: 'training', label: 'Training', icon: Dumbbell, root: () => <TrainingHome /> },
  { key: 'metabolism', label: 'Metabolism', icon: Flame, root: () => <MetabolismHome /> },
  { key: 'profile', label: 'Profile', icon: UserRound, root: () => <ProfileHome /> },
];

function App() {
  // The app always opens on Training.
  const [tab, setTab] = useState<TabKey>('training');
  const select = (k: TabKey) => setTab(k);
  return (
    <div class="app">
      <GradientDefs />
      <div class="tabs-body">
        {TABS.map((t) => (
          <div key={t.key} class="tab-panel" style={{ display: t.key === tab ? 'flex' : 'none' }}>
            <Stack root={t.root()} />
          </div>
        ))}
      </div>
      <RestBar />
      <nav class="tabbar">
        {TABS.map((t) => (
          <button key={t.key} class={t.key === tab ? 'active' : ''} onClick={() => select(t.key)}>
            <Ico icon={t.icon} size={24} grad={t.key === tab ? 'main' : undefined} strokeWidth={t.key === tab ? 2.2 : 1.8} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

applyTheme(savedTheme());
render(<App />, document.getElementById('app')!);

// Ask the browser not to evict our data under storage pressure.
navigator.storage?.persist?.().catch(() => {});
// Restore a recording that was interrupted (app closed or reloaded mid-run).
recorder.restore();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
