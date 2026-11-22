// CARD 6. Home (docs/04-screens-spec.md, section 4).
// Two actions and today's log, with card 14's caffeine strip and aftercare underneath.
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import type { Drink, Stored } from '../../../shared/contracts'
import { careFor } from '../../engine/aftercare'
import { caffeineCurve } from '../../engine/caffeine'
import { hasAlcohol } from '../../engine/nudge'
import { CAFFEINE_KINDS, tallyAlcohol, tallyCaffeine } from '../../engine/serving'
import { dayStart, drinksToday } from '../../store/day'
import { load, update } from '../../store/local'
import { CaffeineChart, CareCard, Housing, Key, Keys, Label, Plate, Rows, SafetyLine, Sheet } from '../../ui'
import { DRINK_LABELS as LABELS } from '../log/presets'
import { printedAt } from '../result/format'

const UNDO_MS = 5000

const clock = (at: number) =>
  new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

/** One line of totals. Known caffeine is added up; unknown amounts are counted, never guessed. */
function totalsLine(today: Drink[]): string {
  const counts = new Map<Drink['kind'], number>()
  for (const d of today) counts.set(d.kind, (counts.get(d.kind) ?? 0) + 1)
  const caffeine = tallyCaffeine(today)
  const alcohol = tallyAlcohol(today).entries

  const parts: string[] = []
  for (const [kind, n] of counts) {
    if (!CAFFEINE_KINDS.has(kind)) continue
    parts.push(`${n} ${LABELS[kind].toLowerCase()}${n > 1 ? 's' : ''}`)
  }
  const unknown = caffeine.unknown > 0 ? ` (${caffeine.unknown} with no amount, not counted)` : ''
  const caffeineText = parts.length ? `${parts.join(', ')}: about ${Math.round(caffeine.mg)} mg caffeine${unknown}.` : ''
  const booze = alcohol ? `${alcohol} alcoholic drink${alcohol > 1 ? 's' : ''}.` : ''
  return [caffeineText, booze].filter(Boolean).join(' ')
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
  // Any alcohol logged today keeps the fixed line up here as well as on every result (D19).
  const showSafety = hasAlcohol(today)
  const baseline = stored.baseline

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

        {showSafety && <SafetyLine />}
      </Sheet>

      <Sheet>
        <Label paper>Your baseline</Label>
        {baseline ? (
          <>
            <Rows
              items={[
                ['Recorded', printedAt(baseline.run.at)],
                ['Checks since', baseline.checks === undefined ? 'not counted' : String(baseline.checks)],
              ]}
            />
            {!baseline.clean && <p className="k-small">Taken after a drink, so read comparisons loosely.</p>}
          </>
        ) : (
          <p>
            None yet. Kachka compares you with yourself, so a check needs one recording of your normal first. It takes
            about a minute.
          </p>
        )}
        {stored.lastResult?.reference.kind === 'example' && !baseline && (
          <p className="k-small">Your last ticket used example numbers. Record a baseline for a comparison with yourself.</p>
        )}
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
        <Key style={{ fontSize: 22 }} onClick={() => navigate(baseline ? '/check' : '/baseline')}>
          {baseline ? 'Run a check' : 'Record baseline'}
        </Key>
      </Keys>

      {baseline ? (
        <Keys>
          <Key quiet onClick={() => navigate('/baseline')}>
            Recalibrate
          </Key>
          <Key quiet onClick={() => navigate('/demo')}>
            Demo challenge
          </Key>
        </Keys>
      ) : (
        <Key quiet onClick={() => navigate('/check', { state: { reference: 'example' } })}>
          Try with example numbers
        </Key>
      )}
    </Housing>
  )
}
