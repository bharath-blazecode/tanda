import { describe, expect, it } from 'vitest'
import { RunResult, type ChoiceMetrics, type StandMetrics } from '../../shared/contracts'
import { assess, evaluate, LEARNING_CHECKS, type AssessInput } from './classify'
import { compareRuns, hasCleanTaps, plannedComparison, pulseStatusOf } from './compare'
import { driftFor } from './drift'

const gyro = (swayRms = 0.6, extra: Partial<StandMetrics> = {}): StandMetrics => ({
  swayRms,
  swayLateralRms: swayRms / 2,
  hz: 60,
  valid: true,
  source: 'gyroscope',
  captureSeconds: 10,
  ...extra,
})
const accel = (swayRms = 0.03): StandMetrics => ({ ...gyro(swayRms), source: 'acceleration' })
const taps = (medianMs = 480, extra: Partial<ChoiceMetrics> = {}): ChoiceMetrics => ({
  medianMs,
  wrong: 0,
  lapses: 0,
  trials: 8,
  ...extra,
})
const allLapses: ChoiceMetrics = { medianMs: 2000, wrong: 0, lapses: 8, trials: 8 }

const input = (baseline: RunResult, run: RunResult, over: Partial<AssessInput> = {}): AssessInput => ({
  baseline,
  baselineClean: true,
  run,
  drinksToday: [],
  mode: 'real',
  checksSinceBaseline: LEARNING_CHECKS,
  ...over,
})

describe('F1: nothing in common is not a reading', () => {
  const baseline: RunResult = { stand: gyro(), at: 1 }
  const run: RunResult = { choice: taps(), at: 2 }

  it('finds no comparable test', () => {
    expect(compareRuns(baseline, run).any).toBe(false)
  })

  it('evaluate refuses instead of printing Steady 100', () => {
    const outcome = evaluate(input(baseline, run))
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) {
      expect(outcome.comparability.stand).toEqual({ compared: false, reason: 'not-taken' })
      expect(outcome.comparability.choice).toEqual({ compared: false, reason: 'not-in-reference' })
    }
  })
})

describe('F2: gyroscope and acceleration are never compared', () => {
  it('refuses a gyroscope baseline against an acceleration check', () => {
    const can = compareRuns({ stand: gyro(0.6), at: 1 }, { stand: accel(0.03), at: 2 })
    expect(can.stand).toEqual({ compared: false, reason: 'sensor-changed' })
    expect(driftFor({ stand: gyro(0.6), at: 1 }, { stand: accel(0.03), at: 2 }).sway).toBeUndefined()
  })

  it('cannot turn a sensor change into Tipsy', () => {
    const baseline: RunResult = { stand: accel(0.03), choice: taps(), at: 1 }
    const run: RunResult = { stand: gyro(0.6), choice: taps(), at: 2 }
    const result = assess(input(baseline, run, { drinksToday: [{ kind: 'beer', at: 2 }] }))
    expect(result.drift.sway).toBeUndefined()
    expect(result.verdict).toBe('steady')
    expect(result.partial).toBe(true)
  })

  it('compares two readings from the same sensor', () => {
    expect(compareRuns({ stand: gyro(0.6), at: 1 }, { stand: gyro(0.9), at: 2 }).stand.compared).toBe(true)
  })

  it('excludes a pre-v2 reading with no recorded source, and says so', () => {
    const legacy = { swayRms: 0.6, swayLateralRms: 0.3, hz: 60, valid: true }
    const can = compareRuns({ stand: legacy, at: 1 }, { stand: gyro(0.7), at: 2 })
    expect(can.stand).toEqual({ compared: false, reason: 'unknown-source' })
  })

  it('lowers the recording-conditions tier for that unverified comparison', () => {
    const legacy = { swayRms: 0.6, swayLateralRms: 0.3, hz: 60, valid: true }
    const checked = assess(input({ stand: gyro(), choice: taps(), at: 1 }, { stand: gyro(), choice: taps(), at: 2 }))
    const unverified = assess(input({ stand: legacy, choice: taps(), at: 1 }, { stand: gyro(), choice: taps(), at: 2 }))
    expect(checked.confidence).toBe('high')
    expect(unverified.confidence).toBe('medium')
  })

  it('refuses a different capture length', () => {
    const can = compareRuns({ stand: gyro(0.6, { captureSeconds: 15 }), at: 1 }, { stand: gyro(0.6), at: 2 })
    expect(can.stand).toEqual({ compared: false, reason: 'capture-changed' })
  })
})

describe('F3: the no-clean-taps placeholder is not a reaction time', () => {
  it('knows when a run has no clean taps', () => {
    expect(hasCleanTaps(allLapses)).toBe(false)
    expect(hasCleanTaps({ medianMs: 2000, wrong: 8, lapses: 0, trials: 8 })).toBe(false)
    expect(hasCleanTaps(taps())).toBe(true)
  })

  it('does not score 2000 ms against a real baseline, and counts the misses instead', () => {
    const baseline: RunResult = { choice: taps(480), at: 1 }
    const run: RunResult = { choice: allLapses, at: 2 }
    const can = compareRuns(baseline, run)
    expect(can.reactionTime).toBe(false)
    expect(can.caveats).toContain('no-reaction-time')
    const drift = driftFor(baseline, run)
    expect(drift.choiceRt).toBeUndefined()
    expect(drift.choiceWrong).toBe(3)
  })

  it('never lets a run with no taps at all read as Steady', () => {
    const outcome = evaluate(input({ choice: taps(480), at: 1 }, { choice: allLapses, at: 2 }))
    expect(outcome.ok).toBe(true)
    if (outcome.ok) expect(outcome.assessment.verdict).not.toBe('steady')
  })

  it('does not compare times against a baseline that had no clean taps', () => {
    const can = compareRuns({ choice: allLapses, at: 1 }, { choice: taps(), at: 2 })
    expect(can.reactionTime).toBe(false)
    expect(driftFor({ choice: allLapses, at: 1 }, { choice: taps(), at: 2 }).choiceRt).toBeUndefined()
  })

  it('counts a missed square as an error, like a wrong one', () => {
    const drift = driftFor({ choice: taps(480), at: 1 }, { choice: taps(480, { lapses: 1 }), at: 2 })
    expect(drift.choiceWrong).toBe(1)
  })

  it('rejects a different trial count before comparing raw errors', () => {
    const can = compareRuns({ choice: taps(480, { trials: 12 }), at: 1 }, { choice: taps(), at: 2 })
    expect(can.choice).toEqual({ compared: false, reason: 'trial-count-changed' })
  })
})

describe('pulse provenance', () => {
  const ref: RunResult = { choice: taps(), hr: 70, hrSource: 'camera', pulse: { status: 'measured', bpm: 70 }, at: 1 }

  it('scores only a measured pulse against a measured reference', () => {
    const run: RunResult = { choice: taps(), hr: 80, hrSource: 'camera', pulse: { status: 'measured', bpm: 80 }, at: 2 }
    expect(compareRuns(ref, run).pulse.compared).toBe(true)
    expect(driftFor(ref, run).hr).toBeGreaterThan(0)
  })

  it('never scores an approximate reading', () => {
    const run: RunResult = { choice: taps(), pulse: { status: 'approximate', bpm: 90 }, at: 2 }
    expect(compareRuns(ref, run).pulse).toEqual({ compared: false, reason: 'approximate' })
    expect(driftFor(ref, run).hr).toBeUndefined()
  })

  it('the contract refuses an approximate reading that tries to fill hr', () => {
    const bad = { choice: taps(), hr: 90, pulse: { status: 'approximate', bpm: 90 }, at: 2 }
    expect(RunResult.safeParse(bad).success).toBe(false)
  })

  it('tells unreadable, blocked, skipped and not offered apart', () => {
    for (const status of ['unreadable', 'blocked', 'skipped'] as const) {
      expect(compareRuns(ref, { choice: taps(), pulse: { status }, at: 2 }).pulse).toEqual({ compared: false, reason: status })
    }
    expect(compareRuns(ref, { choice: taps(), at: 2 }).pulse).toEqual({ compared: false, reason: 'not-offered' })
  })

  it('reads a pre-v2 bare hr as measured', () => {
    expect(pulseStatusOf({ choice: taps(), hr: 72, at: 1 })).toBe('measured')
  })

  it('shows a measured pulse without comparing it when the reference has none', () => {
    const run: RunResult = { choice: taps(), hr: 80, pulse: { status: 'measured', bpm: 80 }, at: 2 }
    expect(compareRuns({ choice: taps(), at: 1 }, run).pulse).toEqual({ compared: false, reason: 'not-in-reference' })
  })
})

describe('example reference', () => {
  it('never guesses a handicap nobody chose', () => {
    const baseline: RunResult = { stand: gyro(0.6), choice: taps(), at: 0 }
    const run: RunResult = { stand: gyro(2), choice: taps(), at: 2 }
    const demo = assess(input(baseline, run, { mode: 'demo' }))
    const example = assess(input(baseline, run, { mode: 'demo', reference: 'example' }))
    expect(demo.guessedHandicap).toBe('spin')
    expect(example.guessedHandicap).toBeUndefined()
  })
})

describe('plannedComparison', () => {
  it('warns before a check that a standing-only baseline cannot be compared without motion', () => {
    expect(plannedComparison({ stand: gyro(), at: 1 }, false)).toEqual({ stand: false, choice: false })
    expect(plannedComparison({ stand: gyro(), choice: taps(), at: 1 }, false)).toEqual({ stand: false, choice: true })
    expect(plannedComparison({ stand: gyro(0.6, { protocolVersion: 2 }), choice: taps(), at: 1 }, true)).toEqual({ stand: true, choice: true })
  })
})

describe('B2 standing protocol provenance', () => {
  const current = { ...gyro(), protocolVersion: 2 }
  it('keeps taps comparable when only the stored standing protocol is unknown', () => {
    const can = compareRuns({ stand: gyro(), choice: taps(), at: 1 }, { stand: current, choice: taps(), at: 2 })
    expect(can.stand).toEqual({ compared: false, reason: 'protocol-changed' })
    expect(can.choice.compared).toBe(true)
  })
  it('requires capture duration on both sides of a current comparison', () => {
    expect(compareRuns({ stand: { ...current, captureSeconds: undefined }, at: 1 }, { stand: current, at: 2 }).stand.compared).toBe(false)
  })
})

describe('B2 recording conditions', () => {
  const stand = { ...gyro(), protocolVersion: 2, placement: 'portrait-up' as const }
  const baseline = { stand, choice: taps(), at: 1 }
  it.each([
    [{ hz: 30 }, 'cadence-changed'],
    [{ placement: 'face-up' }, 'placement-changed'],
    [{ placementChanged: true }, 'placement-changed'],
  ] as const)('excludes incompatible standing data while retaining tapping', (change, reason) => {
    const run = { ...baseline, stand: { ...stand, ...change }, at: 2 }
    expect(compareRuns(baseline, run).stand).toEqual({ compared: false, reason })
    expect(compareRuns(baseline, run).choice.compared).toBe(true)
    expect(driftFor(baseline, run).sway).toBeUndefined()
  })
  it('retains provenance across schema validation and lowers confidence for recovery', () => {
    const run = RunResult.parse({ ...baseline, stand: { ...stand, recovered: true } })
    expect(run.stand?.recovered).toBe(true)
    expect(assess(input(baseline, run)).confidence).toBe('medium')
  })
  it('carries uncertainty about missing gravity into the recording conditions', () => {
    const run = { ...baseline, stand: { ...stand, placement: undefined } }
    expect(compareRuns(baseline, run).caveats).toContain('unverified-placement')
  })
})
