// What a logged drink amounts to, in explicit units. Pure TypeScript: no clock, no DOM, no network.
//
// Every number this file returns carries where it came from, because a label figure, a person's
// estimate and the app's own default are not the same kind of evidence and must not look the same
// on screen. Nothing here estimates what is in a person's body: that is caffeine.ts for caffeine,
// and for alcohol it is deliberately never done (D19).
import type { CaffeineAmount, Drink, DrinkKind } from '../../shared/contracts'

/** The fields the engine reads. Older callers and fixtures pass only `kind` and `at`. */
export type DrinkInput = Pick<Drink, 'kind' | 'at'> & Partial<Omit<Drink, 'kind' | 'at'>>

export const CAFFEINE_KINDS: ReadonlySet<DrinkKind> = new Set(['coffee', 'tea', 'energy', 'other-caffeine'])
export const ALCOHOL_KINDS: ReadonlySet<DrinkKind> = new Set(['beer', 'wine', 'spirit'])

/**
 * The app's own assumption for a one-tap entry, in mg per serving. Set on build day as round
 * starting values, not measured and not a local average (see the evidence ledger). Kinds without
 * an entry have no default: their caffeine is unknown until the person enters it.
 */
export const DEFAULT_CAFFEINE_MG: Partial<Record<DrinkKind, number>> = {
  coffee: 100,
  energy: 80,
}

/** An Australian standard drink is 10 g of ethanol (to verify against current official text). */
export const AU_STANDARD_DRINK_GRAMS = 10

/** Approximate density of ethanol, g/mL, used to turn a label ABV into grams. */
export const ETHANOL_G_PER_ML = 0.789

export type AmountOrigin = 'label' | 'estimate' | 'default'

export type CaffeineFigure =
  | { mg: number; origin: AmountOrigin; basis: 'serving' | 'per100ml' }
  | { mg: null; reason: 'unknown' | 'needs-volume' | 'not-caffeinated' }

/** The share of the serving drunk: 1 unless a valid fraction was given. */
export function fractionOf(drink: DrinkInput): number {
  const f = drink.fraction
  return typeof f === 'number' && Number.isFinite(f) && f > 0 && f <= 1 ? f : 1
}

/** The caffeine a drink is recorded with, frozen at logging time, or the v1 default if bare. */
export function caffeineSpec(drink: DrinkInput): CaffeineAmount | null {
  if (drink.caffeine) return drink.caffeine
  const fallback = DEFAULT_CAFFEINE_MG[drink.kind]
  return fallback === undefined ? null : { basis: 'serving', mg: fallback, source: 'default' }
}

/**
 * Caffeine actually drunk, in mg. A label of 32 mg per 100 mL with a 250 mL serving is 80 mg; half
 * of it drunk is 40 mg. That is arithmetic on the person's inputs, not a claim about any product.
 */
export function caffeineMgFor(drink: DrinkInput): CaffeineFigure {
  const spec = caffeineSpec(drink)
  if (spec === null) {
    return { mg: null, reason: CAFFEINE_KINDS.has(drink.kind) ? 'unknown' : 'not-caffeinated' }
  }
  if (spec.basis === 'unknown') return { mg: null, reason: 'unknown' }
  const fraction = fractionOf(drink)
  if (spec.basis === 'serving') return { mg: spec.mg * fraction, origin: spec.source, basis: 'serving' }
  const ml = drink.servingMl
  if (!(typeof ml === 'number' && ml > 0)) return { mg: null, reason: 'needs-volume' }
  return { mg: (spec.mgPer100ml * ml * fraction) / 100, origin: spec.source, basis: 'per100ml' }
}

export type StandardDrinkFigure =
  | { standardDrinks: number; origin: 'label-declared' | 'label-abv' | 'estimate-abv'; grams: number | null }
  | { standardDrinks: null; reason: 'no-detail' | 'not-alcoholic' }

/**
 * Australian standard drinks in what was actually drunk. The label's own declaration wins over
 * arithmetic from ABV. A count logged without volume and strength stays unknown: it is never
 * treated as one standard drink, because a glass, a can and a shot are not one each.
 */
export function standardDrinksFor(drink: DrinkInput): StandardDrinkFigure {
  if (!ALCOHOL_KINDS.has(drink.kind)) return { standardDrinks: null, reason: 'not-alcoholic' }
  const spec = drink.alcohol
  const fraction = fractionOf(drink)
  if (spec?.labelStandardDrinks !== undefined) {
    const sd = spec.labelStandardDrinks * fraction
    return { standardDrinks: sd, origin: 'label-declared', grams: sd * AU_STANDARD_DRINK_GRAMS }
  }
  const ml = drink.servingMl
  if (spec?.abv !== undefined && typeof ml === 'number' && ml > 0) {
    const grams = ethanolGrams(ml * fraction, spec.abv)
    return {
      standardDrinks: grams / AU_STANDARD_DRINK_GRAMS,
      origin: spec.source === 'label' ? 'label-abv' : 'estimate-abv',
      grams,
    }
  }
  return { standardDrinks: null, reason: 'no-detail' }
}

/** mL × ABV% / 100 × 0.789 g/mL. Shown on screen as written, so the arithmetic is visible. */
export function ethanolGrams(ml: number, abvPercent: number): number {
  return ml * (abvPercent / 100) * ETHANOL_G_PER_ML
}

export type CaffeineTally = {
  /** Sum of every known amount, in mg. */
  mg: number
  /** Entries whose amount came from the app default, not a label or the person. */
  defaults: number
  /** Caffeinated entries with no usable amount, left out of `mg`. */
  unknown: number
  known: number
}

/** Adds up what is known and says how much is not, so a total is never quietly incomplete. */
export function tallyCaffeine(drinks: readonly DrinkInput[]): CaffeineTally {
  const tally: CaffeineTally = { mg: 0, defaults: 0, unknown: 0, known: 0 }
  for (const drink of drinks) {
    const figure = caffeineMgFor(drink)
    if (figure.mg === null) {
      if (figure.reason !== 'not-caffeinated') tally.unknown++
      continue
    }
    tally.mg += figure.mg
    tally.known++
    if (figure.origin === 'default') tally.defaults++
  }
  return tally
}

export type AlcoholTally = {
  /** Alcoholic entries, whatever detail they carry. This is what the verdict route receives. */
  entries: number
  /** Standard drinks from entries with label or ABV detail. */
  standardDrinks: number
  /** Entries with that detail. */
  detailed: number
}

export function tallyAlcohol(drinks: readonly DrinkInput[]): AlcoholTally {
  const tally: AlcoholTally = { entries: 0, standardDrinks: 0, detailed: 0 }
  for (const drink of drinks) {
    if (!ALCOHOL_KINDS.has(drink.kind)) continue
    tally.entries++
    const figure = standardDrinksFor(drink)
    if (figure.standardDrinks !== null) {
      tally.standardDrinks += figure.standardDrinks
      tally.detailed++
    }
  }
  return tally
}
