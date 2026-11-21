import { describe, expect, it } from 'vitest'
import {
  analyzePulse,
  analyzePulseAttempts,
  rateFromAutocorrelation,
  type PulseAttempt,
  type PulseSample,
} from './analyze'

const NOW = 200_000

/** Camera-like timestamps and independent, reproducible noise; no browser or hardware needed. */
function samples(options: {
  bpm?: number
  seconds?: number
  fps?: number
  level?: number
  amplitude?: number
  noise?: number
  seed?: number
} = {}): PulseSample[] {
  const { bpm = 72, seconds = 20, fps = 30, level = 140, amplitude = 4, noise = 0 } = options
  let seed = options.seed ?? 19
  return Array.from({ length: Math.round(seconds * fps) + 1 }, (_, i) => {
    const t = (i * 1000) / fps
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const value = level + amplitude * Math.sin((2 * Math.PI * bpm * t) / 60_000)
      + noise * (seed / 2 ** 32 - 0.5)
    return { t, red: value, green: value, blue: value, covered: true }
  })
}

/** One clean eight-second section, with unrelated camera noise over the other section. */
function interrupted(bpm: number, clean: 'first' | 'last', seed = 19): PulseSample[] {
  const result = samples({ seconds: 18, amplitude: 0, noise: 30, seed })
  return result.map((sample) => {
    const useful = clean === 'first'
      ? sample.t >= 3000 && sample.t <= 11_000
      : sample.t >= 10_000
    if (!useful) return sample
    const value = 140 + 4 * Math.sin((2 * Math.PI * bpm * sample.t) / 60_000)
    return { ...sample, red: value, green: value, blue: value }
  })
}

function attempt(capture: PulseSample[], endedAt = NOW): PulseAttempt {
  return { samples: capture, endedAt }
}

describe('pulse frequency guardrails', () => {
  it.each([10, 20, 25, 30, 35, 38, 39, 220, 240, 300])(
    'rejects a %i bpm periodic signal instead of folding it into the reportable band',
    (bpm) => {
      const got = analyzePulse(samples({ bpm }))
      expect(got.bpm).toBeNull()
      expect(got.reason).not.toBe('ok')
    },
  )

  it.each([312, 315, 320])('rejects a fast %i bpm subharmonic at a low but supported source frame rate', (bpm) => {
    expect(analyzePulse(samples({ bpm, fps: 12 })).bpm).toBeNull()
  })

  it('does not let camera warm-up gaps poison the discarded settling interval', () => {
    const capture = samples().filter((s) => s.t < 1000 || s.t > 2000)
    expect(analyzePulse(capture)).toMatchObject({ reason: 'ok', bpm: 72 })
  })

  it.each([40, 48, 60, 72, 108, 175, 179, 180])(
    'preserves a genuine %i bpm signal, including real low rates and the upper boundary',
    (bpm) => {
      const got = analyzePulse(samples({ bpm }))
      expect(got.reason).toBe('ok')
      expect(got.bpm).not.toBeNull()
      expect(Math.abs(got.bpm! - bpm)).toBeLessThanOrEqual(2)
    },
  )

  it.each([0.1, 0.3, 1.1, 140.1, 128.1234567])(
    'does not mistake round-off in a constant %f signal for periodic energy',
    (value) => {
      const got = rateFromAutocorrelation(new Array(600).fill(value), 30)
      expect(got.bpm).toBeNull()
      expect(got.confidence).toBe(0)
    },
  )

  it('rejects a numerically tiny oscillation rather than normalizing it into a confident pulse', () => {
    expect(analyzePulse(samples({ amplitude: 1e-12 })).bpm).toBeNull()
  })

  it.each([1, 2, 8])('does not invent a 30 fps capture from %i fps source frames', (fps) => {
    expect(analyzePulse(samples({ fps })).bpm).toBeNull()
  })

  it('does not interpolate a missing second of camera data into usable evidence', () => {
    const capture = samples().filter((sample) => sample.t < 8000 || sample.t > 9000)
    expect(analyzePulse(capture).bpm).toBeNull()
  })

  it('rejects invalid timestamps, invalid values and backwards timestamps without throwing', () => {
    for (const change of [
      (sample: PulseSample) => ({ ...sample, t: Number.NaN }),
      (sample: PulseSample) => ({ ...sample, red: Number.POSITIVE_INFINITY }),
      (sample: PulseSample) => ({ ...sample, t: sample.t - 1000 }),
    ]) {
      const capture = samples()
      capture[270] = change(capture[270])
      expect(() => analyzePulse(capture)).not.toThrow()
      expect(analyzePulse(capture).bpm).toBeNull()
    }
  })

  it('rejects strongly disagreeing rates between the beginning and end of a capture', () => {
    const capture = samples({ bpm: 72 })
    for (const sample of capture) {
      if (sample.t < 11_000) continue
      const value = 140 + 4 * Math.sin((2 * Math.PI * 150 * sample.t) / 60_000)
      sample.red = value
      sample.green = value
      sample.blue = value
    }
    expect(analyzePulse(capture).bpm).toBeNull()
  })
})

describe('pulse retry evidence', () => {
  it('recovers only as a rough reading when both failed captures contain compatible usable sections', () => {
    const previous = interrupted(72, 'first')
    const current = interrupted(74, 'last', 23)
    expect(analyzePulse(previous).bpm).toBeNull()
    expect(analyzePulse(current).bpm).toBeNull()

    const got = analyzePulseAttempts([attempt(previous, NOW - 25_000), attempt(current)], NOW)
    expect(got.bpm).not.toBeNull()
    expect(got.bpm!).toBeGreaterThanOrEqual(70)
    expect(got.bpm!).toBeLessThanOrEqual(76)
    expect(got).toMatchObject({ reason: 'ok', rough: true, combined: true })
  })

  it('prefers a strong current reading to any old evidence', () => {
    const got = analyzePulseAttempts([
      attempt(interrupted(108, 'first'), NOW - 25_000),
      attempt(samples({ bpm: 72 })),
    ], NOW)
    expect(got.bpm).toBe(72)
    expect(got.rough).toBe(false)
    expect(got).not.toMatchObject({ combined: true })
  })

  it('does not merge incompatible usable sections into a typical-looking rate', () => {
    const got = analyzePulseAttempts([
      attempt(interrupted(60, 'first'), NOW - 25_000),
      attempt(interrupted(120, 'last', 23)),
    ], NOW)
    expect(got.bpm).toBeNull()
  })

  it('does not reuse stale evidence', () => {
    const got = analyzePulseAttempts([
      attempt(interrupted(72, 'first'), NOW - 91_000),
      attempt(interrupted(74, 'last', 23)),
    ], NOW)
    expect(got.bpm).toBeNull()
  })

  it('never returns a prior pulse when the current attempt has no pulse evidence', () => {
    const got = analyzePulseAttempts([
      attempt(samples({ bpm: 72 }), NOW - 25_000),
      attempt(samples({ amplitude: 0, noise: 30, seed: 23 })),
    ], NOW)
    expect(got.bpm).toBeNull()
  })

  it('does not recover from noise in both attempts', () => {
    const got = analyzePulseAttempts([
      attempt(samples({ amplitude: 0, noise: 30, seed: 19 }), NOW - 25_000),
      attempt(samples({ amplitude: 0, noise: 30, seed: 23 })),
    ], NOW)
    expect(got.bpm).toBeNull()
  })

  it('uses at most the latest two attempts and always requires evidence from the current one', () => {
    const got = analyzePulseAttempts([
      attempt(interrupted(72, 'first'), NOW - 50_000),
      attempt(interrupted(74, 'last', 23), NOW - 25_000),
      attempt(samples({ amplitude: 0, noise: 30, seed: 29 })),
    ], NOW)
    expect(got.bpm).toBeNull()
  })

  it('does not use settling frames when a retry has a non-finite initial clock', () => {
    const earlyOnly = () => {
      const result = interrupted(72, 'first')
      result[0].t = Number.NaN
      return result
    }
    expect(analyzePulseAttempts([attempt(earlyOnly(), NOW - 25_000), attempt(earlyOnly())], NOW).bpm).toBeNull()
  })

  it('does not turn empty or undersized current captures into readings', () => {
    for (const current of [[], samples({ seconds: 6 })]) {
      expect(analyzePulseAttempts([
        attempt(samples({ bpm: 72 }), NOW - 25_000),
        attempt(current),
      ], NOW).bpm).toBeNull()
    }
  })
})
