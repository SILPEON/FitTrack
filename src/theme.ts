/** Colour designs. All are dark; each only swaps the colour tokens defined in styles.css. */
export interface Theme { id: string; name: string; vibe: string; vars: Record<string, string> }

export const THEMES: Theme[] = [
  { id: 'aurora', name: 'Aurora', vibe: 'Current design. The app icon: cyan, violet and pink on deep navy.', vars: {} },
  { id: 'ember', name: 'Ember', vibe: 'Warm charcoal with amber, orange and crimson. Energetic, gym-like.', vars: {
    '--bg': '#110c0b', '--card': '#1e1614', '--text': '#f8efe9', '--sub': '#a8948b', '--sep': '#33261f', '--fill': '#2b201c',
    '--hero-a': '#55200f', '--hero-b': '#1f120e', '--gray-a': '#5a4640', '--gray-b': '#32241f', '--tabbar': 'rgba(20, 13, 11, 0.9)',
    '--p1': '#ffb238', '--p2': '#ff6a3d', '--p3': '#ff2e63', '--p4': '#ff8a3d', '--p5': '#ffd166', '--p6': '#3ddc97', '--p7': '#ff7a59', '--p8': '#ff4d8d',
    '--go-b': '#22c3a6', '--accent': '#ff9466', '--red': '#ff4d6d', '--green': '#3ddc97', '--orange': '#ff8a3d' } },
  { id: 'ocean', name: 'Deep Ocean', vibe: 'Dark petrol blue with aqua, sky and cobalt. Calm and clean.', vars: {
    '--bg': '#06121a', '--card': '#0e1f2a', '--text': '#e8f6fb', '--sub': '#7fa1b0', '--sep': '#1b3442', '--fill': '#16303d',
    '--hero-a': '#0d4a5e', '--hero-b': '#0a2230', '--gray-a': '#3d5866', '--gray-b': '#1f3440', '--tabbar': 'rgba(7, 20, 28, 0.9)',
    '--p1': '#5ef2d6', '--p2': '#22b8e8', '--p3': '#3a7bff', '--p4': '#ffb86b', '--p5': '#ffe08a', '--p6': '#4ff0a8', '--p7': '#2f9bff', '--p8': '#6a8dff',
    '--accent': '#5fd8f2', '--red': '#ff5c7a', '--green': '#4ff0a8', '--orange': '#ffb86b' } },
  { id: 'forest', name: 'Forest', vibe: 'Near-black green with fresh mint, emerald and a touch of gold. Natural, easy on the eyes.', vars: {
    '--bg': '#08110d', '--card': '#111d17', '--text': '#eaf5ee', '--sub': '#86a093', '--sep': '#1f3229', '--fill': '#1a2b23',
    '--hero-a': '#174d35', '--hero-b': '#0c1f17', '--gray-a': '#3f574b', '--gray-b': '#203229', '--tabbar': 'rgba(9, 19, 14, 0.9)',
    '--p1': '#a5e86a', '--p2': '#2ec98f', '--p3': '#11998e', '--p4': '#f2a541', '--p5': '#f7d070', '--p6': '#5be3a0', '--p7': '#2bb3a3', '--p8': '#8fd16a',
    '--accent': '#74e3a8', '--red': '#ff5f6d', '--green': '#5be3a0', '--orange': '#f2a541' } },
  { id: 'amethyst', name: 'Amethyst', vibe: 'Deep purple with lilac, magenta and gold accents. Rich and bold.', vars: {
    '--bg': '#0f0a18', '--card': '#1b1328', '--text': '#f4eefc', '--sub': '#9c8db3', '--sep': '#2e2340', '--fill': '#281d3a',
    '--hero-a': '#46207a', '--hero-b': '#1a1030', '--gray-a': '#4f4166', '--gray-b': '#2c213d', '--tabbar': 'rgba(17, 11, 27, 0.9)',
    '--p1': '#c084fc', '--p2': '#9d4edd', '--p3': '#f15bb5', '--p4': '#ff9e64', '--p5': '#fee440', '--p6': '#3ee0b1', '--p7': '#7b6cff', '--p8': '#e879f9',
    '--go-b': '#2fc6c9', '--accent': '#c9a2ff', '--red': '#ff5c8a', '--green': '#3ee0b1', '--orange': '#ff9e64' } },
  { id: 'oled', name: 'OLED Ice', vibe: 'True black (pixels switch off, saves battery) with cool ice-blue accents. Minimal.', vars: {
    '--bg': '#000000', '--card': '#121214', '--text': '#f5f5f7', '--sub': '#8e8e93', '--sep': '#242426', '--fill': '#1f1f22',
    '--hero-a': '#1a2440', '--hero-b': '#07090f', '--gray-a': '#3a3a3e', '--gray-b': '#1f1f22', '--tabbar': 'rgba(0, 0, 0, 0.88)',
    '--p1': '#8fd3ff', '--p2': '#5e8bff', '--p3': '#4a5bff', '--p4': '#ffad5c', '--p5': '#ffd60a', '--p6': '#30d158', '--p7': '#6f9cff', '--p8': '#8a7dff',
    '--accent': '#8fb4ff', '--red': '#ff453a', '--green': '#30d158', '--orange': '#ff9f0a' } },
];

let cache: Record<string, number[]> = {};
const hexToRgb = (h: string) => {
  const m = h.trim().replace('#', '');
  const f = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
};
/** A palette token as [r, g, b] (cached; call refreshPalette after switching theme). */
export function rgbOf(name: string): number[] {
  if (!cache[name]) cache[name] = hexToRgb(getComputedStyle(document.documentElement).getPropertyValue(name) || '#888888');
  return cache[name];
}
export const cssColor = (name: string) => `rgb(${rgbOf(name).join(',')})`;
export const refreshPalette = () => { cache = {}; };

const AURORA: Record<string, string> = { '--bg': '#0b0d1a', '--card': '#161a2e', '--text': '#eef0fb', '--p1': '#36c6ff', '--p2': '#8b5cf6', '--p3': '#ff4f9a', '--p6': '#2ee6b0' };
/** Colours used to draw a theme's preview swatch, independent of the active theme. */
export const previewOf = (t: Theme) => ({ ...AURORA, ...t.vars });

const KEY = 'theme';
export function savedTheme(): string {
  try { return localStorage.getItem(KEY) ?? 'aurora'; } catch { return 'aurora'; }
}
export function setTheme(id: string) {
  try { localStorage.setItem(KEY, id); } catch { /* private mode: applies for this session only */ }
  applyTheme(id);
}

export function applyTheme(id: string) {
  const t = THEMES.find((x) => x.id === id) ?? THEMES[0];
  const root = document.documentElement;
  for (const th of THEMES) for (const k of Object.keys(th.vars)) root.style.removeProperty(k);
  for (const [k, v] of Object.entries(t.vars)) root.style.setProperty(k, v);
  refreshPalette();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim());
}
