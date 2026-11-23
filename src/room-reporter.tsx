// Tells the room board who is here and what they are doing, so the projector moves before the first
// result lands. Renders nothing. Mounted once inside the router; no screen needs to know it exists.
// Only reports when the person said yes to the board (stored.shareToRoom). Reads the store, never writes it.
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router'
import type { RoomStage } from '../shared/contracts'
import { postRoomPresence } from './api/room'
import {
  createHeartbeat,
  effectiveStage,
  type Heartbeat,
  type StageOverride,
} from './room-reporter-logic'
import { load } from './store/local'

let override: StageOverride | null = null
const listeners = new Set<() => void>()

/**
 * A finer stage than the route gives ('stand', 'choice', 'pulse'). It holds until set back to null
 * or until the route changes. Example: `setRoomStage('stand')` when Stand Still starts.
 */
export function setRoomStage(stage: RoomStage | null): void {
  override = stage === null ? null : { stage, pathname: window.location.pathname }
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => void listeners.delete(listener)
}
const getOverride = () => override

export function RoomReporter() {
  const { pathname } = useLocation()
  const current = useSyncExternalStore(subscribe, getOverride, getOverride)
  const stage = effectiveStage(pathname, current)
  const heartbeat = useRef<Heartbeat | null>(null)

  useEffect(() => {
    const beat = createHeartbeat({
      send: (s) => {
        const stored = load()
        if (!stored.shareToRoom) return
        void postRoomPresence({ deviceId: stored.deviceId, nickname: stored.nickname, stage: s })
      },
      isHidden: () => document.visibilityState === 'hidden',
    })
    heartbeat.current = beat
    const onVisibility = () => beat.visibilityChanged()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      beat.stop()
      heartbeat.current = null
    }
  }, [])

  useEffect(() => {
    heartbeat.current?.setStage(stage)
  }, [stage])

  return null
}
