// CARD 10. Demo (docs/04-screens-spec.md, section 8).
// For a room where nobody has a drink: throw yourself off on purpose, then run the normal check in
// demo mode. The ticket says which handicap the reading points at, decided from the drift alone.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { getMotionAvailability } from '../../sensors/motion'
import { load } from '../../store/local'
import { Housing, Key, Label, Plate, Sheet } from '../../ui'
import type { DemoHandicap } from './guess'

const COUNTDOWN_S = 15

const COPY: Record<DemoHandicap, { key: string; label: string; instruction: string }> = {
  spin: {
    key: 'Spin 5 times',
    label: 'Stands in for wobbly legs',
    instruction: 'Spin around 5 times. Hold on to something. Stop if you feel unwell.',
  },
  offhand: {
    key: 'Use my other hand',
    label: 'The seated option',
    instruction: 'Do the tap test with the hand you do not write with.',
  },
}

export function Demo() {
  const navigate = useNavigate()
  const stored = useRef(load()).current
  const [picked, setPicked] = useState<DemoHandicap | null>(null)
  const [left, setLeft] = useState(COUNTDOWN_S)

  const go = (handicap: DemoHandicap) =>
    navigate('/check', { state: { mode: 'demo', handicap } })

  // One tick a second; at zero, straight into the normal check.
  useEffect(() => {
    if (!picked) return
    if (left <= 0) {
      go(picked)
      return
    }
    const t = window.setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [picked, left])

  if (!stored.baseline) {
    // Not a silent redirect: the person should know why, and go straight to recording one.
    return (
      <Housing>
        <Plate small serial={'Demo\nmode'} />
        <Sheet grow>
          <Label paper>No normal on file</Label>
          <h2>Record your normal first.</h2>
          <p>The demo shows how far you move from your own normal, so it needs one to compare with.</p>
        </Sheet>
        <Key onClick={() => navigate('/baseline')}>Record it</Key>
      </Housing>
    )
  }

  // The spin only shows in Stand Still, so it needs motion now and a standing test in the normal.
  const noMotion = getMotionAvailability() === 'unavailable'
  const noStandInNormal = !stored.baseline.run.stand?.valid
  const spinHidden = noMotion || noStandInNormal

  if (picked) {
    const copy = COPY[picked]
    return (
      <Housing>
        <Plate small serial={'Demo\nGet ready'} />
        <Sheet grow>
          <Label paper>{copy.label}</Label>
          <p>{copy.instruction}</p>
          <h2 aria-live="polite">{left} s</h2>
        </Sheet>
        <Key onClick={() => go(picked)}>Ready now</Key>
        <Key
          quiet
          onClick={() => {
            setPicked(null)
            setLeft(COUNTDOWN_S)
          }}
        >
          Back
        </Key>
      </Housing>
    )
  }

  return (
    <Housing>
      <Plate small serial={'Demo\nmode'} />
      <Sheet grow>
        <Label paper>No drink needed</Label>
        <h2>Throw yourself off, then recheck.</h2>
        <p>Pick one. We run the same tests and say which one we think you did.</p>
        <p className="k-small">Demo readings are stamped as simulated.</p>
        {spinHidden && (
          <p className="k-small">
            {noMotion
              ? 'No spin here: it shows in the standing test, and this phone gives no motion data.'
              : 'No spin here: it shows in the standing test, and your normal has none.'}
          </p>
        )}
      </Sheet>
      {!spinHidden && (
        <Key style={{ fontSize: 24 }} onClick={() => setPicked('spin')}>
          {COPY.spin.key}
        </Key>
      )}
      <Key style={{ fontSize: 24 }} onClick={() => setPicked('offhand')}>
        {COPY.offhand.key}
      </Key>
      <Key quiet onClick={() => navigate('/home')}>
        Back
      </Key>
    </Housing>
  )
}
