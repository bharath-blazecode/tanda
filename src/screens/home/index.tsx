// CARD 6. Home (docs/04-screens-spec.md, section 4).
// Two actions and today's log, with card 14's caffeine strip and aftercare underneath.
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import type { Drink, Stored } from '../../../shared/contracts'
import { careFor } from '../../engine/aftercare'
import { caffeineCurve } from '../../engine/caffeine'
import { CAFFEINE_MG, hasAlcohol } from '../../engine/nudge'
import { dayStart, drinksToday } from '../../store/day'
import { load, update } from '../../store/local'
import { CaffeineChart, CareCard, Housing, Key, Keys, Label, Plate, Rows, SafetyLine, Sheet } from '../../ui'

const LABELS: Record<Drink['kind'], string> = {
  coffee: 'Coffee',
  energy: 'Energy drink',
  beer: 'Beer',
  wine: 'Wine',
  spirit: 'Spirit',
}

/** Past this many alcoholic drinks the safety line stays up for the rest of the night. */
const PERSISTENT_SAFETY_DRINKS = 4

const UNDO_MS = 5000

const clock = (at: number) =>
  new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

function totalsLine(today: Drink[]): string {
  const counts = new Map<Drink['kind'], number>()
  for (const d of today) counts.set(d.kind, (counts.get(d.kind) ?? 0) + 1)

  const caffeineMg = today.reduce((sum, d) => sum + (CAFFEINE_MG[d.kind] ?? 0), 0)
  const alcohol = today.filter((d) => CAFFEINE_MG[d.kind] === undefined).length

  const parts: string[] = []
  for (const [kind, n] of counts) {
    if (CAFFEINE_MG[kind] === undefined) continue
    parts.push(`${n} ${LABELS[kind].toLowerCase()}${n > 1 ? 's' : ''}`)
  }
  const caffeine = parts.length ? `${parts.join(', ')}, about ${caffeineMg} mg caffeine.` : ''
  const booze = alcohol ? `${alcohol} alcoholic drink${alcohol > 1 ? 's' : ''}.` : ''
  return [caffeine, booze].filter(Boolean).join(' ')
}

export function Home() {
  const navigate = useNavigate()
  const location = useLocation()
  const [stored, setStored] = useState<Stored>(load)

  // Log a drink hands the time over so this screen can offer to take it back.
  const justLogged = (location.state as { undo?: number } | null)?.undo
  const [undoable, setUndoable] = useState<number | undefined>(justLogged)

  useEffect(() => {
    if (undoable === undefined) return
    const t = window.setTimeout(() => setUndoable(undefined), UNDO_MS)
    return () => window.clearTimeout(t)
  }, [undoable])

  const removeDrink = (at: number) => {
    setStored(update((current) => ({ ...current, drinks: current.drinks.filter((d) => d.at !== at) })))
    setUndoable(undefined)
  }

  // One reading of the clock for the whole render, so the log, the curve and the bedtime agree.
  const now = Date.now()
  const today = drinksToday(stored.drinks, now)
  const alcoholCount = today.filter((d) => CAFFEINE_MG[d.kind] === undefined).length
  const showSafety = hasAlcohol(today) && alcoholCount >= PERSISTENT_SAFETY_DRINKS

  const care = careFor(today, now)
  // An hour past bedtime, so the marker is not jammed against the right edge.
  const curve = caffeineCurve(today, dayStart(now), care.bedtime + 3600000, 10)
  const showCurve = care.caffeineAtBedtimeMg !== null

  return (
    <Housing>
      <Plate small serial={'Today\nModel BC-2'} />

      <Sheet grow>
        <Label paper>Today</Label>
        {today.length === 0 ? (
          <p>Nothing logged yet.</p>
        ) : (
          <>
            <Rows items={today.map((d) => [LABELS[d.kind], clock(d.at)])} />
            <p className="k-small">{totalsLine(today)}</p>
          </>
        )}

        {stored.baseline && !stored.baseline.clean && (
          <p className="k-small">Baseline taken after a drink.</p>
        )}

        {showSafety && <SafetyLine />}
      </Sheet>

      {showCurve && (
        <CaffeineChart points={curve} bedtime={care.bedtime} atBedtimeMg={care.caffeineAtBedtimeMg} />
      )}

      <CareCard tags={care.tags} />

      {undoable !== undefined && (
        <Key quiet onClick={() => removeDrink(undoable)}>
          Undo that drink
        </Key>
      )}

      <Keys>
        <Key style={{ fontSize: 22 }} onClick={() => navigate('/log')}>
          Log a drink
        </Key>
        <Key style={{ fontSize: 22 }} onClick={() => navigate('/check')}>
          Run a check
        </Key>
      </Keys>

      <Key quiet onClick={() => navigate('/demo')}>
        Demo challenge
      </Key>
    </Housing>
  )
}
