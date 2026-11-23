import { describe, expect, it } from 'vitest'
import { NudgeKind, Verdict, type RunResult } from '../../../shared/contracts'
import { compareRuns } from '../../engine/compare'
import { SAFETY_TEXT } from '../../ui/SafetyLine'
import {
  comparisonRows,
  conditionsWords,
  describeDrinks,
  labelNote,
  moodFor,
  referenceLine,
  nudgeWords,
  quoted,
  serialFor,
  signedCount,
  signedPercent,
  stampNote,
  ticketTags,
} from './format'

const stand = (swayRms: number) => ({ swayRms, swayLateralRms: swayRms / 2, hz: 60, valid: true, source: 'gyroscope' as const })
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
const rowsFor = (r: RunResult, ref: RunResult = baseline) => comparisonRows(r, ref, compareRuns(ref, r))

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

describe('comparisonRows', () => {
  it('prints one plain row per test, compared with the stored reference', () => {
    expect(rowsFor(run).rows).toEqual([
      ['Stand still', '+50%'],
      ['Tap time', '-10%'],
      ['Wrong or missed', '+2'],
      ['Pulse', '+10%'],
    ])
    expect(rowsFor(run).notes).toEqual([])
  })

  it('says Skipped for a standing test that was not taken, and keeps the pulse row last', () => {
    const { rows } = rowsFor({ ...run, stand: undefined })
    expect(rows.map(([label]) => label)).toEqual(['Stand still', 'Tap time', 'Wrong or missed', 'Pulse'])
    expect(rows[0]).toEqual(['Stand still', 'Skipped'])
  })

  it('explains a sensor change instead of printing a number across units', () => {
    const accel = { ...stand(0.03), source: 'acceleration' as const }
    const { rows, notes } = rowsFor({ ...run, stand: accel })
    expect(rows[0]).toEqual(['Stand still', 'Not compared'])
    expect(notes.join(' ')).toMatch(/different motion sensor/)
  })

  it('prints No clean taps instead of a placeholder time, and still counts the errors', () => {
    const { rows, notes } = rowsFor({ ...run, choice: { medianMs: 2000, wrong: 0, lapses: 8, trials: 8 } })
    expect(rows).toContainEqual(['Tap time', 'No clean taps'])
    expect(rows).toContainEqual(['Wrong or missed', '+7'])
    expect(notes.join(' ')).toMatch(/correct tap/)
  })

  it('tells every pulse outcome apart', () => {
    const pulseRow = (r: RunResult, ref: RunResult = baseline) => rowsFor(r, ref).rows.at(-1)
    const noHr = { ...run, hr: undefined }
    expect(pulseRow({ ...noHr, pulse: { status: 'skipped' } })).toEqual(['Pulse', 'Skipped'])
    expect(pulseRow({ ...noHr, pulse: { status: 'unreadable' } })).toEqual(['Pulse', 'No reading'])
    expect(pulseRow({ ...noHr, pulse: { status: 'blocked' } })).toEqual(['Pulse', 'No camera'])
    expect(pulseRow({ ...noHr, pulse: { status: 'approximate', bpm: 91.4 } })).toEqual(['Pulse', 'about 91 bpm'])
    expect(pulseRow(noHr)).toEqual(['Pulse', 'Not taken'])
  })

  it('says an unreadable pulse is not evidence about the pulse itself', () => {
    const { notes } = rowsFor({ ...run, hr: undefined, pulse: { status: 'unreadable' } })
    expect(notes.join(' ')).toMatch(/says nothing about your pulse/)
  })

  it('shows the reading, not a change, when only this run has a pulse', () => {
    const { rows, notes } = rowsFor({ ...run, hr: 71.6 }, { ...baseline, hr: undefined })
    expect(rows.at(-1)).toEqual(['Pulse', '72 bpm'])
    expect(notes.join(' ')).toMatch(/not compared/)
  })

  it('never prints a raw drift number', () => {
    for (const [, value] of rowsFor(run).rows) expect(value).not.toMatch(/\d\.\d{2,}/)
  })
})

describe('nudgeWords', () => {
  it('has the fixed words for every nudge', () => {
    expect(nudgeWords('carry-on')).toBe('Carry on.')
    expect(nudgeWords('water')).toBe('Water, and a slow breath.')
    expect(nudgeWords('no-more-caffeine')).toBe('Check the amounts in your drink log.')
    expect(nudgeWords('ride-or-friend')).toBe('Get a ride or ping a friend.')
    expect(nudgeWords('steady-not-a-driving-test')).toBe('Get a ride or a friend.')
  })
})

describe('ticketTags', () => {
  const plain = { partial: false, confidence: 'high' as const }
  it('shows nothing for a clean, full, real reading', () => {
    expect(ticketTags({ mode: 'real', assessment: plain, baselineClean: true, reference: 'personal' })).toEqual([])
  })
  it('tags simulated, example, partial and loose readings, provenance first', () => {
    expect(
      ticketTags({ mode: 'demo', assessment: { partial: true, confidence: 'low' }, baselineClean: true, reference: 'example' }),
    ).toEqual(['Simulated', 'Example reference, not your baseline', 'Partial reading', 'Loose reading'])
    expect(ticketTags({ mode: 'real', assessment: plain, baselineClean: false })).toEqual(['Loose reading'])
  })
})

describe('provenance and label wording', () => {
  it('describes the tier as recording conditions, never as confidence', () => {
    expect([conditionsWords('high'), conditionsWords('medium'), conditionsWords('low')]).toEqual(['good', 'fair', 'poor'])
  })
  it('prints what the reading was compared with', () => {
    expect(referenceLine({ kind: 'example', run: baseline, clean: true })).toBe('Against · example numbers')
    expect(referenceLine({ kind: 'personal', run: baseline, clean: true })).toMatch(/^Against · your baseline, /)
  })
  it('separates stamp names from the cause of task changes', () => {
    expect(labelNote('wired')).toMatch(/cannot explain what caused/)
    expect(labelNote('tipsy')).toMatch(/cannot explain what caused/)
    expect(labelNote('steady')).toMatch(/threshold/)
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
      ...ticketTags({ mode: 'demo', assessment: { partial: true, confidence: 'low' }, baselineClean: false, reference: 'example' }),
      ...Verdict.options.map(labelNote),
      ...rowsFor({ ...run, hr: undefined, pulse: { status: 'unreadable' }, stand: { ...stand(0.1), source: 'acceleration' } }).notes,
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
