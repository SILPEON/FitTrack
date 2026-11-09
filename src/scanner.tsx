import { Overlay } from './ui';
import { useEffect, useRef, useState } from 'preact/hooks';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { validBarcode } from './off';

const hints = new Map<DecodeHintType, unknown>([
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]],
  [DecodeHintType.TRY_HARDER, true],
]);

/** Full-screen camera barcode scanner with manual entry fallback. */
export function BarcodeScanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const done = useRef(false);

  useEffect(() => {
    let controls: IScannerControls | null = null;
    let cancelled = false;
    // The same code must be read twice in a row before we accept it: filters out misreads.
    let last = '';
    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });
    reader.decodeFromConstraints(
      { audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
      video.current!,
      (result) => {
        if (!result || done.current) return;
        const code = result.getText();
        if (!validBarcode(code)) return;
        if (code !== last) { last = code; return; }
        done.current = true;
        navigator.vibrate?.(60);
        controls?.stop();
        onCode(code);
      },
    ).then((c) => {
      controls = c;
      if (cancelled) c.stop();
    }).catch((e: Error) => {
      setError(e.name === 'NotAllowedError'
        ? 'Camera access is blocked. Allow it in Settings › Apps › Safari › Camera, then reopen FitTrack.'
        : `Camera not available (${e.message}). Type the barcode number below instead.`);
    });
    return () => { cancelled = true; controls?.stop(); };
  }, []);

  const submitManual = () => {
    const code = manual.replace(/\D/g, '');
    if (!code) return;
    done.current = true;
    onCode(code);
  };

  return (
    <Overlay><div class="scanner">
      <video ref={video} class="scanner-video" playsInline muted autoPlay />
      <div class="scanner-frame"><div class="scanner-line" /></div>
      <header class="scanner-top">
        <button class="link" onClick={onClose}>Cancel</button>
        <span>Scan barcode</span>
        <span style={{ width: '60px' }} />
      </header>
      <div class="scanner-bottom">
        {error ? <div class="scanner-error">{error}</div> : <div class="scanner-help">Hold the barcode inside the frame</div>}
        <form class="scanner-manual" onSubmit={(e) => { e.preventDefault(); submitManual(); }}>
          <input inputMode="numeric" placeholder="…or type the number" value={manual}
            onInput={(e) => setManual((e.target as HTMLInputElement).value)} />
          <button type="submit" disabled={!manual.trim()}>Go</button>
        </form>
      </div>
    </div></Overlay>
  );
}
