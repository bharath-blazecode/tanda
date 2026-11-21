import { describe, expect, it } from 'vitest'
import { boardName, generateNickname, isValidNickname, MAX_NAME_CHARS, sanitizeName } from './nicknames'

describe('sanitizeName', () => {
  it('keeps funny and rude names, in any script', () => {
    expect(sanitizeName('Drunk Uncle Bob!')).toBe('Drunk Uncle Bob!')
    expect(sanitizeName('Shit Faced')).toBe('Shit Faced')
    expect(sanitizeName("O'Brien-Smith")).toBe("O'Brien-Smith")
    expect(sanitizeName('Mr. Bean')).toBe('Mr. Bean')
    expect(sanitizeName('Zoë')).toBe('Zoë')
    expect(sanitizeName('Иван')).toBe('Иван')
    expect(sanitizeName('नमस्ते')).toBe('नमस्ते')
    expect(sanitizeName('Spicy Raccoon')).toBe('Spicy Raccoon')
    expect(sanitizeName('Nazir 2')).toBe('Nazir 2')
  })

  it('normalises, collapses whitespace, drops what is not allowed and cuts to 16', () => {
    expect(sanitizeName('  Ｂｉｇ\t\n  Ｍｉｋｅ  ')).toBe('Big Mike') // NFKC turns full-width into ASCII
    expect(sanitizeName('Tom <script>')).toBe('Tom script')
    expect(sanitizeName('Party\u0000​Animal 🍺')).toBe('PartyAnimal')
    expect(sanitizeName('A'.repeat(40))).toHaveLength(MAX_NAME_CHARS)
    expect(sanitizeName('Fifteen chars ab cdef')).toBe('Fifteen chars ab')
    // "x" has no precomposed accented form, so NFKC leaves the marks for the cap to trim.
    expect(sanitizeName('x́̂̃̄̅oe')).toBe('x́̂oe')
    expect(sanitizeName('́́Bo')).toBe('Bo')
  })

  it('returns null when nothing showable is left', () => {
    for (const raw of ['', '   ', '🍺🍺', '!!!', '- . -', '<>']) expect(sanitizeName(raw)).toBeNull()
  })

  it('refuses links', () => {
    for (const raw of ['kachka.fun', 'go to www', 'HTTP://x', 'me@home', 'ｗｗｗ', 'x .com']) {
      expect(sanitizeName(raw)).toBeNull()
    }
  })

  it('refuses slurs and hate terms, with digits read as letters', () => {
    for (const raw of ['n1gg4', 'N I G G E R', 'Hitler Fan', 'heil h1tl3r', 'Faggot', 'fag', 'Spics', '1488', 'KKK Club']) {
      expect(sanitizeName(raw)).toBeNull()
    }
  })
})

describe('boardName', () => {
  it('keeps a generated nickname whole, even past the typed-name cap', () => {
    expect(boardName('Twitchy Kookaburra', 'device-1')).toBe('Twitchy Kookaburra')
  })

  it('uses the sanitised typed name', () => {
    expect(boardName('  Big   Mike ', 'device-1')).toBe('Big Mike')
  })

  it('falls back to a generated nickname that is stable per device', () => {
    const a = boardName('n1gg4', 'device-aaaaaaaa')
    expect(isValidNickname(a)).toBe(true)
    expect(boardName('www.spam.com', 'device-aaaaaaaa')).toBe(a)
    const others = new Set(Array.from({ length: 20 }, (_, i) => boardName('n1gg4', `device-${i}`)))
    expect(others.size).toBeGreaterThan(1)
  })

  it('leaves generateNickname and isValidNickname as they were', () => {
    expect(generateNickname(() => 0)).toBe('Wobbly Quokka')
    expect(isValidNickname('Calm Quokka')).toBe(true)
    expect(isValidNickname('calm quokka')).toBe(false)
  })
})
