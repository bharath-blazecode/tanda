// CARD 14. The caffeine curve, drawn on chart paper. The band is the honest part: half-life
// varies a lot between people, so a single line would claim more than we know.
import type { CaffeinePoint } from '../engine/caffeine'
import { Axis, ChartWindow, Printed } from './ChartWindow'
import { Label } from './Label'

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
}: {
  points: CaffeinePoint[]
  bedtime?: number
  atBedtimeMg?: number | null
}) {
  if (points.length < 2) return null

  const from = points[0].t
  const to = points[points.length - 1].t
  const span = to - from || 1
  const top = Math.max(MIN_TOP_MG, ...points.map((p) => p.high))

  const x = (t: number) => ((t - from) / span) * W
  const y = (mg: number) => H - (mg / top) * H

  const line = points.map((p) => `${x(p.t)},${y(p.mg)}`).join(' ')
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
        {bedtime !== undefined && atBedtimeMg !== null && atBedtimeMg !== undefined && (
          <Label paper>
            About {Math.round(atBedtimeMg)} mg still on board at {clock(bedtime)}.
          </Label>
        )}
        <Label paper>The band is how differently people clear it: some in two hours, some in eight.</Label>
      </Printed>
    </ChartWindow>
  )
}
