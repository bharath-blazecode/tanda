import { describe, expect, it } from 'vitest'
import type { Drink } from '../../shared/contracts'
import { dayStart, drinksToday } from './day'

const at = (iso: string) => new Date(iso).getTime()
const drink = (iso: string, kind: Drink['kind'] = 'beer'): Drink => ({ kind, at: at(iso) })

describe('dayStart', () => {
  it('is 4am today once the morning is past', () => {
    expect(dayStart(at('2026-11-21T14:00'))).toBe(at('2026-11-21T04:00'))
  })

  it('is yesterday 4am in the small hours', () => {
    expect(dayStart(at('2026-11-21T01:00'))).toBe(at('2026-11-20T04:00'))
  })
})

describe('drinksToday', () => {
  it('keeps a 1am drink with the 11pm one before it', () => {
    const drinks = [drink('2026-11-20T23:00'), drink('2026-11-21T01:00')]
    expect(drinksToday(drinks, at('2026-11-21T02:00'))).toHaveLength(2)
  })

  it('drops a drink from before the last 4am', () => {
    const drinks = [drink('2026-11-20T23:00'), drink('2026-11-21T05:00')]
    expect(drinksToday(drinks, at('2026-11-21T09:00'))).toHaveLength(1)
  })

  it('returns the newest first', () => {
    const drinks = [drink('2026-11-21T10:00'), drink('2026-11-21T12:00')]
    expect(drinksToday(drinks, at('2026-11-21T13:00'))[0].at).toBe(at('2026-11-21T12:00'))
  })

  it('leaves the caller’s array alone', () => {
    const drinks = [drink('2026-11-21T12:00'), drink('2026-11-21T10:00')]
    drinksToday(drinks, at('2026-11-21T13:00'))
    expect(drinks[0].at).toBe(at('2026-11-21T12:00'))
  })
})
