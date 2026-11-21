import { describe, expect, it } from 'vitest'
import type { RunResult } from '../../shared/contracts'
import { clip, driftFor, DRIFT_CLIP, pos } from './drift'
import { NOISE_FLOOR } from './metrics'

const run = (over: Partial<RunResult> = {}): RunResult => ({
  stand: { swayRms: 1, swayLateralRms: 0.5, hz: 50, valid: true },
  choice: { medianMs: 400, wrong: 0, lapses: 0, trials: 12 },
  at: 0,
  ...over,
})

describe('clip', () => {
  it('holds drift inside the range either way', () => {
    expect(clip(99)).toBe(DRIFT_CLIP)
    expect(clip(-99)).toBe(-DRIFT_CLIP)
  })

  it('turns a non-finite value into no drift rather than NaN', () => {
    expect(clip(Number.NaN)).toBe(0)
    expect(clip(Number.POSITIVE_INFINITY)).toBe(DRIFT_CLIP)
  })
})

describe('pos', () => {
  it('keeps only the worse-than-baseline part', () => {
    expect(pos(1.2)).toBe(1.2)
    expect(pos(-1.2)).toBe(0)
    expect(pos(undefined)).toBe(0)
  })
})

describe('driftFor', () => {
  it('divides a proportional change by the metric’s noise floor', () => {
    const d = driftFor(run(), run({ choice: { medianMs: 440, wrong: 0, lapses: 0, trials: 12 } }))
    expect(d.choiceRt).toBeCloseTo(0.1 / NOISE_FLOOR.choiceRt, 6)
  })

  it('reads a faster check as negative drift', () => {
    const d = driftFor(run(), run({ choice: { medianMs: 360, wrong: 0, lapses: 0, trials: 12 } }))
    expect(d.choiceRt).toBeLessThan(0)
  })

  it('counts wrong squares absolutely, so one never counts and two do', () => {
    const one = driftFor(run(), run({ choice: { medianMs: 400, wrong: 1, lapses: 0, trials: 12 } }))
    const two = driftFor(run(), run({ choice: { medianMs: 400, wrong: 2, lapses: 0, trials: 12 } }))
    expect(one.choiceWrong).toBe(1)
    expect(two.choiceWrong).toBe(2)
  })

  it('leaves sway out when either run did not stand still', () => {
    expect(driftFor(run({ stand: undefined }), run()).sway).toBeUndefined()
    expect(driftFor(run(), run({ stand: undefined })).sway).toBeUndefined()
  })

  it('leaves sway out when a reading was not usable', () => {
    const bad = run({ stand: { swayRms: 1, swayLateralRms: 0.5, hz: 50, valid: false } })
    expect(driftFor(run(), bad).sway).toBeUndefined()
  })

  it('leaves the pulse out unless both runs have one', () => {
    expect(driftFor(run(), run({ hr: 80 })).hr).toBeUndefined()
    expect(driftFor(run({ hr: 60 }), run()).hr).toBeUndefined()
    expect(driftFor(run({ hr: 60 }), run({ hr: 72 })).hr).toBeCloseTo(0.2 / NOISE_FLOOR.hr, 6)
  })

  it('leaves a metric out rather than dividing by a zero baseline', () => {
    const flat = run({ stand: { swayRms: 0, swayLateralRms: 0, hz: 50, valid: true } })
    expect(driftFor(flat, run()).sway).toBeUndefined()
  })

  it('never returns a value outside the contract’s range', () => {
    const huge = run({ choice: { medianMs: 9000, wrong: 40, lapses: 0, trials: 12 }, hr: 200 })
    const d = driftFor(run({ hr: 60 }), huge)
    for (const value of Object.values(d)) {
      expect(value).toBeGreaterThanOrEqual(-DRIFT_CLIP)
      expect(value).toBeLessThanOrEqual(DRIFT_CLIP)
    }
  })
})
