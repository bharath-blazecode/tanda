// "What have you had?" as one sheet: a count per kind and one rough time for the lot. Used before a
// baseline and before an example run. It writes nothing itself: the caller stores what it returns.
import { useState } from 'react'
import type { Drink, DrinkKind } from '../../../shared/contracts'
import { dayStart } from '../../store/day'
import { Key, Label, Segmented, Sheet } from '../../ui'
import { DRINK_LABELS, DRINK_ORDER, presetDrink, ROUGH_TIMES, roughTimeAt, type RoughTime } from './presets'

const NONE = Object.fromEntries(DRINK_ORDER.map((kind) => [kind, 0])) as Record<DrinkKind, number>

export function DrinkPicker({
  label,
  intro,
  onDone,
}: {
  label: string
  intro?: string
  /** Called with the entries to store, possibly none. */
  onDone: (drinks: Drink[]) => void
}) {
  const [counts, setCounts] = useState<Record<DrinkKind, number>>(NONE)
  const [when, setWhen] = useState<RoughTime | null>(null)
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  // A time is asked for, not assumed: stamping earlier drinks as "now" puts the caffeine curve hours out.
  const ready = total === 0 || when !== null

  const done = () => {
    const now = Date.now()
    const { at, approx } = roughTimeAt(when ?? 'now', now, dayStart(now))
    // A millisecond apart, so each keeps its own place in the list.
    let offset = 0
    const drinks = DRINK_ORDER.flatMap((kind) =>
      Array.from({ length: counts[kind] }, () => presetDrink(kind, at - offset++, now, approx)),
    )
    onDone(drinks)
  }

  return (
    <>
      <Sheet grow>
        <Label paper>{label}</Label>
        <h2>What have you had today?</h2>
        {intro && <p>{intro}</p>}
        <p className="k-small">Tap one for each. It names the reading and feeds the caffeine estimate.</p>
        <div style={{ display: 'grid', gap: 'var(--s2)', gridTemplateColumns: '1fr 1fr' }}>
          {DRINK_ORDER.map((kind) => (
            <Key
              key={kind}
              style={{ fontSize: 18 }}
              aria-label={`${DRINK_LABELS[kind]}, ${counts[kind]} so far`}
              onClick={() => setCounts((c) => ({ ...c, [kind]: c[kind] + 1 }))}
            >
              {DRINK_LABELS[kind]}
              {counts[kind] > 0 ? ` · ${counts[kind]}` : ''}
            </Key>
          ))}
        </div>
        {total > 0 && (
          <>
            <Segmented legend="About when? One time for all of them" value={when} options={ROUGH_TIMES} onChange={setWhen} />
            <p className="k-small">You can correct each one, and add label detail, from Home later.</p>
          </>
        )}
      </Sheet>
      <Key style={{ fontSize: 22 }} onClick={done} disabled={!ready}>
        {total === 0 ? 'Nothing today' : ready ? `Log ${total} and start` : 'Pick a time first'}
      </Key>
      {total > 0 && (
        <Key
          quiet
          onClick={() => {
            setCounts(NONE)
            setWhen(null)
          }}
        >
          Clear
        </Key>
      )}
    </>
  )
}
