import { describe, expect, it } from 'vitest'
import { RunResult } from './contracts'

describe('RunResult needs at least one scored test', () => {
  const taps = { medianMs: 400, wrong: 0, lapses: 0, trials: 8 }
  const stand = { swayRms: 1, swayLateralRms: 1, hz: 50, valid: true }

  it('accepts taps alone, which is the no-motion case', () => {
    expect(RunResult.safeParse({ choice: taps, at: 1 }).success).toBe(true)
  })

  it('accepts standing alone, which is the newly allowed case', () => {
    expect(RunResult.safeParse({ stand, at: 1 }).success).toBe(true)
  })

  it('refuses a run with neither, however much else it carries', () => {
    expect(RunResult.safeParse({ at: 1 }).success).toBe(false)
    // A pulse cannot stand in for a scored test: it is capped and only adjusts (D46).
    expect(RunResult.safeParse({ at: 1, hr: 72, hrSource: 'camera' }).success).toBe(false)
  })
})
