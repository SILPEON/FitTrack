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
import { YogaHome } from './tabs/Yoga';
import { recorder } from './recorder';
import { Dumbbell, Flower2, Map as MapIcon, Scale, UserRound, Utensils, type LucideIcon } from 'lucide-preact';
import { GradientDefs, Ico } from './icons';
import { RestBar } from './RestBar';

type TabKey = 'training' | 'yoga' | 'weight' | 'nutrition' | 'routes' | 'profile';

const TABS: { key: TabKey; label: string; icon: LucideIcon; root: () => preact.VNode }[] = [
  { key: 'training', label: 'Training', icon: Dumbbell, root: () => <TrainingHome /> },
  { key: 'yoga', label: 'Yoga', icon: Flower2, root: () => <YogaHome /> },
  { key: 'weight', label: 'Weight', icon: Scale, root: () => <WeightHome /> },
  { key: 'nutrition', label: 'Nutrition', icon: Utensils, root: () => <NutritionHome /> },
  { key: 'routes', label: 'Routes', icon: MapIcon, root: () => <RoutesHome /> },
  { key: 'profile', label: 'Profile', icon: UserRound, root: () => <ProfileHome /> },
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

render(<App />, document.getElementById('app')!);

// Ask the browser not to evict our data under storage pressure.
navigator.storage?.persist?.().catch(() => {});
// Restore a recording that was interrupted (app closed or reloaded mid-run).
recorder.restore();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
