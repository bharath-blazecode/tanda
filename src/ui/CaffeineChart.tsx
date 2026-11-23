// CARD 14. The caffeine curve, drawn on chart paper. The band is the honest part: half-life
// varies a lot between people, so a single line would claim more than we know.
import { useId, useState } from 'react'
import type { CaffeinePoint } from '../engine/caffeine'
import { Axis, ChartWindow, Printed } from './ChartWindow'
import { Label } from './Label'
import './caffeine-selector.css'

const scenarios = [
  { field: 'low', hours: 2, label: 'Two-hour model' },
  { field: 'mg', hours: 5, label: 'Five-hour model' },
  { field: 'high', hours: 8, label: 'Eight-hour model' },
] as const

const W = 100
const H = 40
/** Never scale to less than this, or two sips fill the whole window and look alarming. */
const MIN_TOP_MG = 120

const clock = (t: number) =>
  new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(' ', '')

export function CaffeineChart({
  points,
  bedtime,
  atBedtimeMg,
  bedtimeScenarios,
}: {
  points: CaffeinePoint[]
  bedtime?: number
  atBedtimeMg?: number | null
  bedtimeScenarios?: Pick<CaffeinePoint, 'low' | 'mg' | 'high'>
}) {
  const group = useId()
  const [selected, setSelected] = useState<(typeof scenarios)[number]>(scenarios[1])
  const field = bedtimeScenarios ? selected.field : 'mg'
  const bedtimeValue = bedtimeScenarios ? bedtimeScenarios[field] : atBedtimeMg
  if (points.length < 2) return null

  const from = points[0].t
  const to = points[points.length - 1].t
  const span = to - from || 1
  const top = Math.max(MIN_TOP_MG, ...points.map((p) => p.high))

  const x = (t: number) => ((t - from) / span) * W
  const y = (mg: number) => H - (mg / top) * H

  const line = points.map((p) => `${x(p.t)},${y(p[field])}`).join(' ')
  // Out along the slow half-life, back along the fast one: that closes the band.
  const band = [
    ...points.map((p) => `${x(p.t)},${y(p.high)}`),
    ...[...points].reverse().map((p) => `${x(p.t)},${y(p.low)}`),
  ].join(' ')

  const markAt = bedtime !== undefined && bedtime >= from && bedtime <= to ? x(bedtime) : null

  return (
    <ChartWindow minHeight={150} bottom>
      <svg className="k-caffeine" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <polygon className="k-caffeine__band" points={band} />
        <polyline className="k-caffeine__line" points={line} />
        {markAt !== null && <line className="k-caffeine__mark" x1={markAt} y1={0} x2={markAt} y2={H} />}
      </svg>
      <Printed>
        <Axis left={clock(from)} right={clock(to)} />
        {bedtimeScenarios && (
          <fieldset className="caffeine-selector">
            <legend>Compare half-lives</legend>
            {scenarios.map(scenario => (
              <label key={scenario.field}>
                <input type="radio" name={group} checked={field === scenario.field}
                  onChange={() => setSelected(scenario)} />
                <span>{scenario.hours} h</span>
              </label>
            ))}
          </fieldset>
        )}
        {bedtime !== undefined && bedtimeValue != null && (
          <div aria-live="polite" aria-atomic="true"><Label paper>
            {bedtimeScenarios ? selected.label : 'Five-hour model'} · {bedtimeValue > 0 && bedtimeValue < 1 ? 'under 1' : Math.round(bedtimeValue)} mg at {clock(bedtime)}.
          </Label></div>
        )}
        <Label paper>Shaded band · two alternative half-lives, 2 and 8 hours.</Label>
      </Printed>
    </ChartWindow>
  )
}
