// CARD 6. Log a drink (docs/04-screens-spec.md, section 5).
// One tap logs a drink now, as before. "Add with details" records the serving, the label figures and
// the real time it was drunk. Editing comes here too, from Home. Every change can be undone on Home.
import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import type { Drink, DrinkKind } from '../../../shared/contracts'
import { load, newId, update } from '../../store/local'
import { Housing, Key, Label, Plate, Sheet } from '../../ui'
import { DrinkEditor } from './DrinkEditor'
import { DRINK_LABELS, DRINK_ORDER, presetDrink } from './presets'
import type { UndoOp } from './undo'

/** A second tap inside this window is a bounce, not a second drink. */
const DOUBLE_TAP_MS = 800

export function Log() {
  const navigate = useNavigate()
  const location = useLocation()
  const editId = (location.state as { edit?: unknown } | null)?.edit
  const existing = typeof editId === 'string' ? load().drinks.find((d) => d.id === editId) : undefined
  const [details, setDetails] = useState<DrinkKind | null>(existing ? existing.kind : null)
  const lastTap = useRef(0)

  const home = (undo: UndoOp) => navigate('/home', { state: { undo } })

  const quick = (kind: DrinkKind) => {
    const now = Date.now()
    if (now - lastTap.current < DOUBLE_TAP_MS) return
    lastTap.current = now
    const drink = presetDrink(kind, now, now)
    update((current) => ({ ...current, drinks: [...current.drinks, drink] }))
    home({ kind: 'added', id: drink.id })
  }

  const save = (drink: Drink) => {
    update((current) => ({
      ...current,
      drinks: existing ? current.drinks.map((d) => (d.id === drink.id ? drink : d)) : [...current.drinks, drink],
    }))
    home(existing ? { kind: 'edited', previous: existing } : { kind: 'added', id: drink.id })
  }

  const remove = () => {
    if (!existing) return
    update((current) => ({ ...current, drinks: current.drinks.filter((d) => d.id !== existing.id) }))
    home({ kind: 'removed', previous: existing })
  }

  if (details !== null || existing) {
    return (
      <Housing>
        <Plate small serial={existing ? 'Log\nEdit' : 'Log\nDetails'} />
        <DrinkEditor
          existing={existing}
          initialKind={details ?? 'coffee'}
          newId={newId}
          onSave={save}
          onCancel={() => (existing ? navigate('/home') : setDetails(null))}
          onRemove={existing ? remove : undefined}
        />
      </Housing>
    )
  }

  return (
    <Housing>
      <Plate small serial={'Log a drink\nOne tap'} />
      <Sheet>
        <Label paper>What did you have?</Label>
        <p className="k-small">
          One tap logs it now, with the app&rsquo;s default amount where there is one. Use details for a label, a size or
          an earlier time.
        </p>
      </Sheet>
      <div style={{ display: 'grid', gap: 'var(--s3)', gridTemplateColumns: '1fr 1fr' }}>
        {DRINK_ORDER.map((kind) => (
          <Key key={kind} style={{ fontSize: 20 }} onClick={() => quick(kind)}>
            {DRINK_LABELS[kind]}
          </Key>
        ))}
      </div>
      <Key quiet onClick={() => setDetails('coffee')}>
        Add with details
      </Key>
      <Key quiet onClick={() => navigate('/home')}>
        Back
      </Key>
    </Housing>
  )
}
