import { describe, expect, it } from 'vitest'
import { SAFETY_TEXT } from '../../ui'
import { receiptFilename, receiptLines, type ReceiptData } from './receipt-image'

const base: ReceiptData = {
  readingId: '36370',
  timestamp: 'Sat 21 Nov 16:40',
  name: 'Testing Ibis',
  tags: [],
  rows: [
    ['Body sway', 'no change'],
    ['Choice time', '+9%'],
    ['Wrong squares', '+1'],
    ['Pulse', 'Skipped'],
  ],
  verdict: 'steady',
  line: 'Steady as a bin lid in a breeze.',
  safety: false,
  nudge: 'Still not a driving test.',
}

const textOf = (d: ReceiptData) =>
  receiptLines(d)
    .map((l) => ('text' in l ? l.text : 'label' in l ? `${l.label} ${l.value}` : ''))
    .join(' | ')

describe('receiptLines', () => {
  it('carries the reading, the time and the rows', () => {
    const text = textOf(base)
    expect(text).toContain('Reading 36370')
    expect(text).toContain('Sat 21 Nov 16:40')
    expect(text).toContain('Wrong squares +1')
    expect(text).toContain('Pulse Skipped')
  })

  it('puts the safety line on the image whenever the reading needs one', () => {
    // A receipt that leaves the phone must not be the one copy that drops the safety line.
    // Steady with alcohol logged is exactly the case this guards (D19).
    expect(textOf({ ...base, safety: true })).toContain(SAFETY_TEXT)
  })

  it('leaves the safety line off a reading that does not need one', () => {
    expect(textOf(base)).not.toContain(SAFETY_TEXT)
  })

  it('never writes a banned phrase', () => {
    const banned = ['safe to drive', 'fine to drive', 'ok to drive', 'sober', 'legal limit', 'BAC', 'diagnosis']
    for (const safety of [true, false]) {
      const text = textOf({ ...base, safety, verdict: 'tipsy' })
      for (const phrase of banned) {
        expect(new RegExp(`\\b${phrase.replace(/ /g, '\\s+')}\\b`, 'i').test(text), phrase).toBe(false)
      }
    }
  })

  it('shows the verdict as a stamp, in capitals', () => {
    expect(receiptLines(base).find((l) => l.kind === 'stamp')).toEqual({ kind: 'stamp', text: 'STEADY' })
  })

  it('leaves the subject line out when there is no name', () => {
    expect(textOf({ ...base, name: undefined })).not.toContain('Subject')
  })

  it('keeps tags above the rows', () => {
    const kinds = receiptLines({ ...base, tags: ['Simulated'] }).map((l) => l.kind)
    expect(kinds.indexOf('tag')).toBeLessThan(kinds.indexOf('row'))
  })
})

describe('receiptFilename', () => {
  it('is a safe filename', () => {
    expect(receiptFilename('36370')).toBe('kachka-reading-36370.png')
    // Letters are kept; only the characters that could escape a filename are dropped.
    expect(receiptFilename('No. 12/34 ../x')).toBe('kachka-reading-No1234x.png')
    expect(receiptFilename('../../etc/passwd')).toBe('kachka-reading-etcpasswd.png')
  })
})

describe('what the picture adds to the ticket', () => {
  const data = {
    readingId: '36370',
    timestamp: 'Sat 21 Nov 16:40',
    tags: [],
    rows: [['Choice time', '+21%']] as [string, string][],
    verdict: 'wobbly',
    line: 'A line.',
    safety: false,
    nudge: 'Water, and a slow breath.',
  }

  it('ends with where to get your own', () => {
    expect(receiptLines(data).at(-1)).toEqual({ kind: 'site', text: 'kachka.fun' })
  })

  it('prints the demo guess under the rows, and only when there is one', () => {
    const kinds = receiptLines({ ...data, extra: 'We think you spun.' }).map((l) => l.kind)
    expect(kinds.indexOf('extra')).toBe(kinds.lastIndexOf('row') + 1)
    expect(receiptLines(data).some((l) => l.kind === 'extra')).toBe(false)
  })
})
