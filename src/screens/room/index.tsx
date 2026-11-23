// Public projector. Reading the board needs no grant and never publishes a participant.
import { useMemo } from 'react'
import { Badge, ChartWindow, Ibis, SafetyLine } from '../../ui'
import { commentaryLine, displayUrl, emptyRoom, isStale, joinUrl, liveView, qrGeometry, roomMood, VERDICT_LABEL } from './board'
import { useRoomBoard } from './use-room-board'
import './room.css'

export function Room() {
  const board = useRoomBoard()
  const room = board.room
  const line = room && commentaryLine(room)
  const live = liveView(room ?? emptyRoom, line ? 10 : 12)
  const url = joinUrl(window.location.origin)
  const qr = useMemo(() => qrGeometry(url), [url])

  return (
    <main className="room">
      <div className="room-frame">
        <div className="room-board">
          <section className="room-left" aria-label="Room sharing options">
            <div className="room-join">
              <svg className="room-qr" viewBox={`0 0 ${qr.size} ${qr.size}`} shapeRendering="crispEdges"
                aria-hidden="true">
                <rect className="room-qr-light" width={qr.size} height={qr.size} />
                <path className="room-qr-dark" d={qr.path} />
              </svg>
              <h1 className="room-join-h">Public room</h1>
              <a className="room-url" href={url}>Room sharing options<br />{displayUrl(url)}</a>
            </div>
            <p>Anyone can watch. Scan to choose whether to share from your phone.</p>
          </section>

          <ChartWindow className="room-live">
            <section className="room-live-in" aria-labelledby="room-live-h">
              <div className="room-live-head">
                <Badge><Ibis mood={roomMood(room ?? emptyRoom)} /></Badge>
                <h2 id="room-live-h" className="room-live-count">
                  {room && <span className="room-num room-live-n">{live.count}</span>}
                  <span className="room-live-h">In the lab right now</span>
                </h2>
              </div>
              {line && <p className="room-say">{line}</p>}
              {!room ? (
                <p className="room-live-empty" role="status">{isStale(board) ? 'Room updates paused. Reconnecting…' : 'Connecting to the room…'}</p>
              ) : live.count === 0 ? (
                <p className="room-live-empty">No one is sharing live activity.</p>
              ) : (
                <ul className="room-people">
                  {live.rows.map(p => (
                    <li key={p.key} className="room-person">
                      <span className="room-person-name">{p.nickname}</span>
                      <span className="room-person-doing">{p.doing}</span>
                    </li>
                  ))}
                  {live.more > 0 && <li className="room-person room-person-more">and {live.more} more</li>}
                </ul>
              )}
            </section>
          </ChartWindow>

          <section className="room-side" aria-label="Shared tickets">
            <h2 className="room-h">Latest shared tickets</h2>
            {room && (room.feed.length ? (
              <ul className="room-feed">
                {room.feed.slice(0, 5).map((e, i) => (
                  <li key={`${e.nickname}:${e.at}:${e.mode}:${i}`}>
                    <span className="room-nick">{e.nickname}</span>
                    <span className="room-verdict">{VERDICT_LABEL[e.verdict]}</span>
                    <span className="room-mode">{e.mode === 'demo' ? 'Simulated' : 'Personal reading'}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="room-empty">No shared tickets yet.</p>)}
            <p>Ticket words use the person’s log. The phone cannot detect intoxication.</p>
            <SafetyLine />
          </section>
        </div>
      </div>
    </main>
  )
}
