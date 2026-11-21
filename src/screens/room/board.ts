// CARD 9. Pure helpers for the room board: poll state, join URL, QR geometry, polling loop.
// No React and no DOM here, so all of it runs under Vitest in the node environment.
import { create } from 'qrcode'
import type { RoomState, Verdict } from '../../../shared/contracts'

export const POLL_MS = 2000
// One dropped poll is normal on venue wifi; flag it only when it keeps happening (spec, screen 10).
export const STALE_AFTER_FAILURES = 2

export type Board = {
  room: RoomState | null // last good state; null until the first poll succeeds
  failures: number // consecutive failed polls
}

export const initialBoard: Board = { room: null, failures: 0 }

// A failed poll (null) never clears the board: the projector keeps showing the last good data.
export function reduceBoard(prev: Board, result: RoomState | null): Board {
  if (result === null) return { room: prev.room, failures: prev.failures + 1 }
  return { room: result, failures: 0 }
}

export function isStale(board: Board): boolean {
  return board.failures >= STALE_AFTER_FAILURES
}

export const emptyRoom: RoomState = {
  total: 0,
  mix: { steady: 0, wired: 0, tipsy: 0, wobbly: 0 },
  feed: [],
  top: { real: [], demo: [] },
  updatedAt: 0,
  commentary: null,
}

export const VERDICT_ORDER: readonly Verdict[] = ['steady', 'wired', 'tipsy', 'wobbly']

export const VERDICT_LABEL: Record<Verdict, string> = {
  steady: 'Steady',
  wired: 'Wired',
  tipsy: 'Tipsy',
  wobbly: 'Wobbly',
}

export function commentaryLine(room: RoomState): string | null {
  const line = room.commentary?.trim()
  return line ? line : null
}

// The phone app lives at "/", on the same origin as the board.
export function joinUrl(origin: string): string {
  return `${origin.replace(/\/+$/, '')}/`
}

// What people read off the screen: no scheme, no trailing slash.
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/+$/, '')
}

export const QR_QUIET_ZONE = 4 // modules; the QR spec minimum, needed for phones to lock on

export type QrGeometry = {
  size: number // side of the viewBox in modules, quiet zone included
  path: string // SVG path of the dark modules, in module units
}

// Builds the QR as one SVG path so the colours can come from CSS tokens instead of hex in JS.
export function qrGeometry(text: string): QrGeometry {
  const { modules } = create(text, { errorCorrectionLevel: 'M' })
  const n = modules.size
  const q = QR_QUIET_ZONE
  let path = ''
  for (let row = 0; row < n; row++) {
    let col = 0
    while (col < n) {
      if (!modules.get(row, col)) {
        col++
        continue
      }
      const start = col
      while (col < n && modules.get(row, col)) col++
      const len = col - start
      // One rectangle per horizontal run keeps the path short.
      path += `M${start + q} ${row + q}h${len}v1h-${len}z`
    }
  }
  return { size: n + 2 * q, path }
}

// The polling loop, with its environment injected so it can be tested with fake timers.
export type PollerDeps = {
  fetchRoom: () => Promise<RoomState | null>
  onResult: (result: RoomState | null) => void
  isHidden: () => boolean
  intervalMs?: number
}

export type Poller = {
  start: () => void
  stop: () => void
  visibilityChanged: () => void // call on every visibilitychange
}

export function createPoller(deps: PollerDeps): Poller {
  const intervalMs = deps.intervalMs ?? POLL_MS
  let timer: ReturnType<typeof setTimeout> | undefined
  let running = false
  let inFlight = false

  const clear = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }

  // A timeout chain rather than setInterval: a slow response never overlaps the next request.
  const tick = async () => {
    clear()
    if (!running || inFlight || deps.isHidden()) return
    inFlight = true
    const result = await deps.fetchRoom()
    inFlight = false
    if (!running) return
    deps.onResult(result)
    if (!deps.isHidden()) timer = setTimeout(tick, intervalMs)
  }

  return {
    start() {
      running = true
      void tick()
    },
    stop() {
      running = false
      clear()
    },
    visibilityChanged() {
      if (!running) return
      // Hidden: stop asking. Visible again: refresh now instead of waiting out the interval.
      if (deps.isHidden()) clear()
      else void tick()
    },
  }
}
