// CARD 5. baseline + run -> normalised drift per metric, clipped to -3..3.
// Formulas: docs/05-architecture.md, Scoring. Pure: no DOM, no network, no Date.now().
import type { Drift, RunResult } from '../../shared/contracts'
import { compareRuns, tapErrors } from './compare'
import { NOISE_FLOOR } from './metrics'

/** Drift is clipped to this either way, so one wild reading cannot swamp the sum. */
export const DRIFT_CLIP = 3

export function clip(value: number): number {
  // NaN carries no direction, so it means "no drift". An infinity does carry one:
  // immeasurably worse clips to the top of the range, not to the middle.
  if (Number.isNaN(value)) return 0
  return Math.max(-DRIFT_CLIP, Math.min(DRIFT_CLIP, value))
}

/** Only the worse-than-baseline part of a drift counts towards the total. */
export function pos(value: number | undefined): number {
  return value !== undefined && value > 0 ? value : 0
}

/** A proportional change, divided by what the metric moves by on its own. */
function ratioDrift(check: number, baseline: number, floor: number): number | undefined {
  if (!(baseline > 0) || !Number.isFinite(check)) return undefined
  return clip((check / baseline - 1) / floor)
}

/** An absolute change, for counts rather than times. */
function countDrift(check: number, baseline: number, floor: number): number | undefined {
  if (!Number.isFinite(check) || !Number.isFinite(baseline)) return undefined
  return clip((check - baseline) / floor)
}

export function driftFor(baseline: RunResult, run: RunResult): Drift {
  const drift: Drift = {}
  // Only what compare.ts accepts: same sensor, same capture, real taps, a measured pulse.
  const can = compareRuns(baseline, run)

  if (can.stand.compared && baseline.stand && run.stand) {
    drift.sway = ratioDrift(run.stand.swayRms, baseline.stand.swayRms, NOISE_FLOOR.sway)
  }

  // Errors are wrong squares plus missed ones, both real counts. The median time only counts when
  // both runs had a clean tap: otherwise it is a 2000 ms placeholder, not a reaction time.
  if (can.choice.compared && baseline.choice && run.choice) {
    if (can.reactionTime) {
      drift.choiceRt = ratioDrift(run.choice.medianMs, baseline.choice.medianMs, NOISE_FLOOR.choiceRt)
    }
    drift.choiceWrong = countDrift(tapErrors(run.choice), tapErrors(baseline.choice), NOISE_FLOOR.choiceWrong)
  }

  // The pulse term exists only when both runs have a measured one (D46). Approximate readings
  // never reach `hr`: the contract refuses them.
  if (can.pulse.compared && baseline.hr !== undefined && run.hr !== undefined) {
    drift.hr = ratioDrift(run.hr, baseline.hr, NOISE_FLOOR.hr)
  }

  // An undefined metric is absent from the record, not zero: zero would read as "measured, no change".
  for (const key of Object.keys(drift) as (keyof Drift)[]) {
    if (drift[key] === undefined) delete drift[key]
  }
  return drift
}
