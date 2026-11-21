// CARD 13. Pulse from a fingertip held over the rear camera (D46).
// Pure TypeScript: samples with timestamps come in, a rate comes out. No DOM, no camera,
// no Date.now(). The camera plumbing lives in src/sensors/camera.ts.
//
// What this deliberately does NOT do: beat-to-beat variability. D46 checked that claim and it
// does not survive 30 frames a second (a frame is 33 ms of noise on a number that is normally
// 20 to 60 ms). So no variability figure is computed here, and none can leak to the ticket.

/** One frame, reduced to the numbers we need. `covered` is the lens gate from camera.ts. */
export type PulseSample = {
  /** Milliseconds, from the same clock throughout a capture. */
  t: number
  /** Mean red of the sampled patch, 0 to 255. */
  red: number
  /** Did this frame look like a fingertip over the lens. */
  covered: boolean
}

export const SETTLE_SECONDS = 3
export const CAPTURE_SECONDS = 15
export const RESAMPLE_HZ = 30

/** The rate band we will report. Outside it we say we could not read, not a silly number. */
export const MIN_BPM = 40
export const MAX_BPM = 180

/** Autocorrelation peak height below this is noise, not a pulse. Real fingertip signals on a
 *  phone with no torch sit a long way below a clean synthetic sine, so this is deliberately low:
 *  a wrong rate is caught by the band check, not by demanding a pretty signal. */
export const MIN_CONFIDENCE = 0.3

/** Below this share of covered frames we doubt the finger was on the lens. Advisory only: a
 *  reading with a clear rhythm is accepted whatever this says (see analyzePulse). */
export const MIN_COVERED_FRACTION = 0.6

/** A capture shorter than this cannot hold enough cycles at MIN_BPM to trust. */
export const MIN_CAPTURE_SECONDS = 8

/**
 * Why a reading failed, so the step can say something useful instead of "error".
 * Every one of these is a normal outcome, not a fault: a failed pulse never marks a result
 * partial and never changes a verdict (D46).
 */
export type PulseFailure = 'too-short' | 'not-covered' | 'no-rhythm'

export type PulseAnalysis = {
  /** Average beats per minute, or null when we could not read one. */
  bpm: number | null
  /** Frames used, after the settling ones are dropped. For diagnosing a failure on a real phone. */
  samples: number
  /** Height of the autocorrelation peak, 0 to 1. Reported for diagnostics, never shown as health. */
  confidence: number
  /** Share of frames that passed the lens gate, 0 to 1. */
  coveredFraction: number
  /** Seconds between the first and last sample. */
  seconds: number
  reason: 'ok' | PulseFailure
}

/** Centred moving average. Window is in samples and is clamped to the array. */
export function movingAverage(xs: readonly number[], window: number): number[] {
  const n = xs.length
  if (n === 0) return []
  const half = Math.max(0, Math.floor(window / 2))
  // Prefix sums keep this O(n) rather than O(n * window); a 15 second capture is 450 samples
  // and this runs on a phone while the camera is still open.
  const prefix = new Array<number>(n + 1).fill(0)
  for (let i = 0; i < n; i += 1) prefix[i + 1] = prefix[i] + xs[i]
  const out = new Array<number>(n)
  for (let i = 0; i < n; i += 1) {
    const from = Math.max(0, i - half)
    const to = Math.min(n - 1, i + half)
    out[i] = (prefix[to + 1] - prefix[from]) / (to - from + 1)
  }
  return out
}

/**
 * Band-pass by subtracting a slow moving average from a fast one.
 * Windows are in seconds. The slow window must be longer than one beat at MIN_BPM or it eats
 * the pulse instead of the drift.
 */
export function bandpass(xs: readonly number[], hz: number, fastSeconds: number, slowSeconds: number): number[] {
  const fast = movingAverage(xs, Math.max(1, Math.round(fastSeconds * hz)))
  const slow = movingAverage(xs, Math.max(1, Math.round(slowSeconds * hz)))
  return fast.map((v, i) => v - slow[i])
}

/**
 * Put irregular frames onto an even grid by linear interpolation. Camera frame rate wanders,
 * and autocorrelation needs an even spacing to turn a lag into a rate.
 */
export function resample(samples: readonly PulseSample[], hz: number): number[] {
  if (samples.length < 2) return samples.map((s) => s.red)
  const step = 1000 / hz
  const start = samples[0].t
  const end = samples[samples.length - 1].t
  const count = Math.floor((end - start) / step) + 1
  const out = new Array<number>(Math.max(0, count))
  let j = 0
  for (let i = 0; i < count; i += 1) {
    const t = start + i * step
    while (j < samples.length - 2 && samples[j + 1].t < t) j += 1
    const a = samples[j]
    const b = samples[j + 1]
    const span = b.t - a.t
    // Two frames with the same timestamp would divide by zero; fall back to the earlier one.
    out[i] = span <= 0 ? a.red : a.red + ((b.red - a.red) * (t - a.t)) / span
  }
  return out
}

/**
 * Rate by autocorrelation, which is the right tool here: it uses the whole capture rather than
 * finding individual beats, so it survives a low frame rate and the odd bad frame. Counting
 * peaks does not.
 *
 * It takes the FIRST strong peak, not the tallest. A periodic signal autocorrelates at its
 * period and again at every multiple, and those later peaks can be the taller ones, which would
 * report half the true rate.
 */
export function rateFromAutocorrelation(y: readonly number[], hz: number): { bpm: number | null; confidence: number } {
  const n = y.length
  const mean = y.reduce((a, b) => a + b, 0) / (n || 1)
  const centred = y.map((v) => v - mean)
  const energy = centred.reduce((a, b) => a + b * b, 0)
  if (n === 0 || energy <= 0) return { bpm: null, confidence: 0 }

  const minLag = Math.max(2, Math.floor((hz * 60) / MAX_BPM))
  const maxLag = Math.min(n - 1, Math.ceil((hz * 60) / MIN_BPM))
  if (maxLag <= minLag) return { bpm: null, confidence: 0 }

  const r = new Array<number>(maxLag + 1).fill(0)
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let sum = 0
    for (let i = 0; i + lag < n; i += 1) sum += centred[i] * centred[i + lag]
    // Normalise by the overlap as well as the energy, or long lags are unfairly small.
    r[lag] = sum / (energy * ((n - lag) / n))
  }

  let best = 0
  for (let lag = minLag; lag <= maxLag; lag += 1) if (r[lag] > best) best = r[lag]
  if (best <= 0) return { bpm: null, confidence: 0 }

  // The fundamental is the first local maximum that gets close to the tallest one.
  let chosen = -1
  for (let lag = minLag + 1; lag < maxLag; lag += 1) {
    if (r[lag] >= r[lag - 1] && r[lag] >= r[lag + 1] && r[lag] >= 0.8 * best) {
      chosen = lag
      break
    }
  }
  if (chosen < 0) {
    for (let lag = minLag; lag <= maxLag; lag += 1) if (r[lag] === best) { chosen = lag; break }
  }

  // Parabolic interpolation around the peak: a lag is a whole frame, which at 30 Hz is 4 bpm
  // of resolution near 70 bpm. This recovers the fraction between frames.
  let lag = chosen
  if (chosen > minLag && chosen < maxLag) {
    const d = r[chosen - 1] - 2 * r[chosen] + r[chosen + 1]
    if (d !== 0) {
      const shift = (0.5 * (r[chosen - 1] - r[chosen + 1])) / d
      if (Math.abs(shift) <= 1) lag = chosen + shift
    }
  }

  const bpm = (hz * 60) / lag
  if (!Number.isFinite(bpm) || bpm < MIN_BPM || bpm > MAX_BPM) return { bpm: null, confidence: r[chosen] }
  return { bpm, confidence: Math.min(1, Math.max(0, r[chosen])) }
}

/**
 * The whole pipeline. Drops the settling frames, checks the lens was covered, then reads a rate.
 * Returns a reason rather than throwing: every failure here is an ordinary outcome.
 */
export function analyzePulse(samples: readonly PulseSample[], settleSeconds = SETTLE_SECONDS): PulseAnalysis {
  const empty = { bpm: null, confidence: 0, coveredFraction: 0, seconds: 0, samples: 0 }
  if (samples.length < 2) return { ...empty, reason: 'too-short' }

  const start = samples[0].t
  const used = samples.filter((s) => s.t - start >= settleSeconds * 1000)
  if (used.length < 2) return { ...empty, reason: 'too-short' }

  const seconds = (used[used.length - 1].t - used[0].t) / 1000
  const coveredFraction = used.filter((s) => s.covered).length / used.length
  const base = { coveredFraction, seconds, samples: used.length }

  if (seconds < MIN_CAPTURE_SECONDS) return { ...empty, ...base, reason: 'too-short' }

  // Read the rate FIRST, and judge coverage only if that fails. Coverage was a hard gate before
  // this, so a phone whose auto-exposure pushed a few frames outside the gate threw away a
  // reading that was perfectly good. A clear rhythm is the better evidence of a finger on a lens
  // than any single-frame test, so it wins.
  const grid = resample(used, RESAMPLE_HZ)
  // 0.1 s smooths sensor noise; 1.5 s is longer than one beat at MIN_BPM, so the slow term
  // removes drift, finger pressure and the camera hunting for an exposure, without removing
  // the pulse itself.
  const filtered = bandpass(grid, RESAMPLE_HZ, 0.1, 1.5)
  const { bpm, confidence } = rateFromAutocorrelation(filtered, RESAMPLE_HZ)

  if (bpm !== null && confidence >= MIN_CONFIDENCE) {
    return { bpm: Math.round(bpm), confidence, ...base, reason: 'ok' }
  }
  // No rate. Now coverage decides which advice to give.
  const reason: PulseFailure = coveredFraction < MIN_COVERED_FRACTION ? 'not-covered' : 'no-rhythm'
  return { bpm: null, confidence, ...base, reason }
}
