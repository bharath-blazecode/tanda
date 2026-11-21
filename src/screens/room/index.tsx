// CARD 9. The room board, shown on the projector (docs/04-screens-spec.md, section 10).
// The live list sits in the middle on chart paper: it is what moves while a hundred phones run a check.
import { useMemo } from 'react'
import type { RoomEntry } from '../../../shared/contracts'
import { Badge, ChartWindow, Ibis } from '../../ui'
import {
  commentaryLine,
  displayUrl,
  emptyRoom,
  isStale,
  joinUrl,
  liveView,
  qrGeometry,
  roomMood,
  VERDICT_LABEL,
  VERDICT_ORDER,
} from './board'
import { useRoomBoard } from './use-room-board'
import './room.css'

// The server sends up to 12; only this many stay legible from the back row in the side column.
const FEED_ROWS = 5
// Two columns of six fit the chart at a size the back row can read. A commentary line costs one row.
const LIVE_ROWS = 12

export function Room() {
  const board = useRoomBoard()
  const room = board.room ?? emptyRoom
  const stale = isStale(board)
  const line = commentaryLine(room)
  const live = liveView(room, line ? LIVE_ROWS - 2 : LIVE_ROWS)

  const url = joinUrl(window.location.origin)
  const qr = useMemo(() => qrGeometry(url), [url])
  const shownUrl = displayUrl(url)

  return (
    <main className="room">
      <div className="room-frame">
        <div className="room-board">
          <section className="room-left" aria-label="Join and the room mix">
            <div className="room-join">
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
              <h1 className="room-join-h">Scan. Stand still.</h1>
              <p className="room-url">{shownUrl}</p>
            </div>

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

          <ChartWindow className="room-live">
            <section className="room-live-in" aria-labelledby="room-live-h">
              <div className="room-live-head">
                <Badge>
                  <Ibis mood={roomMood(room)} />
                </Badge>
                <p className="room-live-count">
                  <span className="room-num room-live-n">{live.count}</span>
                  <span id="room-live-h" className="room-live-h">
                    In the lab right now
                  </span>
                </p>
              </div>
              {line && <p className="room-say">{line}</p>}

              {live.count === 0 ? (
                <p className="room-live-empty">Nobody yet. Scan the code and walk in.</p>
              ) : (
                <ul className="room-people">
                  {live.rows.map((p) => (
                    <li key={p.key} className="room-person">
                      <span className="room-person-name">{p.nickname}</span>
                      <span className="room-person-doing">{p.doing}</span>
                    </li>
                  ))}
                  {live.more > 0 && (
                    <li className="room-person room-person-more">
                      <span className="room-person-name">and {live.more} more</span>
                    </li>
                  )}
                </ul>
              )}
            </section>
          </ChartWindow>

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
