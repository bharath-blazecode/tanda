// CARD 8 owns this file. Local fallback lines, shown at once and kept if Claude does not answer in 4 s.
// Voice: Dr. Bin Chicken, dry and unimpressed. Never mentions driving, medicine or the law.
import type { Mode, Verdict } from '../../shared/contracts'

export function cannedLine(_verdict: Verdict, _mode: Mode): string {
  return 'Nothing to report. I have bins to attend to.'
}
