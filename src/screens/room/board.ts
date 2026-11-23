// CARD 9. Pure helpers for the room board: poll state, join URL, QR geometry, polling loop.
// No React and no DOM here, so all of it runs under Vitest in the node environment.
import { create } from 'qrcode'
import type { RoomLive, RoomStage, RoomState, Verdict } from '../../../shared/contracts'

// Faster than the 2 s of D13: the live list is what moves during the demo, and a heartbeat is cheap.
export const POLL_MS = 1500

export type Board = {
  room: RoomState | null // last good state; null until the first poll succeeds
  failures: number // consecutive failed polls
}

export const initialBoard: Board = { room: null, failures: 0 }

// A disconnected projector cannot verify ongoing participation. Clear its last snapshot.
export function reduceBoard(prev: Board, result: RoomState | null): Board {
  if (result === null) return { room: null, failures: prev.failures + 1 }
  return { room: result, failures: 0 }
}

export function isStale(board: Board): boolean {
  return board.failures > 0
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

// Plain words for the back row. Never a verdict here: those only come from a result.
export const STAGE_LABEL: Record<RoomStage, string> = {
  joined: 'just walked in',
  baseline: 'recording a baseline',
  stand: 'standing still',
  choice: 'tapping',
  check: 'running a check',
  pulse: 'taking a pulse',
  result: 'reading the ticket',
  demo: 'trying the demo',
  idle: 'hanging about',
}

export type LiveRow = { key: string; nickname: string; doing: string }
export type LiveView = { count: number; rows: LiveRow[]; more: number }

/**
 * The live list as the board draws it: at most `max` rows, newest change first, and how many
 * present people are not drawn. A key changes when the stage does, so a changed row prints in again.
 */
export function liveView(room: RoomState, max: number): LiveView {
  const live: RoomLive[] = room.live ?? []
  const count = Math.max(room.liveCount ?? live.length, live.length)
  // With more people than rows, the last row becomes the "and N more" line.
  const shown = count > max ? live.slice(0, max - 1) : live.slice(0, max)
  const seen = new Map<string, number>()
  const rows = shown.map((p) => {
    const base = `${p.nickname}|${p.stage}|${p.at}`
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    return { key: n === 0 ? base : `${base}#${n}`, nickname: p.nickname, doing: STAGE_LABEL[p.stage] }
  })
  return { count, rows, more: count - rows.length }
}

// The mascot wears the room's most common verdict; an empty or tied room stays steady.
export function roomMood(room: RoomState): Verdict {
  let best: Verdict = 'steady'
  for (const v of VERDICT_ORDER) if (room.mix[v] > room.mix[best]) best = v
  return best
}

export function commentaryLine(room: RoomState): string | null {
  const line = room.commentary?.trim()
  return line ? line : null
}

// A scan opens the disclosure and controls without granting consent.
export function joinUrl(origin: string): string {
  return `${origin.replace(/\/+$/, '')}/privacy`
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
  let generation = 0

  const clear = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }

  // A timeout chain rather than setInterval: a slow response never overlaps the next request.
  const tick = async () => {
    clear()
    if (!running || inFlight || deps.isHidden()) return
    inFlight = true
    const started = generation
    const result = await deps.fetchRoom()
    inFlight = false
    if (!running) return
    if (started !== generation || deps.isHidden()) {
      if (!deps.isHidden()) void tick()
      return
    }
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
      generation++
      clear()
    },
    visibilityChanged() {
      if (!running) return
      // Hidden: stop asking. Visible again: refresh now instead of waiting out the interval.
      if (deps.isHidden()) {
        generation++
        clear()
        deps.onResult(null)
      } else void tick()
    },
  }
}
