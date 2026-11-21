// CARD 6. Landing (docs/04-screens-spec.md, section 1).
// Say what this is in five seconds and get the first tap.
import { useNavigate } from 'react-router'
import { ChartWindow, Housing, Key, Plate, Printed } from '../../ui'
import { load, reset } from '../../store/local'

export function Landing() {
  const navigate = useNavigate()
  const stored = load()
  const returning = stored.baseline !== undefined

  return (
    <Housing>
      <Plate serial={'Body drift recorder\nModel BC-2'} />

      <ChartWindow bottom style={{ flex: 1, minHeight: 260 }}>
        <Printed>
          <h2
            style={{
              margin: '0 0 var(--s2)',
              font: '900 clamp(34px, 11vw, 52px)/0.9 var(--display)',
              letterSpacing: '.02em',
              textTransform: 'uppercase',
              textWrap: 'balance',
            }}
          >
            Wired or wobbly?
          </h2>
          <p style={{ margin: 0, maxWidth: '30ch', background: 'var(--chart)', display: 'inline' }}>
            Log a drink. Stand still, then tap fast. A bin chicken will judge how far you have drifted
            from your own normal.
          </p>
        </Printed>
      </ChartWindow>

      {returning ? (
        <>
          <Key onClick={() => navigate('/home')}>Continue</Key>
          <Key
            quiet
            onClick={() => {
              reset()
              navigate(0)
            }}
          >
            Start over
          </Key>
        </>
      ) : (
        <Key onClick={() => navigate('/setup')}>Start</Key>
      )}

      <p style={{ color: 'var(--housing-dim)', fontSize: 13, textAlign: 'center', margin: 0 }}>
        Peer-reviewed by a bin chicken. A toy, not a test. For adults.
      </p>
    </Housing>
  )
}
