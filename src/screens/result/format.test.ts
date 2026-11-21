import { describe, expect, it } from 'vitest'
import { NudgeKind, type RunResult } from '../../../shared/contracts'
import { SAFETY_TEXT } from '../../ui/SafetyLine'
import {
  describeDrinks,
  metricRows,
  moodFor,
  nudgeWords,
  quoted,
  serialFor,
  signedCount,
  signedPercent,
  stampNote,
  ticketTags,
} from './format'

const stand = (swayRms: number) => ({ swayRms, swayLateralRms: swayRms / 2, hz: 60, valid: true })
const baseline: RunResult = {
  stand: stand(0.2),
  choice: { medianMs: 500, wrong: 1, lapses: 0, trials: 8 },
  hr: 70,
  at: 1,
}
const run: RunResult = {
  stand: stand(0.3),
  choice: { medianMs: 450, wrong: 3, lapses: 0, trials: 8 },
  hr: 77,
  at: 2,
}

describe('signedPercent', () => {
  it('signs the change from the normal', () => {
    expect(signedPercent(130, 100)).toBe('+30%')
    expect(signedPercent(88, 100)).toBe('-12%')
  })
  it('says no change when it rounds to zero or cannot compare', () => {
    expect(signedPercent(100.3, 100)).toBe('no change')
    expect(signedPercent(5, 0)).toBe('no change')
  })
})

describe('signedCount', () => {
  it('signs a count and says no change at zero', () => {
    expect(signedCount(3, 1)).toBe('+2')
    expect(signedCount(0, 2)).toBe('-2')
    expect(signedCount(1, 1)).toBe('no change')
  })
})

describe('metricRows', () => {
  it('prints one plain row per metric in the drift record', () => {
    const rows = metricRows({ sway: 1.6, choiceRt: -0.6, choiceWrong: 2, hr: 0.6 }, run, baseline)
    expect(rows).toEqual([
      ['Body sway', '+50%'],
      ['Choice time', '-10%'],
      ['Wrong squares', '+2'],
      ['Pulse', '+10%'],
    ])
  })
  it('leaves out metrics the engine did not score, except the pulse', () => {
    const rows = metricRows({ choiceRt: 0, choiceWrong: 0 }, { ...run, stand: undefined }, baseline)
    expect(rows.map(([label]) => label)).toEqual(['Choice time', 'Wrong squares', 'Pulse'])
  })

  it('says Skipped rather than dropping the pulse row', () => {
    // The pulse is the one step a person chooses to do or not. A missing row reads as a bug;
    // "Skipped" reads as a choice.
    const rows = metricRows({ choiceRt: 0, choiceWrong: 0 }, { ...run, hr: undefined }, baseline)
    expect(rows.at(-1)).toEqual(['Pulse', 'Skipped'])
  })

  it('says Skipped when neither run has a pulse', () => {
    const rows = metricRows({ choiceRt: 0 }, { ...run, hr: undefined }, { ...baseline, hr: undefined })
    expect(rows.at(-1)).toEqual(['Pulse', 'Skipped'])
  })

  it('shows the reading, not a change, when only this run has a pulse', () => {
    // Nothing to compare it with, so a percentage would be a number we cannot honestly state.
    const rows = metricRows({ choiceRt: 0 }, { ...run, hr: 71.6 }, { ...baseline, hr: undefined })
    expect(rows.at(-1)).toEqual(['Pulse', '72 bpm'])
  })

  it('keeps the pulse row last, under the wrong squares', () => {
    const rows = metricRows({ sway: 1, choiceRt: 0, choiceWrong: 1, hr: 0.5 }, run, baseline)
    expect(rows.map(([label]) => label)).toEqual(['Body sway', 'Choice time', 'Wrong squares', 'Pulse'])
  })
  it('never prints a raw drift number', () => {
    const rows = metricRows({ sway: 2.345, choiceRt: 1.234, choiceWrong: 2 }, run, baseline)
    for (const [, value] of rows) expect(value).not.toMatch(/2\.345|1\.234/)
  })
})

describe('nudgeWords', () => {
  it('has the fixed words for every nudge', () => {
    expect(nudgeWords('carry-on')).toBe('Carry on.')
    expect(nudgeWords('water')).toBe('Water, and a slow breath.')
    expect(nudgeWords('no-more-caffeine')).toBe('No more coffee today.')
    expect(nudgeWords('ride-or-friend')).toBe('Get a ride or ping a friend.')
    expect(nudgeWords('steady-not-a-driving-test')).toBe('Still not a driving test.')
  })
})

describe('ticketTags', () => {
  const plain = { partial: false, confidence: 'high' as const }
  it('shows nothing for a clean, full, real reading', () => {
    expect(ticketTags({ mode: 'real', assessment: plain, baselineClean: true })).toEqual([])
  })
  it('tags demo, partial and loose readings', () => {
    expect(
      ticketTags({ mode: 'demo', assessment: { partial: true, confidence: 'low' }, baselineClean: true }),
    ).toEqual(['Simulated', 'Partial reading: no Stand Still', 'Loose reading'])
    expect(ticketTags({ mode: 'real', assessment: plain, baselineClean: false })).toEqual(['Loose reading'])
  })
})

describe('stamp and header', () => {
  it('says simulated on the stamp only in demo mode', () => {
    expect(stampNote('demo')).toMatch(/simulated/i)
    expect(stampNote('real')).not.toMatch(/simulated/i)
  })
  it('gives the matching mascot mood', () => {
    expect(moodFor('steady')).toBe('steady')
    expect(moodFor('wobbly')).toBe('wobbly')
  })
  it('prints the same serial for the same reading', () => {
    expect(serialFor(1_763_700_000_000)).toBe(serialFor(1_763_700_000_000))
    expect(serialFor(1_763_700_000_000)).toMatch(/^No\. \d{5}$/)
  })
  it('quotes the line once', () => {
    expect(quoted('Hello.')).toBe('“Hello.”')
    expect(quoted('"Hello."')).toBe('“Hello.”')
  })
})

describe('copy rules', () => {
  const BANNED = /safe to drive|fine to drive|ok to drive|sober|legal limit|\bBAC\b|diagnosis/i
  it('ships none of the banned words', () => {
    const copy = [
      ...NudgeKind.options.map(nudgeWords),
      stampNote('demo'),
      stampNote('real'),
      ...ticketTags({ mode: 'demo', assessment: { partial: true, confidence: 'low' }, baselineClean: false }),
      SAFETY_TEXT,
    ]
    for (const words of copy) expect(words).not.toMatch(BANNED)
  })
})

describe('describeDrinks', () => {
  const at = Date.now()
  it('is empty when nothing was logged, so the line can be left off', () => {
    expect(describeDrinks([])).toBe('')
  })

  it('counts each kind and pluralises', () => {
    expect(describeDrinks([{ kind: 'beer', at }, { kind: 'beer', at }])).toBe('2 beers')
    expect(describeDrinks([{ kind: 'coffee', at }])).toBe('1 coffee')
    expect(describeDrinks([{ kind: 'energy', at }, { kind: 'energy', at }])).toBe('2 energy drinks')
  })

  it('puts alcohol before caffeine, whatever order it was logged in', () => {
    const drinks = [
      { kind: 'coffee' as const, at },
      { kind: 'beer' as const, at },
      { kind: 'wine' as const, at },
    ]
    expect(describeDrinks(drinks)).toBe('1 beer, 1 wine, 1 coffee')
  })

  it('never states a quantity of alcohol in the body, only what was logged', () => {
    // The ticket says what you told it. It does not convert that into units, grams or a level,
    // because that is a sobriety estimate and this is not one (D17, D18).
    const text = describeDrinks([{ kind: 'spirit', at }, { kind: 'spirit', at }])
    expect(text).toBe('2 spirits')
    expect(text).not.toMatch(/standard|unit|g\b|%|BAC/i)
  })
})
