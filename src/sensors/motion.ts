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
  let lastTime = -Infinity;
  const listener = (event: DeviceMotionEvent) => {
    const time = performance.now() / 1000;
    if (time <= lastTime) return;
    const sample = readMotion(event, time);
    if (sample) {
      lastTime = time;
      onSample(sample);
    }
  };
  window.addEventListener("devicemotion", listener);
  return () => window.removeEventListener("devicemotion", listener);
}

// Public scaffold contract. Times are milliseconds since this subscription began.
export type MotionSample = {
  t: number;
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
      ax: gravity.x,
      ay: gravity.y,
      az: gravity.z,
      ra: reading.rotation?.z ?? null,
      rb: reading.rotation?.x ?? null,
      rg: reading.rotation?.y ?? null,
    });
  });
}
