// Privacy and data. What this app keeps on the phone, what leaves it and when, and the switches for
// each. Every sentence here was checked against the code paths named in
// docs/portfolio/THREAT-MODEL.md; change them together.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { postRoomResult, withdrawFromRoom } from '../../api/room'
import { finishRoomRemoval, load, ROOM_REVOKED, setRoomSharing, update } from '../../store/local'
import { Housing, Key, Label, Plate, Rows, Sheet, Toggle } from '../../ui'
import { printedAt } from '../result/format'
import { resultToPost } from '../../room-reporter-logic'
import { eraseEverything } from './erase'

export function Privacy() {
  const navigate = useNavigate()
  const [stored, setStored] = useState(load)
  const [busy, setBusy] = useState<'send' | 'remove' | null>(null)
  const [sentAt, setSentAt] = useState<number | null>(null)
  const operation = useRef(0)
  const preview = resultToPost(stored, sentAt, Date.now())
  const [roomNote, setRoomNote] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [eraseError, setEraseError] = useState('')
  const [erasing, setErasing] = useState(false)

  useEffect(() => {
    const refresh = () => {
      setStored(load())
      setRoomNote('')
      setSentAt(null)
    }
    window.addEventListener(ROOM_REVOKED, refresh)
    window.addEventListener('pageshow', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(ROOM_REVOKED, refresh)
      window.removeEventListener('pageshow', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const setSharing = async (on: boolean) => {
    const id = ++operation.current
    setSentAt(null)
    setBusy(on ? null : 'remove')
    const next = setRoomSharing(on)
    setStored(next)
    if (on) {
      setRoomNote(next.shareToRoom ? 'Sharing in this tab until reload.' : 'Sharing is off. Browser storage is unavailable.')
      return
    }
    setRoomNote('Taking you off the room screen.')
    const ok = await withdrawFromRoom(stored.deviceId)
    if (id !== operation.current) return
    setBusy(null)
    if (load().shareToRoom) return
    if (ok) setStored(finishRoomRemoval(stored.deviceId))
    setRoomNote(
      ok
        ? 'Removed from the room screen.'
        : 'Sharing is off. Removal was not confirmed. A previous result may remain visible for up to 12 hours.',
    )
  }

  const shareTicket = async () => {
    const current = load()
    const body = resultToPost(current, sentAt, Date.now())
    // The person agreed to the displayed fields. A change in another tab requires a fresh preview.
    if (!body || !preview || current.lastResult?.run.at !== stored.lastResult?.run.at ||
        body.deviceId !== preview.deviceId || body.nickname !== preview.nickname || body.score !== preview.score ||
        body.verdict !== preview.verdict || body.mode !== preview.mode) {
      setStored(current)
      setRoomNote('The ticket or sharing permission changed. Review the current details.')
      return
    }
    const id = ++operation.current
    setBusy('send')
    const ok = await postRoomResult(body)
    if (id !== operation.current) return
    setBusy(null)
    if (!load().shareToRoom) return
    if (ok) setSentAt(current.lastResult!.run.at)
    setRoomNote(ok ? 'Ticket request sent. The board may skip repeat requests.' : 'Ticket sharing was not confirmed. You can try again.')
  }

  const erase = async () => {
    setErasing(true)
    const { roomWithdrawn, cleared, error } = await eraseEverything(stored.deviceId)
    if (!cleared) {
      setErasing(false)
      setEraseError(error ?? 'Browser storage could not be cleared. Use your browser’s site data settings.')
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
          Motion and camera readings are worked out here. The room receives no raw samples or drink log. A receipt
          you save or share includes the details you select.
        </p>
      </Sheet>

      <Sheet>
        <Label paper>Room screen</Label>
        <Toggle
          paper
          checked={stored.shareToRoom}
          disabled={stored.roomRemovalPending || busy === 'remove'}
          onChange={(on) => void setSharing(on)}
          label="Show me on the room screen"
          hint="Anyone can watch the public room. Turning this on shares your nickname and live activity until reload. The event can substitute a generated name. Choose each ticket separately. Activity expires after 45 seconds and tickets after 12 hours. Turning this off requests removal of both."
        />
        {preview && <>
          <p className="k-small">Share this ticket as {preview.nickname}: {preview.verdict}, score {preview.score}, {preview.mode === 'demo' ? 'simulated' : 'personal reading'}. Your drink log and measurements stay private.</p>
          <Key quiet style={{ color: 'var(--ink)' }} disabled={busy !== null} onClick={() => void shareTicket()}>Share this ticket to the room</Key>
        </>}
        {stored.roomRemovalPending && <p className="k-small">Your personal data was cleared. Retry the previous room removal to retire its random ID.</p>}
        {!stored.shareToRoom && <Key quiet style={{ color: 'var(--ink)' }} disabled={busy === 'remove'} onClick={() => void setSharing(false)}>Remove any previous room entry</Key>}
        <Link to="/room" className="k-small">View public room</Link>
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
