import { describe, expect, it } from 'vitest'
import type { Drink } from '../../../shared/contracts'
import { amountShort, drinkFromForm, explainDrink, formFor, fromLocalInput, toLocalInput, type DrinkForm } from './form'

const NOW = new Date(2026, 10, 22, 15, 30).getTime()
const MIN = 60_000
const base = { id: 'd1', loggedAt: NOW }
const form = (kind: Drink['kind'], over: Partial<DrinkForm> = {}): DrinkForm => ({ ...formFor(kind, NOW), ...over })
const save = (f: DrinkForm) => drinkFromForm(f, base, NOW)
const drink = (f: DrinkForm): Drink => {
  const r = save(f)
  if (!r.ok) throw new Error(JSON.stringify(r.errors))
  return r.drink
}

describe('local date and time text', () => {
  it('round-trips a time to the minute in the phone\'s own zone', () => {
    expect(fromLocalInput(toLocalInput(NOW))).toBe(NOW)
    expect(toLocalInput(NOW)).toBe('2026-11-22T15:30')
  })

  it('refuses incomplete text and impossible dates', () => {
    expect(fromLocalInput('')).toBeNull()
    expect(fromLocalInput('2026-11-22')).toBeNull()
    expect(fromLocalInput('2026-02-31T10:00')).toBeNull()
  })
})

describe('retrospective time', () => {
  it('saves the time the drink was had, separately from when it was entered', () => {
    const d = drink(form('coffee', { when: toLocalInput(NOW - 150 * MIN) }))
    expect(d.at).toBe(NOW - 150 * MIN)
    expect(d.loggedAt).toBe(NOW)
  })

  it('keeps a rough time marked as rough', () => {
    expect(drink(form('coffee', { approx: true })).approxTime).toBe(true)
  })

  it('refuses a time in the future and one more than a week ago', () => {
    const ahead = save(form('coffee', { when: toLocalInput(NOW + 10 * MIN) }))
    const old = save(form('coffee', { when: toLocalInput(NOW - 8 * 24 * 60 * MIN) }))
    expect(ahead.ok || ahead.errors.when).toMatch(/future/)
    expect(old.ok || old.errors.when).toMatch(/week/)
  })

  it('allows a phone clock a minute fast', () => {
    expect(save(form('coffee', { when: toLocalInput(NOW + MIN) })).ok).toBe(true)
  })
})

describe('caffeine units', () => {
  it('writes the coffee default down as the app\'s assumption', () => {
    expect(drink(form('coffee')).caffeine).toEqual({ basis: 'serving', mg: 100, source: 'default' })
  })

  it('offers no default for tea, and starts it as unknown', () => {
    expect(form('tea').caffeineMode).toBe('unknown')
    expect(drink(form('tea')).caffeine).toEqual({ basis: 'unknown' })
    expect(save(form('tea', { caffeineMode: 'default' })).ok).toBe(false)
  })

  it('stores mg per serving with its source', () => {
    const d = drink(form('coffee', { caffeineMode: 'serving', caffeineValue: '150', caffeineSource: 'estimate' }))
    expect(d.caffeine).toEqual({ basis: 'serving', mg: 150, source: 'estimate' })
    expect(explainDrink(d)[0]).toBe('Caffeine: 150 mg (your estimate).')
  })

  it('turns 32 mg per 100 mL and 250 mL into 80 mg, and says so', () => {
    const d = drink(form('energy', { caffeineMode: 'per100ml', caffeineValue: '32', servingMl: '250', caffeineSource: 'label' }))
    expect(explainDrink(d)[0]).toBe('Caffeine: 32 mg per 100 mL × 250 mL = 80 mg (from the label).')
    expect(amountShort(d)).toBe('80 mg')
  })

  it('needs a volume for a per 100 mL figure', () => {
    const r = save(form('energy', { caffeineMode: 'per100ml', caffeineValue: '32', servingMl: '' }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.servingMl).toMatch(/per 100 mL/)
  })

  it('scales by the share drunk and says how much', () => {
    const d = drink(form('energy', { caffeineMode: 'per100ml', caffeineValue: '32', servingMl: '500', fraction: '0.5' }))
    expect(explainDrink(d)[0]).toBe('Caffeine: 32 mg per 100 mL × 500 mL, half drunk = 80 mg (your estimate).')
  })

  it('refuses an amount outside its unit\'s range', () => {
    expect(save(form('coffee', { caffeineMode: 'serving', caffeineValue: '5000' })).ok).toBe(false)
    expect(save(form('energy', { caffeineMode: 'per100ml', caffeineValue: '150', servingMl: '250' })).ok).toBe(false)
  })

  it('says an unknown amount is left out of the estimate', () => {
    expect(explainDrink(drink(form('coffee', { caffeineMode: 'unknown' })))[0]).toMatch(/left out of the estimate/)
  })
})

describe('Australian standard drinks', () => {
  it('works out 375 mL at 4.5% from the label, with the arithmetic visible', () => {
    const d = drink(form('beer', { servingMl: '375', abv: '4.5' }))
    expect(explainDrink(d)[0]).toBe(
      '375 mL × 4.5% × about 0.789 g/mL = 13.3 g of alcohol, ÷ 10 g = 1.3 Australian standard drinks (label strength).',
    )
    expect(amountShort(d)).toBe('1.3 std drinks')
  })

  it('prefers the label\'s own number, scaled by the share drunk', () => {
    const d = drink(form('wine', { servingMl: '750', abv: '13', labelStandardDrinks: '7.7', fraction: '0.25' }))
    expect(explainDrink(d)[0]).toBe('1.9 Australian standard drinks, a quarter drunk, from the number on the label.')
  })

  it('keeps an entry with no detail as a count, never one standard drink', () => {
    const d = drink(form('beer'))
    expect(d.alcohol).toBeUndefined()
    expect(amountShort(d)).toBe('count only')
    expect(explainDrink(d)[0]).toMatch(/A count only/)
  })

  it('says a migrated v1 count is not standard drinks', () => {
    const legacy: Drink = { id: 'v1-1-0', kind: 'beer', at: NOW - MIN, legacy: true }
    expect(explainDrink(legacy)[0]).toBe('Logged before serving detail existed: a count, not standard drinks.')
  })

  it('keeps an ABV without a volume, and does not invent one', () => {
    const d = drink(form('spirit', { abv: '40' }))
    expect(d.alcohol).toEqual({ abv: 40, source: 'label' })
    expect(d.servingMl).toBeUndefined()
    expect(amountShort(d)).toBe('count only')
  })

  it('refuses a strength over 100%', () => {
    expect(save(form('spirit', { abv: '140' })).ok).toBe(false)
  })
})

describe('editing', () => {
  it('round-trips every field of an entry through the form', () => {
    const original: Drink = {
      id: 'd9',
      kind: 'energy',
      at: NOW - 30 * MIN,
      loggedAt: NOW - 20 * MIN,
      approxTime: true,
      name: 'Can, sugar free',
      note: 'after lunch',
      servingMl: 500,
      fraction: 0.5,
      caffeine: { basis: 'per100ml', mgPer100ml: 32, source: 'label' },
    }
    const r = drinkFromForm(formFor('coffee', NOW, original), { id: original.id, loggedAt: original.loggedAt }, NOW)
    expect(r.ok && r.drink).toEqual(original)
  })

  it('keeps the legacy mark when detail is added to a migrated entry', () => {
    const legacy: Drink = { id: 'v1-1-0', kind: 'beer', at: NOW - MIN, legacy: true }
    const r = drinkFromForm({ ...formFor('beer', NOW, legacy), servingMl: '375', abv: '4.5' }, { id: legacy.id, legacy: true }, NOW)
    expect(r.ok && r.drink.legacy).toBe(true)
    expect(r.ok && r.drink.alcohol).toEqual({ abv: 4.5, source: 'label' })
  })

  it('drops caffeine detail when an entry is changed to an alcoholic kind', () => {
    const d = drink(form('coffee', { kind: 'beer', caffeineMode: 'serving', caffeineValue: '100' }))
    expect(d.caffeine).toBeUndefined()
  })

  it('limits name and note lengths', () => {
    const r = save(form('coffee', { name: 'x'.repeat(41), note: 'y'.repeat(141) }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['name', 'note'])
  })
})
