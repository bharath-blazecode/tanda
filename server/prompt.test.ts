import { describe, expect, it } from 'vitest'
import type { VerdictRequest } from '../shared/contracts'
import { SYSTEM_PROMPT, buildUserMessage, driftLabel, filterLine } from './prompt'

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
  })
})

describe('SYSTEM_PROMPT', () => {
  it('sets the voice and the hard rules', () => {
    expect(SYSTEM_PROMPT).toContain('Dr. Bin Chicken')
    expect(SYSTEM_PROMPT).toContain('180 characters')
    expect(SYSTEM_PROMPT).toMatch(/never mention driving/i)
  })
})
