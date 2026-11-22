import { describe, expect, it } from 'vitest'
import { RunResult } from '../../shared/contracts'
import { buildRun } from './run'

const choice = { medianMs: 450, wrong: 0, lapses: 0, trials: 8 }

describe('buildRun', () => {
  it('copies only a measured pulse into the scored field', () => {
    const run = buildRun(null, choice, { status: 'measured', bpm: 72 }, 5)
    expect(run.hr).toBe(72)
    expect(run.hrSource).toBe('camera')
    expect(RunResult.safeParse(run).success).toBe(true)
  })

  it('keeps an approximate pulse for the ticket, unscored', () => {
    const run = buildRun(null, choice, { status: 'approximate', bpm: 90 }, 5)
    expect(run.hr).toBeUndefined()
    expect(run.pulse).toEqual({ status: 'approximate', bpm: 90 })
    expect(RunResult.safeParse(run).success).toBe(true)
  })

  it('records a skipped, blocked or unreadable pulse, and leaves the field out when it was not offered', () => {
    expect(buildRun(null, choice, { status: 'skipped' }, 5).pulse).toEqual({ status: 'skipped' })
    expect(buildRun(null, choice, { status: 'unreadable' }, 5).pulse).toEqual({ status: 'unreadable' })
    expect('pulse' in buildRun(null, choice, null, 5)).toBe(false)
  })
})
