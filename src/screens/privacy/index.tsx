// Privacy and data. What this app keeps on the phone, what leaves it and when, and the switches for
// each. Every sentence here was checked against the code paths named in
// docs/portfolio/THREAT-MODEL.md; change them together.
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { withdrawFromRoom } from '../../api/room'
import { load, setRoomSharing, update } from '../../store/local'
import { Housing, Key, Label, Plate, Rows, Sheet, Toggle } from '../../ui'
import { printedAt } from '../result/format'
import { eraseEverything } from './erase'

export function Privacy() {
  const navigate = useNavigate()
  const [stored, setStored] = useState(load)
  const [roomNote, setRoomNote] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [eraseError, setEraseError] = useState('')
  const [erasing, setErasing] = useState(false)

  const setSharing = async (on: boolean) => {
    const next = setRoomSharing(on)
    setStored(next)
    if (on) {
      setRoomNote(next.shareToRoom ? 'Sharing in this tab until reload.' : 'Sharing is off. Browser storage is unavailable.')
      return
    }
    setRoomNote('Taking you off the room screen.')
    const ok = await withdrawFromRoom(stored.deviceId)
    if (load().shareToRoom) return
    setRoomNote(
      ok
        ? 'Removed from the room screen.'
        : 'Sharing is off. Removal was not confirmed. A previous result may remain visible for up to 12 hours.',
    )
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
  }

  return (
    <Housing>
      <Plate small serial={'Privacy\nAnd data'} />

      <Sheet>
        <Label paper>On this phone</Label>
        <Rows
          items={[
            ['Name', stored.nickname],
            ['Baseline', stored.baseline ? printedAt(stored.baseline.run.at) : 'none'],
            ['Drink log', `${stored.drinks.length} ${stored.drinks.length === 1 ? 'entry' : 'entries'}`],
            ['Last ticket', stored.lastResult ? printedAt(stored.lastResult.run.at) : 'none'],
          ]}
        />
        <p className="k-small">
          Kept in this browser&rsquo;s storage, with no expiry. Anyone using this browser can see it. A random device
          ID lets the server limit requests. Anyone with this ID can update or withdraw this browser&rsquo;s room entry. Keep this ID private.
        </p>
        <p className="k-small">
          Motion and camera readings are worked out here and never uploaded. Drink names and notes never leave the
          phone.
        </p>
      </Sheet>

      <Sheet>
        <Label paper>Room screen</Label>
        <Toggle
          paper
          checked={stored.shareToRoom}
          onChange={(on) => void setSharing(on)}
          label="Show me on the room screen"
          hint="Sharing stops on reload. Sends your name, your current activity, and each ticket's word and score. Never your drinks, measurements or baseline. A result stays on the board for up to 12 hours, your live row for 45 seconds. Turning this off requests removal of both."
        />
        {roomNote && (
          <p className="k-small" role="status">
            {roomNote}
          </p>
        )}
      </Sheet>

      <Sheet>
        <Label paper>Ticket line from Claude</Label>
        <Toggle
          paper
          checked={stored.aiCommentary}
          onChange={(on) => setStored(update((s) => ({ ...s, aiCommentary: on })))}
          label="Ask Claude for the line on each ticket"
          hint="Our server sends Anthropic the word on the stamp, the recording-conditions tier, whether the reading was simulated, how far each test moved (in rough bands), caffeine logged today in mg, the number of alcoholic drinks logged today, the hour, and any demo handicap. Never your name, device ID, drink names or notes: the device ID reaches our server only, to limit requests. The code decides the result either way. Off: a built-in line is printed instead, and nothing is sent."
        />
      </Sheet>

      <Sheet>
        <Label paper>Start over</Label>
        {eraseError && <p role="status">{eraseError}</p>}
      {confirming ? (
          <>
            <h2>Delete everything?</h2>
            <p>
              This removes your name, baseline, drink log and last ticket from this browser, and first asks the server to
              take you off the room screen.
            </p>
            <p className="k-small">
              It cannot reach receipt images you saved or shared, the hosting provider&rsquo;s ordinary access logs, or
              requests already sent to Anthropic for ticket lines.
            </p>
          </>
        ) : (
          <p className="k-small">
            To keep your log and only replace your baseline, recalibrate instead.
          </p>
        )}
      </Sheet>

      {confirming ? (
        <>
          <Key onClick={() => void erase()} disabled={erasing}>
            {erasing ? 'Deleting' : 'Delete everything'}
          </Key>
          <Key quiet onClick={() => setConfirming(false)} disabled={erasing}>
            Keep it
          </Key>
        </>
      ) : (
        <>
          {stored.baseline && (
            <Key quiet onClick={() => navigate('/baseline')}>
              Recalibrate baseline
            </Key>
          )}
          <Key quiet onClick={() => setConfirming(true)}>
            Delete everything on this phone
          </Key>
          <Key quiet onClick={() => navigate('/home')}>
            Back
          </Key>
        </>
      )}
    </Housing>
  )
}
