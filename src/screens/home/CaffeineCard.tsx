// The caffeine estimate as a chart and as text. The text is not a hidden extra for screen readers: it
// is the same information for everyone, with the assumptions and what is missing from the log, so the
// picture never says more than the numbers behind it.
import { useState } from 'react'
import { nextBedtimeAt, DEFAULT_BEDTIME_HOUR } from '../../engine/aftercare'
import {
  caffeineCurve,
  caffeineSummary,
  HALF_LIFE_FAST_HOURS,
  HALF_LIFE_HOURS,
  HALF_LIFE_SLOW_HOURS,
  PEAK_MINUTES,
  recentDrinks,
} from '../../engine/caffeine'
import { DRINK_LABELS } from '../log/presets'
import { DEFAULT_CAFFEINE_MG, type AmountOrigin, type DrinkInput } from '../../engine/serving'
import { CaffeineChart, Field, Label, Rows, Sheet } from '../../ui'

const clock = (t: number) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const mg = (n: number) => n > 0 && n < 1 ? 'under 1 mg' : `${Math.round(n)} mg`
const approximateMg = (n: number) => n > 0 && n < 1 ? 'under 1 mg' : `about ${mg(n)}`
const sourceName: Record<AmountOrigin, string> = { label: 'Label', estimate: 'Your estimate', default: 'App default' }
const range = (low: number, high: number) => `${mg(low)} to ${mg(high)}`

const toMinutes = (text: string): number | null => {
  const m = /^(\d{2}):(\d{2})$/.exec(text)
  if (!m) return null
  const minutes = Number(m[1]) * 60 + Number(m[2])
  return minutes >= 0 && minutes < 1440 ? minutes : null
}
const fromMinutes = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

export function CaffeineCard({
  drinks,
  now,
  dayStartAt,
  bedtimeMinutes,
  onBedtime,
}: {
  drinks: readonly DrinkInput[]
  now: number
  dayStartAt: number
  bedtimeMinutes: number | undefined
  onBedtime: (minutes: number | undefined) => void
}) {
  const [editing, setEditing] = useState(false)
  const chosen = bedtimeMinutes ?? DEFAULT_BEDTIME_HOUR * 60
  const [draft, setDraft] = useState(fromMinutes(chosen))
  const bedtime = nextBedtimeAt(now, chosen)
  const recent = recentDrinks(drinks, now)
  const s = caffeineSummary(drinks, now, bedtime, dayStartAt)
  // An hour past bedtime, so the marker is not jammed against the right edge.
  const curve = s.known ? caffeineCurve(recent, dayStartAt, bedtime + 3_600_000, 10) : []

  const rows: [string, string][] = [
    ['Now, five-hour model', approximateMg(s.now.mg)],
    ['Now, scenarios', range(s.now.low, s.now.high)],
    [`At ${clock(bedtime)}, five-hour model`, approximateMg(s.bedtime.mg)],
    [`At ${clock(bedtime)}, scenarios`, range(s.bedtime.low, s.bedtime.high)],
  ]
  if (s.carriedOverMg >= 1) rows.push(['From before 4am', approximateMg(s.carriedOverMg)])

  const example = s.bedtimeExample
  const sourceRows: [string, string][] = []
  for (const origin of ['label', 'estimate', 'default'] as const) {
    const { entries, mg: total } = s.sources[origin]
    if (entries) sourceRows.push([sourceName[origin], `${mg(total)} · ${entries} ${entries === 1 ? 'entry' : 'entries'}`])
  }
  const inputs = [
    [s.sources.label.entries, 'from labels'],
    [s.sources.estimate.entries, 'manually estimated'],
    [s.sources.default.entries, 'using app defaults'],
  ] as const
  const provenance = inputs.filter(([count]) => count > 0).map(([count, text]) => `${count} ${text}`).join(', ')
  const omitted = s.unknown === 1 ? '1 entry with an unknown amount is' : `${s.unknown} entries with unknown amounts are`

  return (
    <>
      {s.known > 0 && <CaffeineChart points={curve} bedtime={bedtime} bedtimeScenarios={s.bedtime} />}
      <Sheet>
        <Label paper>{s.unknown && s.known ? 'Partial caffeine estimate' : 'Caffeine estimate'}</Label>
        {s.known > 0 ? <Rows items={rows} /> : <p>Amount unknown. Add a caffeine amount to a drink in your log to see an estimate.</p>}
        {s.known > 0 && <p className="k-small">Doses in the model · {provenance}. {s.unknown > 0 && `${omitted} left out.`}</p>}
        {s.needsVolume > 0 && <p className="k-small">For a label in mg per 100 mL, enter the serving volume as well.</p>}
        <details>
          <summary className="k-small">How this estimate was made</summary>
          {sourceRows.length > 0 && <>
            <p className="k-small">Caffeine logged in the last 48 hours, adjusted for the fraction consumed.</p>
            <Rows items={sourceRows} />
          </>}
          {s.defaults > 0 && <p className="k-small">One-tap coffee uses {DEFAULT_CAFFEINE_MG.coffee} mg and energy drink uses {DEFAULT_CAFFEINE_MG.energy} mg per serving. Edit an entry if you have its label.</p>}
          {s.approxTimes > 0 && <p className="k-small">{s.approxTimes} {s.approxTimes === 1 ? 'entry has a rough time' : 'entries have rough times'}. An earlier or later time moves the curve.</p>}
          {s.legacy > 0 && <p className="k-small">Your log includes older entries made before serving details could be recorded.</p>}
          {example && <p className="k-small">The {DRINK_LABELS[example.kind].toLowerCase()} logged {example.approxTime ? 'around' : 'at'} {clock(example.at)} on {new Date(example.at).toLocaleDateString([], { month: 'short', day: 'numeric' })} contributes about {mg(example.projected)} at bedtime in the five-hour model, from a logged dose of {mg(example.dose)} ({sourceName[example.origin].toLowerCase()}).</p>}
          <p className="k-small">Each dose follows an illustrative rise to a peak at {PEAK_MINUTES} minutes, then halves every {HALF_LIFE_HOURS} hours. The band reruns the same log at {HALF_LIFE_FAST_HOURS} and {HALF_LIFE_SLOW_HOURS} hours. Your own timing can fall outside those scenarios.</p>
          <p className="k-small">The bedtime marker shows where the bedtime setting falls on the curve. The model cannot predict how you will sleep.</p>
        </details>
        {editing ? (
          <>
            <Field
              label="Your bedtime"
              type="time"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              hint="Used only to place the marker. It cannot predict whether you will sleep."
            />
            <p className="k-small">
              <button
                type="button"
                className="k-inline-link"
                onClick={() => {
                  const minutes = toMinutes(draft)
                  if (minutes !== null) onBedtime(minutes)
                  setEditing(false)
                }}
              >
                Save bedtime
              </button>
              {bedtimeMinutes !== undefined && (
                <>
                  {' · '}
                  <button
                    type="button"
                    className="k-inline-link"
                    onClick={() => {
                      onBedtime(undefined)
                      setDraft(fromMinutes(DEFAULT_BEDTIME_HOUR * 60))
                      setEditing(false)
                    }}
                  >
                    Back to the default
                  </button>
                </>
              )}
            </p>
          </>
        ) : (
          <p className="k-small">
            Bedtime {fromMinutes(chosen)}
            {bedtimeMinutes === undefined ? ' (the app default)' : ''}.{' '}
            <button type="button" className="k-inline-link" onClick={() => setEditing(true)}>
              Change
            </button>
          </p>
        )}
      </Sheet>
    </>
  )
}
