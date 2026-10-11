import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, Camera, CameraOff, CheckCircle2, XCircle } from 'lucide-react';
import jsQR from 'jsqr';
import { checkInTicket, type CheckInResult } from '@/adminApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import usePageMeta from '@/hooks/usePageMeta';
import { cn } from '@/lib/utils';

interface Scan { id: number; at: Date; result: CheckInResult }

// The browser's built-in detector where available (Chrome, Android); jsQR on a canvas everywhere else.
type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };
const NativeDetector = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;

/** Door check-in: scan ticket QR codes with the camera (or type a code). Each ticket is admitted once, on an event day. */
export default function CheckIn() {
  usePageMeta({ title: 'Check-in | AFRIGULF Exchange admin', description: 'AFRIGULF Exchange admin portal.' });
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const busyRef = useRef(false);
  const lastRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scans, setScans] = useState<Scan[]>([]);
  const [manual, setManual] = useState('');

  const submit = useCallback(async (code: string) => {
    // Ignore the same code held in front of the camera for a few seconds.
    const now = Date.now();
    if (busyRef.current || (code === lastRef.current.code && now - lastRef.current.at < 4000)) return;
    busyRef.current = true;
    lastRef.current = { code, at: now };
    const result = await checkInTicket(code);
    setScans(current => [{ id: now, at: new Date(), result }, ...current].slice(0, 20));
    if ('vibrate' in navigator) navigator.vibrate(result.ok ? 80 : [60, 60, 60]);
    busyRef.current = false;
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  async function startCamera() {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      setCameraError('The camera isn’t available. Allow camera access in your browser, or type the code from the ticket below.');
    }
  }

  // Decode a few frames a second while the camera runs.
  useEffect(() => {
    if (!cameraOn) return;
    const detector = NativeDetector ? new NativeDetector({ formats: ['qr_code'] }) : null;
    let stopped = false;
    async function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (stopped || !video || !canvas) return;
      if (video.readyState >= 2 && !busyRef.current) {
        try {
          let value: string | undefined;
          if (detector) {
            value = (await detector.detect(video))[0]?.rawValue;
          } else {
            const width = 480;
            const height = Math.round((video.videoHeight / video.videoWidth) * width) || 360;
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d', { willReadFrequently: true })!;
            context.drawImage(video, 0, 0, width, height);
            value = jsQR(context.getImageData(0, 0, width, height).data, width, height)?.data;
          }
          if (value) await submit(value);
        } catch {
          // A frame that can't be read; try the next one.
        }
      }
      if (!stopped) setTimeout(tick, 250);
    }
    tick();
    return () => { stopped = true; };
  }, [cameraOn, submit]);

  useEffect(() => stopCamera, [stopCamera]);

  function onManual(e: FormEvent) {
    e.preventDefault();
    if (!manual.trim()) return;
    lastRef.current = { code: '', at: 0 }; // typing the same code again is deliberate
    submit(manual.trim());
    setManual('');
  }

  const latest = scans[0];

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="mb-1 text-3xl">Check-in</h1>
        <p className="mb-0 text-muted-foreground">Scan tickets at the entrance. Each ticket is admitted once, and only on the day of its event.</p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-4">
          <div className="relative overflow-hidden rounded-xl border border-border bg-[#0b1d33]">
            <video ref={videoRef} muted playsInline className={cn('aspect-[4/3] w-full object-cover', !cameraOn && 'invisible')} aria-label="Camera preview" />
            <canvas ref={canvasRef} className="hidden" />
            {cameraOn ? (
              <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" aria-hidden="true" />
            ) : (
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-white">
                <div>
                  <Camera className="mx-auto mb-3 size-10 opacity-80" aria-hidden="true" />
                  <p className="mb-4 text-sm text-white/80">Point the camera at a ticket’s QR code.</p>
                  <Button onClick={startCamera} className="bg-white text-[#0d2b45] hover:bg-white/90">Start camera</Button>
                </div>
              </div>
            )}
          </div>
          {cameraError && <p role="alert" className="m-0 text-sm text-[#b42318]">{cameraError}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {cameraOn && <Button variant="outline" className="bg-white" onClick={stopCamera}><CameraOff /> Stop camera</Button>}
            <form onSubmit={onManual} className="flex min-w-0 flex-1 gap-2">
              <Input value={manual} onChange={e => setManual(e.target.value)} placeholder="Or type the code printed under the QR" aria-label="Ticket code" className="bg-white" autoComplete="off" />
              <Button type="submit">Check in</Button>
            </form>
          </div>
        </div>

        <div className="grid gap-4">
          <ResultPanel scan={latest} />
          {scans.length > 1 && (
            <div className="rounded-xl border border-border bg-white p-4">
              <h2 className="mb-3 font-sans! text-sm font-semibold tracking-normal!">Recent scans</h2>
              <ul className="m-0 grid list-none gap-2 p-0 text-sm">
                {scans.slice(1, 8).map(scan => (
                  <li key={scan.id} className="flex items-center gap-2">
                    {scan.result.ok ? <CheckCircle2 className="size-4 shrink-0 text-[#1e6b3a]" aria-label="Admitted" /> : <XCircle className="size-4 shrink-0 text-[#b42318]" aria-label="Refused" />}
                    <span className="min-w-0 flex-1 truncate">{scan.result.ticket?.name ?? (scan.result.ok ? '' : scan.result.message)}</span>
                    <span className="text-muted-foreground tabular-nums">{scan.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ResultPanel({ scan }: { scan?: Scan }) {
  if (!scan) {
    return <div className="rounded-xl border border-dashed border-border bg-white p-6 text-center text-sm text-muted-foreground">Scan results appear here.</div>;
  }
  const { result } = scan;
  const ticket = result.ticket;
  const used = !result.ok && result.result === 'already_used';
  const tone = result.ok ? 'border-[#9fd3b0] bg-[#effaf2] text-[#1e6b3a]' : used ? 'border-[#f1dcb8] bg-[#fcf7ef] text-[#8a5a12]' : 'border-[#f3c7c3] bg-[#fdf1f0] text-[#b42318]';
  const Icon = result.ok ? CheckCircle2 : used ? AlertTriangle : XCircle;
  return (
    <div key={scan.id} role="status" aria-live="assertive" className={cn('rounded-xl border-2 p-5', tone)}>
      <Icon className="mb-2 size-10" aria-hidden="true" />
      <h2 className="mb-1 font-sans! text-2xl font-bold tracking-normal!">{result.ok ? 'Admitted' : used ? 'Already used' : 'Not valid'}</h2>
      {!result.ok && <p className="mb-3 text-sm">{result.message}</p>}
      {ticket && (
        <dl className="m-0 grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1 text-sm text-foreground">
          <dt className="text-muted-foreground">Name</dt><dd className="m-0 font-semibold">{ticket.name}</dd>
          <dt className="text-muted-foreground">Ticket</dt><dd className="m-0">{ticket.number} of {ticket.of} · {ticket.reference}</dd>
          <dt className="text-muted-foreground">Event</dt><dd className="m-0">{ticket.event}</dd>
          {used && ticket.checkedInAt && <><dt className="text-muted-foreground">Used at</dt><dd className="m-0">{new Date(ticket.checkedInAt).toLocaleTimeString()}</dd></>}
          <dt className="text-muted-foreground">Inside</dt><dd className="m-0">{ticket.eventCheckedIn} of {ticket.eventTickets} tickets</dd>
        </dl>
      )}
    </div>
  );
}
