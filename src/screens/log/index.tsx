// CARD 6. Log a drink (docs/04-screens-spec.md, section 5).
// One tap per drink, no forms. One tap means now: logging something from earlier is not supported.
import { useRef } from 'react'
import { useNavigate } from 'react-router'
import type { DrinkKind } from '../../../shared/contracts'
import { update } from '../../store/local'
import { Housing, Key, Label, Plate, Sheet } from '../../ui'

const DRINKS: { kind: DrinkKind; label: string }[] = [
  { kind: 'coffee', label: 'Coffee' },
  { kind: 'energy', label: 'Energy drink' },
  { kind: 'beer', label: 'Beer' },
  { kind: 'wine', label: 'Wine' },
  { kind: 'spirit', label: 'Spirit' },
]

/** A second tap inside this window is a bounce, not a second drink. */
const DOUBLE_TAP_MS = 800

export function Log() {
  const navigate = useNavigate()
  const lastTap = useRef(0)

  const log = (kind: DrinkKind) => {
    const now = Date.now()
    if (now - lastTap.current < DOUBLE_TAP_MS) return
    lastTap.current = now
    update((current) => ({ ...current, drinks: [...current.drinks, { kind, at: now }] }))
    navigate('/home', { state: { undo: now } })
  }

  return (
    <Housing>
      <Plate small serial={'Log a drink\nOne tap'} />
      <Sheet>
        <Label paper>What did you have?</Label>
        <p className="k-small">Tapping one logs it now and takes you back.</p>
      </Sheet>
      <div style={{ display: 'grid', gap: 'var(--s3)' }}>
        {DRINKS.map(({ kind, label }) => (
          <Key key={kind} style={{ fontSize: 24 }} onClick={() => log(kind)}>
            {label}
          </Key>
        ))}
      </div>
      <Key quiet onClick={() => navigate('/home')}>
        Back
      </Key>
    </Housing>
  )
}
