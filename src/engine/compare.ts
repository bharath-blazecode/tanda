// Which parts of two runs can honestly be compared. Pure TypeScript, no clock.
//
// The engine used to compare whatever two numbers it was handed. That let three things through:
// a gyroscope reading (deg/s) measured against an acceleration reading (m/s²), a "no clean taps"
// placeholder of 2000 ms scored as a real reaction time, and a check with nothing in common with
// its reference printed as Steady 100. This file decides, per test, whether a comparison exists at
// all, and says why not when it does not. Drift is only ever computed for what passes here.
import type { ChoiceMetrics, PulseStatus, RunResult, StandMetrics } from '../../shared/contracts'

import { STAND_CAPTURE_SECONDS, STAND_PROTOCOL_VERSION } from '../../shared/contracts'

export type NotCompared =
  | 'protocol-changed'
  | 'cadence-changed'
  | 'placement-changed'
  | 'not-taken' // skipped, or no sensor this time
  | 'not-in-reference' // the reference has no such test
  | 'unusable' // this run's reading failed its own checks
  | 'reference-unusable' // the reference's reading failed its own checks
  | 'unknown-source'
  | 'trial-count-changed'
  | 'sensor-changed' // gyroscope one time, acceleration the other: different units
  | 'capture-changed' // a different capture length

export type TestStatus = { compared: true } | { compared: false; reason: NotCompared }

export type PulseComparison =
  | { compared: true }
  | { compared: false; reason: 'not-offered' | 'not-in-reference' | Exclude<PulseStatus, 'measured'> }

/** Things that allow a comparison but make it looser. Each lowers the recording-conditions tier. */
export type Caveat = 'no-reaction-time' | 'recovered-stand' | 'unverified-placement'

export type Comparability = {
  stand: TestStatus
  choice: TestStatus
  /** Both runs had at least one clean tap, so their median times are real and can be compared. */
  reactionTime: boolean
  pulse: PulseComparison
  caveats: Caveat[]
  /** At least one of the two scored tests was compared. Without that there is no reading. */
  any: boolean
}

/** Capture lengths within this many seconds count as the same protocol. */
export const CAPTURE_TOLERANCE_S = 0.5

/** False when every scored tap was a wrong square or a lapse, so the median is a placeholder. */
export function hasCleanTaps(metrics: ChoiceMetrics): boolean {
  return metrics.wrong + metrics.lapses < metrics.trials
}

export function standStatus(ref: StandMetrics | undefined, run: StandMetrics | undefined): TestStatus {
  if (!run) return { compared: false, reason: 'not-taken' }
  if (!ref) return { compared: false, reason: 'not-in-reference' }
  if (!run.valid) return { compared: false, reason: 'unusable' }
  if (!ref.valid) return { compared: false, reason: 'reference-unusable' }
  if (!ref.source || !run.source) return { compared: false, reason: 'unknown-source' }
  if (ref.source !== run.source) return { compared: false, reason: 'sensor-changed' }
  // Historical tickets contain two unversioned readings. Keep their original row semantics.
  // Every new acquisition carries a version, including the fixed example reference.
  if (ref.protocolVersion !== undefined || run.protocolVersion !== undefined) {
    if (ref.protocolVersion !== STAND_PROTOCOL_VERSION || run.protocolVersion !== STAND_PROTOCOL_VERSION)
      return { compared: false, reason: 'protocol-changed' }
    if (ref.captureSeconds !== STAND_CAPTURE_SECONDS || run.captureSeconds !== STAND_CAPTURE_SECONDS)
      return { compared: false, reason: 'capture-changed' }
    if (ref.placementChanged || run.placementChanged ||
        (ref.placement && run.placement && ref.placement !== run.placement))
      return { compared: false, reason: 'placement-changed' }
    const rates = [ref.hz, run.hz]
    if (Math.max(...rates) > 1.25 * Math.min(...rates))
      return { compared: false, reason: 'cadence-changed' }
  }
  if (
    ref.captureSeconds !== undefined &&
    run.captureSeconds !== undefined &&
    Math.abs(ref.captureSeconds - run.captureSeconds) > CAPTURE_TOLERANCE_S
  ) {
    return { compared: false, reason: 'capture-changed' }
  }
  return { compared: true }
}

/** Wrong squares plus missed squares: both are real counts, unlike a placeholder median. */
export function tapErrors(metrics: ChoiceMetrics): number {
  return metrics.wrong + metrics.lapses
}

/**
 * The tapping test is compared on its error count whenever both runs have one. The median time is
 * compared only when both runs had a clean tap: otherwise it is the 2000 ms placeholder, not a
 * time anyone took. Dropping the whole test instead would let someone who never tapped read as
 * Steady, which rewards a worse reading.
 */
function choiceStatus(ref: ChoiceMetrics | undefined, run: ChoiceMetrics | undefined, caveats: Caveat[]): TestStatus {
  if (!run) return { compared: false, reason: 'not-taken' }
  if (!ref) return { compared: false, reason: 'not-in-reference' }
  if (ref.trials !== run.trials) return { compared: false, reason: 'trial-count-changed' }
  if (!hasCleanTaps(run) || !hasCleanTaps(ref)) caveats.push('no-reaction-time')
  return { compared: true }
}

/** The pulse step's own outcome, reading a pre-v2 run's bare `hr` as measured. */
export function pulseStatusOf(run: RunResult): PulseStatus | 'not-offered' {
  if (run.pulse) return run.pulse.status
  return run.hr !== undefined ? 'measured' : 'not-offered'
}

function pulseComparison(ref: RunResult, run: RunResult): PulseComparison {
  const status = pulseStatusOf(run)
  if (status !== 'measured') return { compared: false, reason: status }
  if (ref.hr === undefined || run.hr === undefined) return { compared: false, reason: 'not-in-reference' }
  return { compared: true }
}

export function compareRuns(reference: RunResult, run: RunResult): Comparability {
  const caveats: Caveat[] = []
  const stand = standStatus(reference.stand, run.stand)
  if (stand.compared && (run.stand?.recovered || reference.stand?.recovered)) caveats.push('recovered-stand')
  if (stand.compared && run.stand?.protocolVersion && (!reference.stand?.placement || !run.stand.placement))
    caveats.push('unverified-placement')
  const choice = choiceStatus(reference.choice, run.choice, caveats)
  const reactionTime =
    choice.compared && !!reference.choice && !!run.choice && hasCleanTaps(reference.choice) && hasCleanTaps(run.choice)
  return {
    stand,
    choice,
    reactionTime,
    pulse: pulseComparison(reference, run),
    caveats,
    any: stand.compared || choice.compared,
  }
}

/** What the reference can be compared on, before a check starts. Used to warn up front. */
export function plannedComparison(reference: RunResult, motionAvailable: boolean): { stand: boolean; choice: boolean } {
  return {
    stand: motionAvailable && reference.stand?.valid === true && !!reference.stand.source &&
      reference.stand.protocolVersion === STAND_PROTOCOL_VERSION && reference.stand.captureSeconds === STAND_CAPTURE_SECONDS && !reference.stand.placementChanged,
    choice: reference.choice !== undefined,
  }
}
