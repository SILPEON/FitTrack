import Dexie, { type EntityTable } from 'dexie';
import { EXERCISES, FOODS } from './seed';

export const MUSCLES = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms', 'Quads',
  'Hamstrings', 'Glutes', 'Calves', 'Core', 'Full Body'] as const;

export interface Exercise { id: number; name: string; muscle: string; equipment: string; custom: boolean }
export interface SetEntry { reps: number; weight: number }
export interface WorkoutEntry { exerciseId: number; sets: SetEntry[] }
export interface Workout { id: number; date: number; title: string; notes: string; entries: WorkoutEntry[] }
export interface WeightEntry { id: number; day: string; kg: number }
/** Nutrients per 100 g. */
export interface Food { id: number; name: string; kcal: number; protein: number; carbs: number; fat: number; fiber: number; custom: boolean; lastUsed?: number }
export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export const MEALS: { key: Meal; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' }, { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' }, { key: 'snack', label: 'Snacks' },
];
/** A logged food; values are absolute for the logged amount. */
export interface FoodLog { id: number; day: string; meal: Meal; name: string; grams: number; kcal: number; protein: number; carbs: number; fat: number; fiber: number; time: number }
export type Activity = 'walk' | 'run' | 'bike';
/** [lat, lon, altitude|null, timestamp|null] */
export type Pt = [number, number, number | null, number | null];
export interface Route { id: number; name: string; date: number; activity: Activity; planned: boolean; distance: number; duration: number; elevation: number; points: Pt[] }
export interface KV { key: string; value: unknown }

export const db = new Dexie('fittrack') as Dexie & {
  exercises: EntityTable<Exercise, 'id'>;
  workouts: EntityTable<Workout, 'id'>;
  weights: EntityTable<WeightEntry, 'id'>;
  foods: EntityTable<Food, 'id'>;
  foodLog: EntityTable<FoodLog, 'id'>;
  routes: EntityTable<Route, 'id'>;
  kv: EntityTable<KV, 'key'>;
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

db.on('populate', (tx) => {
  tx.table('exercises').bulkAdd(EXERCISES.map(([name, muscle, equipment]) => ({ name, muscle, equipment, custom: false })));
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

const TABLES = ['exercises', 'workouts', 'weights', 'foods', 'foodLog', 'routes', 'kv'] as const;

export async function exportBackup(): Promise<string> {
  const data: Record<string, unknown[]> = {};
  for (const t of TABLES) data[t] = await db.table(t).toArray();
  return JSON.stringify({ app: 'FitTrack', version: 1, exported: new Date().toISOString(), data });
}

export async function importBackup(json: string) {
  const parsed = JSON.parse(json);
  if (parsed?.app !== 'FitTrack' || !parsed.data) throw new Error('This is not a FitTrack backup file.');
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear();
      const rows = parsed.data[t];
      if (Array.isArray(rows) && rows.length) await db.table(t).bulkAdd(rows);
    }
  });
}
