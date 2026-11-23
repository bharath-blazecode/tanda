// CARD 14. The health side: what is worth saying to someone who has logged caffeine or alcohol.
// Pure TypeScript, time in as an argument, and it returns closed tags rather than words, so the
// copy stays in one file that a test greps (D19).
//
// The hard rule this file exists to hold: nothing here promises a result. Water, food and sleep
// are worth doing on their own terms, and none of them speeds up alcohol leaving the body. That
// is why `only-time` is attached to every alcohol case and cannot be configured away. A list of
// remedies with a countdown would be read as "do these and you are done", which is the clearance
// claim this product does not make (CLAUDE.md, product rules).
import { caffeineOnBoardMg } from './caffeine'
import { hasAlcohol } from './nudge'
import { tallyCaffeine } from './serving'
import type { DrinkInput } from './serving'

// Three tags were retired on 22 Nov 2026 because the evidence ledger could not support them as
// written: salty food and fruit as fluid replacement (food-ideas), "expect to wake early"
// (alcohol-and-sleep), and caffeine as a diuretic that needs water alongside (water-with-caffeine).
export type CareTag =
  | 'only-time'
  | 'water-between'
  | 'food-with-it'
  | 'caffeine-at-bedtime'

/** Local bedtime used when nobody has said otherwise. */
export const DEFAULT_BEDTIME_HOUR = 23

/** Enough left to be worth a line: a quarter of the app's default cup. A product setting, not a sleep threshold. */
export const BEDTIME_NOTICE_MG = 25

/** The next time the clock reads `hour`, at or after `now`. */
export function nextBedtime(now: number, hour = DEFAULT_BEDTIME_HOUR): number {
  return nextBedtimeAt(now, hour * 60)
}

/** The next time the local clock reads `minutes` after midnight, strictly after `now`. */
export function nextBedtimeAt(now: number, minutes: number): number {
  const at = new Date(now)
  at.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
  if (at.getTime() <= now) at.setDate(at.getDate() + 1)
  return at.getTime()
}

export type Care = {
  tags: CareTag[]
  /** On board at bedtime, in mg, or null when no logged caffeine amount is available. */
  caffeineAtBedtimeMg: number | null
  bedtime: number
}

/**
 * What to show alongside a result. `drinksToday` is already filtered to the current day by
 * src/store/day.ts; this function does not decide what counts as today.
 */
export function careFor(
  drinksToday: readonly DrinkInput[],
  now: number,
  bedtimeAt?: number,
  /** Drinks still on board, which can reach back past the 4am boundary. Defaults to today's. */
  onBoard: readonly DrinkInput[] = drinksToday,
): Care {
  const bedtime = bedtimeAt ?? nextBedtime(now)
  const drinks = [...drinksToday]
  const tags: CareTag[] = []

  if (hasAlcohol(drinks)) {
    // Order matters: the honest line comes first so it cannot be read as a footnote to a remedy.
    tags.push('only-time', 'water-between', 'food-with-it')
  }

  const caffeineAtBedtimeMg = tallyCaffeine(onBoard).known > 0 ? caffeineOnBoardMg(onBoard, bedtime) : null

  if (caffeineAtBedtimeMg !== null && caffeineAtBedtimeMg >= BEDTIME_NOTICE_MG) tags.push('caffeine-at-bedtime')

  return { tags, caffeineAtBedtimeMg, bedtime }
}
