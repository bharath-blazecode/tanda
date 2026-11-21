// Per-device gates for the room routes. The per-IP limiter alone lets one device spend the bucket the
// whole venue shares, and lets one script pose as hundreds of people. Throttled requests are answered
// like accepted ones (204) by the routes: a real phone never hits these, so there is nothing to tell it.
// Time comes in as an argument. Every map expires with its window and has a hard cap.

export const RESULT_GAP_MS = 15_000
export const NEW_DEVICES_PER_IP = 800 // a whole auditorium can arrive from one venue IP
export const NEW_DEVICE_WINDOW_MS = 10 * 60_000
export const MAX_TRACKED_DEVICES = 20_000
export const MAX_TRACKED_IPS = 10_000

export type RoomThrottleOptions = {
  resultGapMs?: number
  newDevicesPerIp?: number
  newDeviceWindowMs?: number
  maxDevices?: number
  maxIps?: number
}

export type RoomThrottle = {
  // False for a never-seen deviceId once its IP has admitted its quota of new ones in the window.
  admit(ip: string, deviceId: string, now: number): boolean
  // False when this device had a result accepted within the gap.
  takeResult(deviceId: string, now: number): boolean
  // For tests: how many keys each map holds.
  size(): { seen: number; ips: number; results: number }
}

type Window = { start: number; count: number }

export function createRoomThrottle({
  resultGapMs = RESULT_GAP_MS,
  newDevicesPerIp = NEW_DEVICES_PER_IP,
  newDeviceWindowMs = NEW_DEVICE_WINDOW_MS,
  maxDevices = MAX_TRACKED_DEVICES,
  maxIps = MAX_TRACKED_IPS,
}: RoomThrottleOptions = {}): RoomThrottle {
  // Each map is re-inserted on update, so Map order is oldest first and expiry only looks at the front.
  const seen = new Map<string, number>() // deviceId -> last request
  const fresh = new Map<string, Window>() // ip -> new identities admitted in the current window
  const lastResult = new Map<string, number>() // deviceId -> last accepted result

  const trim = <V>(map: Map<string, V>, isOld: (value: V) => boolean, cap: number) => {
    for (const [key, value] of map) {
      if (map.size <= cap && !isOld(value)) break
      map.delete(key)
    }
  }

  return {
    admit(ip, deviceId, now) {
      trim(seen, (t) => now - t >= newDeviceWindowMs, maxDevices)
      trim(fresh, (w) => now - w.start >= newDeviceWindowMs, maxIps)
      if (seen.has(deviceId)) {
        seen.delete(deviceId)
        seen.set(deviceId, now)
        return true
      }
      let window = fresh.get(ip)
      if (!window) {
        window = { start: now, count: 0 }
        fresh.set(ip, window)
      }
      if (window.count >= newDevicesPerIp) return false
      window.count++
      seen.set(deviceId, now)
      trim(seen, () => false, maxDevices)
      trim(fresh, () => false, maxIps)
      return true
    },

    takeResult(deviceId, now) {
      trim(lastResult, (t) => now - t >= resultGapMs, maxDevices)
      if (lastResult.has(deviceId)) return false
      lastResult.set(deviceId, now)
      trim(lastResult, () => false, maxDevices)
      return true
    },

    size: () => ({ seen: seen.size, ips: fresh.size, results: lastResult.size }),
  }
}
