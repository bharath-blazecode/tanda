// CARD 9. The room board, shown on the projector (docs/04-screens-spec.md, section 10).
// Plain on purpose: the mascot, the logo and the trace come from src/ui (card 2) later.
import { useMemo } from 'react'
import type { RoomEntry } from '../../../shared/contracts'
import {
  commentaryLine,
  displayUrl,
  emptyRoom,
  isStale,
  joinUrl,
  qrGeometry,
  VERDICT_LABEL,
  VERDICT_ORDER,
} from './board'
import { useRoomBoard } from './use-room-board'
import './room.css'

// The server sends up to 12; only this many stay legible from the back row in the side column.
const FEED_ROWS = 6

export function Room() {
  const board = useRoomBoard()
  const room = board.room ?? emptyRoom
  const stale = isStale(board)
  const line = commentaryLine(room)

  const url = joinUrl(window.location.origin)
  const qr = useMemo(() => qrGeometry(url), [url])
  const shownUrl = displayUrl(url)

  return (
    <main className="room">
      <div className="room-frame">
        <div className="room-board">
          <section className="room-join" aria-labelledby="room-join-h">
            <svg
              className="room-qr"
              viewBox={`0 0 ${qr.size} ${qr.size}`}
              shapeRendering="crispEdges"
              role="img"
              aria-label={`QR code to join: ${shownUrl}`}
            >
              <rect className="room-qr-light" width={qr.size} height={qr.size} />
              <path className="room-qr-dark" d={qr.path} />
            </svg>
            <h1 id="room-join-h" className="room-join-h">
              Scan. Stand still.
            </h1>
            <p className="room-url">{shownUrl}</p>
          </section>

          <section className="room-mid" aria-label="The room">
            <div className="room-voice">
              {/* SLOT: mascot badge (Ibis from src/ui, card 2). Keep the box; drop the component in. */}
              <div className="room-badge-slot" aria-hidden="true" />
              {line && <p className="room-say">{line}</p>}
            </div>

            {/* SLOT: the live trace (ChartWindow + Trace from src/ui, card 2). Sized; fills the column. */}
            <div className="room-trace-slot" aria-hidden="true" />

            <p className="room-total">
              <span className="room-num">{room.total}</span> {room.total === 1 ? 'reading' : 'readings'}
            </p>
            <ul className="room-tally">
              {VERDICT_ORDER.map((v) => (
                <li key={v}>
                  <span className="room-tally-n room-num">{room.mix[v]}</span>
                  <span className="room-verdict">{VERDICT_LABEL[v]}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="room-side" aria-label="Readings">
            <h2 className="room-h">Latest readings</h2>
            {room.feed.length === 0 ? (
              <p className="room-empty">No readings yet. Be the first.</p>
            ) : (
              <ul className="room-feed">
                {room.feed.slice(0, FEED_ROWS).map((e) => (
                  <li key={entryKey(e)}>
                    <span className="room-nick">
                      {e.nickname}
                      {e.mode === 'demo' && <span className="room-demo"> (demo)</span>}
                    </span>
                    <span className="room-verdict">{VERDICT_LABEL[e.verdict]}</span>
                  </li>
                ))}
              </ul>
            )}

            <h2 className="room-h">Steadiest in the room</h2>
            <TopList entries={room.top.real} />

            <h2 className="room-h">Dizziest after the handicap (demo only)</h2>
            <TopList entries={room.top.demo} />
          </section>
        </div>
        {stale && <p className="room-reconnecting">reconnecting</p>}
      </div>
    </main>
  )
}

function TopList({ entries }: { entries: RoomEntry[] }) {
  if (entries.length === 0) return <p className="room-none">None yet.</p>
  return (
    <ol className="room-top">
      {entries.map((e) => (
        <li key={entryKey(e)}>
          <span className="room-nick">{e.nickname}</span>
          <span className="room-num">{e.score}</span>
        </li>
      ))}
    </ol>
  )
}

// Nicknames can repeat across devices, so the timestamp joins the key.
function entryKey(e: RoomEntry): string {
  return `${e.nickname}:${e.at}:${e.mode}`
}
