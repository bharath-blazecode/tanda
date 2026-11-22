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
import { CAFFEINE_LIMIT_MG, caffeineMgToday, hasAlcohol, hasCaffeine } from './nudge'
import type { DrinkInput } from './serving'

export type CareTag =
  | 'only-time'
  | 'water-between'
  | 'food-with-it'
  | 'food-ideas'
  | 'alcohol-and-sleep'
  | 'water-with-caffeine'
  | 'caffeine-over-limit'
  | 'caffeine-at-bedtime'

/** Local bedtime used when nobody has said otherwise. */
export const DEFAULT_BEDTIME_HOUR = 23

/** Enough left to be worth a line: about a quarter of a cup. Descriptive, not a threshold. */
export const BEDTIME_NOTICE_MG = 25

/** The next time the clock reads `hour`, at or after `now`. */
export function nextBedtime(now: number, hour = DEFAULT_BEDTIME_HOUR): number {
  const at = new Date(now)
  at.setHours(hour, 0, 0, 0)
  if (at.getTime() <= now) at.setDate(at.getDate() + 1)
  return at.getTime()
}

export type Care = {
  tags: CareTag[]
  /** On board at bedtime, in mg, or null when nothing caffeinated was logged. */
  caffeineAtBedtimeMg: number | null
  bedtime: number
  /** The day's intake, for the over-the-guide line. */
  caffeineTodayMg: number
}

/**
 * What to show alongside a result. `drinksToday` is already filtered to the current day by
 * src/store/day.ts; this function does not decide what counts as today.
 */
export function careFor(drinksToday: readonly DrinkInput[], now: number, bedtimeAt?: number): Care {
  const bedtime = bedtimeAt ?? nextBedtime(now)
  const drinks = [...drinksToday]
  const tags: CareTag[] = []

  if (hasAlcohol(drinks)) {
    // Order matters: the honest line comes first so it cannot be read as a footnote to a remedy.
    tags.push('only-time', 'water-between', 'food-with-it', 'food-ideas', 'alcohol-and-sleep')
  }

  const caffeineTodayMg = caffeineMgToday(drinks)
  const caffeineAtBedtimeMg = hasCaffeine(drinks) ? caffeineOnBoardMg(drinks, bedtime) : null

  if (hasCaffeine(drinks)) tags.push('water-with-caffeine')
  if (caffeineTodayMg >= CAFFEINE_LIMIT_MG) tags.push('caffeine-over-limit')
  if (caffeineAtBedtimeMg !== null && caffeineAtBedtimeMg >= BEDTIME_NOTICE_MG) tags.push('caffeine-at-bedtime')

  return { tags, caffeineAtBedtimeMg, bedtime, caffeineTodayMg }
}
