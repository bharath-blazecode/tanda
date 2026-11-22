import { describe, expect, it } from 'vitest'
import type { VerdictRequest } from '../shared/contracts'
import { DEMO_LINES, DEMO_NO_DRIFT_LINES, REAL_LINES, STEADY_WITH_ALCOHOL_LINES } from '../src/engine/canned'
import { SYSTEM_PROMPT, buildUserMessage, driftLabel, filterLine, normalise } from './prompt'

const base: VerdictRequest = {
  deviceId: 'device-secret-1234',
  mode: 'real',
  verdict: 'tipsy',
  confidence: 'medium',
  drift: { sway: 2, choiceRt: 0.1, choiceWrong: 1 },
  nudge: 'ride-or-friend',
  drinks: { caffeineMg: 95.4, alcohol: 3 },
  localHour: 22,
}

describe('buildUserMessage', () => {
  it('never includes the deviceId', () => {
    const msg = buildUserMessage(base)
    expect(msg).not.toContain(base.deviceId)
    expect(msg).not.toMatch(/device/i)
  })

  it('renders drift as plain-language labels, plus drinks, hour and verdict', () => {
    const msg = buildUserMessage(base)
    expect(msg).toContain('Verdict: tipsy')
    expect(msg).toContain('Confidence: medium')
    expect(msg).toContain('body sway: well above their normal')
    expect(msg).toContain('tap reaction time: about their normal')
    expect(msg).toContain('wrong taps: a bit above their normal')
    expect(msg).toContain('about 95 mg')
    expect(msg).toContain('Alcoholic drinks logged today: 3')
    expect(msg).toContain('22:00 (late night)')
    expect(msg).not.toContain('heart rate')
    expect(msg).not.toContain('Demo mode')
  })

  it('mentions mode and handicap in demo mode', () => {
    const msg = buildUserMessage({ ...base, mode: 'demo', verdict: 'wobbly', handicap: 'spin' })
    expect(msg).toContain('Mode: demo')
    expect(msg).toContain('spun around')
  })

  it('says an example run compared with fixed numbers and had no handicap', () => {
    const msg = buildUserMessage({ ...base, mode: 'demo', verdict: 'wobbly', reference: 'example' })
    expect(msg).toContain('fixed example numbers')
    expect(msg).toContain('No handicap was chosen')
    expect(msg).not.toContain('messed up the test on purpose')
  })

  it('tells Claude a steady result proves nothing when alcohol was logged', () => {
    const msg = buildUserMessage({ ...base, verdict: 'steady', drift: { sway: 0 } })
    expect(msg).toContain('Steady tests prove nothing beyond standing and tapping')
    const sober = buildUserMessage({ ...base, verdict: 'steady', drinks: { caffeineMg: 0, alcohol: 0 } })
    expect(sober).not.toContain('prove nothing')
  })
})

describe('driftLabel', () => {
  it('maps the bands', () => {
    expect(driftLabel(-2)).toBe('better than their normal')
    expect(driftLabel(0)).toBe('about their normal')
    expect(driftLabel(3)).toBe('far above their normal')
  })
})

describe('filterLine', () => {
  it('trims, strips wrapping quotes and collapses whitespace', () => {
    expect(filterLine('  "Your sway   wandered\n off."  ')).toBe('Your sway wandered off.')
    expect(filterLine('“Taps logged.”')).toBe('Taps logged.')
  })

  it('rejects empty and overlong output', () => {
    expect(filterLine('   ')).toBeNull()
    expect(filterLine('""')).toBeNull()
    expect(filterLine('a'.repeat(221))).toBeNull()
    expect(filterLine('a'.repeat(220))).not.toBeNull()
  })

  it.each([
    'You are safe to drive.',
    'Fine to drive, mate.',
    'OK to drive home.',
    'Okay To Drive.',
    'Looking SOBER enough.',
    'Under the legal limit.',
    'Your BAC is low.',
    'Blood alcohol: none.',
    'My diagnosis: wobbly.',
    'Do not drive.',
    'Driving is out.',
    'Get a driver.',
  ])('rejects banned phrase: %s', (text) => {
    expect(filterLine(text)).toBeNull()
  })

  it('does not reject innocent words that contain a short stem', () => {
    expect(filterLine('Back to the bin with bacon.')).toBe('Back to the bin with bacon.')
    expect(filterLine('Careful with the cardboard, I have seen more drama in an empty wheelie bin.')).not.toBeNull()
  })

  it.each([
    'Your sobriety is noted.',
    'Your blood-alcohol is a mystery.',
    'B.A.C. unknown.',
    'Looking s o b e r today.',
    'You belong behind the wheel.',
    'Comfortably under the limit.',
    'Nice car.',
    'Hand over the licence.',
    'Ask a doctor.',
    'That needs medical attention.',
    'You drove here, did you.',
    'Not a legal opinion.',
    'So​ber as a judge.',
    'You are s‍ober.',
  ])('rejects a disguised banned word: %s', (text) => {
    expect(filterLine(text)).toBeNull()
  })

  it('rejects look-alike alphabets and other non-ASCII letters', () => {
    expect(filterLine('You are sоber.')).toBeNull() // Cyrillic o
    expect(filterLine('Café jitters.')).toBeNull()
  })

  it('maps compatibility forms before matching', () => {
    expect(filterLine('Ｓｏｂｅｒ enough.')).toBeNull() // fullwidth letters fold to ASCII under NFKC
  })

  it('lets a harmless line with an apostrophe, a dash and curly quotes through', () => {
    const line = 'You’re a “scientist” now — the bin\'s impressed.'
    expect(filterLine(line)).toBe(line)
    expect(filterLine(line, { alcohol: true })).toBe(line)
  })

  it.each([
    "You're fine.",
    'Safe enough, I suppose.',
    'All OK here.',
    'Okay, logged.',
    "You're alright.",
    'All clear on the chart.',
    'Good to go, apparently.',
    'You are clear to leave.',
  ])('rejects clearance words when alcohol is logged: %s', (text) => {
    expect(filterLine(text, { alcohol: true })).toBeNull()
    expect(filterLine(text)).toBe(text)
  })

  it('keeps every canned line that can be shown with alcohol logged through the alcohol filter', () => {
    const withAlcohol = [
      ...REAL_LINES.tipsy,
      ...REAL_LINES.wired,
      ...STEADY_WITH_ALCOHOL_LINES,
      ...Object.values(DEMO_LINES).flat(),
      ...DEMO_NO_DRIFT_LINES,
    ]
    for (const line of withAlcohol) expect(filterLine(line, { alcohol: true }), line).toBe(line)
  })
})

describe('normalise', () => {
  it('lower-cases, drops punctuation and joins spaced-out letters', () => {
    expect(normalise('Blood-Alcohol, B.A.C.!')).toBe('blood alcohol bac')
    expect(normalise('s o b e r')).toBe('sober')
  })
})

describe('SYSTEM_PROMPT', () => {
  it('sets the voice and the hard rules', () => {
    expect(SYSTEM_PROMPT).toContain('Dr. Bin Chicken')
    expect(SYSTEM_PROMPT).toContain('180 characters')
    expect(SYSTEM_PROMPT).toMatch(/never mention driving/i)
  })
})
