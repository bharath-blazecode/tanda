// Privacy and data. What this app keeps on the phone, what leaves it and when, and the switches for
// each. Every sentence here was checked against the code paths named in
// docs/portfolio/THREAT-MODEL.md; change them together.
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { withdrawFromRoom } from '../../api/room'
import { load, update } from '../../store/local'
import { Housing, Key, Label, Plate, Rows, Sheet, Toggle } from '../../ui'
import { printedAt } from '../result/format'
import { eraseEverything } from './erase'

export function Privacy() {
  const navigate = useNavigate()
  const [stored, setStored] = useState(load)
  const [roomNote, setRoomNote] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [erasing, setErasing] = useState(false)

  const setSharing = async (on: boolean) => {
    setStored(update((s) => ({ ...s, shareToRoom: on })))
    if (on) {
      setRoomNote('Your name appears on the room screen from your next step.')
      return
    }
    setRoomNote('Taking you off the room screen.')
    const ok = await withdrawFromRoom(stored.deviceId)
    setRoomNote(
      ok
        ? 'Removed from the room screen.'
        : 'Could not reach the server. Nothing more is sent, and your entry drops off the board within 12 hours.',
    )
  }

  const erase = async () => {
    setErasing(true)
    const { roomWithdrawn } = await eraseEverything()
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
          ID is kept with it: it lets the server keep one room entry per phone and limit requests. It is not an
          account and it unlocks nothing.
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
          hint="Sends your name, what you are doing (standing, tapping), and each ticket's word and score. Never your drinks, measurements or baseline. A result stays on the board for up to 12 hours, your live row for 45 seconds. Turning this off asks the server to remove both straight away."
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
          <Key quiet onClick={() => navigate(-1)}>
            Back
          </Key>
        </>
      )}
    </Housing>
  )
}
