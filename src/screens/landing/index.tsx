// CARD 6. Landing (docs/04-screens-spec.md, section 1).
// Say what this is in five seconds and get the first tap.
import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { ChartWindow, Housing, Key, Plate, Printed, Toggle } from '../../ui'
import { load, setRoomSharing, update } from '../../store/local'
import { withdrawFromRoom } from '../../api/room'
import { eraseEverything } from '../privacy/erase'

const NAME_MAX = 16
// Stored.nickname has min(3): a shorter value would fail validation on the next load() and wipe the record.
const NAME_MIN = 3

/** The name to keep: what was typed, cut to 16, or the generated one if that is empty or too short.
 *  An untouched prefill is kept whole, since some generated nicknames run past 16. */
export function chooseName(typed: string, generated: string): string {
  const name = typed.trim().slice(0, NAME_MAX).trim()
  if (typed.trim() === generated) return generated
  return name.length >= NAME_MIN ? name : generated
}

export function Landing() {
  const navigate = useNavigate()
  const location = useLocation()
  // Set by Start over on the way back here, so the person hears what was and was not deleted.
  const erased = (location.state as { erased?: 'all' | 'local' } | null)?.erased
  const stored = load()
  const [share, setShare] = useState(stored.shareToRoom)
  const [confirming, setConfirming] = useState(false)
  const [eraseError, setEraseError] = useState('')
  const [erasing, setErasing] = useState(false)
  // Anyone with something on this phone, not only someone with a baseline: a quick-demo visitor
  // has a ticket and a log, and should find them again.
  const returning = stored.baseline !== undefined || stored.lastResult !== undefined || stored.drinks.length > 0
  const [name, setName] = useState(stored.nickname)

  // A form, so Enter (shown as "Go") in the field does exactly what the Start key does.
  const start = (event: FormEvent) => {
    event.preventDefault()
    update((s) => ({ ...s, nickname: chooseName(name, s.nickname) }))
    navigate('/setup', { state: { next: 'baseline' } })
  }

  // The short way through: every test once against example numbers, then a ticket. Nothing is
  // written into the personal baseline, so this can never overwrite one (schema v2).
  const quickDemo = () => {
    update((s) => ({ ...s, nickname: chooseName(name, s.nickname) }))
    navigate('/setup', { state: { next: 'example' } })
  }

  const erase = async () => {
    setErasing(true)
    const { roomWithdrawn, cleared } = await eraseEverything(stored.deviceId)
    if (!cleared) {
      setErasing(false)
      setEraseError('Browser storage could not be cleared. Use your browser’s site data settings.')
      return
    }
    navigate('/', { replace: true, state: { erased: roomWithdrawn ? 'all' : 'local' } })
    // A full reload, so every screen starts from the fresh record.
    navigate(0)
  }

  return (
    <Housing>
      <Plate serial={'Body drift recorder\nModel BC-2'} />

      {/* First visit carries the name field, so the chart gives up height to keep the keys above the fold. */}
      <ChartWindow bottom style={{ flex: 1, minHeight: returning ? 260 : 200 }}>
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
            Log a coffee or a drink. Stand still, then tap fast. A bin chicken will judge how far you
            have drifted from your own normal.
          </p>
        </Printed>
      </ChartWindow>

      {eraseError && <p role="status">{eraseError}</p>}
      {erased && (
        <p role="status" style={{ color: 'var(--housing-ink)', fontSize: 13, margin: 0 }}>
          {erased === 'all'
            ? 'Deleted from this phone, and taken off the room screen.'
            : 'Deleted from this phone. Room removal was not confirmed. A previous result may remain visible for up to 12 hours.'}
        </p>
      )}

      {returning ? (
        confirming ? (
          <>
            <p style={{ margin: 0 }}>
              Delete your name, baseline, drink log and last ticket from this phone? The server is asked to take you off
              the room screen first.
            </p>
            <Key onClick={() => void erase()} disabled={erasing}>
              {erasing ? 'Deleting' : 'Delete everything'}
            </Key>
            <Key quiet onClick={() => setConfirming(false)} disabled={erasing}>
              Keep it
            </Key>
          </>
        ) : (
          <>
            <Key onClick={() => navigate('/home')}>Continue</Key>
            <Key quiet onClick={() => setConfirming(true)}>
              Start over
            </Key>
          </>
        )
      ) : (
        <>
          <form onSubmit={start} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
            <NameField value={name} onChange={setName} />
            <Toggle
              checked={share}
              onChange={(on) => {
                setShare(setRoomSharing(on).shareToRoom)
                if (!on) void withdrawFromRoom(stored.deviceId)
              }}
              label="Show me on the room screen"
              hint="Off until chosen. Reloading turns it off. Your name and each ticket's word and score, never your drinks."
            />
            <Key type="submit">Start</Key>
          </form>
          <Key quiet onClick={quickDemo}>
            Quick demo · example numbers
          </Key>
        </>
      )}

      <p style={{ color: 'var(--housing-dim)', fontSize: 13, textAlign: 'center', margin: 0 }}>
        Peer-reviewed by a bin chicken. A toy, not a test. For adults.
      </p>
    </Housing>
  )
}

/** A paper field with an ink frame. The kit has no text input yet; this is a candidate for src/ui. */
function NameField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
      <label htmlFor="room-name" className="k-label">
        Your name
      </label>
      <input
        id="room-name"
        name="nickname"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={NAME_MAX}
        autoComplete="off"
        autoCapitalize="words"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="go"
        aria-describedby="room-name-note"
        style={{
          // 18px keeps iPhone Safari from zooming the page on focus (it zooms below 16px).
          font: '700 18px/1.2 var(--mono)',
          color: 'var(--ink)',
          background: 'var(--chart)',
          border: '2px solid var(--ink)',
          borderRadius: 0,
          appearance: 'none',
          padding: 'var(--s3)',
          width: '100%',
          minHeight: 48,
          margin: 0,
        }}
      />
      <p id="room-name-note" style={{ color: 'var(--housing-dim)', fontSize: 13, margin: 0 }}>
        Saved on this phone. It appears on the room screen only if you turn that on.
      </p>
    </div>
  )
}
