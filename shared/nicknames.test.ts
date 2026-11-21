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

describe('sanitizeName hardening', () => {
  it('removes invisible letters, and a name with nothing visible left is null', () => {
    for (const raw of ['ᅟ', 'ᅠᅠ', 'ㅤ', 'ﾠﾠ', 'ㅤ ㅤ', '͏️']) {
      expect(sanitizeName(raw)).toBeNull()
    }
    expect(sanitizeName('ㅤBobﾠ')).toBe('Bob')
    expect(sanitizeName('Bᅟoᅠb')).toBe('Bob')
  })

  it('refuses spaced and punctuated spellings', () => {
    for (const raw of ['n-a-z-i', 'n a z i', 'F A G', 's.p.i.c', 'N.A.Z.I.S', 'k i k e', 'h-i-t-l-e-r']) {
      expect(sanitizeName(raw), raw).toBeNull()
    }
  })

  it('refuses Cyrillic and Greek look-alikes, accents and any script of digits', () => {
    const bypasses = [
      'nаzі', // Cyrillic а and і
      'NАZІ', // Cyrillic capitals А and І
      'СООN', // Cyrillic С О О
      'ΚΚΚ', // Greek capital kappa
      'κκκ',
      'fаg', // Cyrillic а
      'ѕрiс', // Cyrillic ѕ р с
      'n̈ází', // combining marks and accents
      'ńįgg',
      '١٤٨٨', // Arabic-Indic digits
      '१४८८', // Devanagari digits
      '𝟏𝟒𝟖𝟖', // mathematical digits
      'n١gg', // Arabic-Indic one read as i
      'h١tl٣r',
      'tοwelhead', // Greek omicron
    ]
    for (const raw of bypasses) expect(sanitizeName(raw), raw).toBeNull()
  })

  it('refuses a dot, spaces and a letter as a link, and still http, www and @', () => {
    for (const raw of ['kachka . fun', 'kachka. fun', 'kachka .fun', 'kachka .  fun', 'HTTP x', 'www', 'a@b', 'һttр']) {
      expect(sanitizeName(raw), raw).toBeNull()
    }
    expect(sanitizeName('Mr. Bean')).toBe('Mr. Bean')
    expect(sanitizeName('Big Kev.')).toBe('Big Kev.')
  })

  it('still lets funny and rude names through, with the letters the user typed', () => {
    const fine = ['Big Kev', 'Sir Wobbles', 'El Pedote', 'Señor Chela', 'Beer Goblin', 'José', 'Zoë', '李雷']
    for (const raw of fine) expect(sanitizeName(raw), raw).toBe(raw)
    // The comparison form is never what comes back.
    expect(sanitizeName('Иван Петров')).toBe('Иван Петров')
    expect(sanitizeName('Ζωή')).toBe('Ζωή')
    expect(sanitizeName('Agent ٤٢')).toBe('Agent ٤٢')
  })

  it('keeps the 16 character cap', () => {
    expect(sanitizeName('ㅤ'.repeat(5) + 'A'.repeat(40))).toBe('A'.repeat(MAX_NAME_CHARS))
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
