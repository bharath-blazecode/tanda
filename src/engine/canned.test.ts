import { describe, expect, it } from 'vitest'
import { Handicap, Verdict } from '../../shared/contracts'
import { MAX_LINE_CHARS, filterLine } from '../../server/prompt'
import {
  DEMO_LINES,
  DEMO_NO_DRIFT_LINES,
  EXAMPLE_LINES,
  REAL_LINES,
  STEADY_WITH_ALCOHOL_LINES,
  allCannedLines,
  cannedLine,
} from './canned'

describe('canned lines', () => {
  it('every canned line passes the server output filter unchanged', () => {
    for (const line of allCannedLines()) {
      expect(filterLine(line), line).toBe(line)
      expect(line.length).toBeLessThanOrEqual(Math.min(180, MAX_LINE_CHARS))
    }
  })

  it('has at least three lines per verdict, per handicap and for no drift', () => {
    for (const v of Verdict.options) expect(REAL_LINES[v].length).toBeGreaterThanOrEqual(3)
    for (const h of Handicap.options) expect(DEMO_LINES[h].length).toBeGreaterThanOrEqual(3)
    expect(DEMO_NO_DRIFT_LINES.length).toBeGreaterThanOrEqual(3)
    expect(STEADY_WITH_ALCOHOL_LINES.length).toBeGreaterThanOrEqual(3)
  })

  it('steady lines with alcohol never read as clearance', () => {
    for (const line of STEADY_WITH_ALCOHOL_LINES) {
      expect(line).not.toMatch(/\b(fine|safe|ok|okay|good to go|all clear|cleared)\b/i)
    }
  })
})

describe('cannedLine', () => {
  it('keeps the two-argument call working', () => {
    expect(cannedLine('wired', 'real')).toBe(REAL_LINES.wired[0])
  })

  it('chooses deterministically with pick, wrapping around', () => {
    expect(cannedLine('tipsy', 'real', 1)).toBe(REAL_LINES.tipsy[1])
    expect(cannedLine('tipsy', 'real', 4)).toBe(REAL_LINES.tipsy[1])
    expect(cannedLine('tipsy', 'real', -2)).toBe(REAL_LINES.tipsy[2])
    expect(cannedLine('tipsy', 'real', Number.NaN)).toBe(REAL_LINES.tipsy[0])
  })

  it('uses the non-clearance steady lines when alcohol is logged', () => {
    expect(cannedLine('steady', 'real', 2, { alcohol: 1 })).toBe(STEADY_WITH_ALCOHOL_LINES[2])
    expect(cannedLine('steady', 'real', 2, { alcohol: 0 })).toBe(REAL_LINES.steady[2])
  })

  it('keys demo lines by handicap guess, and by no drift', () => {
    expect(cannedLine('wobbly', 'demo', 0, { handicap: 'jacks' })).toBe(DEMO_LINES.jacks[0])
    expect(cannedLine('steady', 'demo', 1, { handicap: 'spin' })).toBe(DEMO_NO_DRIFT_LINES[1])
    expect(cannedLine('wobbly', 'demo')).toBe(REAL_LINES.wobbly[0])
  })
})

describe('example runs', () => {
  it('never call the example numbers the person\'s normal, nor mention a handicap', () => {
    for (const verdict of Verdict.options) {
      for (const line of EXAMPLE_LINES[verdict]) {
        expect(line).not.toMatch(/your normal range|handicap|on purpose|sabotage/i)
      }
    }
  })

  it('are picked for an example reference, and steady with alcohol still gets the non-clearance line', () => {
    expect(cannedLine('wobbly', 'demo', 0, { reference: 'example' })).toBe(EXAMPLE_LINES.wobbly[0])
    expect(cannedLine('steady', 'demo', 1, { reference: 'example' })).toBe(EXAMPLE_LINES.steady[1])
    expect(cannedLine('steady', 'demo', 1, { reference: 'example', alcohol: 2 })).toBe(STEADY_WITH_ALCOHOL_LINES[1])
  })
})
