import { db, type Food } from './db';

/**
 * Product lookup in Open Food Facts (openfoodfacts.org): a free, open database of
 * packaged foods with very good coverage of European products. Values are per 100 g / 100 ml.
 */
export type Lookup =
  | { status: 'found'; food: Food }                  // complete nutrition data, saved locally
  | { status: 'incomplete'; name: string; brand?: string; unit: 'g' | 'ml' } // product known, nutrition missing
  | { status: 'not-found' }
  | { status: 'offline' };

const FIELDS = 'code,product_name,product_name_de,product_name_en,generic_name,brands,nutriments,serving_quantity,product_quantity,product_quantity_unit,quantity';

const num = (v: unknown): number | undefined => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

/** Checks the local database first (works offline), then Open Food Facts. New products are saved locally. */
export async function lookupBarcode(code: string): Promise<Lookup> {
  const local = await db.foods.where('barcode').equals(code).first();
  if (local) return { status: 'found', food: local };

  let json: any;
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`);
    if (res.status === 404) return { status: 'not-found' };
    if (!res.ok) return { status: 'offline' };
    json = await res.json();
  } catch {
    return { status: 'offline' };
  }
  const p = json?.product;
  if (json?.status !== 1 || !p) return { status: 'not-found' };

  const n = p.nutriments ?? {};
  const unitRaw = String(p.product_quantity_unit ?? p.quantity ?? '').toLowerCase();
  const unit: 'g' | 'ml' = /\bml\b|\bcl\b|\bl\b/.test(unitRaw) ? 'ml' : 'g';
  const name = String(p.product_name_de || p.product_name || p.product_name_en || p.generic_name || '').trim() || `Product ${code}`;
  const brand = String(p.brands ?? '').split(',')[0].trim() || undefined;

  let kcal = num(n['energy-kcal_100g']);
  if (kcal == null) {
    const kj = num(n['energy-kj_100g']) ?? num(n['energy_100g']);
    if (kj != null) kcal = kj / 4.184;
  }
  const protein = num(n['proteins_100g']);
  const carbs = num(n['carbohydrates_100g']);
  const fat = num(n['fat_100g']);
  if (kcal == null || protein == null || carbs == null || fat == null) return { status: 'incomplete', name, brand, unit };

  const food = {
    name: brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${name} (${brand})` : name,
    brand, barcode: code, unit, kcal, protein, carbs, fat, fiber: num(n['fiber_100g']) ?? 0,
    servingG: num(p.serving_quantity), packageG: num(p.product_quantity), custom: true,
  } as Food;
  food.id = await db.foods.add(food);
  return { status: 'found', food };
}

/** EAN-8/EAN-13/UPC-A check digit validation, to reject misreads before hitting the network. */
export function validBarcode(code: string) {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}
