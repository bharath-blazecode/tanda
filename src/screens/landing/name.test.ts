import { describe, expect, it } from 'vitest'
import { Stored } from '../../../shared/contracts'
import { chooseName } from './index'

describe('chooseName', () => {
  it('keeps a typed name, trimmed', () => {
    expect(chooseName('  Big Kev  ', 'Woozy Emu')).toBe('Big Kev')
  })

  it('cuts a typed name to 16 characters', () => {
    expect(chooseName('Abcdefghijklmnopqrst', 'Woozy Emu')).toBe('Abcdefghijklmnop')
  })

  it('keeps an untouched generated name whole, even past 16', () => {
    expect(chooseName('Rattled Kookaburra', 'Rattled Kookaburra')).toBe('Rattled Kookaburra')
  })

  it('falls back to the generated name when empty or too short to store', () => {
    expect(chooseName('   ', 'Woozy Emu')).toBe('Woozy Emu')
    expect(chooseName('Al', 'Woozy Emu')).toBe('Woozy Emu')
  })

  it('always returns a nickname the store accepts', () => {
    const generated = 'Woozy Emu'
    for (const typed of ['', 'a', 'Al ', 'Bob', ' x'.repeat(20), 'Zé']) {
      const nickname = chooseName(typed, generated)
      expect(Stored.shape.nickname.safeParse(nickname).success).toBe(true)
    }
  })
})
