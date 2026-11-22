// CARD 14. Caffeine on board over the day. Pure TypeScript: every time comes in as an argument.
// Independent of the tests and of the verdict: this is arithmetic on what was logged, not a
// reading of the person.
//
// The model is the one in docs/05-architecture.md: a dose rises to a peak at about 50 minutes,
// then halves every 5 hours. Half-life varies a lot between people (genetics, the pill, smoking,
// pregnancy), which is why the chart carries a band rather than a line.
import { caffeineMgFor, CAFFEINE_KINDS, type DrinkInput } from './serving'

/** Minutes from the first sip to the most on board. */
export const PEAK_MINUTES = 50

/** The middle of the published range, and the edges the band is drawn between. */
export const HALF_LIFE_HOURS = 5
export const HALF_LIFE_FAST_HOURS = 2
export const HALF_LIFE_SLOW_HOURS = 8

/**
 * How much of one dose is still on board.
 * Rises on a quarter sine to the peak, which leaves the curve flat at the top instead of
 * cornering, then halves on the given half-life.
 */
export function doseOnBoardMg(doseMg: number, minutesSince: number, halfLifeHours = HALF_LIFE_HOURS): number {
  if (!Number.isFinite(minutesSince) || minutesSince <= 0) return 0
  if (minutesSince < PEAK_MINUTES) return doseMg * Math.sin((Math.PI / 2) * (minutesSince / PEAK_MINUTES))
  const hoursSincePeak = (minutesSince - PEAK_MINUTES) / 60
  return doseMg * Math.pow(0.5, hoursSincePeak / halfLifeHours)
}

/** Total caffeine on board at a moment, in mg, from everything logged. */
export function caffeineOnBoardMg(drinks: readonly DrinkInput[], at: number, halfLifeHours = HALF_LIFE_HOURS): number {
  return drinks.reduce((total, drink) => {
    const dose = caffeineMgFor(drink).mg
    if (dose === null) return total
    return total + doseOnBoardMg(dose, (at - drink.at) / 60000, halfLifeHours)
  }, 0)
}

export type CaffeinePoint = {
  /** Epoch milliseconds. */
  t: number
  /** On board at the middle half-life. */
  mg: number
  /** On board if caffeine leaves fast, and if it leaves slowly. The band on the chart. */
  low: number
  high: number
}

/**
 * The curve to draw, from `from` to `to` inclusive. `stepMinutes` is the sample spacing.
 * A fast half-life means less is left, so `low` uses the fast one.
 */
export function caffeineCurve(
  drinks: readonly DrinkInput[],
  from: number,
  to: number,
  stepMinutes = 10,
): CaffeinePoint[] {
  const step = Math.max(1, stepMinutes) * 60000
  const out: CaffeinePoint[] = []
  if (!(to > from)) return out
  for (let t = from; t <= to; t += step) {
    out.push({
      t,
      mg: caffeineOnBoardMg(drinks, t),
      low: caffeineOnBoardMg(drinks, t, HALF_LIFE_FAST_HOURS),
      high: caffeineOnBoardMg(drinks, t, HALF_LIFE_SLOW_HOURS),
    })
  }
  return out
}

/** The most on board at any point in a window, and when. For labelling the chart. */
export function peakOf(points: readonly CaffeinePoint[]): CaffeinePoint | null {
  if (points.length === 0) return null
  return points.reduce((best, p) => (p.mg > best.mg ? p : best))
}

/**
 * The latest moment a further `doseMg` could be taken and still leave no more than `targetMg`
 * on board at `bedtime`. Returns null when even taking it right now would clear the target,
 * or when the target is already passed without it.
 *
 * This is a calculator, not advice: it answers "if I want this much on board by then, when do I
 * stop", and the caller chooses the target.
 */
export function lastCallFor(
  drinks: readonly DrinkInput[],
  doseMg: number,
  bedtime: number,
  targetMg: number,
  now: number,
  halfLifeHours = HALF_LIFE_HOURS,
): number | null {
  if (!(bedtime > now)) return null
  const already = caffeineOnBoardMg(drinks, bedtime, halfLifeHours)
  if (already >= targetMg) return null

  const allowed = targetMg - already
  // Walk back from bedtime in five minute steps. The curve is not invertible in closed form
  // across the rising part, and a search is plenty fast over a few hundred steps.
  const step = 5 * 60000
  for (let t = now; t <= bedtime; t += step) {
    if (doseOnBoardMg(doseMg, (bedtime - t) / 60000, halfLifeHours) > allowed) {
      // t is the first moment that would overshoot, so the step before it is the answer.
      return t - step < now ? null : t - step
    }
  }
  return bedtime
}

/**
 * How far back a dose still matters to the estimate. Ten slow half-lives leave under 0.1% of a dose,
 * so 48 hours covers everything the slow edge of the band can still see.
 */
export const RECENT_HOURS = 48

/**
 * Drinks close enough to matter for caffeine on board. This is deliberately separate from "today",
 * which ends at 4am for counting (src/store/day.ts): yesterday evening's coffee is not today's
 * intake, but some of it is still on board this morning.
 */
export function recentDrinks<T extends DrinkInput>(drinks: readonly T[], now: number, hours = RECENT_HOURS): T[] {
  const from = now - hours * 3_600_000
  return drinks.filter((d) => d.at >= from && d.at <= now)
}

export type CaffeineSummary = {
  /** On board now at the middle half-life, and at the fast and slow edges. */
  now: { mg: number; low: number; high: number }
  /** The same at bedtime. */
  bedtime: { at: number; mg: number; low: number; high: number }
  /** How much of `now.mg` comes from drinks before the 4am boundary. */
  carriedOverMg: number
  /** Caffeinated entries in the window whose amount is unknown, so the estimate reads low. */
  unknown: number
  /** Entries using the app's default dose, not a label or the person's figure. */
  defaults: number
  /** Entries with a rough time ("about an hour ago"). */
  approxTimes: number
  /** Entries migrated from v1, which only ever knew "a coffee". */
  legacy: number
}

/** Everything the chart shows, as numbers, so it can be printed as text for anyone not using the chart. */
export function caffeineSummary(
  drinks: readonly DrinkInput[],
  now: number,
  bedtime: number,
  dayStartAt: number,
): CaffeineSummary {
  const recent = recentDrinks(drinks, now)
  const caffeinated = recent.filter((d) => CAFFEINE_KINDS.has(d.kind))
  const before = recent.filter((d) => d.at < dayStartAt)
  const at = (t: number) => ({
    mg: caffeineOnBoardMg(recent, t),
    low: caffeineOnBoardMg(recent, t, HALF_LIFE_FAST_HOURS),
    high: caffeineOnBoardMg(recent, t, HALF_LIFE_SLOW_HOURS),
  })
  let unknown = 0
  let defaults = 0
  for (const d of caffeinated) {
    const figure = caffeineMgFor(d)
    if (figure.mg === null) unknown++
    else if (figure.origin === 'default') defaults++
  }
  return {
    now: at(now),
    bedtime: { at: bedtime, ...at(bedtime) },
    carriedOverMg: caffeineOnBoardMg(before, now),
    unknown,
    defaults,
    approxTimes: caffeinated.filter((d) => d.approxTime).length,
    legacy: caffeinated.filter((d) => d.legacy).length,
  }
}
