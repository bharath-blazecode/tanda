// What a one-tap entry writes, and the rough times a batch can be given. The clock comes in as an
// argument everywhere, so this is tested without faking time.
import type { Drink, DrinkKind } from '../../../shared/contracts'
import { DEFAULT_CAFFEINE_MG } from '../../engine/serving'
import { newId } from '../../store/local'

export const DRINK_LABELS: Record<DrinkKind, string> = {
  coffee: 'Coffee',
  tea: 'Tea',
  energy: 'Energy drink',
  'other-caffeine': 'Other caffeine',
  beer: 'Beer',
  wine: 'Wine',
  spirit: 'Spirit',
}

/** Caffeine first: someone who never drinks alcohol should find everything they need at the top. */
export const DRINK_ORDER: DrinkKind[] = ['coffee', 'tea', 'energy', 'other-caffeine', 'beer', 'wine', 'spirit']

/**
 * A one-tap entry. Coffee and energy drinks get the app's default dose written into the entry, marked
 * as the app's assumption, so a later change to the default never silently rewrites old entries.
 * Kinds with no default are left without an amount: unknown, and said to be unknown.
 */
export function presetDrink(kind: DrinkKind, at: number, now: number, approxTime = false): Drink {
  const mg = DEFAULT_CAFFEINE_MG[kind]
  return {
    id: newId(),
    kind,
    at,
    loggedAt: now,
    ...(approxTime ? { approxTime: true } : {}),
    ...(mg === undefined ? {} : { caffeine: { basis: 'serving' as const, mg, source: 'default' as const } }),
  }
}

export type RoughTime = 'now' | 'hour' | 'few-hours' | 'earlier'

export const ROUGH_TIMES: { value: RoughTime; label: string }[] = [
  { value: 'now', label: 'Just now' },
  { value: 'hour', label: 'In the last hour' },
  { value: 'few-hours', label: '1 to 3 hours ago' },
  { value: 'earlier', label: 'Earlier today' },
]

/**
 * A point inside the window the person chose, flagged as approximate unless it was "just now".
 * "Earlier today" never lands before the 4am day boundary the person meant by "today".
 */
export function roughTimeAt(choice: RoughTime, now: number, dayStartAt: number): { at: number; approx: boolean } {
  const minute = 60_000
  switch (choice) {
    case 'now':
      return { at: now, approx: false }
    case 'hour':
      return { at: now - 30 * minute, approx: true }
    case 'few-hours':
      return { at: now - 120 * minute, approx: true }
    case 'earlier':
      return { at: Math.max(dayStartAt + minute, now - 300 * minute), approx: true }
  }
}
