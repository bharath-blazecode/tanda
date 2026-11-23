import { describe, expect, it } from 'vitest'
import { CARE_COPY } from './care-copy'

const entries = Object.entries(CARE_COPY)

/** The words this product never ships, from CLAUDE.md. Matched on word boundaries, or "BAC"
 *  fires on "background" and "callback" and the test cries wolf. */
const BANNED = [
  'safe to drive',
  'fine to drive',
  'ok to drive',
  'sober',
  'legal limit',
  'BAC',
  'diagnosis',
]

describe('care copy', () => {
  it('keeps population intake limits out of personal advice', () => {
    for (const [, copy] of entries) expect(copy.body).not.toMatch(/400 mg|safe limit/i)
  })

  it('never promises a kinder tomorrow or an early wake-up, and disowns any sleep prediction', () => {
    for (const [tag, copy] of entries) {
      expect(/tomorrow will be kinder|expect to wake/i.test(copy.body), tag).toBe(false)
    }
    expect(CARE_COPY['caffeine-at-bedtime'].body).toMatch(/cannot tell you whether you will sleep/)
  })

  it('has a title and a body for every tag', () => {
    for (const [tag, copy] of entries) {
      expect(copy.title.length, tag).toBeGreaterThan(0)
      expect(copy.body.length, tag).toBeGreaterThan(0)
    }
  })

  it('ships none of the banned words', () => {
    for (const [tag, copy] of entries) {
      const text = `${copy.title} ${copy.body}`
      for (const phrase of BANNED) {
        const pattern = new RegExp(`\\b${phrase.replace(/ /g, '\\s+')}\\b`, 'i')
        expect(pattern.test(text), `${tag} contains "${phrase}"`).toBe(false)
      }
    }
  })

  it('never claims a drink or a food changes how fast alcohol leaves', () => {
    // A remedy framing is the failure mode this whole card is guarding against.
    const promises = [/flush(es|ing)? (it|the alcohol) out/i, /speeds? (it|you) up/i, /sobers? you up/i]
    for (const [tag, copy] of entries) {
      for (const pattern of promises) {
        expect(pattern.test(`${copy.title} ${copy.body}`), `${tag}`).toBe(false)
      }
    }
  })

  it('says plainly in only-time that nothing speeds it up', () => {
    expect(CARE_COPY['only-time'].body).toMatch(/nothing you eat or drink/i)
    expect(CARE_COPY['only-time'].body).toMatch(/only time/i)
  })

  it('does not offer a countdown or a finish line', () => {
    for (const [tag, copy] of entries) {
      expect(/\b(\d+)\s+(glasses|waters)\b/i.test(`${copy.title} ${copy.body}`), tag).toBe(false)
    }
  })
})
