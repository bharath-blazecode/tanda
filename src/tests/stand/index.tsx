// CARD 3. Stub component with the final props. Returns canned numbers so other cards can build on it.
// onDone(null) means the user skipped the test or the phone has no motion sensors.
import type { StandMetrics } from '../../../shared/contracts'
import { analyzeStand } from './analyze'

type Props = { onDone: (metrics: StandMetrics | null) => void }

export function StandTest({ onDone }: Props) {
  return (
    <p>
      <button type="button" onClick={() => onDone(analyzeStand([]))}>Stand Still (stub): finish</button>{' '}
      <button type="button" onClick={() => onDone(null)}>Skip</button>
    </p>
  )
}
