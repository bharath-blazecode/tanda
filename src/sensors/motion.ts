export type Vector = { x: number; y: number; z: number };
export type MotionReading = {
  t: number;
  rotation: Vector | null;
  acceleration: Vector | null;
  gravity: Vector | null;
};
export type MotionPermission =
  | "granted"
  | "denied"
  | "unsupported"
  | "insecure";
type MotionConstructor = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};
function vector(
  x: number | null | undefined,
  y: number | null | undefined,
  z: number | null | undefined,
): Vector | null {
  if (
    ![x, y, z].every(
      (value) => typeof value === "number" && Number.isFinite(value),
    )
  )
    return null;
  return { x: x!, y: y!, z: z! };
}
export function readMotion(
  event: DeviceMotionEvent,
  t: number,
): MotionReading | null {
  // beta and gamma are the two tilt axes. alpha is retained for diagnostics.
  const rotation = vector(
    event.rotationRate?.beta,
    event.rotationRate?.gamma,
    event.rotationRate?.alpha,
  );
  const acceleration = vector(
    event.acceleration?.x,
    event.acceleration?.y,
    event.acceleration?.z,
  );
  const gravity = vector(
    event.accelerationIncludingGravity?.x,
    event.accelerationIncludingGravity?.y,
    event.accelerationIncludingGravity?.z,
  );
  if (!rotation && !acceleration && !gravity) return null;
  return { t, rotation, acceleration, gravity };
}
export function measuredHz(samples: readonly MotionReading[]): number {
  if (samples.length < 2) return 0;
  const span = samples.at(-1)!.t - samples[0].t;
  return span > 0 ? (samples.length - 1) / span : 0;
}
export async function ensurePermission(): Promise<MotionPermission> {
  if (!window.isSecureContext) return "insecure";
  const constructor = window.DeviceMotionEvent as MotionConstructor | undefined;
  if (!constructor) return "unsupported";
  // Invoked directly by the Start tap, before any asynchronous work.
  if (constructor.requestPermission) {
    try {
      return await constructor.requestPermission();
    } catch {
      return "denied";
    }
  }
  return "granted";
}
export function subscribe(
  onSample: (sample: MotionReading) => void,
): () => void {
  const listener = (event: DeviceMotionEvent) => {
    // DOM event creation time is a proxy for acquisition. Callback receipt time
    // would make a batch of queued readings look like simultaneous samples.
    const stamp = event.timeStamp > 1e12 ? event.timeStamp - performance.timeOrigin : event.timeStamp;
    const ageMs = performance.now() - stamp;
    if (!Number.isFinite(stamp) || stamp < 0 || ageMs < -2 || ageMs > 250) return;
    const sample = readMotion(event, stamp / 1000);
    if (sample) onSample(sample);
  };
  window.addEventListener("devicemotion", listener);
  return () => window.removeEventListener("devicemotion", listener);
}

// Public scaffold contract. Times are milliseconds since this subscription began.
export type MotionSample = {
  t: number;
  /** Explicit linear acceleration, distinct from the legacy gravity-inclusive axes below. */
  linearAcceleration?: Vector | null;
  ax: number;
  ay: number;
  az: number;
  ra: number | null;
  rb: number | null;
  rg: number | null;
};
export function startMotion(
  onSample: (sample: MotionSample) => void,
): () => void {
  let origin: number | undefined;
  return subscribe((reading) => {
    origin ??= reading.t;
    const gravity = reading.gravity ??
      reading.acceleration ?? { x: 0, y: 0, z: 0 };
    onSample({
      t: (reading.t - origin) * 1000,
      linearAcceleration: reading.acceleration,
      ax: gravity.x,
      ay: gravity.y,
      az: gravity.z,
      ra: reading.rotation?.z ?? null,
      rb: reading.rotation?.x ?? null,
      rg: reading.rotation?.y ?? null,
    });
  });
}

// ---- Is motion usable here? The one place that decides, shared by Setup and Stand Still. ----

/** Setup's window for the first usable sample. */
export const FIRST_SAMPLE_MS = 1000;

/** A reading counts only if some axis is non-zero. Blocked sensors (Brave) send no events,
 *  all-null events or all-zero ones; a real phone always reports gravity, so it never reads all zero. */
export function isUsable(
  reading: MotionReading | null,
): reading is MotionReading {
  if (!reading || (!reading.rotation && !reading.acceleration)) return false;
  return [reading.rotation, reading.acceleration, reading.gravity].some(
    (v) => v !== null && (v.x !== 0 || v.y !== 0 || v.z !== 0),
  );
}

/** What can be done before any tap: a prompt only a tap may open (iOS), or just listen. */
export function motionSupport():
  | "insecure"
  | "unsupported"
  | "needs-tap"
  | "listen" {
  if (!window.isSecureContext) return "insecure";
  const constructor = window.DeviceMotionEvent as MotionConstructor | undefined;
  if (!constructor) return "unsupported";
  return typeof constructor.requestPermission === "function"
    ? "needs-tap"
    : "listen";
}

/** Resolves true on the first usable sample, false if none arrives within the window. */
export function waitForUsableSample(windowMs: number, signal?: AbortSignal): Promise<boolean> {
  if (signal?.aborted) return Promise.resolve(false);
  return new Promise((resolve) => {
    const finish = (usable: boolean) => {
      clearTimeout(timer);
      stop();
      signal?.removeEventListener("abort", abort);
      resolve(usable);
    };
    const abort = () => finish(false);
    const timer = setTimeout(abort, windowMs);
    const stop = subscribe((sample) => { if (isUsable(sample)) finish(true); });
    signal?.addEventListener("abort", abort, { once: true });
  });
}

/** "unknown" until Setup or a Stand Still run decides. Memory only: a reload re-detects, which is
 *  what someone wants after allowing motion sensors in Brave's site settings. */
export type MotionAvailability = "unknown" | "available" | "unavailable";
let availability: MotionAvailability = "unknown";
export function getMotionAvailability(): MotionAvailability {
  return availability;
}
export function setMotionAvailability(next: MotionAvailability): void {
  availability = next;
}

/** Asks if this browser has a prompt, proves it with a usable sample, and records the outcome for
 *  the session. Call it from a tap: the iOS prompt is requested before the first await. */
export async function detectMotion(
  windowMs = FIRST_SAMPLE_MS,
  signal?: AbortSignal,
): Promise<MotionPermission | "no-data"> {
  const permission = await ensurePermission();
  const outcome =
    permission !== "granted"
      ? permission
      : (await waitForUsableSample(windowMs, signal))
        ? "granted"
        : "no-data";
  if (!signal?.aborted) setMotionAvailability(outcome === "granted" ? "available" : "unavailable");
  return outcome;
}
