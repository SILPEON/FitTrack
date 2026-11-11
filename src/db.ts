import Dexie, { type EntityTable } from 'dexie';
import { EXERCISES, FOODS } from './seed';
import { LIBRARY } from './plans';

export const MUSCLES = ['Glutes', 'Quads', 'Chest', 'Shoulders', 'Neck', 'Biceps', 'Triceps', 'Back', 'Upper back', 'Core',
  'Hamstrings', 'Forearms', 'Calves', 'Full Body'] as const;

export interface Exercise { id: number; name: string; muscle: string; equipment: string; custom: boolean }
export interface SetEntry { reps: number; weight: number; done?: boolean; side?: 'L' | 'R' }
export interface WorkoutEntry {
  exerciseId: number; sets: SetEntry[];
  /** Set when the workout was started from a plan. */
  target?: string; rest?: number; note?: string; done?: boolean;
  /** Your own note for this exercise in this workout (note above is the plan's coaching hint). */
  userNote?: string;
}
export interface Workout { id: number; date: number; title: string; notes: string; entries: WorkoutEntry[]; planId?: string; dayId?: string; finishedAt?: number }
export interface WeightEntry { id: number; day: string; kg: number }
/** Nutrients per 100 g. */
export interface Food {
  id: number; name: string; kcal: number; protein: number; carbs: number; fat: number; fiber: number; custom: boolean; lastUsed?: number;
  /** Set for scanned products (EAN/UPC). */
  barcode?: string; brand?: string; unit?: 'g' | 'ml'; servingG?: number; packageG?: number;
}
export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export const MEALS: { key: Meal; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' }, { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' }, { key: 'snack', label: 'Snacks' },
];
/** A logged food; values are absolute for the logged amount. */
export interface FoodLog { id: number; day: string; meal: Meal; name: string; grams: number; unit?: 'g' | 'ml'; kcal: number; protein: number; carbs: number; fat: number; fiber: number; time: number }
export type Activity = 'walk' | 'run' | 'bike';
/** [lat, lon, altitude|null, timestamp|null] */
export type Pt = [number, number, number | null, number | null];
export interface Route { id: number; name: string; date: number; activity: Activity; planned: boolean; distance: number; duration: number; elevation: number; points: Pt[] }
export interface KV { key: string; value: unknown }
export type Pose = 'front' | 'side' | 'back';
export interface Photo { id: number; day: string; time: number; pose: Pose; blob: Blob; w: number; h: number; note?: string }
export interface YogaSession { id: number; day: string; time: number; routineId: string; secs: number }
/** Flexibility measurements in cm (each optional). Splits: lowest point of the hips/crotch to the floor. */
export interface MobilityTest { id: number; day: string; toeTouchCm?: number; frontLCm?: number; frontRCm?: number; middleCm?: number }
/** Bowel movement, Bristol Stool Scale type 1–7. */
export interface Stool { id: number; day: string; time: number; type: number; urgency?: boolean; strain?: boolean; pain?: boolean; blood?: boolean; note?: string }

export const db = new Dexie('fittrack') as Dexie & {
  exercises: EntityTable<Exercise, 'id'>;
  workouts: EntityTable<Workout, 'id'>;
  weights: EntityTable<WeightEntry, 'id'>;
  foods: EntityTable<Food, 'id'>;
  foodLog: EntityTable<FoodLog, 'id'>;
  routes: EntityTable<Route, 'id'>;
  kv: EntityTable<KV, 'key'>;
  photos: EntityTable<Photo, 'id'>;
  yogaSessions: EntityTable<YogaSession, 'id'>;
  mobility: EntityTable<MobilityTest, 'id'>;
  stool: EntityTable<Stool, 'id'>;
};

db.version(1).stores({
  exercises: '++id, name, muscle',
  workouts: '++id, date',
  weights: '++id, day',
  foods: '++id, name, lastUsed',
  foodLog: '++id, day',
  routes: '++id, date',
  kv: 'key',
});

// v2: barcode index for scanned products.
db.version(2).stores({ foods: '++id, name, lastUsed, barcode' });

// v3: progress photos, yoga sessions, mobility tests; training-plan exercises in the library.
db.version(3).stores({ photos: '++id, day, pose, time', yogaSessions: '++id, day', mobility: '++id, day' }).upgrade(async (tx) => {
  const have = new Set((await tx.table('exercises').toArray()).map((e: Exercise) => e.name));
  const add = LIBRARY.filter((e) => !have.has(e.name)).map((e) => ({ name: e.name, muscle: e.group, equipment: e.equipment, custom: false }));
  if (add.length) await tx.table('exercises').bulkAdd(add);
});

// v4: stool diary.
db.version(4).stores({ stool: '++id, day' });

db.on('populate', (tx) => {
  const seeded = new Set(EXERCISES.map(([name]) => name));
  tx.table('exercises').bulkAdd([
    ...EXERCISES.map(([name, muscle, equipment]) => ({ name, muscle, equipment, custom: false })),
    ...LIBRARY.filter((e) => !seeded.has(e.name)).map((e) => ({ name: e.name, muscle: e.group, equipment: e.equipment, custom: false })),
  ]);
  tx.table('foods').bulkAdd(FOODS.map(([name, kcal, protein, carbs, fat, fiber]) => ({ name, kcal, protein, carbs, fat, fiber, custom: false })));
});

// ---------- Profile ----------

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive';
export type Goal = 'lose' | 'maintain' | 'gain';
export interface Profile {
  sex: Sex; birthDate: string; heightCm: number; activity: ActivityLevel; goal: Goal;
  targetKg: number; weeklyKg: number; proteinPerKg: number; fatPercent: number;
}

export const DEFAULT_PROFILE: Profile = {
  sex: 'male', birthDate: `${new Date().getFullYear() - 30}-01-01`, heightCm: 175, activity: 'moderate',
  goal: 'maintain', targetKg: 75, weeklyKg: 0.5, proteinPerKg: 1.8, fatPercent: 25,
};

export async function getProfile(): Promise<Profile> {
  const row = await db.kv.get('profile');
  return { ...DEFAULT_PROFILE, ...((row?.value as Partial<Profile>) ?? {}) };
}

export async function saveProfile(p: Profile) {
  await db.kv.put({ key: 'profile', value: p });
}

// ---------- Backup ----------

const TABLES = ['exercises', 'workouts', 'weights', 'foods', 'foodLog', 'routes', 'kv', 'yogaSessions', 'mobility', 'photos', 'stool'] as const;

const blobToDataURL = (b: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(b);
});
const dataURLToBlob = async (u: string) => (await fetch(u)).blob();

export async function exportBackup(): Promise<string> {
  const data: Record<string, unknown[]> = {};
  for (const t of TABLES) data[t] = await db.table(t).toArray();
  data.photos = await Promise.all((data.photos as Photo[]).map(async (p) => ({ ...p, blob: await blobToDataURL(p.blob) })));
  return JSON.stringify({ app: 'FitTrack', version: 1, exported: new Date().toISOString(), data });
}

export async function importBackup(json: string) {
  const parsed = JSON.parse(json);
  if (parsed?.app !== 'FitTrack' || !parsed.data) throw new Error('This is not a FitTrack backup file.');
  // Photos are stored as data URLs in the file; turn them back into images before the transaction.
  if (Array.isArray(parsed.data.photos)) {
    parsed.data.photos = await Promise.all(parsed.data.photos.map(async (p: Photo & { blob: unknown }) =>
      ({ ...p, blob: typeof p.blob === 'string' ? await dataURLToBlob(p.blob) : p.blob })));
  }
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      if (!(t in parsed.data)) continue; // older backups: keep data they don't contain (e.g. photos)
      await db.table(t).clear();
      const rows = parsed.data[t];
      if (Array.isArray(rows) && rows.length) await db.table(t).bulkAdd(rows);
    }
  });
}
