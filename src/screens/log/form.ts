// The drink editor's logic, without React: form text in, a validated Drink or field errors out, and
// the arithmetic in words. The clock comes in as an argument.
import { Drink, type DrinkKind } from '../../../shared/contracts'
import {
  ALCOHOL_KINDS,
  AU_STANDARD_DRINK_GRAMS,
  CAFFEINE_KINDS,
  caffeineMgFor,
  DEFAULT_CAFFEINE_MG,
  ETHANOL_G_PER_ML,
  fractionOf,
  standardDrinksFor,
} from '../../engine/serving'
import { DRINK_LABELS } from './presets'

/** A drink may be dated up to this far ahead, for a phone clock a minute or two fast. */
export const FUTURE_SLACK_MS = 2 * 60_000
/** Older than this is no longer about today's estimates, and is more likely a typo in the date. */
export const MAX_AGE_MS = 7 * 24 * 3_600_000

export type CaffeineMode = 'default' | 'serving' | 'per100ml' | 'unknown'
export type Fraction = '1' | '0.75' | '0.5' | '0.25'

export type DrinkForm = {
  kind: DrinkKind
  when: string // datetime-local text, in the phone's own time zone
  approx: boolean
  name: string
  note: string
  servingMl: string
  fraction: Fraction
  caffeineMode: CaffeineMode
  caffeineValue: string
  caffeineSource: 'label' | 'estimate'
  abv: string
  labelStandardDrinks: string
  alcoholSource: 'label' | 'estimate'
}

export type FormField = keyof DrinkForm

const pad = (n: number) => String(n).padStart(2, '0')

/** Epoch ms as the text a datetime-local input shows, in local time, to the minute. */
export function toLocalInput(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** The reverse, or null for anything that is not a complete local date and time. */
export function fromLocalInput(text: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(text.trim())
  if (!m) return null
  const [, y, mo, d, h, mi] = m.map(Number)
  const date = new Date(y, mo - 1, d, h, mi, 0, 0)
  // Reject dates the Date constructor quietly rolled over, such as 31 February.
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null
  return date.getTime()
}

/** The form for a new entry of `kind` drunk now, or for editing an existing entry. */
export function formFor(kind: DrinkKind, now: number, drink?: Drink): DrinkForm {
  const caffeine = drink?.caffeine
  const mode: CaffeineMode = !caffeine
    ? DEFAULT_CAFFEINE_MG[kind] !== undefined
      ? 'default'
      : 'unknown'
    : caffeine.basis === 'unknown'
      ? 'unknown'
      : caffeine.source === 'default'
        ? 'default'
        : caffeine.basis
  const fraction = String(drink?.fraction ?? 1)
  return {
    kind: drink?.kind ?? kind,
    when: toLocalInput(drink?.at ?? now),
    approx: drink?.approxTime ?? false,
    name: drink?.name ?? '',
    note: drink?.note ?? '',
    servingMl: drink?.servingMl !== undefined ? String(drink.servingMl) : '',
    fraction: (['1', '0.75', '0.5', '0.25'] as const).includes(fraction as Fraction) ? (fraction as Fraction) : '1',
    caffeineMode: mode,
    caffeineValue:
      caffeine?.basis === 'serving' && caffeine.source !== 'default'
        ? String(caffeine.mg)
        : caffeine?.basis === 'per100ml'
          ? String(caffeine.mgPer100ml)
          : '',
    caffeineSource: caffeine && caffeine.basis !== 'unknown' && caffeine.source === 'label' ? 'label' : 'estimate',
    abv: drink?.alcohol?.abv !== undefined ? String(drink.alcohol.abv) : '',
    labelStandardDrinks:
      drink?.alcohol?.labelStandardDrinks !== undefined ? String(drink.alcohol.labelStandardDrinks) : '',
    alcoholSource: drink?.alcohol?.source ?? 'label',
  }
}

/** The caffeine choices that make sense for a kind: "app default" only where there is one. */
export function caffeineModes(kind: DrinkKind): CaffeineMode[] {
  return DEFAULT_CAFFEINE_MG[kind] !== undefined
    ? ['default', 'serving', 'per100ml', 'unknown']
    : ['serving', 'per100ml', 'unknown']
}

function number(text: string, min: number, max: number): number | null | 'bad' {
  const t = text.trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  if (!Number.isFinite(n) || n < min || n > max) return 'bad'
  return n
}

export type FormResult = { ok: true; drink: Drink } | { ok: false; errors: Partial<Record<FormField, string>> }

/**
 * A validated entry, or the reason each field cannot be saved. Nothing is filled in that the person
 * did not give: an empty volume stays unknown, an alcohol entry without detail stays a count.
 * `base` carries what the form does not edit: the ID, when it was first logged, the legacy mark.
 */
export function drinkFromForm(
  form: DrinkForm,
  base: { id: string; loggedAt?: number; legacy?: true },
  now: number,
): FormResult {
  const errors: Partial<Record<FormField, string>> = {}

  const at = fromLocalInput(form.when)
  if (at === null) errors.when = 'Enter a date and time.'
  else if (at > now + FUTURE_SLACK_MS) errors.when = 'That is in the future.'
  else if (now - at > MAX_AGE_MS) errors.when = 'More than a week ago. Pick a time in the last seven days.'

  const servingMl = number(form.servingMl, 1, 3000)
  if (servingMl === 'bad') errors.servingMl = 'Enter a volume between 1 and 3000 mL, or leave it empty.'

  const name = form.name.trim()
  const note = form.note.trim()
  if (name.length > 40) errors.name = 'Keep it to 40 characters.'
  if (note.length > 140) errors.note = 'Keep it to 140 characters.'

  let caffeine: Drink['caffeine']
  if (CAFFEINE_KINDS.has(form.kind)) {
    if (form.caffeineMode === 'default') {
      const mg = DEFAULT_CAFFEINE_MG[form.kind]
      if (mg === undefined) errors.caffeineMode = 'There is no app default for this one. Enter an amount or choose Not sure.'
      else caffeine = { basis: 'serving', mg, source: 'default' }
    } else if (form.caffeineMode === 'unknown') {
      caffeine = { basis: 'unknown' }
    } else {
      const max = form.caffeineMode === 'serving' ? 1000 : 100
      const value = number(form.caffeineValue, 0, max)
      if (value === null || value === 'bad') {
        errors.caffeineValue =
          form.caffeineMode === 'serving' ? 'Enter mg in the serving, 0 to 1000.' : 'Enter mg per 100 mL, 0 to 100.'
      } else if (form.caffeineMode === 'serving') {
        caffeine = { basis: 'serving', mg: value, source: form.caffeineSource }
      } else {
        caffeine = { basis: 'per100ml', mgPer100ml: value, source: form.caffeineSource }
        if (servingMl === null) errors.servingMl = 'Needed to work out mg from a per 100 mL label.'
      }
    }
  }

  let alcohol: Drink['alcohol']
  if (ALCOHOL_KINDS.has(form.kind)) {
    const abv = number(form.abv, 0, 100)
    const sd = number(form.labelStandardDrinks, 0, 50)
    if (abv === 'bad') errors.abv = 'Enter a strength between 0 and 100%, or leave it empty.'
    if (sd === 'bad') errors.labelStandardDrinks = 'Enter the number printed on the label, or leave it empty.'
    if ((abv !== null && abv !== 'bad') || (sd !== null && sd !== 'bad')) {
      alcohol = {
        ...(abv !== null && abv !== 'bad' ? { abv } : {}),
        ...(sd !== null && sd !== 'bad' ? { labelStandardDrinks: sd } : {}),
        source: form.alcoholSource,
      }
    }
  }

  if (Object.keys(errors).length > 0 || at === null) return { ok: false, errors }

  const fraction = Number(form.fraction)
  const candidate: Drink = {
    id: base.id,
    kind: form.kind,
    at,
    ...(base.loggedAt !== undefined ? { loggedAt: base.loggedAt } : {}),
    ...(form.approx ? { approxTime: true } : {}),
    ...(name ? { name } : {}),
    ...(note ? { note } : {}),
    ...(servingMl !== null && servingMl !== 'bad' ? { servingMl } : {}),
    ...(fraction < 1 ? { fraction } : {}),
    ...(caffeine ? { caffeine } : {}),
    ...(alcohol ? { alcohol } : {}),
    ...(base.legacy ? { legacy: true as const } : {}),
  }
  const parsed = Drink.safeParse(candidate)
  return parsed.success ? { ok: true, drink: parsed.data } : { ok: false, errors: { when: 'This entry could not be saved.' } }
}

const FRACTION_WORDS: Record<string, string> = { '1': 'all of it', '0.75': 'three quarters', '0.5': 'half', '0.25': 'a quarter' }
const ORIGIN_WORDS = { label: 'from the label', estimate: 'your estimate', default: "the app's default" } as const

const round1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1)

/**
 * The arithmetic behind an entry, in words, so every number on screen shows where it came from.
 * Returns the caffeine line and the alcohol line that apply, never a figure for what is in a body.
 */
export function explainDrink(drink: Drink): string[] {
  const lines: string[] = []
  const share = fractionOf(drink)
  const shareText = share < 1 ? `, ${FRACTION_WORDS[String(share)] ?? `${Math.round(share * 100)}%`} drunk` : ''

  if (CAFFEINE_KINDS.has(drink.kind)) {
    const figure = caffeineMgFor(drink)
    const spec = drink.caffeine
    if (figure.mg === null) {
      lines.push(
        figure.reason === 'needs-volume'
          ? 'Caffeine: a per 100 mL figure needs the volume. Left out of the estimate until then.'
          : 'Caffeine: amount unknown, so it is left out of the estimate.',
      )
    } else if (figure.origin === 'default') {
      lines.push(
        `Caffeine: about ${Math.round(figure.mg)} mg${shareText}, the app's default for a ${DRINK_LABELS[drink.kind].toLowerCase()}. Not measured: real servings vary a lot.`,
      )
    } else if (spec?.basis === 'per100ml' && drink.servingMl !== undefined) {
      lines.push(
        `Caffeine: ${spec.mgPer100ml} mg per 100 mL × ${drink.servingMl} mL${shareText} = ${Math.round(figure.mg)} mg (${ORIGIN_WORDS[figure.origin]}).`,
      )
    } else {
      lines.push(`Caffeine: ${Math.round(figure.mg)} mg${shareText} (${ORIGIN_WORDS[figure.origin]}).`)
    }
  }

  if (ALCOHOL_KINDS.has(drink.kind)) {
    const figure = standardDrinksFor(drink)
    if (figure.standardDrinks === null) {
      lines.push(
        drink.legacy && !drink.alcohol
          ? 'Logged before serving detail existed: a count, not standard drinks.'
          : 'A count only. Add the volume and the label strength, or the standard drinks on the label, to work it out.',
      )
    } else if (figure.origin === 'label-declared') {
      lines.push(
        `${round1(figure.standardDrinks)} Australian standard drinks${shareText}, from the number on the label.`,
      )
    } else {
      const ml = (drink.servingMl ?? 0) * share
      lines.push(
        `${Math.round(ml)} mL × ${drink.alcohol?.abv}% × about ${ETHANOL_G_PER_ML} g/mL = ${round1(figure.grams ?? 0)} g of alcohol, ÷ ${AU_STANDARD_DRINK_GRAMS} g = ${round1(figure.standardDrinks)} Australian standard drinks (${figure.origin === 'label-abv' ? 'label strength' : 'your estimate of strength'}).`,
      )
    }
  }
  return lines
}

/** A short amount for a list row: "80 mg", "1.3 std", "unknown". */
export function amountShort(drink: Drink): string {
  if (CAFFEINE_KINDS.has(drink.kind)) {
    const figure = caffeineMgFor(drink)
    if (figure.mg === null) return 'mg unknown'
    return `${Math.round(figure.mg)} mg${figure.origin === 'default' ? ' (default)' : ''}`
  }
  const figure = standardDrinksFor(drink)
  return figure.standardDrinks === null ? 'count only' : `${round1(figure.standardDrinks)} std drinks`
}
