import { describe, expect, it } from 'vitest'
import type { DrinkInput as Drink } from './serving'
import { BEDTIME_NOTICE_MG, careFor, nextBedtime, nextBedtimeAt } from './aftercare'

const NOON = new Date('2026-11-21T12:00:00').getTime()
const hours = (n: number) => n * 3600000
const drink = (kind: Drink['kind'], at = NOON): Drink => ({ kind, at })

describe('nextBedtime', () => {
  it('is tonight when the evening has not arrived', () => {
    const at = new Date(nextBedtime(NOON))
    expect(at.getHours()).toBe(23)
    expect(at.getDate()).toBe(new Date(NOON).getDate())
  })

  it('rolls to tomorrow once it is past', () => {
    const lateNight = new Date('2026-11-21T23:30:00').getTime()
    expect(new Date(nextBedtime(lateNight)).getDate()).toBe(22)
  })

  it('rolls over on the hour itself rather than sitting on it', () => {
    const exactly = new Date('2026-11-21T23:00:00').getTime()
    expect(nextBedtime(exactly)).toBeGreaterThan(exactly)
  })
})

describe('careFor', () => {
  it('says nothing when nothing was logged', () => {
    const care = careFor([], NOON)
    expect(care.tags).toEqual([])
    expect(care.caffeineAtBedtimeMg).toBeNull()
  })

  it('always attaches only-time to alcohol, and puts it first', () => {
    // This is the rule the card exists to hold. A list of remedies without it reads as a cure.
    for (const kind of ['beer', 'wine', 'spirit'] as const) {
      const care = careFor([drink(kind)], NOON)
      expect(care.tags).toContain('only-time')
      expect(care.tags[0]).toBe('only-time')
    }
  })

  it('keeps only-time even when the day is mostly coffee', () => {
    const care = careFor([drink('coffee'), drink('coffee'), drink('beer')], NOON)
    expect(care.tags).toContain('only-time')
  })

  it('offers water and food alongside alcohol, after only-time', () => {
    const care = careFor([drink('beer')], NOON)
    expect(care.tags).toEqual(['only-time', 'water-between', 'food-with-it'])
  })

  it('does not bring alcohol lines to a coffee-only day', () => {
    const care = careFor([drink('coffee')], NOON)
    expect(care.tags).not.toContain('only-time')
    expect(care.tags).not.toContain('water-between')
  })

  it('keeps an unknown-only bedtime estimate unavailable', () => {
    const care = careFor([drink('tea')], NOON)
    expect(care.caffeineAtBedtimeMg).toBeNull()
    expect(care.tags).toEqual([])
  })

  it('notices caffeine that will still be on board at bedtime', () => {
    const afternoon = new Date('2026-11-21T15:00:00').getTime()
    const care = careFor([drink('coffee', afternoon)], afternoon)
    expect(care.caffeineAtBedtimeMg!).toBeGreaterThan(BEDTIME_NOTICE_MG)
    expect(care.tags).toContain('caffeine-at-bedtime')
  })

  it('stays quiet about bedtime when the coffee was hours ago', () => {
    const dawn = new Date('2026-11-21T05:00:00').getTime()
    const care = careFor([drink('coffee', dawn)], dawn + hours(2))
    expect(care.caffeineAtBedtimeMg!).toBeLessThan(BEDTIME_NOTICE_MG)
    expect(care.tags).not.toContain('caffeine-at-bedtime')
  })

  it('takes a bedtime when it is given one', () => {
    const bedtime = NOON + hours(2)
    expect(careFor([drink('coffee')], NOON, bedtime).bedtime).toBe(bedtime)
  })

  it('does not mutate what it is handed', () => {
    const drinks = [drink('beer')]
    careFor(drinks, NOON)
    expect(drinks).toHaveLength(1)
  })
})

describe('bedtime the person chose', () => {
  it('finds the next 22:30 after now', () => {
    const at = new Date(nextBedtimeAt(NOON, 22 * 60 + 30))
    expect([at.getHours(), at.getMinutes(), at.getDate()]).toEqual([22, 30, new Date(NOON).getDate()])
  })

  it('rolls an after-midnight bedtime to the next morning', () => {
    const at = new Date(nextBedtimeAt(NOON, 60))
    expect(at.getHours()).toBe(1)
    expect(at.getDate()).toBe(new Date(NOON).getDate() + 1)
  })

  it('counts caffeine still on board from before the 4am boundary at bedtime', () => {
    const lastNight = new Date('2026-11-20T23:00:00').getTime()
    const coffee = { kind: 'coffee' as const, at: lastNight }
    const withCarry = careFor([], NOON, undefined, [coffee])
    expect(withCarry.caffeineAtBedtimeMg).not.toBeNull()
    expect(careFor([], NOON).caffeineAtBedtimeMg).toBeNull()
  })
})
