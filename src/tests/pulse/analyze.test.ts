import { describe, expect, it } from 'vitest'
import {
  MIN_CONFIDENCE,
  analyzePulse,
  bandpass,
  movingAverage,
  rateFromAutocorrelation,
  resample,
  type PulseSample,
} from './analyze'

/** A synthetic capture: a sine at `bpm` on a bright red field, sampled at `fps`. */
function capture(options: {
  bpm: number
  seconds?: number
  fps?: number
  covered?: boolean
  amplitude?: number
  drift?: number
  noise?: number
  jitter?: number
  seed?: number
}): PulseSample[] {
  const { bpm, seconds = 20, fps = 30, covered = true, amplitude = 4, drift = 0, noise = 0, jitter = 0 } = options
  const out: PulseSample[] = []
  // A fixed generator, so a failure is reproducible.
  let seed = options.seed ?? 7
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed / 2147483648 - 0.5
  }
  const count = Math.round(seconds * fps)
  for (let i = 0; i < count; i += 1) {
    const t = (i * 1000) / fps + jitter * random() * (1000 / fps)
    const phase = (2 * Math.PI * bpm * (t / 1000)) / 60
    const red = 140 + amplitude * Math.sin(phase) + (drift * t) / 1000 + noise * random()
    out.push({ t, red, green: red, blue: red, covered })
  }
  return out
}

describe('movingAverage', () => {
  it('returns the input when the window is one', () => {
    expect(movingAverage([1, 2, 3], 1)).toEqual([1, 2, 3])
  })

  it('flattens a constant signal to itself', () => {
    expect(movingAverage([5, 5, 5, 5], 3)).toEqual([5, 5, 5, 5])
  })

  it('handles an empty array', () => {
    expect(movingAverage([], 5)).toEqual([])
  })
})

describe('bandpass', () => {
  it('removes a slow ramp and keeps a fast wiggle', () => {
    const hz = 30
    const ramp = Array.from({ length: 300 }, (_, i) => i * 0.5)
    const flat = bandpass(ramp, hz, 0.1, 1.5)
    // A pure ramp has nothing in the pass band, so the middle should sit near zero.
    const middle = flat.slice(60, 240)
    const worst = Math.max(...middle.map(Math.abs))
    expect(worst).toBeLessThan(1)
  })
})

describe('resample', () => {
  it('puts jittery frames onto an even grid', () => {
    const samples: PulseSample[] = [
      { t: 0, red: 0, covered: true },
      { t: 40, red: 4, covered: true },
      { t: 70, red: 7, covered: true },
      { t: 100, red: 10, covered: true },
    ]
    const grid = resample(samples, 100)
    // The source is red = t / 10, so an even grid should land on multiples of one.
    expect(grid.length).toBe(11)
    expect(grid[0]).toBeCloseTo(0, 6)
    expect(grid[5]).toBeCloseTo(5, 6)
    expect(grid[10]).toBeCloseTo(10, 6)
  })

  it('survives two frames sharing a timestamp', () => {
    const samples: PulseSample[] = [
      { t: 0, red: 1, covered: true },
      { t: 0, red: 2, covered: true },
      { t: 100, red: 3, covered: true },
    ]
    expect(resample(samples, 50).every(Number.isFinite)).toBe(true)
  })
})

describe('rateFromAutocorrelation', () => {
  it('reads a clean rate back', () => {
    for (const bpm of [48, 60, 72, 96, 140]) {
      const y = capture({ bpm, seconds: 20 }).map((s) => s.red)
      const got = rateFromAutocorrelation(y, 30)
      expect(got.bpm).not.toBeNull()
      expect(got.bpm!).toBeGreaterThan(bpm - 3)
      expect(got.bpm!).toBeLessThan(bpm + 3)
    }
  })

  it('does not report half the rate when the second harmonic is tall', () => {
    // Autocorrelation peaks at the period and at every multiple of it. Taking the tallest peak
    // instead of the first strong one would report 60 for a 120 bpm pulse.
    const y = capture({ bpm: 120, seconds: 20 }).map((s) => s.red)
    const got = rateFromAutocorrelation(y, 30)
    expect(got.bpm!).toBeGreaterThan(110)
  })

  it('has no confidence in a flat signal', () => {
    const got = rateFromAutocorrelation(new Array(300).fill(140), 30)
    expect(got.bpm).toBeNull()
    expect(got.confidence).toBe(0)
  })
})

describe('analyzePulse', () => {
  it('reads a resting rate through drift and noise', () => {
    const got = analyzePulse(capture({ bpm: 72, drift: 6, noise: 1.5 }))
    expect(got.reason).toBe('ok')
    expect(got.bpm!).toBeGreaterThan(69)
    expect(got.bpm!).toBeLessThan(75)
    expect(got.confidence).toBeGreaterThanOrEqual(MIN_CONFIDENCE)
  })

  it('reads a raised rate, which is the case that matters for drift', () => {
    const got = analyzePulse(capture({ bpm: 108 }))
    expect(got.reason).toBe('ok')
    expect(got.bpm!).toBeGreaterThan(104)
    expect(got.bpm!).toBeLessThan(112)
  })

  it('survives a camera that will not hold its frame rate', () => {
    const got = analyzePulse(capture({ bpm: 78, fps: 15, jitter: 0.8 }))
    expect(got.reason).toBe('ok')
    expect(got.bpm!).toBeGreaterThan(74)
    expect(got.bpm!).toBeLessThan(82)
  })

  it('says not-covered when the lens gate failed AND there is no rhythm to be found', () => {
    const got = analyzePulse(capture({ bpm: 72, amplitude: 0, noise: 30, covered: false }))
    expect(got.reason).toBe('not-covered')
    expect(got.bpm).toBeNull()
  })

  it('rejects periodic light when the lens was uncovered', () => {
    expect(analyzePulse(capture({ bpm: 72, covered: false }))).toMatchObject({ bpm: null, reason: 'not-covered' })
  })

  it('reports what it saw, so a failure on a real phone can be diagnosed', () => {
    const got = analyzePulse(capture({ bpm: 72 }))
    expect(got.samples).toBeGreaterThan(100)
    expect(got.seconds).toBeGreaterThan(15)
  })

  it('says too-short for a capture that cannot hold enough cycles', () => {
    expect(analyzePulse(capture({ bpm: 72, seconds: 6 })).reason).toBe('too-short')
    expect(analyzePulse([]).reason).toBe('too-short')
    expect(analyzePulse([{ t: 0, red: 1, covered: true }]).reason).toBe('too-short')
  })

  it('never invents a rate from pure noise, whatever the seed', () => {
    // The thresholds exist because of this. Over many seeds of noise with no pulse in it the
    // autocorrelation peak reaches about 0.29, so a threshold below that prints a random number
    // between 40 and 180 and calls it someone's pulse. This test holds the line.
    let reported = 0
    for (let seed = 1; seed <= 30; seed += 1) {
      const got = analyzePulse(capture({ bpm: 72, amplitude: 0, noise: 30, seed }))
      if (got.bpm !== null) reported += 1
    }
    expect(reported).toBe(0)
  })

  it('says no-rhythm for noise with no pulse in it', () => {
    const got = analyzePulse(capture({ bpm: 72, amplitude: 0, noise: 30 }))
    expect(got.reason).toBe('no-rhythm')
    expect(got.bpm).toBeNull()
  })

  it('drops the settling frames instead of scoring them', () => {
    // Three seconds of nonsense, then a clean pulse. The nonsense must not reach the rate.
    const settle: PulseSample[] = Array.from({ length: 90 }, (_, i) => ({
      t: (i * 1000) / 30,
      red: i % 2 === 0 ? 0 : 255,
      covered: true,
    }))
    const rest = capture({ bpm: 66, seconds: 17 }).map((s) => ({ ...s, t: s.t + 3000 }))
    const got = analyzePulse([...settle, ...rest])
    expect(got.reason).toBe('ok')
    expect(got.bpm!).toBeGreaterThan(63)
    expect(got.bpm!).toBeLessThan(69)
  })

  it('never returns a rate outside the band it promises', () => {
    for (const bpm of [20, 30, 220, 300]) {
      const got = analyzePulse(capture({ bpm, seconds: 20 }))
      if (got.bpm !== null) {
        expect(got.bpm).toBeGreaterThanOrEqual(40)
        expect(got.bpm).toBeLessThanOrEqual(180)
      }
    }
  })
})
