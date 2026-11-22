import { describe, expect, it } from 'vitest'
import type { RunResult } from '../../shared/contracts'
import type { DrinkInput as Drink } from './serving'
import { assess, LEARNING_CHECKS, MIN_HZ, scoreFor, totalDrift, type AssessInput } from './classify'
import { DRIFT_THRESHOLD, PULSE_CAP } from './metrics'

const run = (over: Partial<RunResult> = {}): RunResult => ({
  stand: { swayRms: 1, swayLateralRms: 0.5, hz: 50, valid: true, source: 'gyroscope' },
  choice: { medianMs: 400, wrong: 0, lapses: 0, trials: 12 },
  at: 0,
  ...over,
})

/** A check that drifts well past the threshold on sway alone. */
const drifted = () => run({ stand: { swayRms: 2.5, swayLateralRms: 1, hz: 50, valid: true, source: 'gyroscope' } })

const beer: Drink[] = [{ kind: 'beer', at: 0 }]
const coffee: Drink[] = [{ kind: 'coffee', at: 0 }]

const input = (over: Partial<AssessInput> = {}): AssessInput => ({
  baseline: run(),
  baselineClean: true,
  run: run(),
  drinksToday: [],
  mode: 'real',
  checksSinceBaseline: LEARNING_CHECKS,
  ...over,
})

describe('totalDrift', () => {
  it('adds only the worse-than-baseline parts', () => {
    expect(totalDrift({ sway: 1, choiceRt: -2, choiceWrong: 0.5 })).toBeCloseTo(1.5, 6)
  })

  it('caps the pulse so it can never carry a reading on its own', () => {
    expect(totalDrift({ hr: 3 })).toBe(PULSE_CAP)
    expect(totalDrift({ hr: 3 })).toBeLessThan(DRIFT_THRESHOLD)
  })
})

describe('scoreFor', () => {
  it('is 100 with nothing measured', () => {
    expect(scoreFor({})).toBe(100)
  })

  it('is 100 when nothing drifted the wrong way', () => {
    expect(scoreFor({ sway: -1, choiceRt: 0 })).toBe(100)
  })

  it('falls as drift rises, and never leaves 0 to 100', () => {
    const mild = scoreFor({ sway: 1 })
    const bad = scoreFor({ sway: 3, choiceRt: 3, choiceWrong: 3 })
    expect(mild).toBeGreaterThan(bad)
    expect(bad).toBe(0)
    expect(mild).toBeLessThanOrEqual(100)
    expect(mild).toBeGreaterThanOrEqual(0)
  })
})

describe('the sensors give the amount, the log gives the name', () => {
  it('is steady below the threshold whatever was logged', () => {
    expect(assess(input({ drinksToday: beer })).verdict).toBe('steady')
    expect(assess(input({ drinksToday: coffee })).verdict).toBe('steady')
  })

  it('names drift tipsy when alcohol is logged', () => {
    expect(assess(input({ run: drifted(), drinksToday: beer })).verdict).toBe('tipsy')
  })

  it('names drift wired when only caffeine is logged', () => {
    expect(assess(input({ run: drifted(), drinksToday: coffee })).verdict).toBe('wired')
  })

  it('names drift wobbly when nothing is logged', () => {
    expect(assess(input({ run: drifted() })).verdict).toBe('wobbly')
  })

  it('reads a night with both drinks as tipsy, never wired', () => {
    const both = [...beer, ...coffee]
    expect(assess(input({ run: drifted(), drinksToday: both })).verdict).toBe('tipsy')
  })
})

describe('safety', () => {
  it('always sends a tipsy reading to a ride or a friend', () => {
    const a = assess(input({ run: drifted(), drinksToday: beer }))
    expect(a.nudge).toBe('ride-or-friend')
    expect(a.showSafetyLine).toBe(true)
  })

  it('shows the safety line on a steady reading when alcohol was logged', () => {
    const a = assess(input({ drinksToday: beer }))
    expect(a.verdict).toBe('steady')
    expect(a.showSafetyLine).toBe(true)
    expect(a.nudge).toBe('steady-not-a-driving-test')
  })

  it('does not show the safety line for caffeine alone', () => {
    expect(assess(input({ drinksToday: coffee })).showSafetyLine).toBe(false)
  })
})

describe('learning', () => {
  const faster = run({ choice: { medianMs: 300, wrong: 0, lapses: 0, trials: 12 } })

  it('does not bank a faster tap as improvement in the first few checks', () => {
    const a = assess(input({ run: faster, checksSinceBaseline: 0 }))
    expect(a.drift.choiceRt).toBe(0)
  })

  it('credits it once the person has had some practice', () => {
    const a = assess(input({ run: faster, checksSinceBaseline: LEARNING_CHECKS }))
    expect(a.drift.choiceRt).toBeLessThan(0)
  })
})

describe('confidence', () => {
  it('is high with a clean baseline and a usable stand', () => {
    expect(assess(input()).confidence).toBe('high')
  })

  it('drops when the check never stood still', () => {
    expect(assess(input({ run: run({ stand: undefined }) })).confidence).toBe('medium')
  })

  it('drops when the baseline was not clean', () => {
    expect(assess(input({ baselineClean: false })).confidence).toBe('medium')
  })

  it('drops on a slow sample rate', () => {
    const slow = run({ stand: { swayRms: 1, swayLateralRms: 0.5, hz: MIN_HZ - 1, valid: true, source: 'gyroscope' } })
    expect(assess(input({ run: slow })).confidence).toBe('medium')
  })

  it('drops on a sample rate far from the baseline’s', () => {
    const off = run({ stand: { swayRms: 1, swayLateralRms: 0.5, hz: 20, valid: true, source: 'gyroscope' } })
    expect(assess(input({ run: off })).confidence).toBe('medium')
  })

  it('reaches low when two things are wrong at once', () => {
    expect(assess(input({ run: run({ stand: undefined }), baselineClean: false })).confidence).toBe('low')
  })
})

describe('partial', () => {
  it('marks a run that never stood still', () => {
    expect(assess(input({ run: run({ stand: undefined }) })).partial).toBe(true)
    expect(assess(input()).partial).toBe(false)
  })
})

describe('demo mode', () => {
  it('guesses jumping jacks from a raised pulse', () => {
    const a = assess(input({ mode: 'demo', baseline: run({ hr: 60 }), run: run({ hr: 80 }) }))
    expect(a.guessedHandicap).toBe('jacks')
  })

  it('guesses a spin when the body drifted more than the tapping', () => {
    expect(assess(input({ mode: 'demo', run: drifted() })).guessedHandicap).toBe('spin')
  })

  it('guesses the other hand when the tapping drifted more', () => {
    const clumsy = run({ choice: { medianMs: 700, wrong: 3, lapses: 0, trials: 12 } })
    expect(assess(input({ mode: 'demo', run: clumsy })).guessedHandicap).toBe('offhand')
  })

  it('guesses nothing when the handicap did nothing', () => {
    expect(assess(input({ mode: 'demo' })).guessedHandicap).toBeUndefined()
  })

  it('never guesses outside demo mode', () => {
    expect(assess(input({ run: drifted() })).guessedHandicap).toBeUndefined()
  })
})
