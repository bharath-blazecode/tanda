// Pure parts of the room reporter: which stage a route means, whether a result should be posted, and
// the heartbeat loop with its timers and visibility injected. No React, no DOM, so Vitest runs it in node.
import type { RoomResultRequest, RoomStage, Stored } from '../shared/contracts'

export const HEARTBEAT_MS = 15_000
// A ticket opened long after its check is someone rereading it, not a new result for the board.
export const RESULT_FRESH_MS = 10 * 60 * 1000

const ROUTE_STAGE: Record<string, RoomStage> = {
  '/': 'joined',
  '/setup': 'joined',
  '/baseline': 'baseline',
  '/check': 'check',
  '/result': 'result',
  '/demo': 'demo',
  '/home': 'idle',
  '/log': 'idle',
  '/band': 'idle',
}

/** The stage a route stands for, or null where the phone must not appear (the projector, the lab). */
export function routeStage(pathname: string): RoomStage | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return ROUTE_STAGE[path] ?? null
}

export type StageOverride = { stage: RoomStage; pathname: string }

/**
 * A screen's finer stage wins, but only on the route it was set on: navigating away ends it without
 * anyone having to clear it, whatever order the effects run in.
 */
export function effectiveStage(pathname: string, override: StageOverride | null): RoomStage | null {
  const fromRoute = routeStage(pathname)
  if (fromRoute === null) return null
  return override && override.pathname === pathname ? override.stage : fromRoute
}

/** The result to post for the board, or null: sharing off, nothing new, or an old ticket reopened. */
export function resultToPost(
  stored: Stored,
  lastPostedAt: number | null,
  now: number,
): RoomResultRequest | null {
  const last = stored.lastResult
  if (!stored.shareToRoom || !last) return null
  if (last.run.at === lastPostedAt || now - last.run.at > RESULT_FRESH_MS) return null
  const { verdict, score, guessedHandicap } = last.assessment
  return {
    deviceId: stored.deviceId,
    nickname: stored.nickname,
    verdict,
    score,
    mode: last.mode,
    // The stored result keeps only the app's guess at the handicap, and only in demo mode. An example
    // run had no handicap at all, so it never carries one onto "Dizziest after the handicap".
    ...(last.mode === 'demo' && last.reference.kind === 'personal' && guessedHandicap ? { handicap: guessedHandicap } : {}),
  }
}

export type HeartbeatDeps = {
  send: (stage: RoomStage) => void
  isHidden: () => boolean
  intervalMs?: number
}

export type Heartbeat = {
  setStage: (stage: RoomStage | null) => void // null stops beating
  visibilityChanged: () => void
  stop: () => void
}

// Beats at once on every stage change, then every interval while visible. Hidden tabs stay silent.
export function createHeartbeat(deps: HeartbeatDeps): Heartbeat {
  const intervalMs = deps.intervalMs ?? HEARTBEAT_MS
  let stage: RoomStage | null = null
  let timer: ReturnType<typeof setTimeout> | undefined

  const clear = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }

  const beat = () => {
    clear()
    if (stage === null || deps.isHidden()) return
    deps.send(stage)
    timer = setTimeout(beat, intervalMs)
  }

  return {
    setStage(next) {
      if (next === stage) return
      stage = next
      beat()
    },
    visibilityChanged() {
      if (deps.isHidden()) clear()
      else beat()
    },
    stop() {
      stage = null
      clear()
    },
  }
}
