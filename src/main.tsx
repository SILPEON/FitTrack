import { render } from 'preact';
import { useState } from 'preact/hooks';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import { Stack } from './ui';
import { TrainingHome } from './tabs/Training';
import { WeightHome } from './tabs/Weight';
import { NutritionHome } from './tabs/Nutrition';
import { RoutesHome } from './tabs/Routes';
import { ProfileHome } from './tabs/Profile';
import { recorder } from './recorder';

type TabKey = 'training' | 'weight' | 'nutrition' | 'routes' | 'profile';

const TABS: { key: TabKey; label: string; icon: string; root: () => preact.VNode }[] = [
  { key: 'training', label: 'Training', icon: '🏋️', root: () => <TrainingHome /> },
  { key: 'weight', label: 'Weight', icon: '⚖️', root: () => <WeightHome /> },
  { key: 'nutrition', label: 'Nutrition', icon: '🍽️', root: () => <NutritionHome /> },
  { key: 'routes', label: 'Routes', icon: '🗺️', root: () => <RoutesHome /> },
  { key: 'profile', label: 'Profile', icon: '👤', root: () => <ProfileHome /> },
];

function App() {
  const [tab, setTab] = useState<TabKey>(() => {
    try { return (localStorage.getItem('tab') as TabKey) || 'training'; } catch { return 'training'; }
  });
  const select = (k: TabKey) => {
    setTab(k);
    try { localStorage.setItem('tab', k); } catch { /* ignore */ }
  };
  return (
    <div class="app">
      <div class="tabs-body">
        {TABS.map((t) => (
          <div key={t.key} class="tab-panel" style={{ display: t.key === tab ? 'flex' : 'none' }}>
            <Stack root={t.root()} />
          </div>
        ))}
      </div>
      <nav class="tabbar">
        {TABS.map((t) => (
          <button key={t.key} class={t.key === tab ? 'active' : ''} onClick={() => select(t.key)}>
            <span class="tab-icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

render(<App />, document.getElementById('app')!);

// Ask the browser not to evict our data under storage pressure.
navigator.storage?.persist?.().catch(() => {});
// Restore a recording that was interrupted (app closed or reloaded mid-run).
recorder.restore();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
