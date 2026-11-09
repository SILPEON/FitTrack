import { useEffect, useRef, useState } from 'preact/hooks';
import L from 'leaflet';
import { db, type Activity, type Pt, type Route } from '../db';
import { ACTIVITIES, activityInfo, fmt, fmtDate, fmtDistance, fmtDuration, fmtPace, fmtSpeed, parseGPX, pathDistance, shareFile, toGPX } from '../calc';
import { createMap, dotIcon, routeLeg, searchPlace, userIcon } from '../map';
import { recorder } from '../recorder';
import { ActionRow, ActionSheet, Empty, Page, Row, Section, Segmented, useLive, useNav, Overlay } from '../ui';
import { Compass, Lock, LocateFixed, Pause, Play, Repeat, Route as RouteIcon, Square, Trash, Undo2, Upload } from 'lucide-preact';
import { Ico } from '../icons';

function useRecorder() {
  const [, force] = useState(0);
  useEffect(() => recorder.subscribe(() => force((n) => n + 1)), []);
  return recorder;
}

/** A Leaflet map that fills its container and stays sized correctly when shown/hidden. */
function MapBox({ onReady, class: cls }: { onReady: (map: L.Map) => void | (() => void); class?: string }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const map = createMap(el.current!);
    const cleanup = onReady(map);
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el.current!);
    return () => { ro.disconnect(); if (typeof cleanup === 'function') cleanup(); map.remove(); };
  }, []);
  return <div ref={el} class={cls ?? 'map'} />;
}

// ---------- Home ----------

export function RoutesHome() {
  const nav = useNav();
  const rec = useRecorder();
  const routes = useLive(() => db.routes.orderBy('date').reverse().toArray(), [], [] as Route[]);
  const [planned, setPlanned] = useState<'recorded' | 'planned'>('recorded');
  const [menu, setMenu] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const visible = routes.filter((r) => r.planned === (planned === 'planned'));
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const month = routes.filter((r) => !r.planned && r.date >= monthStart);

  const importGPX = async (file: File) => {
    try {
      const { name, points } = parseGPX(await file.text());
      if (points.length < 2) throw new Error('No track points found.');
      await db.routes.add({ name, date: Date.now(), activity: 'walk', planned: true, distance: pathDistance(points), duration: 0, elevation: 0, points } as Route);
      setPlanned('planned');
    } catch (e) { alert(`Import failed: ${(e as Error).message}`); }
  };

  return (
    <Page title="Routes"
      left={<button class="link" onClick={() => setMenu(true)}>Plan</button>}
      actions={<button class="record-btn" onClick={() => nav.push(<RecordScreen />)}><span class="rec-dot" />Record</button>}>
      {rec.state !== 'idle' && (
        <Section>
          <Row onClick={() => nav.push(<RecordScreen />)}>
            <span class="rec-dot" /><span class="danger-text bold row-main">{rec.state === 'recording' ? 'Recording' : 'Paused'}: {fmtDistance(rec.distance)}. Tap to open.</span>
          </Row>
        </Section>
      )}
      <div class="pad">
        <Segmented value={planned} onChange={setPlanned} options={[{ key: 'recorded', label: 'Recorded' }, { key: 'planned', label: 'Planned' }]} />
      </div>
      <Section>
        {visible.length === 0 && (planned === 'planned'
          ? <Empty icon={Compass} title="No planned routes" text="Tap Plan to draw a route on the map or import a GPX file." />
          : <Empty icon={RouteIcon} title="No recorded routes" text="Tap Record to track a walk, run or ride." />)}
        {visible.map((r) => (
          <Row key={r.id} chevron onClick={() => nav.push(<RouteDetail id={r.id} />)}>
            <span class={`icon-badge ${r.planned ? 'violet' : ''}`}><Ico icon={activityInfo(r.activity).icon} size={20} /></span>
            <div class="row-main">
              <b>{r.name}</b>
              <div class="sub small">{fmtDate(r.date, !r.planned)}</div>
            </div>
            <div class="row-value right-col">
              <b>{fmtDistance(r.distance)}</b>
              {!r.planned && <div class="sub small">{fmtDuration(r.duration)}</div>}
            </div>
          </Row>
        ))}
      </Section>
      {planned === 'recorded' && month.length > 0 && (
        <Section title="This month">
          {ACTIVITIES.map((a) => {
            const items = month.filter((r) => r.activity === a.key);
            if (!items.length) return null;
            return <Row label={<span class="inline-icon"><Ico icon={a.icon} size={18} grad="main" />{items.length}× {a.label}</span>}
              value={`${fmtDistance(items.reduce((s, r) => s + r.distance, 0))} · ${fmtDuration(items.reduce((s, r) => s + r.duration, 0))}`} />;
          })}
        </Section>
      )}
      <input ref={fileRef} type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" style={{ display: 'none' }}
        onChange={(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) importGPX(f); (e.target as HTMLInputElement).value = ''; }} />
      <ActionSheet open={menu} onClose={() => setMenu(false)} actions={[
        { label: 'Draw a route on the map', run: () => nav.push(<PlannerScreen />) },
        { label: 'Import GPX file', run: () => fileRef.current?.click() },
      ]} />
    </Page>
  );
}

// ---------- Detail ----------

function RouteDetail({ id }: { id: number }) {
  const nav = useNav();
  const route = useLive(() => db.routes.get(id), [id], undefined as Route | undefined);
  if (!route) return <Page title="Route"><div /></Page>;
  const a = activityInfo(route.activity);

  return (
    <Page title={route.name}>
      <div class="map-card">
        <MapBox class="map" onReady={(map) => {
          const latlngs = route.points.map((p) => [p[0], p[1]] as [number, number]);
          if (latlngs.length) {
            const line = L.polyline(latlngs, { color: route.planned ? '#8b5cf6' : '#4f7bff', weight: 5 }).addTo(map);
            L.marker(latlngs[0], { icon: dotIcon('S', '#22d3a0') }).addTo(map);
            L.marker(latlngs[latlngs.length - 1], { icon: dotIcon('E', '#ff4f9a') }).addTo(map);
            map.fitBounds(line.getBounds(), { padding: [24, 24] });
          }
        }} />
      </div>
      <Section title="Details">
        <Row><input class="text-input" value={route.name} onInput={(e) => db.routes.update(id, { name: (e.target as HTMLInputElement).value })} /></Row>
        <Row>
          <span class="row-main">Activity</span>
          <select value={route.activity} onChange={(e) => db.routes.update(id, { activity: (e.target as HTMLSelectElement).value as Activity })}>
            {ACTIVITIES.map((x) => <option value={x.key}>{x.label}</option>)}
          </select>
        </Row>
        <Row label="Distance" value={fmtDistance(route.distance)} />
        {route.planned
          ? <Row label="Estimated time" value={`${fmtDuration((route.distance / 1000 / a.speedKmh) * 3600)} at ${a.speedKmh} km/h`} />
          : <>
              <Row label="Moving time" value={fmtDuration(route.duration)} />
              {route.activity === 'bike'
                ? <Row label="Avg. speed" value={fmtSpeed(route.distance, route.duration)} />
                : <Row label="Avg. pace" value={fmtPace(route.distance, route.duration)} />}
              <Row label="Elevation gain" value={`${fmt(route.elevation, 0)} m`} />
            </>}
        <Row label="Date" value={fmtDate(route.date, true)} />
      </Section>
      <Section>
        <ActionRow icon={route.planned ? Play : Repeat} bold label={route.planned ? 'Start this route' : 'Do this route again'}
          onClick={() => nav.push(<RecordScreen guide={route.points} />)} />
        <ActionRow icon={Upload} label="Export GPX"
          onClick={() => shareFile(`${route.name.replace(/[^\w-]+/g, '_') || 'route'}.gpx`, toGPX(route.name, route.points), 'application/gpx+xml')} />
        <ActionRow icon={Trash} danger label="Delete route" onClick={() => { if (confirm('Delete this route?')) { db.routes.delete(id); nav.pop(); } }} />
      </Section>
    </Page>
  );
}

// ---------- Recorder ----------

function RecordScreen({ guide }: { guide?: Pt[] }) {
  const nav = useNav();
  const rec = useRecorder();
  const [activity, setActivity] = useState<Activity>(rec.state === 'idle' ? 'run' : rec.activity);
  const [, tick] = useState(0);
  const [locked, setLocked] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const trackRef = useRef<L.Polyline | null>(null);
  const userRef = useRef<L.Marker | null>(null);
  const follow = useRef(true);

  useEffect(() => {
    recorder.startWatching();
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => { clearInterval(t); recorder.stopWatching(); };
  }, []);

  // Keep the map in sync with the recorder.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    trackRef.current?.setLatLngs(rec.points.map((p) => [p[0], p[1]] as [number, number]));
    const c = rec.current?.coords;
    if (c) {
      const ll: [number, number] = [c.latitude, c.longitude];
      if (!userRef.current) userRef.current = L.marker(ll, { icon: userIcon }).addTo(map);
      else userRef.current.setLatLng(ll);
      if (follow.current) map.setView(ll, Math.max(map.getZoom(), 16), { animate: false });
    }
  });

  const finish = async () => {
    recorder.pause();
    if (rec.points.length < 2) {
      if (confirm('Not enough GPS points to save a route yet. Discard it?')) { await recorder.discard(); nav.pop(); }
      return;
    }
    const h = new Date(rec.startDate).getHours();
    const part = h >= 5 && h < 12 ? 'Morning' : h < 17 && h >= 12 ? 'Afternoon' : h >= 17 && h < 22 ? 'Evening' : 'Night';
    const name = prompt('Name this route', `${part} ${activityInfo(rec.activity).label}`);
    if (name === null) return; // cancelled: stays paused
    await recorder.finish(name.trim() || `${part} ${activityInfo(rec.activity).label}`);
    nav.pop();
  };

  const elapsed = rec.elapsed();

  return (
    <Page title={rec.state === 'idle' ? 'Record' : rec.state === 'recording' ? 'Recording' : 'Paused'} noScroll>
      <div class="map-full">
        <MapBox onReady={(map) => {
          mapRef.current = map;
          if (guide?.length) {
            const g = L.polyline(guide.map((p) => [p[0], p[1]] as [number, number]), { color: '#8b5cf6', weight: 6, opacity: 0.6, dashArray: '8 8' }).addTo(map);
            map.fitBounds(g.getBounds(), { padding: [24, 24] });
            follow.current = false;
          }
          trackRef.current = L.polyline([], { color: '#4f7bff', weight: 5 }).addTo(map);
          map.on('dragstart', () => { follow.current = false; });
        }} />
        <button class="map-btn" onClick={() => {
          follow.current = true;
          const c = recorder.current?.coords;
          if (c && mapRef.current) mapRef.current.setView([c.latitude, c.longitude], 16);
        }} aria-label="Center on my location"><Ico icon={LocateFixed} size={22} grad="cool" /></button>
      </div>

      <div class="panel">
        {rec.error && <div class="danger-text small center">{rec.error}</div>}
        {rec.restored && <div class="warn small center">This recording was interrupted. Tap Resume to continue it, or Finish to save it.</div>}
        {rec.state === 'recording' && !rec.wakeLockActive && (
          <div class="warn small center">Keep the screen on and FitTrack open: iPhone stops GPS for web apps when the screen locks.</div>
        )}
        <div class="stats">
          <div><b>{fmtDuration(elapsed)}</b><span>Time</span></div>
          <div><b>{fmtDistance(rec.distance)}</b><span>Distance</span></div>
          {(rec.state === 'idle' ? activity : rec.activity) === 'bike'
            ? <div><b>{fmtSpeed(rec.distance, elapsed)}</b><span>Speed</span></div>
            : <div><b>{fmtPace(rec.distance, elapsed)}</b><span>Pace</span></div>}
        </div>
        {rec.state === 'idle' ? (
          <>
            <Segmented value={activity} onChange={setActivity} options={ACTIVITIES.map((a) => ({ key: a.key, label: <span class="inline-icon"><Ico icon={a.icon} size={16} />{a.label}</span> }))} />
            <button class="big-btn green" onClick={() => recorder.start(activity)}><Ico icon={Play} size={20} />Start</button>
          </>
        ) : (
          <div class="btn-row">
            {rec.state === 'recording'
              ? <button class="big-btn orange" onClick={() => recorder.pause()}><Ico icon={Pause} size={20} />Pause</button>
              : <button class="big-btn green" onClick={() => recorder.resume()}><Ico icon={Play} size={20} />Resume</button>}
            <button class="big-btn red" onClick={finish}><Ico icon={Square} size={18} />Finish</button>
            {rec.state === 'recording' && <button class="big-btn gray narrow" onClick={() => setLocked(true)} aria-label="Pocket lock"><Ico icon={Lock} size={22} /></button>}
          </div>
        )}
      </div>

      {locked && <PocketLock onUnlock={() => setLocked(false)} distance={rec.distance} elapsed={elapsed} />}
    </Page>
  );
}

/** Black screen that ignores taps (pocket mode). Hold for 1.5 s to unlock. Keeps GPS running. */
function PocketLock({ onUnlock, distance, elapsed }: { onUnlock: () => void; distance: number; elapsed: number }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | null>(null);
  const start = () => { setHolding(true); timer.current = window.setTimeout(onUnlock, 1500); };
  const cancel = () => { setHolding(false); if (timer.current) clearTimeout(timer.current); };
  return (
    <Overlay><div class="pocket" onPointerDown={start} onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}>
      <div class="pocket-stats">
        <div>{fmtDistance(distance)}</div>
        <div>{fmtDuration(elapsed)}</div>
      </div>
      <div class={holding ? 'pocket-hint holding' : 'pocket-hint'}>Hold anywhere to unlock</div>
    </div></Overlay>
  );
}

// ---------- Planner ----------

interface Leg { from: [number, number]; to: [number, number]; coords: [number, number][]; routed: boolean }

function PlannerScreen() {
  const nav = useNav();
  const [waypoints, setWaypoints] = useState<[number, number][]>([]);
  const [legs, setLegs] = useState<Leg[]>([]);
  const [activity, setActivity] = useState<Activity>('walk');
  const [snap, setSnap] = useState(true);
  const [pending, setPending] = useState(0);
  const [query, setQuery] = useState('');
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const state = useRef({ waypoints, snap, activity });
  state.current = { waypoints, snap, activity };

  const path: [number, number][] = legs.length ? legs.flatMap((l, i) => (i === 0 ? l.coords : l.coords.slice(1))) : waypoints;
  const distance = pathDistance(path);
  const info = activityInfo(activity);

  const routeLegAt = async (index: number, from: [number, number], to: [number, number], act: Activity) => {
    setPending((n) => n + 1);
    const coords = await routeLeg(from, to, act);
    setPending((n) => n - 1);
    if (!coords) return;
    // Only apply if the leg is still the same one (user may have undone it meanwhile).
    setLegs((ls) => ls.map((l, i) => (i === index && l.from === from && l.to === to ? { ...l, coords, routed: true } : l)));
  };

  const addWaypoint = (ll: [number, number]) => {
    const { waypoints: wps, snap: s, activity: act } = state.current;
    const next = [...wps, ll];
    setWaypoints(next);
    if (next.length >= 2) {
      const from = next[next.length - 2];
      const index = next.length - 2;
      setLegs((ls) => [...ls, { from, to: ll, coords: [from, ll], routed: false }]);
      if (s) routeLegAt(index, from, ll, act);
    }
  };

  const rebuild = (wps: [number, number][], s: boolean, act: Activity) => {
    const ls = wps.slice(1).map((to, i) => ({ from: wps[i], to, coords: [wps[i], to] as [number, number][], routed: false }));
    setLegs(ls);
    if (s) ls.forEach((l, i) => routeLegAt(i, l.from, l.to, act));
  };

  // Redraw map layers.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (path.length > 1) L.polyline(path, { color: '#8b5cf6', weight: 5 }).addTo(layer);
    waypoints.forEach((w, i) => L.marker(w, { icon: dotIcon(String(i + 1), i === 0 ? '#22d3a0' : '#8b5cf6') }).addTo(layer));
  });

  const save = async () => {
    const name = prompt('Name this route', `${info.label} route ${new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`);
    if (name === null) return;
    await db.routes.add({
      name: name.trim() || 'Planned route', date: Date.now(), activity, planned: true,
      distance, duration: 0, elevation: 0, points: path.map(([la, lo]) => [la, lo, null, null] as Pt),
    } as Route);
    nav.pop();
  };

  const search = async () => {
    if (!query.trim() || !mapRef.current) return;
    const hit = await searchPlace(query);
    if (!hit) { alert('Place not found.'); return; }
    if (hit.bbox) mapRef.current.fitBounds([[hit.bbox[0], hit.bbox[2]], [hit.bbox[1], hit.bbox[3]]]);
    else mapRef.current.setView([hit.lat, hit.lon], 14);
  };

  return (
    <Page title="Plan Route" noScroll actions={<button class="link bold" disabled={waypoints.length < 2} onClick={save}>Save</button>}>
      <form class="search-bar overlay-search" onSubmit={(e) => { e.preventDefault(); search(); }}>
        <input type="search" placeholder="Search a place" value={query} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
      </form>
      <div class="map-full">
        <MapBox onReady={(map) => {
          mapRef.current = map;
          layerRef.current = L.layerGroup().addTo(map);
          map.on('click', (e: L.LeafletMouseEvent) => addWaypoint([e.latlng.lat, e.latlng.lng]));
          navigator.geolocation?.getCurrentPosition(
            (p) => { if (!state.current.waypoints.length) map.setView([p.coords.latitude, p.coords.longitude], 15); },
            () => {}, { enableHighAccuracy: false, timeout: 10000 });
        }} />
      </div>
      <div class="panel">
        {waypoints.length === 0
          ? <div class="sub center">Tap the map to add waypoints.</div>
          : (
            <div class="plan-stats">
              <div><b>{fmtDistance(distance)}</b><div class="sub small">≈ {fmtDuration((distance / 1000 / info.speedKmh) * 3600)} at {info.speedKmh} km/h</div></div>
              {pending > 0 && <span class="spinner" />}
            </div>
          )}
        <Segmented value={activity} onChange={(a) => { setActivity(a); if (snap) rebuild(waypoints, snap, a); }}
          options={ACTIVITIES.map((a) => ({ key: a.key, label: <span class="inline-icon"><Ico icon={a.icon} size={16} />{a.label}</span> }))} />
        <label class="toggle-row">
          <span>Follow roads &amp; paths</span>
          <input type="checkbox" class="switch" checked={snap} onChange={(e) => { const v = (e.target as HTMLInputElement).checked; setSnap(v); rebuild(waypoints, v, activity); }} />
        </label>
        <div class="btn-row small-btns">
          <button disabled={!waypoints.length} onClick={() => { setWaypoints(waypoints.slice(0, -1)); setLegs(legs.slice(0, -1)); }}><Ico icon={Undo2} size={16} />Undo</button>
          <button disabled={waypoints.length < 2} onClick={() => addWaypoint(waypoints[0])}><Ico icon={Repeat} size={16} />Loop back</button>
          <button class="danger-text" disabled={!waypoints.length} onClick={() => { setWaypoints([]); setLegs([]); }}><Ico icon={Trash} size={16} />Clear</button>
        </div>
      </div>
    </Page>
  );
}
