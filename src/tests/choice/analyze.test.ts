import { describe, expect, it } from 'vitest'
import { median, NO_CLEAN_TAPS_MS, SCORED_TRIALS, summariseChoice, type ChoiceTrial } from './analyze'

const hit = (ms: number, lit = 0): ChoiceTrial => ({ lit, tapped: lit, ms })
const miss = (lit = 0): ChoiceTrial => ({ lit, tapped: null, ms: null })
const wrong = (ms: number, lit = 0): ChoiceTrial => ({ lit, tapped: (lit + 1) % 4, ms })

describe('median', () => {
  it('takes the middle value of an odd list', () => {
    expect(median([300, 100, 200])).toBe(200)
  })

  it('takes the mean of the middle two of an even list', () => {
    expect(median([100, 200, 300, 400])).toBe(250)
  })

  it('is null for an empty list', () => {
    expect(median([])).toBeNull()
  })

  it('does not reorder the caller’s array', () => {
    const values = [300, 100, 200]
    median(values)
    expect(values).toEqual([300, 100, 200])
  })
})

describe('the trial count', () => {
  it('divides evenly between the four squares, so none is favoured', () => {
    expect(SCORED_TRIALS % 4).toBe(0)
  })

  it('is enough taps for a median to mean anything', () => {
    expect(SCORED_TRIALS).toBeGreaterThanOrEqual(8)
  })
})

describe('summariseChoice', () => {
  it('takes the median over correct taps', () => {
    expect(summariseChoice([hit(400), hit(500), hit(600)]).medianMs).toBe(500)
  })

  it('counts a wrong square and keeps it out of the median', () => {
    const metrics = summariseChoice([hit(400), wrong(120), hit(600)])
    expect(metrics.wrong).toBe(1)
    expect(metrics.medianMs).toBe(500)
  })

  it('counts a lapse and keeps it out of the median', () => {
    const metrics = summariseChoice([hit(400), miss(), hit(600)])
    expect(metrics.lapses).toBe(1)
    expect(metrics.medianMs).toBe(500)
  })

  it('reports how many scored trials it was given', () => {
    expect(summariseChoice([hit(400), wrong(120), miss()]).trials).toBe(3)
  })

  it('falls back to a slow median when no tap was both correct and timed', () => {
    const metrics = summariseChoice([wrong(120), miss(), wrong(150)])
    expect(metrics.medianMs).toBe(NO_CLEAN_TAPS_MS)
    expect(metrics.wrong).toBe(2)
    expect(metrics.lapses).toBe(1)
  })

  it('reads an empty run as every trial lapsed, not as a fast one', () => {
    const metrics = summariseChoice([])
    expect(metrics.medianMs).toBe(NO_CLEAN_TAPS_MS)
    expect(metrics.lapses).toBe(SCORED_TRIALS)
    expect(metrics.trials).toBe(SCORED_TRIALS)
  })

  it('ignores a correct tap that was never timed', () => {
    const metrics = summariseChoice([hit(400), { lit: 2, tapped: 2, ms: null }, hit(600)])
    expect(metrics.medianMs).toBe(500)
    expect(metrics.wrong).toBe(0)
    expect(metrics.lapses).toBe(0)
  })

  it('always returns a positive median, as the contract requires', () => {
    for (const trials of [[], [miss()], [hit(1)], [wrong(50)]]) {
      expect(summariseChoice(trials).medianMs).toBeGreaterThan(0)
    }
  })
})
