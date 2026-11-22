import { describe, expect, it } from 'vitest'
import { Drink } from '../../../shared/contracts'
import { presetDrink, roughTimeAt } from './presets'

const NOW = 1_763_700_000_000
const MIN = 60_000

describe('presetDrink', () => {
  it('writes the coffee default down as the app assumption', () => {
    const d = presetDrink('coffee', NOW, NOW)
    expect(d.caffeine).toEqual({ basis: 'serving', mg: 100, source: 'default' })
    expect(Drink.safeParse(d).success).toBe(true)
  })

  it('leaves tea without an amount, because there is no default to assume', () => {
    expect(presetDrink('tea', NOW, NOW).caffeine).toBeUndefined()
  })

  it('records when it was entered separately from when it was drunk', () => {
    const d = presetDrink('beer', NOW - 30 * MIN, NOW, true)
    expect(d.at).toBe(NOW - 30 * MIN)
    expect(d.loggedAt).toBe(NOW)
    expect(d.approxTime).toBe(true)
  })

  it('gives every entry its own id', () => {
    expect(presetDrink('wine', NOW, NOW).id).not.toBe(presetDrink('wine', NOW, NOW).id)
  })
})

describe('roughTimeAt', () => {
  const dayStart = NOW - 8 * 60 * MIN
  it('places each window and marks every one but "just now" as approximate', () => {
    expect(roughTimeAt('now', NOW, dayStart)).toEqual({ at: NOW, approx: false })
    expect(roughTimeAt('hour', NOW, dayStart)).toEqual({ at: NOW - 30 * MIN, approx: true })
    expect(roughTimeAt('few-hours', NOW, dayStart)).toEqual({ at: NOW - 120 * MIN, approx: true })
    expect(roughTimeAt('earlier', NOW, dayStart)).toEqual({ at: NOW - 300 * MIN, approx: true })
  })

  it('never puts "earlier today" before the 4am boundary', () => {
    const justAfterFour = NOW - 2 * 60 * MIN
    expect(roughTimeAt('earlier', NOW, justAfterFour).at).toBe(justAfterFour + MIN)
  })
})
