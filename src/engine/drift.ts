// CARD 5. baseline + run -> normalised drift per metric, clipped to -3..3.
// Formulas: docs/05-architecture.md, Scoring. Pure: no DOM, no network, no Date.now().
import type { Drift, RunResult } from '../../shared/contracts'
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

  // Sway needs both runs to have stood still, and both readings to be usable.
  if (baseline.stand?.valid && run.stand?.valid) {
    drift.sway = ratioDrift(run.stand.swayRms, baseline.stand.swayRms, NOISE_FLOOR.sway)
  }

  drift.choiceRt = ratioDrift(run.choice.medianMs, baseline.choice.medianMs, NOISE_FLOOR.choiceRt)
  drift.choiceWrong = countDrift(run.choice.wrong, baseline.choice.wrong, NOISE_FLOOR.choiceWrong)

  // The pulse term exists only when both runs have one (D46).
  if (baseline.hr !== undefined && run.hr !== undefined) {
    drift.hr = ratioDrift(run.hr, baseline.hr, NOISE_FLOOR.hr)
  }

  // An undefined metric is absent from the record, not zero: zero would read as "measured, no change".
  for (const key of Object.keys(drift) as (keyof Drift)[]) {
    if (drift[key] === undefined) delete drift[key]
  }
  return drift
}
