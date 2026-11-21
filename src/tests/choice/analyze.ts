// CARD 4. Pure function: trials in, raw numbers out.
// Protocol and edge cases: docs/04-screens-spec.md, T2. Ported from docs/design/prototype-flow.html.
import type { ChoiceMetrics } from '../../../shared/contracts'

export type ChoiceTrial = {
  lit: number // which of the four squares lit up, 0 to 3
  tapped: number | null // which square was tapped; null is a lapse
  ms: number | null // time from light to tap
}

/** Scored trials in one run. Two warm-ups run first and are never passed in here. */
export const SCORED_TRIALS = 12

/**
 * Stands in for the median when no tap was both correct and timed.
 * `ChoiceMetrics.medianMs` must be positive, and the scoring in docs/05-architecture.md
 * already treats a missing median as 2000 ms, so a run with nothing clean reads as very slow
 * rather than as impossibly fast. Card 5 should use the same number.
 */
export const NO_CLEAN_TAPS_MS = 2000

/** Middle value, or the mean of the middle two. Null for an empty list. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * Median over correct taps only. Wrong squares and lapses are counted, never averaged in:
 * a wrong tap is usually fast, so letting it into the median would make impairment look like speed.
 */
export function summariseChoice(trials: ChoiceTrial[]): ChoiceMetrics {
  if (trials.length === 0) {
    return { medianMs: NO_CLEAN_TAPS_MS, wrong: 0, lapses: SCORED_TRIALS, trials: SCORED_TRIALS }
  }

  const correct: number[] = []
  let wrong = 0
  let lapses = 0

  for (const trial of trials) {
    if (trial.tapped === null) {
      lapses++
    } else if (trial.tapped !== trial.lit) {
      wrong++
    } else if (trial.ms !== null) {
      correct.push(trial.ms)
    }
  }

  return {
    medianMs: median(correct) ?? NO_CLEAN_TAPS_MS,
    wrong,
    lapses,
    trials: trials.length,
  }
}

/** False when every scored trial was a wrong square or a lapse, so there is no real median to show. */
export function hasCleanTaps(metrics: ChoiceMetrics): boolean {
  return metrics.wrong + metrics.lapses < metrics.trials
}
