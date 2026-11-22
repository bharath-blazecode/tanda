// One way to turn finished tests into a run, shared by the baseline and the check. Pure: the time
// comes in as an argument.
import type { ChoiceMetrics, PulseRecord, RunResult, StandMetrics } from '../../shared/contracts'

/**
 * `pulse` is null when the step was never offered. Only a measured pulse fills `hr`, the field the
 * engine scores; an approximate one is kept for the ticket with its figure and never scored.
 */
export function buildRun(
  stand: StandMetrics | null,
  choice: ChoiceMetrics | null,
  pulse: PulseRecord | null,
  at: number,
): RunResult {
  return {
    ...(stand ? { stand } : {}),
    ...(choice ? { choice } : {}),
    ...(pulse ? { pulse } : {}),
    ...(pulse?.status === 'measured' && pulse.bpm !== undefined ? { hr: pulse.bpm, hrSource: 'camera' as const } : {}),
    at,
  }
}
