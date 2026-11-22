import { describe, expect, it } from 'vitest'
import type { DrinkInput as Drink } from './serving'
import {
  HALF_LIFE_FAST_HOURS,
  HALF_LIFE_SLOW_HOURS,
  PEAK_MINUTES,
  caffeineCurve,
  caffeineOnBoardMg,
  doseOnBoardMg,
  lastCallFor,
  peakOf,
  caffeineSummary,
  recentDrinks,
} from './caffeine'

const NOON = new Date('2026-11-21T12:00:00').getTime()
const minutes = (n: number) => n * 60000
const hours = (n: number) => minutes(n * 60)
const coffee = (at: number): Drink => ({ kind: 'coffee', at })

describe('doseOnBoardMg', () => {
  it('is nothing before the first sip', () => {
    expect(doseOnBoardMg(100, -10)).toBe(0)
    expect(doseOnBoardMg(100, 0)).toBe(0)
  })

  it('reaches the full dose at the peak', () => {
    expect(doseOnBoardMg(100, PEAK_MINUTES)).toBeCloseTo(100, 6)
  })

  it('rises on the way there and never overshoots', () => {
    let last = 0
    for (let m = 1; m <= PEAK_MINUTES; m += 1) {
      const now = doseOnBoardMg(100, m)
      expect(now).toBeGreaterThan(last)
      expect(now).toBeLessThanOrEqual(100.000001)
      last = now
    }
  })

  it('halves every five hours after the peak', () => {
    expect(doseOnBoardMg(100, PEAK_MINUTES + 300)).toBeCloseTo(50, 6)
    expect(doseOnBoardMg(100, PEAK_MINUTES + 600)).toBeCloseTo(25, 6)
    expect(doseOnBoardMg(100, PEAK_MINUTES + 900)).toBeCloseTo(12.5, 6)
  })

  it('leaves faster on a short half-life and lingers on a long one', () => {
    const late = PEAK_MINUTES + 300
    const fast = doseOnBoardMg(100, late, HALF_LIFE_FAST_HOURS)
    const slow = doseOnBoardMg(100, late, HALF_LIFE_SLOW_HOURS)
    expect(fast).toBeLessThan(slow)
    expect(fast).toBeCloseTo(100 * Math.pow(0.5, 5 / 2), 6)
  })
})

describe('caffeineOnBoardMg', () => {
  it('adds the drinks up', () => {
    const drinks = [coffee(NOON), coffee(NOON)]
    const one = caffeineOnBoardMg([coffee(NOON)], NOON + hours(3))
    expect(caffeineOnBoardMg(drinks, NOON + hours(3))).toBeCloseTo(one * 2, 6)
  })

  it('ignores drinks that carry no caffeine', () => {
    const drinks: Drink[] = [{ kind: 'beer', at: NOON }, { kind: 'wine', at: NOON }, { kind: 'spirit', at: NOON }]
    expect(caffeineOnBoardMg(drinks, NOON + hours(1))).toBe(0)
  })

  it('counts an energy drink as less than a coffee', () => {
    const at = NOON + hours(2)
    const energy = caffeineOnBoardMg([{ kind: 'energy', at: NOON }], at)
    expect(energy).toBeLessThan(caffeineOnBoardMg([coffee(NOON)], at))
    expect(energy).toBeGreaterThan(0)
  })

  it('has not forgotten an afternoon coffee by midnight', () => {
    // The whole point of the card: this is the number people do not expect.
    const threePm = new Date('2026-11-21T15:00:00').getTime()
    const midnight = new Date('2026-11-22T00:00:00').getTime()
    const left = caffeineOnBoardMg([coffee(threePm)], midnight)
    expect(left).toBeGreaterThan(25)
    expect(left).toBeLessThan(40)
  })
})

describe('caffeineCurve', () => {
  it('samples the window and brackets the middle line with the band', () => {
    const points = caffeineCurve([coffee(NOON)], NOON, NOON + hours(6), 30)
    expect(points.length).toBe(13)
    for (const p of points.slice(4)) {
      expect(p.low).toBeLessThanOrEqual(p.mg + 1e-9)
      expect(p.mg).toBeLessThanOrEqual(p.high + 1e-9)
    }
  })

  it('returns nothing for a window that does not run forwards', () => {
    expect(caffeineCurve([coffee(NOON)], NOON, NOON, 10)).toEqual([])
    expect(caffeineCurve([coffee(NOON)], NOON + 1000, NOON, 10)).toEqual([])
  })

  it('puts the peak near fifty minutes after the drink', () => {
    const points = caffeineCurve([coffee(NOON)], NOON, NOON + hours(6), 5)
    const top = peakOf(points)!
    expect((top.t - NOON) / 60000).toBeGreaterThanOrEqual(45)
    expect((top.t - NOON) / 60000).toBeLessThanOrEqual(55)
  })

  it('has no peak in an empty curve', () => {
    expect(peakOf([])).toBeNull()
  })
})

describe('lastCallFor', () => {
  const bedtime = NOON + hours(10)

  it('refuses when the target is already passed without another drink', () => {
    const heavy = [coffee(NOON + hours(9)), coffee(NOON + hours(9))]
    expect(lastCallFor(heavy, 100, bedtime, 25, NOON)).toBeNull()
  })

  it('refuses when even having it now would overshoot', () => {
    expect(lastCallFor([], 100, bedtime, 25, NOON)).toBeNull()
  })

  it('finds a time that meets the target, where the next step would not', () => {
    const at = lastCallFor([], 100, bedtime, 40, NOON)
    expect(at).not.toBeNull()
    const onBoard = (t: number) => doseOnBoardMg(100, (bedtime - t) / 60000)
    expect(onBoard(at!)).toBeLessThanOrEqual(40)
    expect(onBoard(at! + minutes(5))).toBeGreaterThan(40)
  })

  it('refuses a bedtime that is not in the future', () => {
    expect(lastCallFor([], 100, NOON, 40, NOON)).toBeNull()
    expect(lastCallFor([], 100, NOON - 1000, 40, NOON)).toBeNull()
  })
})

describe('carry-over across the 4am day boundary', () => {
  const morning = new Date('2026-11-22T07:00:00').getTime()
  const fourAm = new Date('2026-11-22T04:00:00').getTime()
  const lastNight: Drink = { kind: 'coffee', at: new Date('2026-11-21T22:00:00').getTime() }

  it('keeps yesterday evening\'s coffee in the on-board estimate this morning', () => {
    expect(recentDrinks([lastNight], morning)).toHaveLength(1)
    const summary = caffeineSummary([lastNight], morning, morning + 15 * 3_600_000, fourAm)
    expect(summary.now.mg).toBeGreaterThan(30)
    expect(summary.carriedOverMg).toBeCloseTo(summary.now.mg, 6)
  })

  it('drops doses older than the window, and future-dated ones', () => {
    const old: Drink = { kind: 'coffee', at: morning - 49 * 3_600_000 }
    const ahead: Drink = { kind: 'coffee', at: morning + 60_000 }
    expect(recentDrinks([old, ahead], morning)).toEqual([])
  })
})

describe('caffeineSummary', () => {
  const now = new Date('2026-11-22T15:00:00').getTime()
  const fourAm = new Date('2026-11-22T04:00:00').getTime()
  const bed = new Date('2026-11-22T23:00:00').getTime()

  it('reports the middle, fast and slow figures now and at bedtime, in order', () => {
    const s = caffeineSummary([{ kind: 'coffee', at: now - 2 * 3_600_000 }], now, bed, fourAm)
    expect(s.now.low).toBeLessThan(s.now.mg)
    expect(s.now.mg).toBeLessThan(s.now.high)
    expect(s.bedtime.mg).toBeLessThan(s.now.mg)
    expect(s.bedtime.at).toBe(bed)
  })

  it('counts what makes the estimate incomplete or assumed', () => {
    const s = caffeineSummary(
      [
        { kind: 'coffee', at: now - 3_600_000 },
        { kind: 'tea', at: now - 3_600_000, approxTime: true },
        { kind: 'coffee', at: now - 3_600_000, legacy: true },
        { kind: 'energy', at: now - 3_600_000, servingMl: 250, caffeine: { basis: 'per100ml', mgPer100ml: 32, source: 'label' } },
        { kind: 'beer', at: now - 3_600_000 },
      ],
      now,
      bed,
      fourAm,
    )
    expect(s.unknown).toBe(1)
    expect(s.defaults).toBe(2)
    expect(s.approxTimes).toBe(1)
    expect(s.legacy).toBe(1)
  })

  it('uses label arithmetic for the dose', () => {
    const label: Drink = { kind: 'energy', at: now - 50 * 60_000, servingMl: 500, caffeine: { basis: 'per100ml', mgPer100ml: 32, source: 'label' } }
    expect(caffeineSummary([label], now, bed, fourAm).now.mg).toBeCloseTo(160, 6)
  })
})
