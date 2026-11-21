// CARD 14. Renders the aftercare tags the engine chose. It picks nothing itself: the rules are
// in src/engine/aftercare.ts and the words are in care-copy.ts, so one test can read all of them.
import type { CareTag } from '../engine/aftercare'
import { CARE_COPY } from './care-copy'
import { Label } from './Label'
import { Sheet } from './Sheet'

export function CareCard({ tags, title = 'Looking after yourself' }: { tags: readonly CareTag[]; title?: string }) {
  if (tags.length === 0) return null
  return (
    <Sheet>
      <Label paper>{title}</Label>
      <ul className="k-care">
        {tags.map((tag) => (
          <li key={tag}>
            <b>{CARE_COPY[tag].title}</b>
            <span>{CARE_COPY[tag].body}</span>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
