// CARD 6. Home (docs/04-screens-spec.md, section 4).
// Today's log, each entry editable; the caffeine estimate with its assumptions; the baseline; and
// the two actions. Every change to the log can be undone here for a few seconds.
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import type { Drink, Stored } from '../../../shared/contracts'
import { careFor, nextBedtimeAt, DEFAULT_BEDTIME_HOUR } from '../../engine/aftercare'
import { recentDrinks } from '../../engine/caffeine'
import { hasAlcohol, hasCaffeine } from '../../engine/nudge'
import { CAFFEINE_KINDS, tallyAlcohol, tallyCaffeine } from '../../engine/serving'
import { dayStart, drinksToday } from '../../store/day'
import { load, update } from '../../store/local'
import { CareCard, Housing, Key, Keys, Label, Plate, Rows, SafetyLine, Sheet } from '../../ui'
import { amountShort } from '../log/form'
import { DRINK_LABELS as LABELS } from '../log/presets'
import { applyUndo, readUndo, undoLabel, type UndoOp } from '../log/undo'
import { printedAt } from '../result/format'
import { CaffeineCard } from './CaffeineCard'

const UNDO_MS = 8000

const clock = (at: number) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/** Totals for the day. Known amounts are added up; anything unknown is counted, never guessed. */
function totals(today: Drink[]): string[] {
  const caffeine = tallyCaffeine(today)
  const alcohol = tallyAlcohol(today)
  const lines: string[] = []
  if (caffeine.known + caffeine.unknown > 0) {
    if (!caffeine.known) lines.push('Caffeine today: amount unknown.')
    else lines.push(
      `Caffeine today: about ${Math.round(caffeine.mg)} mg` +
        (caffeine.unknown > 0 ? `, plus ${caffeine.unknown} with no amount.` : '.'),
    )
  }
  if (alcohol.entries > 0) {
    const detail =
      alcohol.detailed > 0
        ? ` About ${(Math.round(alcohol.standardDrinks * 10) / 10).toFixed(1)} Australian standard drinks from the ${alcohol.detailed} with label detail${alcohol.detailed < alcohol.entries ? `; ${alcohol.entries - alcohol.detailed} without` : ''}.`
        : ' No label detail, so no standard-drink count.'
    lines.push(`Alcohol today: ${alcohol.entries} ${alcohol.entries === 1 ? 'entry' : 'entries'}.${detail}`)
  }
  return lines
}

function Entries({ drinks, onEdit }: { drinks: Drink[]; onEdit: (d: Drink) => void }) {
  return (
    <ul className="k-entries">
      {drinks.map((d) => (
        <li key={d.id}>
          <button type="button" className="k-entry" onClick={() => onEdit(d)} aria-label={`Edit ${LABELS[d.kind]} at ${clock(d.at)}`}>
            <b>{d.name ? `${LABELS[d.kind]} · ${d.name}` : LABELS[d.kind]}</b>
            <span className="k-entry__time">
              {d.approxTime ? 'about ' : ''}
              {clock(d.at)}
            </span>
            <span className="k-entry__detail">{amountShort(d)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function Home() {
  const navigate = useNavigate()
  const location = useLocation()
  const [stored, setStored] = useState<Stored>(load)

  // Log hands over what it just did, so this screen can offer to take it back.
  const [undo, setUndo] = useState<UndoOp | null>(() => readUndo(location.state))
  const [said, setSaid] = useState('')

  useEffect(() => {
    if (!undo) return
    const t = window.setTimeout(() => setUndo(null), UNDO_MS)
    return () => window.clearTimeout(t)
  }, [undo])

  const takeBack = () => {
    if (!undo) return
    setStored(update((current) => ({ ...current, drinks: applyUndo(current.drinks, undo) })))
    setSaid(undo.kind === 'added' ? 'Drink removed.' : undo.kind === 'edited' ? 'Edit undone.' : 'Drink put back.')
    setUndo(null)
    // Do not offer the same undo again after a reload.
    navigate('.', { replace: true, state: null })
  }

  const edit = (d: Drink) => navigate('/log', { state: { edit: d.id } })

  // One reading of the clock for the whole render, so the log, the curve and the bedtime agree.
  const [, setTick] = useState(0)
  useEffect(() => {
    const refresh = () => setTick(tick => tick + 1)
    const timer = window.setInterval(refresh, 60_000)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [])
  const now = Date.now()
  const startOfDay = dayStart(now)
  const today = drinksToday(stored.drinks, now)
  // Earlier entries that still matter to the caffeine estimate, shown so the carry-over is visible.
  const earlier = recentDrinks(stored.drinks, now)
    .filter((d) => d.at < startOfDay && CAFFEINE_KINDS.has(d.kind))
    .sort((a, b) => b.at - a.at)
  // Any alcohol logged today keeps the fixed line up here as well as on every result (D19).
  const showSafety = hasAlcohol(today)
  const baseline = stored.baseline

  const bedtime = nextBedtimeAt(now, stored.bedtimeMinutes ?? DEFAULT_BEDTIME_HOUR * 60)
  const care = careFor(today, now, bedtime, recentDrinks(stored.drinks, now))
  const showCaffeine = hasCaffeine(recentDrinks(stored.drinks, now))

  return (
    <Housing>
      <Plate small serial={'Today\nModel BC-2'} />

      <Sheet grow>
        <Label paper>Today</Label>
        {today.length === 0 ? <p>Nothing logged yet.</p> : <Entries drinks={today} onEdit={edit} />}
        {today.length > 0 && <p className="k-small">Tap an entry to fix its time, amount or label detail, or to remove it.</p>}
        {totals(today).map((line) => (
          <p key={line} className="k-small">
            {line}
          </p>
        ))}
        {earlier.length > 0 && (
          <details>
            <summary className="k-small">Before 4am, still in the caffeine estimate ({earlier.length})</summary>
            <Entries drinks={earlier} onEdit={edit} />
          </details>
        )}
        {showSafety && <SafetyLine />}
      </Sheet>

      {undo && (
        <Key quiet onClick={takeBack}>
          {undoLabel(undo)}
        </Key>
      )}
      <p role="status" aria-live="polite" style={{ margin: 0, color: 'var(--housing-dim)', fontSize: 13 }}>
        {said}
      </p>

      {showCaffeine && (
        <CaffeineCard
          drinks={stored.drinks}
          now={now}
          dayStartAt={startOfDay}
          bedtimeMinutes={stored.bedtimeMinutes}
          onBedtime={(minutes) =>
            setStored(
              update((current) => {
                const { bedtimeMinutes: _old, ...rest } = current
                return minutes === undefined ? rest : { ...rest, bedtimeMinutes: minutes }
              }),
            )
          }
        />
      )}

      <CareCard tags={care.tags.filter(tag => tag !== 'caffeine-at-bedtime')} />

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

      <Key quiet onClick={() => navigate('/privacy')}>
        Privacy · room screen {stored.shareToRoom ? 'on' : 'off'}
      </Key>
    </Housing>
  )
}
