// CARD 3. Stub. The one place that touches DeviceMotion.
// iOS only grants motion access from a tap, on HTTPS, and asks again in each session:
// call ensurePermission() from the Start button's click handler, never from a timer or on load.

export type MotionSample = {
  t: number // ms since the stream started
  ax: number // acceleration including gravity, m/s^2
  ay: number
  az: number
  ra: number | null // rotation rate, deg/s (alpha, beta, gamma); null without a gyroscope
  rb: number | null
  rg: number | null
}

export type MotionPermission = 'granted' | 'denied' | 'unsupported'

export async function ensurePermission(): Promise<MotionPermission> {
  return 'unsupported'
}

/** Starts the stream and returns a function that stops it. */
export function startMotion(_onSample: (sample: MotionSample) => void): () => void {
  return () => {}
}
