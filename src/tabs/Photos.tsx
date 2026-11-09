import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Camera, Columns2, Ghost, ImagePlus, Images, Layers, SwitchCamera, Timer, TimerOff, Trash, X } from 'lucide-preact';
import { db, type Photo, type Pose, type WeightEntry } from '../db';
import { dayKey, fmt, fmtDate } from '../calc';
import { Ico } from '../icons';
import { ActionRow, Empty, Page, Row, Section, Segmented, useLive, useNav, Overlay } from '../ui';

const POSES: { key: Pose; label: string }[] = [{ key: 'front', label: 'Front' }, { key: 'side', label: 'Side' }, { key: 'back', label: 'Back' }];
const MAX_EDGE = 1440;

/** Object URL for a stored image, released when no longer shown. */
function useBlobUrl(blob: Blob | undefined) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : undefined), [blob]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return url;
}

const Thumb = ({ photo, onClick, selected }: { photo: Photo; onClick?: () => void; selected?: boolean }) => {
  const url = useBlobUrl(photo.blob);
  return <button class={`thumb ${selected ? 'selected' : ''}`} onClick={onClick}><img src={url} alt={`${photo.pose} ${photo.day}`} loading="lazy" /></button>;
};

/** Downscale and re-encode so photos stay small in storage and backups. */
async function toJpeg(source: CanvasImageSource, w: number, h: number, mirror = false): Promise<{ blob: Blob; w: number; h: number }> {
  const k = Math.min(1, MAX_EDGE / Math.max(w, h));
  const cw = Math.round(w * k), ch = Math.round(h * k);
  const canvas = document.createElement('canvas');
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d')!;
  if (mirror) { ctx.translate(cw, 0); ctx.scale(-1, 1); }
  ctx.drawImage(source, 0, 0, cw, ch);
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), 'image/jpeg', 0.85));
  return { blob, w: cw, h: ch };
}

async function fileToJpeg(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode(); // the browser applies the photo's EXIF rotation
    return await toJpeg(img, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const savePhoto = (pose: Pose, data: { blob: Blob; w: number; h: number }, day = dayKey()) =>
  db.photos.add({ day, time: Date.now(), pose, ...data } as Photo);

/** Weight logged closest to a photo's day (within 4 days). */
function weightNear(weights: WeightEntry[], day: string) {
  const t = new Date(day + 'T12:00:00').getTime();
  let best: WeightEntry | undefined, bestD = Infinity;
  for (const w of weights) {
    const d = Math.abs(new Date(w.day + 'T12:00:00').getTime() - t);
    if (d < bestD) { best = w; bestD = d; }
  }
  return best && bestD <= 4 * 86400000 ? best : undefined;
}

// ---------- Card shown in the Weight tab ----------

export function PhotosCard() {
  const nav = useNav();
  const latest = useLive(() => db.photos.orderBy('time').reverse().limit(4).toArray(), [], [] as Photo[]);
  const count = useLive(() => db.photos.count(), [], 0);
  return (
    <Section title="Progress photos" right={count ? `${count}` : undefined}>
      {latest.length > 0 && <div class="thumb-strip pad">{latest.map((p) => <Thumb key={p.id} photo={p} onClick={() => nav.push(<PhotosScreen />)} />)}</div>}
      <ActionRow icon={latest.length ? Images : Camera} bold label={latest.length ? 'Open photo journal' : 'Take your first progress photos'} onClick={() => nav.push(<PhotosScreen />)} />
    </Section>
  );
}

// ---------- Gallery ----------

export function PhotosScreen() {
  const nav = useNav();
  const [pose, setPose] = useState<Pose>('front');
  const photos = useLive(() => db.photos.where('pose').equals(pose).toArray(), [pose], [] as Photo[]);
  const weights = useLive(() => db.weights.toArray(), [], [] as WeightEntry[]);
  const [camera, setCamera] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const sorted = [...photos].sort((a, b) => b.time - a.time);

  const importFiles = async (files: FileList) => {
    for (const f of Array.from(files)) {
      try { await savePhoto(pose, await fileToJpeg(f)); } catch { alert(`Could not read ${f.name}.`); }
    }
  };

  return (
    <Page title="Photo Journal">
      <div class="pad"><Segmented value={pose} onChange={setPose} options={POSES} /></div>

      <Section>
        <ActionRow icon={Camera} bold label={`Take ${pose} photo`} onClick={() => setCamera(true)} />
        <ActionRow icon={ImagePlus} label="Add from Photos" onClick={() => fileRef.current?.click()} />
        {sorted.length >= 2 && (
          <ActionRow icon={Columns2} label="Compare before & after" onClick={() => nav.push(<CompareScreen pose={pose} />)} />
        )}
      </Section>

      <Section title={`${POSES.find((p) => p.key === pose)!.label} photos`}
        footer="Photos are stored only inside FitTrack on this phone, not in your photo library. They're included in Profile › Save backup. For comparable photos: same spot, same light, same time of day (ideally morning).">
        {sorted.length === 0
          ? <Empty icon={Images} title="No photos yet" text="Take one now and repeat every 2–4 weeks." />
          : (
            <div class="photo-grid pad">
              {sorted.map((p) => {
                const w = weightNear(weights, p.day);
                return (
                  <div class="photo-cell">
                    <Thumb photo={p} onClick={() => nav.push(<PhotoViewer id={p.id} />)} />
                    <div class="small sub">{fmtDate(p.day)}{w ? ` · ${fmt(w.kg)} kg` : ''}</div>
                  </div>
                );
              })}
            </div>
          )}
      </Section>

      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
        onChange={(e) => { const f = (e.target as HTMLInputElement).files; if (f?.length) importFiles(f); (e.target as HTMLInputElement).value = ''; }} />
      {camera && <PoseCamera pose={pose} ghost={sorted[0]} onClose={() => setCamera(false)} />}
    </Page>
  );
}

function PhotoViewer({ id }: { id: number }) {
  const nav = useNav();
  const photo = useLive(() => db.photos.get(id), [id], undefined as Photo | undefined);
  const weights = useLive(() => db.weights.toArray(), [], [] as WeightEntry[]);
  const url = useBlobUrl(photo?.blob);
  if (!photo) return <Page title="Photo"><div /></Page>;
  const w = weightNear(weights, photo.day);
  return (
    <Page title={fmtDate(photo.day)}>
      <div class="viewer"><img src={url} alt="" /></div>
      <Section>
        <Row label="Pose" value={POSES.find((p) => p.key === photo.pose)!.label} />
        <Row label="Weight around that day" value={w ? `${fmt(w.kg)} kg` : '–'} />
        <ActionRow icon={Trash} danger label="Delete photo" onClick={() => { if (confirm('Delete this photo?')) { db.photos.delete(id); nav.pop(); } }} />
      </Section>
    </Page>
  );
}

// ---------- Before / after ----------

function CompareScreen({ pose }: { pose: Pose }) {
  const photos = useLive(() => db.photos.where('pose').equals(pose).sortBy('time'), [pose], [] as Photo[]);
  const weights = useLive(() => db.weights.toArray(), [], [] as WeightEntry[]);
  const [beforeId, setBeforeId] = useState<number | null>(null);
  const [afterId, setAfterId] = useState<number | null>(null);
  const [mode, setMode] = useState<'slider' | 'side'>('slider');
  const [pos, setPos] = useState(50);

  const before = photos.find((p) => p.id === beforeId) ?? photos[0];
  const after = photos.find((p) => p.id === afterId) ?? photos[photos.length - 1];
  const bUrl = useBlobUrl(before?.blob);
  const aUrl = useBlobUrl(after?.blob);
  if (!before || !after) return <Page title="Compare"><div /></Page>;
  const wb = weightNear(weights, before.day), wa = weightNear(weights, after.day);
  const days = Math.round((new Date(after.day).getTime() - new Date(before.day).getTime()) / 86400000);

  return (
    <Page title="Before & After">
      <div class="pad"><Segmented value={mode} onChange={setMode} options={[
        { key: 'slider', label: <span class="inline-icon"><Ico icon={Layers} size={16} />Slider</span> },
        { key: 'side', label: <span class="inline-icon"><Ico icon={Columns2} size={16} />Side by side</span> },
      ]} /></div>

      {mode === 'slider' ? (
        <div class="compare">
          <img src={bUrl} alt="before" />
          <img src={aUrl} alt="after" class="compare-after" style={{ clipPath: `inset(0 0 0 ${pos}%)` }} />
          <div class="compare-line" style={{ left: `${pos}%` }} />
          <span class="compare-tag left">Before</span><span class="compare-tag right">After</span>
          <input type="range" min={0} max={100} value={pos} class="compare-range" aria-label="Before/after slider"
            onInput={(e) => setPos(Number((e.target as HTMLInputElement).value))} />
        </div>
      ) : (
        <div class="compare-side">
          <figure><img src={bUrl} alt="before" /><figcaption>Before</figcaption></figure>
          <figure><img src={aUrl} alt="after" /><figcaption>After</figcaption></figure>
        </div>
      )}

      <div class="stat-tiles">
        <div class="tile"><span class="tile-label">Before</span><b>{fmtDate(before.day)}</b><span class="small sub">{wb ? `${fmt(wb.kg)} kg` : '–'}</span></div>
        <div class="tile"><span class="tile-label">After</span><b>{fmtDate(after.day)}</b><span class="small sub">{wa ? `${fmt(wa.kg)} kg` : '–'}</span></div>
        <div class="tile"><span class="tile-label">Change</span><b>{days} days</b><span class="small sub">{wb && wa ? `${wa.kg - wb.kg > 0 ? '+' : ''}${fmt(wa.kg - wb.kg)} kg` : ''}</span></div>
      </div>

      <Section title="Before">
        <div class="thumb-strip pad">{photos.map((p) => <Thumb key={p.id} photo={p} selected={p.id === before.id} onClick={() => setBeforeId(p.id)} />)}</div>
      </Section>
      <Section title="After">
        <div class="thumb-strip pad">{photos.map((p) => <Thumb key={p.id} photo={p} selected={p.id === after.id} onClick={() => setAfterId(p.id)} />)}</div>
      </Section>
    </Page>
  );
}

// ---------- Camera with ghost overlay and self-timer ----------

function PoseCamera({ pose, ghost, onClose }: { pose: Pose; ghost?: Photo; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [timer, setTimer] = useState<0 | 3 | 10>(10);
  const [count, setCount] = useState<number | null>(null);
  const [showGhost, setShowGhost] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const ghostUrl = useBlobUrl(ghost?.blob);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices?.getUserMedia({ audio: false, video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1920 } } })
      .then((s) => {
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
        stream.current = s;
        if (video.current) { video.current.srcObject = s; video.current.play().catch(() => {}); }
      })
      .catch((e: Error) => setError(e.name === 'NotAllowedError'
        ? 'Camera access is blocked. Allow it in Settings › Apps › Safari › Camera, or use "Add from Photos".'
        : 'Camera not available. Use "Add from Photos" instead.'));
    return () => { cancelled = true; stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; };
  }, [facing]);

  const capture = async () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    setFlash(true); setTimeout(() => setFlash(false), 180);
    await savePhoto(pose, await toJpeg(v, v.videoWidth, v.videoHeight, facing === 'user'));
    onClose();
  };

  const shoot = () => {
    if (count != null) return;
    if (!timer) { capture(); return; }
    let n = timer;
    setCount(n);
    const t = setInterval(() => {
      n -= 1;
      if (n <= 0) { clearInterval(t); setCount(null); capture(); } else setCount(n);
    }, 1000);
  };

  return (
    <Overlay><div class="scanner">
      <video ref={video} class={`scanner-video ${facing === 'user' ? 'mirror' : ''}`} playsInline muted autoPlay />
      {ghost && showGhost && <img src={ghostUrl} class="ghost" alt="" />}
      {count != null && <div class="countdown">{count}</div>}
      {flash && <div class="flash" />}
      <header class="scanner-top">
        <button class="icon-link light" aria-label="Close" onClick={onClose}><Ico icon={X} size={26} /></button>
        <span>{POSES.find((p) => p.key === pose)!.label} photo</span>
        <button class="icon-link light" aria-label="Switch camera" onClick={() => setFacing(facing === 'user' ? 'environment' : 'user')}><Ico icon={SwitchCamera} size={24} /></button>
      </header>
      <div class="scanner-bottom">
        {error && <div class="scanner-error">{error}</div>}
        {!error && <div class="scanner-help">{ghost ? 'Line yourself up with the faded previous photo.' : 'Full body in frame, arms relaxed, same spot every time.'}</div>}
        <div class="cam-controls">
          <button class={`cam-opt ${timer ? 'on' : ''}`} onClick={() => setTimer(timer === 0 ? 3 : timer === 3 ? 10 : 0)}>
            <Ico icon={timer ? Timer : TimerOff} size={20} />{timer ? `${timer}s` : 'Off'}
          </button>
          <button class="shutter" aria-label="Take photo" onClick={shoot} disabled={!!error} />
          <button class={`cam-opt ${ghost && showGhost ? 'on' : ''}`} disabled={!ghost} onClick={() => setShowGhost(!showGhost)}>
            <Ico icon={Ghost} size={20} />Ghost
          </button>
        </div>
      </div>
    </div></Overlay>
  );
}
