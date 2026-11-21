// CARD 4. Stub component with the final props. Returns canned numbers so other cards can build on it.
import type { ChoiceMetrics } from '../../../shared/contracts'
import { summariseChoice } from './analyze'

type Props = { onDone: (metrics: ChoiceMetrics) => void }

export function ChoiceTest({ onDone }: Props) {
  return (
    <p>
      <button type="button" onClick={() => onDone(summariseChoice([]))}>Choice Tap (stub): finish</button>
    </p>
  )
}
