// Developer pages. One per piece, so each card can be seen working on a real phone
// before the screens around it exist.
import { useState } from 'react'
import { Link } from 'react-router'
import type { ChoiceMetrics, StandMetrics } from '../../../shared/contracts'
import { ChoiceTest } from '../../tests/choice'
import { StandTest } from '../../tests/stand'
import { Placeholder } from '../placeholder'

const routes = ['/', '/setup', '/baseline', '/home', '/log', '/check', '/result', '/demo', '/band', '/room']

export function Lab() {
  return (
    <Placeholder title="Lab" card="Card 1" spec="docs/05-architecture.md, How the work is split">
      <ul>
        <li><Link to="/lab/stand">Stand Still</Link> (card 3)</li>
        <li><Link to="/lab/choice">Choice Tap</Link> (card 4)</li>
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
    <Placeholder title="Stand Still" card="Card 3" spec="docs/04-screens-spec.md, T1">
      <StandTest onDone={setMetrics} />
      <pre>{JSON.stringify(metrics, null, 2)}</pre>
    </Placeholder>
  )
}

export function LabChoice() {
  const [metrics, setMetrics] = useState<ChoiceMetrics | undefined>(undefined)
  return (
    <Placeholder title="Choice Tap" card="Card 4" spec="docs/04-screens-spec.md, T2">
      <ChoiceTest onDone={setMetrics} />
      <pre>{JSON.stringify(metrics, null, 2)}</pre>
    </Placeholder>
  )
}

export function LabKit() {
  return <Placeholder title="UI kit" card="Card 2" spec="docs/design/DESIGN.md, Components" />
}
