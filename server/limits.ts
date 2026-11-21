// CARD 8. In-memory limits on Claude calls (D11): per device, per client IP, and a daily ceiling.
// Fixed windows that start at the first call; a redeploy resets them, which is acceptable (D6).
export const LIMITS = {
  perDevicePerHour: 12,
  perIpPerHour: 600,
  perDay: 5000,
}

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const SWEEP_EVERY_MS = 60 * 1000

type Window = { start: number; count: number }

export type LimitResult = { ok: true } | { ok: false; reason: 'device_limit' | 'ip_limit' | 'daily_limit' }

export type Limiter = {
  // Counts one Claude call against every limit, or refuses without counting anything.
  take(deviceId: string, ip: string): LimitResult
  // For tests: how many keys are still held in memory.
  size(): { devices: number; ips: number }
}

export function createLimiter(now: () => number = Date.now, limits = LIMITS): Limiter {
  const devices = new Map<string, Window>()
  const ips = new Map<string, Window>()
  let day: Window = { start: now(), count: 0 }
  let lastSweep = now()

  const current = (map: Map<string, Window>, key: string, t: number): Window | undefined => {
    const w = map.get(key)
    return w && t - w.start < HOUR_MS ? w : undefined
  }

  // Drops expired windows so a stream of one-off devices or IPs cannot grow the maps forever.
  const sweep = (t: number) => {
    if (t - lastSweep < SWEEP_EVERY_MS) return
    lastSweep = t
    for (const map of [devices, ips]) {
      for (const [key, w] of map) if (t - w.start >= HOUR_MS) map.delete(key)
    }
  }

  return {
    take(deviceId, ip) {
      const t = now()
      sweep(t)
      if (t - day.start >= DAY_MS) day = { start: t, count: 0 }

      const device = current(devices, deviceId, t)
      const address = current(ips, ip, t)
      if (day.count >= limits.perDay) return { ok: false, reason: 'daily_limit' }
      if (address && address.count >= limits.perIpPerHour) return { ok: false, reason: 'ip_limit' }
      if (device && device.count >= limits.perDevicePerHour) return { ok: false, reason: 'device_limit' }

      day.count += 1
      if (address) address.count += 1
      else ips.set(ip, { start: t, count: 1 })
      if (device) device.count += 1
      else devices.set(deviceId, { start: t, count: 1 })
      return { ok: true }
    },
    size: () => ({ devices: devices.size, ips: ips.size }),
  }
}

type HeaderReader = (name: string) => string | undefined

// Cloudflare sets CF-Connecting-IP to the real client; X-Forwarded-For is the fallback for other proxies.
export function clientIp(header: HeaderReader): string {
  const cf = header('CF-Connecting-IP')?.trim()
  if (cf) return cf
  const first = header('X-Forwarded-For')?.split(',')[0]?.trim()
  return first || 'unknown'
}
