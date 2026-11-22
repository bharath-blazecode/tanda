// CARD 5. drift + the drink log -> verdict, confidence, score, nudge.
// The sensors give the amount of drift; the log gives it a name (D17, D18).
import type { Assessment, Confidence, Drift, Handicap, ReferenceKind, RunResult } from '../../shared/contracts'
import type { Mode } from '../../shared/contracts'
import type { DrinkInput } from './serving'
import { compareRuns, type Comparability } from './compare'
import { driftFor, pos } from './drift'
import { DRIFT_CLIP } from './drift'
import { DRIFT_THRESHOLD, PULSE_CAP } from './metrics'
import { hasAlcohol, hasCaffeine, nudgeFor } from './nudge'

export type AssessInput = {
  baseline: RunResult
  baselineClean: boolean
  run: RunResult
  drinksToday: readonly DrinkInput[]
  mode: Mode
  checksSinceBaseline: number // the first few "faster than baseline" readings are learning, not drift
  /** `example` is the quick demo's fixed numbers: no handicap was chosen, so none is guessed. */
  reference?: ReferenceKind
}

/** For the first few checks a faster tap is practice, not improvement worth crediting. */
export const LEARNING_CHECKS = 3

/** Below this sample rate the sway reading is not trustworthy enough to count fully. */
export const MIN_HZ = 15

/** How far a run's sample rate may sit from the baseline's before confidence drops. */
export const HZ_TOLERANCE = 0.25

/** One number from the whole drift record. The pulse is capped so it can never decide alone (D46). */
export function totalDrift(drift: Drift): number {
  const sensors = pos(drift.sway) + pos(drift.choiceRt) + pos(drift.choiceWrong)
  const pulse = Math.min(PULSE_CAP, PULSE_CAP * pos(drift.hr))
  return sensors + pulse
}

/** 100 is rock steady. The mean is over the metrics actually measured, not over all four. */
export function scoreFor(drift: Drift): number {
  const values = Object.values(drift).filter((v): v is number => typeof v === 'number')
  if (values.length === 0) return 100
  const mean = values.reduce((sum, v) => sum + pos(v), 0) / values.length
  return 100 - Math.round(100 * Math.min(1, Math.max(0, mean / DRIFT_CLIP)))
}

/**
 * The recording-conditions tier: how much the comparison can be leaned on given what was recorded.
 * It is not a probability and not diagnostic confidence (see the evidence ledger).
 */
function confidenceFor(input: AssessInput, can: Comparability): Confidence {
  let steps = 0
  if (!can.stand.compared) steps++
  if (!input.baselineClean) steps++
  steps += can.caveats.length

  const hz = input.run.stand?.hz
  const baseHz = input.baseline.stand?.hz
  if (hz !== undefined) {
    if (hz < MIN_HZ) steps++
    else if (baseHz !== undefined && baseHz > 0 && Math.abs(hz / baseHz - 1) > HZ_TOLERANCE) steps++
  }

  if (steps <= 0) return 'high'
  if (steps === 1) return 'medium'
  return 'low'
}

/**
 * In demo mode the person chose a handicap and we guess which. A raised pulse points at jumping
 * jacks; otherwise whichever side of the body drifted more names it.
 */
function guessHandicap(drift: Drift, baseline: RunResult, run: RunResult): Handicap | undefined {
  if (baseline.hr !== undefined && run.hr !== undefined && run.hr >= baseline.hr * 1.25) return 'jacks'
  const sway = pos(drift.sway)
  const tapping = pos(drift.choiceRt) + pos(drift.choiceWrong)
  if (sway === 0 && tapping === 0) return undefined
  return sway > tapping ? 'spin' : 'offhand'
}

export function assess(input: AssessInput): Assessment {
  const can = compareRuns(input.baseline, input.run)
  const drift = driftFor(input.baseline, input.run)

  // Early on, a faster tap is the person learning the test. Do not bank it as improvement.
  if (input.checksSinceBaseline < LEARNING_CHECKS && drift.choiceRt !== undefined && drift.choiceRt < 0) {
    drift.choiceRt = 0
  }

  const total = totalDrift(drift)
  const alcohol = hasAlcohol(input.drinksToday)
  const caffeine = hasCaffeine(input.drinksToday)

  // The amount comes from the sensors; the name comes from the log (D17, D18).
  // Alcohol outranks caffeine, so a night with both reads as tipsy.
  const verdict =
    total < DRIFT_THRESHOLD ? 'steady' : alcohol ? 'tipsy' : caffeine ? 'wired' : 'wobbly'

  const { nudge, showSafetyLine } = nudgeFor(verdict, input.drinksToday)

  // A guess only makes sense when the person chose a handicap, which an example run never does.
  const guessed =
    input.mode === 'demo' && input.reference !== 'example' ? guessHandicap(drift, input.baseline, input.run) : undefined

  return {
    verdict,
    confidence: confidenceFor(input, can),
    drift,
    score: scoreFor(drift),
    nudge,
    showSafetyLine,
    // Partial: one of the two scored tests was not compared, for whatever reason.
    partial: !can.stand.compared || !can.choice.compared,
    ...(guessed ? { guessedHandicap: guessed } : {}),
  }
}

export type Evaluation = { ok: true; assessment: Assessment; comparability: Comparability } | { ok: false; comparability: Comparability }

/**
 * The entry point for a screen. Refuses to produce a verdict when neither scored test could be
 * compared: an empty comparison used to print as Steady 100, which reads as an all-clear for a
 * reading that never happened.
 */
export function evaluate(input: AssessInput): Evaluation {
  const comparability = compareRuns(input.baseline, input.run)
  if (!comparability.any) return { ok: false, comparability }
  return { ok: true, assessment: assess(input), comparability }
}
