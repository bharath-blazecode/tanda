import { describe, expect, it } from 'vitest'
import { NudgeKind } from '../../../shared/contracts'
import { EVENING_HOUR, nudgeText } from './nudge-copy'

const BANNED = ['safe to drive', 'fine to drive', 'ok to drive', 'sober', 'legal limit', 'BAC', 'diagnosis']
const ALL = NudgeKind.options
const EVERY_LINE = ALL.flatMap((n) => [nudgeText(n, 9), nudgeText(n, 20)])

describe('nudge copy', () => {
  it('has a line for every nudge in the enum, at any hour', () => {
    for (const line of EVERY_LINE) expect(line.length).toBeGreaterThan(0)
  })

  it('ships none of the banned words', () => {
    for (const line of EVERY_LINE) {
      for (const phrase of BANNED) {
        const pattern = new RegExp(`\\b${phrase.replace(/ /g, '\\s+')}\\b`, 'i')
        expect(pattern.test(line), `"${line}" contains "${phrase}"`).toBe(false)
      }
    }
  })

  it('never tells anyone they are fine, clear or good to go', () => {
    const promises = [/you are (fine|clear|good|right)\b/i, /safe to\b/i, /fit to\b/i, /\bclear to\b/i]
    for (const line of EVERY_LINE) {
      for (const pattern of promises) expect(pattern.test(line), line).toBe(false)
    }
  })

  it('says the steady-with-alcohol line is still not a driving test', () => {
    expect(nudgeText('steady-not-a-driving-test', 20)).toMatch(/not a driving test/i)
  })

  it('mentions sleep for caffeine in the evening but not in the morning', () => {
    expect(nudgeText('no-more-caffeine', EVENING_HOUR)).toMatch(/bedtime/i)
    expect(nudgeText('no-more-caffeine', EVENING_HOUR - 1)).not.toMatch(/bedtime/i)
  })
})
