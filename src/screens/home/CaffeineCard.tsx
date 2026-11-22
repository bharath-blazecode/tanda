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
import type { DrinkInput } from '../../engine/serving'
import { CaffeineChart, Field, Label, Rows, Sheet } from '../../ui'

const clock = (t: number) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const mg = (n: number) => `${Math.round(n)} mg`
const range = (low: number, high: number) => `${Math.round(low)} to ${Math.round(high)} mg`

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
  const curve = caffeineCurve(recent, dayStartAt, bedtime + 3_600_000, 10)

  const rows: [string, string][] = [
    ['Now', `about ${mg(s.now.mg)}`],
    ['Now, range', range(s.now.low, s.now.high)],
    [`At ${clock(bedtime)}`, `about ${mg(s.bedtime.mg)}`],
    [`At ${clock(bedtime)}, range`, range(s.bedtime.low, s.bedtime.high)],
  ]
  if (s.carriedOverMg >= 1) rows.push(['From before 4am', `about ${mg(s.carriedOverMg)}`])

  const gaps: string[] = []
  if (s.unknown > 0) gaps.push(`${s.unknown} caffeinated ${s.unknown === 1 ? 'entry has' : 'entries have'} no amount and ${s.unknown === 1 ? 'is' : 'are'} left out, so this reads low.`)
  if (s.defaults > 0) gaps.push(`${s.defaults} ${s.defaults === 1 ? 'entry uses' : 'entries use'} the app's default dose, not a label or your figure.`)
  if (s.approxTimes > 0) gaps.push(`${s.approxTimes} ${s.approxTimes === 1 ? 'time is' : 'times are'} rough guesses.`)
  if (s.legacy > 0) gaps.push(`${s.legacy} ${s.legacy === 1 ? 'entry was' : 'entries were'} logged before times and amounts could be edited.`)

  return (
    <>
      <CaffeineChart points={curve} bedtime={bedtime} atBedtimeMg={s.bedtime.mg} />
      <Sheet>
        <Label paper>Caffeine estimate</Label>
        <Rows items={rows} />
        <p className="k-small">
          Arithmetic on your log, not a measurement of you. It assumes each dose peaks about {PEAK_MINUTES} minutes after
          you drink it and then halves every {HALF_LIFE_HOURS} hours. The range uses {HALF_LIFE_FAST_HOURS} and{' '}
          {HALF_LIFE_SLOW_HOURS} hours instead: a spread of assumptions, not a confidence interval, and some people fall
          outside it. Pregnancy, some medicines and smoking change it a lot.
        </p>
        {gaps.length > 0 && (
          <ul className="k-notes">
            {gaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        )}
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
