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
  /** Mean green. Haemoglobin absorbs green hardest, so this often carries the clearest pulse
   *  even though a fingertip looks red: red is the brightest channel, not the most modulated. */
  green?: number
  /** Mean blue. Weakest of the three through a finger, but free to try. */
  blue?: number
  /** Did this frame look like a fingertip over the lens. */
  covered: boolean
}

export type Channel = 'red' | 'green' | 'blue'

export const SETTLE_SECONDS = 3
export const CAPTURE_SECONDS = 15
export const RESAMPLE_HZ = 30

/** The rate band we will report. Outside it we say we could not read, not a silly number. */
export const MIN_BPM = 40
export const MAX_BPM = 180

// These two came out of measurement, not taste. Over 40 seeds of pure noise with no pulse in it
// at all, the autocorrelation peak had a median of 0.13 and reached 0.29. A clear signal scored
// 0.74 and up. So anything at or below 0.3 is indistinguishable from noise, and a number read
// there would be invented rather than measured. There is a test that holds this line.
/** Below this the rate is weak enough to be shown only as a rough figure. Set above the noise
 *  ceiling of 0.29 in those synthetic fixtures. Periodic motion can still resemble pulse. */
export const ROUGH_CONFIDENCE = 0.35

/** At or above this the rate is reported plainly. */
export const MIN_CONFIDENCE = 0.5

/** Require evidence of fingertip contact before interpreting periodic brightness. */
export const MIN_COVERED_FRACTION = 0.6

/** A capture shorter than this cannot hold enough cycles at MIN_BPM to trust. */
export const MIN_CAPTURE_SECONDS = 8
/** Interpolation cannot replace actual camera frames or bridge a stalled camera. */
export const MIN_SOURCE_HZ = 12
export const MAX_FRAME_GAP_MS = 250
/** Ignore variation below the camera's useful precision, including floating-point residue. */
export const MIN_MODULATION_PERCENT = 0.01
export const MAX_ATTEMPT_AGE_MS = 90_000

/**
 * Why a reading failed, so the step can say something useful instead of "error".
 * Every one of these is a normal outcome, not a fault: a failed pulse never marks a result
 * partial and never changes a verdict (D46).
 */
export type PulseFailure = 'too-short' | 'not-covered' | 'no-rhythm'

/**
 * Relative modulation: how much each sample differs from the local average, as a fraction of it.
 * Dividing by the local level is what makes channels comparable, and it undoes part of what the
 * camera's automatic exposure does, since a gain change scales every pixel at once.
 */
export function relativeSeries(xs: readonly number[], hz: number): number[] {
  const slow = movingAverage(xs, Math.max(1, Math.round(1.5 * hz)))
  const fast = movingAverage(xs, Math.max(1, Math.round(0.1 * hz)))
  return fast.map((v, i) => (slow[i] > 0 ? (v - slow[i]) / slow[i] : 0))
}

/** Root mean square of a series, used to report how much signal there was at all. */
export function rms(xs: readonly number[]): number {
  if (xs.length === 0) return 0
  return Math.sqrt(xs.reduce((a, b) => a + b * b, 0) / xs.length)
}

export type PulseAnalysis = {
  /** Average beats per minute, or null when we could not read one. */
  bpm: number | null
  /** Frames used, after the settling ones are dropped. For diagnosing a failure on a real phone. */
  samples: number
  /** Which colour channel the rate came from. */
  channel?: Channel
  /** How much the signal actually moved, as a percentage of its own level. Near zero means the
   *  camera flattened it, not that the person has no pulse. */
  modulation: number
  /** True when the rate is reported but the signal was weak: show it as approximate. */
  rough: boolean
  /** An approximate estimate supported by separate recent attempts, never a scored reading. */
  combined?: boolean
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
export function resample(samples: readonly PulseSample[], hz: number, channel: Channel = 'red'): number[] {
  const value = (s: PulseSample) => s[channel] ?? s.red
  if (samples.length < 2) return samples.map(value)
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
    const from = value(a)
    const to = value(b)
    out[i] = span <= 0 ? from : from + ((to - from) * (t - a.t)) / span
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
  const none = { bpm: null, confidence: 0 }
  const n = y.length
  if (n < 3 || !Number.isFinite(hz) || hz <= 0 || y.some((v) => !Number.isFinite(v))) return none
  let low = Infinity
  let high = -Infinity
  for (const v of y) { low = Math.min(low, v); high = Math.max(high, v) }
  if (high - low <= Number.EPSILON * Math.max(1, Math.abs(low), Math.abs(high)) * 16) return none
  const mean = y.reduce((a, b) => a + b, 0) / n
  const centred = y.map((v) => v - mean)
  const energy = centred.reduce((a, b) => a + b * b, 0)
  if (!Number.isFinite(energy) || energy <= 0) return none

  // Find the fundamental before enforcing the reportable band. Looking only inside 40..180
  // hides a 220 bpm fundamental and reports its 110 bpm subharmonic instead. Slow exposure
  // drift must not become the maximum at a search boundary and be reported as 40 or 180.
  const minLag = 2
  const maxLag = Math.min(n - 2, Math.ceil((hz * 60) / 20))
  if (maxLag <= minLag) return none
  const r = new Array<number>(maxLag + 2).fill(0)
  // Include a neighbour on both sides, even for a peak exactly at 40 or 180 bpm.
  for (let lag = minLag - 1; lag <= maxLag + 1; lag += 1) {
    let sum = 0
    for (let i = 0; i + lag < n; i += 1) sum += centred[i] * centred[i + lag]
    r[lag] = sum / (energy * ((n - lag) / n))
  }
  const peaks: number[] = []
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    if (r[lag] > 0 && r[lag] > r[lag - 1] && r[lag] >= r[lag + 1]) peaks.push(lag)
  }
  if (peaks.length === 0) return none
  const best = Math.max(...peaks.map((lag) => r[lag]))
  const chosen = peaks.find((lag) => r[lag] >= 0.8 * best)!

  // Parabolic interpolation around the peak: a lag is a whole frame, which at 30 Hz is 4 bpm
  // of resolution near 70 bpm. This recovers the fraction between frames.
  let lag = chosen
  if (chosen >= minLag && chosen <= maxLag) {
    const d = r[chosen - 1] - 2 * r[chosen] + r[chosen + 1]
    if (d !== 0) {
      const shift = (0.5 * (r[chosen - 1] - r[chosen + 1])) / d
      if (Math.abs(shift) <= 1) lag = chosen + shift
    }
  }

  const bpm = (hz * 60) / lag
  if (!Number.isFinite(bpm) || bpm < MIN_BPM || bpm > MAX_BPM) return { bpm: null, confidence: r[chosen] }

  // At low source frame rates, integer lags can favour a multiple of the real period even
  // with guard peaks. Cross-check spectral energy before reporting that low rate. A much
  // stronger faster harmonic means the period is ambiguous, so reject it rather than divide
  // a fast rhythm into a plausible-looking resting pulse.
  const powerAt = (rate: number) => {
    const step = (2 * Math.PI * rate) / (60 * hz)
    let real = 0
    let imaginary = 0
    for (let i = 0; i < n; i++) {
      real += centred[i] * Math.cos(step * i)
      imaginary += centred[i] * Math.sin(step * i)
    }
    return real * real + imaginary * imaginary
  }
  const fundamentalPower = powerAt(bpm)
  for (let multiple = 2; multiple * bpm < hz * 30; multiple++) {
    if (powerAt(multiple * bpm) > 2 * fundamentalPower) return { bpm: null, confidence: r[chosen] }
  }
  return { bpm, confidence: Math.min(1, Math.max(0, r[chosen])) }
}

/** Whether a capture contains real, contiguous frames on one monotonic clock. */
function usableSamples(samples: readonly PulseSample[]): boolean {
  if (samples.length < 2) return false
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]
    if (![s.t, s.red, s.green ?? s.red, s.blue ?? s.red].every(Number.isFinite)) return false
    if (i > 0) {
      const gap = s.t - samples[i - 1].t
      if (gap <= 0 || gap > MAX_FRAME_GAP_MS) return false
    }
  }
  const seconds = (samples[samples.length - 1].t - samples[0].t) / 1000
  return seconds > 0 && (samples.length - 1) / seconds >= MIN_SOURCE_HZ
}

function agree(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(8, 0.1 * Math.min(a, b))
}

/**
 * The whole pipeline. Drops the settling frames, checks the lens was covered, then reads a rate.
 * Returns a reason rather than throwing: every failure here is an ordinary outcome.
 */
export function analyzePulse(samples: readonly PulseSample[], settleSeconds = SETTLE_SECONDS): PulseAnalysis {
  const empty = { bpm: null, confidence: 0, coveredFraction: 0, seconds: 0, samples: 0, modulation: 0, rough: false }
  if (samples.length < 2) return { ...empty, reason: 'too-short' }
  if (samples.some((s, i) => !Number.isFinite(s.t) || (i > 0 && s.t <= samples[i - 1].t))) {
    return { ...empty, reason: 'no-rhythm' }
  }

  const start = samples[0].t
  const used = samples.filter((s) => s.t - start >= settleSeconds * 1000)
  if (used.length < 2) return { ...empty, reason: 'too-short' }

  const seconds = (used[used.length - 1].t - used[0].t) / 1000
  const coveredFraction = used.filter((s) => s.covered).length / used.length
  const base = { coveredFraction, seconds, samples: used.length }

  if (seconds + 1e-6 < MIN_CAPTURE_SECONDS) return { ...empty, ...base, reason: 'too-short' }
  if (!usableSamples(used)) return { ...empty, ...base, reason: 'no-rhythm' }

  if (coveredFraction < MIN_COVERED_FRACTION) return { ...empty, ...base, reason: 'not-covered' }
  const supportedRates: number[] = []
  // Try every colour channel and keep the clearest. A fingertip looks red because red is the
  // brightest channel through skin, but haemoglobin absorbs GREEN hardest, so green usually
  // carries the strongest pulse. Reading red alone threw that away.
  const channels: Channel[] = ['green', 'red', 'blue']
  let best: { bpm: number | null; confidence: number; channel: Channel; modulation: number } | null = null
  for (const channel of channels) {
    if (channel !== 'red' && used[0][channel] === undefined) continue
    const series = relativeSeries(resample(used, RESAMPLE_HZ, channel), RESAMPLE_HZ)
    const got = rateFromAutocorrelation(series, RESAMPLE_HZ)
    const modulation = rms(series) * 100
    let bpm = modulation >= MIN_MODULATION_PERCENT ? got.bpm : null
    // One global correlation can hide a rate that jumps between incompatible periods.
    // Require the beginning and end to support the same rate for a full-length capture.
    if (bpm !== null && seconds >= 12) {
      const width = MIN_CAPTURE_SECONDS * RESAMPLE_HZ
      const first = rateFromAutocorrelation(series.slice(0, width), RESAMPLE_HZ)
      const last = rateFromAutocorrelation(series.slice(-width), RESAMPLE_HZ)
      if (first.bpm === null || last.bpm === null ||
          first.confidence < ROUGH_CONFIDENCE || last.confidence < ROUGH_CONFIDENCE ||
          !agree(bpm, first.bpm) || !agree(bpm, last.bpm) || !agree(first.bpm, last.bpm)) bpm = null
    }
    if (bpm !== null && got.confidence >= MIN_CONFIDENCE) supportedRates.push(bpm)
    const candidate = { ...got, bpm, channel, modulation }
    // An unusable channel must not mask a valid one just because it correlated strongly.
    if (!best || (candidate.bpm !== null && best.bpm === null) ||
        ((candidate.bpm === null) === (best.bpm === null) && candidate.confidence > best.confidence)) best = candidate
  }
  if (supportedRates.some(a => supportedRates.some(b => !agree(a, b)))) return { ...empty, ...base, reason: 'no-rhythm' }
  if (!best) return { ...empty, ...base, reason: 'no-rhythm' }

  const { bpm, confidence, channel, modulation } = best
  if (bpm !== null && confidence >= ROUGH_CONFIDENCE) {
    return {
      bpm: Math.round(bpm),
      confidence,
      channel,
      modulation,
      // Above MIN_CONFIDENCE it is a reading; between the two it is a rough figure, and the
      // screen says so rather than passing it off as exact.
      rough: confidence < MIN_CONFIDENCE,
      ...base,
      reason: 'ok',
    }
  }
  return { bpm: null, confidence, channel, modulation, rough: false, ...base, reason: 'no-rhythm' }
}


export type PulseAttempt = { samples: readonly PulseSample[]; endedAt: number; acquisition?: string }

type Evidence = PulseAnalysis & { bpm: number }

/** Look for contiguous good sections; never interpolate a gap or concatenate separate tries. */
function attemptEvidence(samples: readonly PulseSample[]): Evidence | null {
  if (samples.length < 2 || !Number.isFinite(samples[0].t)) return null
  const start = samples[0].t + SETTLE_SECONDS * 1000
  const segments: PulseSample[][] = []
  let segment: PulseSample[] = []
  for (const sample of samples) {
    const finite = [sample.t, sample.red, sample.green ?? sample.red, sample.blue ?? sample.red].every(Number.isFinite)
    if (!finite || sample.t < start) {
      if (segment.length) segments.push(segment)
      segment = []
      continue
    }
    const gap = segment.length ? sample.t - segment[segment.length - 1].t : 0
    if (segment.length && (gap <= 0 || gap > MAX_FRAME_GAP_MS)) {
      segments.push(segment)
      segment = []
    }
    segment.push(sample)
  }
  if (segment.length) segments.push(segment)
  const evidence: Evidence[] = []
  for (const frames of segments) {
    // Half-overlapping windows help salvage a stable section in a moving-finger capture.
    // They still count as ONE attempt, not independent votes for the same frames.
    const starts = new Set<number>()
    let nextStart = -Infinity
    for (let from = 0; from < frames.length; from++) {
      if (frames[from].t >= nextStart) {
        starts.add(from)
        nextStart = frames[from].t + MIN_CAPTURE_SECONDS * 500
      }
    }
    // A good section at the end can fall between the grid's starts, especially after the
    // finger settles late. Include the last full window without counting it as another vote.
    const last = frames[frames.length - 1].t
    const tail = frames.findLastIndex((s) => s.t <= last - MIN_CAPTURE_SECONDS * 1000)
    if (tail >= 0) starts.add(tail)
    for (const from of starts) {
      let to = from + 1
      while (to < frames.length && frames[to].t - frames[from].t < MIN_CAPTURE_SECONDS * 1000) to++
      if (to >= frames.length) continue
      const result = analyzePulse(frames.slice(from, to + 1), 0)
      if (result.bpm !== null && result.reason === 'ok' && result.confidence >= 0.65) {
        evidence.push({ ...result, bpm: result.bpm })
      }
    }
  }
  if (!evidence.length) return null
  if (evidence.some((a) => evidence.some((b) => !agree(a.bpm, b.bpm)))) return null
  return evidence.reduce((best, got) => got.confidence > best.confidence ? got : best)
}

/** Retry evidence lives only in the caller's pulse step. No old result can replace a good new one. */
export function analyzePulseAttempts(attempts: readonly PulseAttempt[], now: number): PulseAnalysis {
  const current = attempts[attempts.length - 1]
  if (!current) return analyzePulse([])
  const lastFrame = current.samples.at(-1)?.t
  if (lastFrame !== undefined && (current.endedAt < lastFrame || current.endedAt - lastFrame > MAX_FRAME_GAP_MS)) {
    return { ...analyzePulse([]), reason: 'no-rhythm' }
  }
  const standalone = analyzePulse(current.samples)
  if (standalone.reason === 'ok' && !standalone.rough) return standalone
  if (!Number.isFinite(now)) return standalone
  const recent = attempts.slice(-2).filter((a) => Number.isFinite(a.endedAt) && a.endedAt <= now && now - a.endedAt <= MAX_ATTEMPT_AGE_MS)
  if (recent.length !== 2 || recent[1] !== current || recent[0].endedAt >= current.endedAt || recent[0].samples === current.samples) return standalone
  const priorFrames = recent[0].samples
  const priorEnd = priorFrames.at(-1)?.t
  if (priorEnd === undefined || priorEnd > recent[0].endedAt ||
      recent[0].endedAt - priorEnd > MAX_FRAME_GAP_MS || now - priorFrames[0].t > MAX_ATTEMPT_AGE_MS) return standalone
  if (!current.acquisition || recent[0].acquisition !== current.acquisition ||
      !(current.samples[0]?.t > recent[0].endedAt)) return standalone
  const previous = attemptEvidence(recent[0].samples)
  const latest = attemptEvidence(current.samples)
  if (!previous || !latest || !agree(previous.bpm, latest.bpm)) return standalone

  const cadence = (e: Evidence) => (e.samples - 1) / e.seconds
  if (Math.max(cadence(previous), cadence(latest)) > 1.2 * Math.min(cadence(previous), cadence(latest))) return standalone
  // Use an observed rate from the stronger window, not an arithmetic middle between two pulses.
  const chosen = latest.confidence >= previous.confidence ? latest : previous
  const samples = previous.samples + latest.samples
  return {
    ...chosen,
    rough: true,
    combined: true,
    reason: 'ok',
    confidence: Math.min(previous.confidence, latest.confidence),
    seconds: previous.seconds + latest.seconds,
    samples,
    coveredFraction: (previous.coveredFraction * previous.samples + latest.coveredFraction * latest.samples) / samples,
  }
}
