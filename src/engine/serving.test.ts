import { describe, expect, it } from 'vitest'
import {
  AU_STANDARD_DRINK_GRAMS,
  caffeineMgFor,
  ethanolGrams,
  ETHANOL_G_PER_ML,
  standardDrinksFor,
  tallyAlcohol,
  tallyCaffeine,
  type DrinkInput,
} from './serving'

const at = 1

describe('caffeine in what was drunk', () => {
  it('keeps the v1 meaning for a bare coffee: the app default, labelled as one', () => {
    expect(caffeineMgFor({ kind: 'coffee', at })).toEqual({ mg: 100, origin: 'default', basis: 'serving' })
    expect(caffeineMgFor({ kind: 'energy', at })).toEqual({ mg: 80, origin: 'default', basis: 'serving' })
  })

  it('has no default for tea or other caffeine, so their amount is unknown until entered', () => {
    expect(caffeineMgFor({ kind: 'tea', at })).toEqual({ mg: null, reason: 'unknown' })
    expect(caffeineMgFor({ kind: 'other-caffeine', at })).toEqual({ mg: null, reason: 'unknown' })
  })

  it('turns a label of 32 mg per 100 mL into 80 mg for a 250 mL can', () => {
    const can: DrinkInput = { kind: 'energy', at, servingMl: 250, caffeine: { basis: 'per100ml', mgPer100ml: 32, source: 'label' } }
    expect(caffeineMgFor(can)).toEqual({ mg: 80, origin: 'label', basis: 'per100ml' })
  })

  it('scales by the share actually drunk', () => {
    const half: DrinkInput = { kind: 'energy', at, servingMl: 500, fraction: 0.5, caffeine: { basis: 'per100ml', mgPer100ml: 32, source: 'label' } }
    expect(caffeineMgFor(half).mg).toBe(80)
    const third: DrinkInput = { kind: 'coffee', at, fraction: 1 / 3, caffeine: { basis: 'serving', mg: 150, source: 'estimate' } }
    expect(caffeineMgFor(third).mg).toBeCloseTo(50, 9)
  })

  it('ignores a fraction outside (0, 1] rather than inventing a bigger dose', () => {
    expect(caffeineMgFor({ kind: 'coffee', at, fraction: 3 }).mg).toBe(100)
    expect(caffeineMgFor({ kind: 'coffee', at, fraction: 0 }).mg).toBe(100)
  })

  it('cannot compute a per-100 mL figure without a volume', () => {
    const noVolume: DrinkInput = { kind: 'energy', at, caffeine: { basis: 'per100ml', mgPer100ml: 32, source: 'label' } }
    expect(caffeineMgFor(noVolume)).toEqual({ mg: null, reason: 'needs-volume' })
  })

  it('leaves an explicitly unknown amount out, even on a coffee', () => {
    expect(caffeineMgFor({ kind: 'coffee', at, caffeine: { basis: 'unknown' } })).toEqual({ mg: null, reason: 'unknown' })
  })

  it('says a beer is not caffeinated rather than unknown', () => {
    expect(caffeineMgFor({ kind: 'beer', at })).toEqual({ mg: null, reason: 'not-caffeinated' })
  })
})

describe('Australian standard drinks', () => {
  it('uses 10 g and 0.789 g/mL', () => {
    expect(AU_STANDARD_DRINK_GRAMS).toBe(10)
    expect(ETHANOL_G_PER_ML).toBe(0.789)
  })

  it('makes 375 mL at 4.5% about 1.3 standard drinks, as arithmetic', () => {
    const figure = standardDrinksFor({ kind: 'beer', at, servingMl: 375, alcohol: { abv: 4.5, source: 'label' } })
    expect(figure.standardDrinks).toBeCloseTo(1.3314, 3)
    if (figure.standardDrinks !== null) expect(figure.origin).toBe('label-abv')
  })

  it('reproduces every row of the handoff arithmetic table', () => {
    const rows: [number, number, number][] = [
      [375, 3.2, 0.9468],
      [375, 4.5, 1.331438],
      [425, 4.8, 1.60956],
      [500, 5.0, 1.9725],
      [150, 12.0, 1.4202],
      [30, 40.0, 0.9468],
    ]
    for (const [ml, abv, sd] of rows) expect(ethanolGrams(ml, abv) / 10).toBeCloseTo(sd, 5)
  })

  it('prefers the label declaration over arithmetic, and scales it by the share drunk', () => {
    const figure = standardDrinksFor({
      kind: 'wine',
      at,
      servingMl: 750,
      fraction: 0.2,
      alcohol: { abv: 13, labelStandardDrinks: 7.7, source: 'label' },
    })
    expect(figure.standardDrinks).toBeCloseTo(1.54, 9)
    if (figure.standardDrinks !== null) expect(figure.origin).toBe('label-declared')
  })

  it('marks an ABV the person estimated as an estimate', () => {
    const figure = standardDrinksFor({ kind: 'spirit', at, servingMl: 30, alcohol: { abv: 40, source: 'estimate' } })
    if (figure.standardDrinks !== null) expect(figure.origin).toBe('estimate-abv')
  })

  it('never treats a bare count, or a migrated v1 entry, as one standard drink', () => {
    expect(standardDrinksFor({ kind: 'beer', at })).toEqual({ standardDrinks: null, reason: 'no-detail' })
    expect(standardDrinksFor({ kind: 'beer', at, legacy: true })).toEqual({ standardDrinks: null, reason: 'no-detail' })
    expect(standardDrinksFor({ kind: 'beer', at, servingMl: 375 })).toEqual({ standardDrinks: null, reason: 'no-detail' })
  })
})

describe('tallies say what is missing', () => {
  it('adds known caffeine and counts unknowns and defaults separately', () => {
    const tally = tallyCaffeine([
      { kind: 'coffee', at },
      { kind: 'tea', at },
      { kind: 'energy', at, servingMl: 250, caffeine: { basis: 'per100ml', mgPer100ml: 32, source: 'label' } },
      { kind: 'beer', at },
    ])
    expect(tally).toEqual({ mg: 180, defaults: 1, unknown: 1, known: 2 })
  })

  it('counts every alcoholic entry and sums standard drinks only where detail exists', () => {
    const tally = tallyAlcohol([
      { kind: 'beer', at },
      { kind: 'beer', at, servingMl: 375, alcohol: { abv: 4.5, source: 'label' } },
      { kind: 'coffee', at },
    ])
    expect(tally.entries).toBe(2)
    expect(tally.detailed).toBe(1)
    expect(tally.standardDrinks).toBeCloseTo(1.3314, 3)
  })
})
