import L from 'leaflet';
import type { Activity } from './db';

/** Creates a Leaflet map with OpenStreetMap tiles. */
export function createMap(el: HTMLElement, center: [number, number] = [51.1657, 10.4515], zoom = 6) {
  const map = L.map(el, { zoomControl: false, attributionControl: true }).setView(center, zoom);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  map.attributionControl.setPrefix(false);
  return map;
}

export const dotIcon = (label: string, color: string) => L.divIcon({
  className: '',
  html: `<div class="map-dot" style="background:${color}">${label}</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

export const userIcon = L.divIcon({ className: '', html: '<div class="user-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });

/**
 * Routes one leg along paths using the free OSRM servers run by FOSSGIS (OpenStreetMap data).
 * Returns null when offline or the server fails, so the caller can fall back to a straight line.
 */
export async function routeLeg(a: [number, number], b: [number, number], activity: Activity): Promise<[number, number][] | null> {
  const profile = activity === 'bike' ? 'routed-bike' : 'routed-foot';
  const url = `https://routing.openstreetmap.de/${profile}/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const coords: [number, number][] | undefined = json?.routes?.[0]?.geometry?.coordinates;
    return coords && coords.length > 1 ? coords.map(([lon, lat]) => [lat, lon]) : null;
  } catch {
    return null;
  }
}

/** Place search with OpenStreetMap Nominatim. */
export async function searchPlace(q: string): Promise<{ lat: number; lon: number; bbox?: [number, number, number, number] } | null> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`);
    const [hit] = await res.json();
    if (!hit) return null;
    const bb = hit.boundingbox?.map(Number);
    return { lat: Number(hit.lat), lon: Number(hit.lon), bbox: bb ? [bb[0], bb[1], bb[2], bb[3]] : undefined };
  } catch {
    return null;
  }
}
