// CARD 8. In-memory limits on Claude calls (D11): per device, per client IP, and global ceilings.
// The whole room may share one venue IP, so the per-IP limits are wide and the global ones protect
// the shared budget. Fixed windows that start at the first call; a redeploy resets them (D6).
export { clientIp } from './client-ip'

export const LIMITS = {
  perDevicePerHour: 12,
  perIpPerHour: 2000,
  perIpPerMinute: 150,
  globalPerMinute: 200,
  perDay: 6000,
}

export type Limits = typeof LIMITS

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const SWEEP_EVERY_MS = MINUTE_MS

type Window = { start: number; count: number }

export type LimitResult =
  | { ok: true }
  | { ok: false; reason: 'device_limit' | 'ip_limit' | 'ip_minute_limit' | 'minute_limit' | 'daily_limit' }

export type Limiter = {
  // Counts one Claude call against every limit, or refuses without counting anything.
  take(deviceId: string, ip: string): LimitResult
  // For tests: how many keys are still held in memory.
  size(): { devices: number; ips: number }
}

export function createLimiter(now: () => number = Date.now, limits: Limits = LIMITS): Limiter {
  const devices = new Map<string, Window>()
  const ipsHour = new Map<string, Window>()
  const ipsMinute = new Map<string, Window>()
  let day: Window = { start: now(), count: 0 }
  let minute: Window = { start: now(), count: 0 }
  let lastSweep = now()

  const current = (map: Map<string, Window>, key: string, t: number, span: number): Window | undefined => {
    const w = map.get(key)
    return w && t - w.start < span ? w : undefined
  }

  const bump = (map: Map<string, Window>, key: string, w: Window | undefined, t: number) => {
    if (w) w.count += 1
    else map.set(key, { start: t, count: 1 })
  }

  // Drops expired windows so a stream of one-off devices or IPs cannot grow the maps forever.
  // Keys are only added on an allowed call, so the global limits also cap the map sizes.
  const sweep = (t: number) => {
    if (t - lastSweep < SWEEP_EVERY_MS) return
    lastSweep = t
    const spans: Array<[Map<string, Window>, number]> = [
      [devices, HOUR_MS],
      [ipsHour, HOUR_MS],
      [ipsMinute, MINUTE_MS],
    ]
    for (const [map, span] of spans) {
      for (const [key, w] of map) if (t - w.start >= span) map.delete(key)
    }
  }

  return {
    take(deviceId, ip) {
      const t = now()
      sweep(t)
      if (t - day.start >= DAY_MS) day = { start: t, count: 0 }
      if (t - minute.start >= MINUTE_MS) minute = { start: t, count: 0 }

      const device = current(devices, deviceId, t, HOUR_MS)
      const ipHour = current(ipsHour, ip, t, HOUR_MS)
      const ipMinute = current(ipsMinute, ip, t, MINUTE_MS)
      if (day.count >= limits.perDay) return { ok: false, reason: 'daily_limit' }
      if (minute.count >= limits.globalPerMinute) return { ok: false, reason: 'minute_limit' }
      if (ipHour && ipHour.count >= limits.perIpPerHour) return { ok: false, reason: 'ip_limit' }
      if (ipMinute && ipMinute.count >= limits.perIpPerMinute) return { ok: false, reason: 'ip_minute_limit' }
      if (device && device.count >= limits.perDevicePerHour) return { ok: false, reason: 'device_limit' }

      day.count += 1
      minute.count += 1
      bump(ipsHour, ip, ipHour, t)
      bump(ipsMinute, ip, ipMinute, t)
      bump(devices, deviceId, device, t)
      return { ok: true }
    },
    size: () => ({ devices: devices.size, ips: ipsHour.size }),
  }
}
