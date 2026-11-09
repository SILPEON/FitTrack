import type { Activity, ActivityLevel, Profile, Pt } from './db';

// ---------- Formatting & parsing ----------

export const fmt = (n: number, maxFrac = 1, minFrac = 0) =>
  n.toLocaleString(undefined, { maximumFractionDigits: maxFrac, minimumFractionDigits: minFrac });

/** Accepts "72,5" and "72.5". */
export const parseNum = (s: string): number | null => {
  const v = parseFloat(s.replace(',', '.').trim());
  return Number.isFinite(v) ? v : null;
};

export const fmtDistance = (m: number) => (m >= 1000 ? `${fmt(m / 1000, 2, 2)} km` : `${Math.round(m)} m`);

export const fmtDuration = (sec: number) => {
  const t = Math.max(0, Math.floor(sec));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const p = (x: number) => String(x).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
};

export const fmtPace = (dist: number, sec: number) =>
  dist > 50 && sec > 0 ? `${fmtDuration(sec / (dist / 1000))} /km` : '–';

export const fmtSpeed = (dist: number, sec: number) => (sec > 0 ? `${fmt((dist / sec) * 3.6, 1, 1)} km/h` : '–');

export const fmtDate = (d: number | string | Date, withTime = false) =>
  new Date(typeof d === 'string' ? d + (d.length === 10 ? 'T12:00:00' : '') : d).toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });

// ---------- Dates ----------

/** Local calendar day as YYYY-MM-DD. */
export const dayKey = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const shiftDay = (key: string, days: number) => {
  const d = new Date(key + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return dayKey(d);
};

/** Value for <input type="datetime-local">. */
export const toLocalInput = (ts: number) => {
  const d = new Date(ts);
  return `${dayKey(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// ---------- Health ----------

export const ACTIVITY_LEVELS: { key: ActivityLevel; label: string; detail: string; factor: number }[] = [
  { key: 'sedentary', label: 'Sedentary', detail: 'Desk job, little or no exercise', factor: 1.2 },
  { key: 'light', label: 'Lightly active', detail: 'Light exercise 1–3 days/week', factor: 1.375 },
  { key: 'moderate', label: 'Moderately active', detail: 'Moderate exercise 3–5 days/week', factor: 1.55 },
  { key: 'active', label: 'Very active', detail: 'Hard exercise 6–7 days/week', factor: 1.725 },
  { key: 'veryActive', label: 'Extremely active', detail: 'Physical job plus hard training', factor: 1.9 },
];

/** kcal per kg of body weight change (common approximation). */
export const KCAL_PER_KG = 7700;

export const age = (birthDate: string, now = new Date()) => {
  const b = new Date(birthDate + 'T12:00:00');
  let a = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) a--;
  return a;
};

/** BMI = kg / m² */
export const bmi = (kg: number, cm: number) => (cm > 0 ? kg / (cm / 100) ** 2 : 0);

/** WHO adult classification. */
export const bmiCategory = (b: number) =>
  b < 16 ? 'Severely underweight' : b < 18.5 ? 'Underweight' : b < 25 ? 'Normal weight'
    : b < 30 ? 'Overweight' : b < 35 ? 'Obesity class I' : b < 40 ? 'Obesity class II' : 'Obesity class III';

export const healthyRange = (cm: number): [number, number] => {
  const m2 = (cm / 100) ** 2;
  return [18.5 * m2, 24.9 * m2];
};

/** Mifflin-St Jeor resting energy expenditure. */
export const bmr = (kg: number, cm: number, years: number, sex: 'male' | 'female') =>
  10 * kg + 6.25 * cm - 5 * years + (sex === 'male' ? 5 : -161);

/** Epley estimated one-rep max. */
export const oneRepMax = (weight: number, reps: number) =>
  reps <= 0 || weight <= 0 ? 0 : reps === 1 ? weight : weight * (1 + reps / 30);

export interface Targets { bmr: number; tdee: number; calories: number; protein: number; carbs: number; fat: number; fiber: number; warnings: string[] }

export function targets(p: Profile, kg: number): Targets {
  const warnings: string[] = [];
  const base = bmr(kg, p.heightCm, age(p.birthDate), p.sex);
  const factor = ACTIVITY_LEVELS.find((a) => a.key === p.activity)?.factor ?? 1.55;
  const tdee = base * factor;
  const delta = (p.weeklyKg * KCAL_PER_KG) / 7;

  let calories = tdee;
  if (p.goal === 'lose') {
    calories = tdee - delta;
    if (p.targetKg >= kg) warnings.push("Your goal is to lose weight but your target weight isn't below your current weight.");
    if (p.weeklyKg > kg * 0.01) warnings.push('Losing more than ~1% of body weight per week raises the risk of muscle loss.');
  } else if (p.goal === 'gain') {
    calories = tdee + delta;
    if (p.targetKg <= kg) warnings.push("Your goal is to gain weight but your target weight isn't above your current weight.");
    if (p.weeklyKg > 0.5) warnings.push('Gaining faster than ~0.25–0.5 kg per week mostly adds fat, not muscle.');
  }

  const floor = p.sex === 'male' ? 1500 : 1200;
  if (calories < floor) {
    calories = floor;
    warnings.push(`Target raised to ${floor} kcal, a common minimum for unsupervised dieting. Choose a slower rate or talk to a doctor.`);
  }

  let proteinBasis = kg;
  if (bmi(kg, p.heightCm) >= 30) {
    proteinBasis = 25 * (p.heightCm / 100) ** 2;
    warnings.push(`Protein is based on an adjusted weight of ${Math.round(proteinBasis)} kg because BMI is 30 or more.`);
  }
  const protein = p.proteinPerKg * proteinBasis;
  const fat = (calories * p.fatPercent) / 100 / 9;
  const carbs = Math.max(0, (calories - protein * 4 - fat * 9) / 4);
  if (carbs === 0) warnings.push('Protein and fat use up all your calories. Lower the protein or fat setting.');
  const fiber = (calories / 1000) * 14;

  return { bmr: base, tdee, calories, protein, carbs, fat, fiber, warnings };
}

// ---------- Geo ----------

export const ACTIVITIES: { key: Activity; label: string; icon: string; speedKmh: number }[] = [
  { key: 'walk', label: 'Walk', icon: '🚶', speedKmh: 5 },
  { key: 'run', label: 'Run', icon: '🏃', speedKmh: 10 },
  { key: 'bike', label: 'Bike', icon: '🚴', speedKmh: 20 },
];
export const activityInfo = (a: Activity) => ACTIVITIES.find((x) => x.key === a) ?? ACTIVITIES[0];

/** Great-circle distance in meters. */
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371008.8, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export const pathDistance = (pts: [number, number][] | Pt[]) => {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += haversine(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
  return d;
};

// ---------- GPX ----------

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function toGPX(name: string, points: Pt[]) {
  const pts = points.map(([lat, lon, alt, t]) =>
    `<trkpt lat="${lat}" lon="${lon}">${alt != null ? `<ele>${alt.toFixed(1)}</ele>` : ''}${t != null ? `<time>${new Date(t).toISOString()}</time>` : ''}</trkpt>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="FitTrack" xmlns="http://www.topografix.com/GPX/1/1">\n<trk><name>${esc(name)}</name><trkseg>\n${pts}\n</trkseg></trk>\n</gpx>\n`;
}

export function parseGPX(xml: string): { name: string; points: Pt[] } {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  let nodes = Array.from(doc.getElementsByTagName('trkpt'));
  if (!nodes.length) nodes = Array.from(doc.getElementsByTagName('rtept'));
  if (!nodes.length) nodes = Array.from(doc.getElementsByTagName('wpt'));
  const points: Pt[] = nodes.map((n): Pt => {
    const ele = n.getElementsByTagName('ele')[0]?.textContent;
    const time = n.getElementsByTagName('time')[0]?.textContent;
    return [parseFloat(n.getAttribute('lat') || '0'), parseFloat(n.getAttribute('lon') || '0'),
      ele ? parseFloat(ele) : null, time ? Date.parse(time) : null];
  }).filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
  const name = doc.getElementsByTagName('name')[0]?.textContent?.trim() || 'Imported route';
  return { name, points };
}

/** Share a file via the iOS share sheet, falling back to a download. */
export async function shareFile(filename: string, content: string, mime: string) {
  const file = new File([content], filename, { type: mime });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); return; } catch (e) {
      if ((e as DOMException).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
