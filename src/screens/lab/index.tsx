// Developer pages. One per piece, so each card can be seen working on a real phone
// before the screens around it exist.
import { useState } from 'react'
import { Link } from 'react-router'
import type { ChoiceMetrics, StandMetrics } from '../../../shared/contracts'
import { ChoiceTest } from '../../tests/choice'
import { PulseTest } from '../../tests/pulse'
import { careFor } from '../../engine/aftercare'
import { caffeineCurve } from '../../engine/caffeine'
import { CaffeineChart, CareCard } from '../../ui'
import type { DrinkInput } from '../../engine/serving'
import { dayStart } from '../../store/day'
import { StandTest } from '../../tests/stand'
import { Placeholder } from '../placeholder'
import { Kit } from './kit'

const routes = ['/', '/setup', '/baseline', '/home', '/log', '/check', '/result', '/demo', '/band', '/room']

export function Lab() {
  return (
    <Placeholder title="Lab" card="Card 1" spec="docs/05-architecture.md, How the work is split">
      <ul>
        <li><Link to="/lab/stand">Stand Still</Link> (card 3)</li>
        <li><Link to="/lab/choice">Choice Tap</Link> (card 4)</li>
        <li><Link to="/lab/pulse">Pulse from the camera</Link> (card 13)</li>
        <li><Link to="/lab/care">Caffeine on board and aftercare</Link> (card 14)</li>
        <li><Link to="/lab/kit">UI kit</Link> (card 2)</li>
        <li><a href="/api/health">/api/health</a></li>
        <li><a href="/api/room">/api/room</a></li>
      </ul>
      <p>Screens: {routes.map((r) => <Link key={r} to={r} style={{ marginRight: 8 }}>{r}</Link>)}</p>
    </Placeholder>
  )
}

export function LabStand() {
  const [metrics, setMetrics] = useState<StandMetrics | null | undefined>(undefined)
  return (
    <Placeholder built title="Stand Still" card="Card 3" spec="docs/04-screens-spec.md, T1">
      <StandTest onDone={setMetrics} />
      <pre>{JSON.stringify(metrics, null, 2)}</pre>
    </Placeholder>
  )
}

export function LabChoice() {
  const [metrics, setMetrics] = useState<ChoiceMetrics | undefined>(undefined)
  return (
    <Placeholder built title="Choice Tap" card="Card 4" spec="docs/04-screens-spec.md, T2">
      <ChoiceTest onDone={setMetrics} />
      <pre>{JSON.stringify(metrics, null, 2)}</pre>
    </Placeholder>
  )
}

export function LabPulse() {
  const [bpm, setBpm] = useState<number | null | undefined>(undefined)
  return (
    <Placeholder built title="Pulse from the camera" card="Card 13" spec="DECISIONS.md, D46">
      <PulseTest onDone={setBpm} />
      <pre>{JSON.stringify({ bpm }, null, 2)}</pre>
    </Placeholder>
  )
}

export function LabCare() {
  const now = Date.now()
  const hour = 3600000
  // A day with both in it, so every tag is on the page at once.
  const drinks: DrinkInput[] = [
    { kind: 'coffee', at: now - 6 * hour },
    { kind: 'coffee', at: now - 2 * hour },
    { kind: 'energy', at: now - 40 * 60000 },
    { kind: 'beer', at: now - 30 * 60000 },
  ]
  const care = careFor(drinks, now)
  const points = caffeineCurve(drinks, dayStart(now), care.bedtime + hour, 10)
  return (
    <Placeholder built title="Caffeine and aftercare" card="Card 14" spec="docs/05-architecture.md, Scoring">
      <CaffeineChart points={points} bedtime={care.bedtime} atBedtimeMg={care.caffeineAtBedtimeMg} />
      <CareCard tags={care.tags} />
      <pre>{JSON.stringify({ ...care, caffeineAtBedtimeMg: Math.round(care.caffeineAtBedtimeMg ?? 0) }, null, 2)}</pre>
    </Placeholder>
  )
}

export function LabKit() {
  return <Kit />
}
