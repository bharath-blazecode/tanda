import { describe, expect, it } from 'vitest'
import { LIMITS, clientIp, createLimiter } from './limits'

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE

function clock(start = 1_000_000) {
  let t = start
  return { now: () => t, advance: (ms: number) => (t += ms) }
}

describe('createLimiter', () => {
  it('trips the per-device limit at the 13th call in an hour and recovers after the hour', () => {
    const c = clock()
    const limiter = createLimiter(c.now)
    for (let i = 0; i < 12; i++) {
      expect(limiter.take('device-a', 'ip-1').ok).toBe(true)
      c.advance(60 * 1000)
    }
    expect(limiter.take('device-a', 'ip-1')).toEqual({ ok: false, reason: 'device_limit' })
    expect(limiter.take('device-b', 'ip-1').ok).toBe(true)
    c.advance(HOUR)
    expect(limiter.take('device-a', 'ip-1').ok).toBe(true)
  })

  it('uses the agreed defaults', () => {
    expect(LIMITS).toEqual({
      perDevicePerHour: 12,
      perIpPerHour: 2000,
      perIpPerMinute: 150,
      globalPerMinute: 200,
      perDay: 6000,
    })
  })

  it('trips the per-IP minute limit at 150 across devices and recovers after the minute', () => {
    const c = clock()
    const limiter = createLimiter(c.now)
    for (let i = 0; i < 150; i++) expect(limiter.take(`device-${i}`, 'hall').ok).toBe(true)
    expect(limiter.take('device-new', 'hall')).toEqual({ ok: false, reason: 'ip_minute_limit' })
    expect(limiter.take('device-new', 'elsewhere').ok).toBe(true)
    c.advance(MINUTE)
    expect(limiter.take('device-new', 'hall').ok).toBe(true)
  })

  it('trips the per-IP hour limit at 2000 across devices', () => {
    const c = clock()
    const limiter = createLimiter(c.now)
    for (let i = 0; i < 2000; i++) {
      if (i > 0 && i % 100 === 0) c.advance(MINUTE) // stay under both minute limits
      expect(limiter.take(`device-${i}`, 'hall').ok).toBe(true)
    }
    c.advance(MINUTE)
    expect(limiter.take('device-new', 'hall')).toEqual({ ok: false, reason: 'ip_limit' })
    expect(limiter.take('device-new', 'elsewhere').ok).toBe(true)
    c.advance(HOUR)
    expect(limiter.take('device-new', 'hall').ok).toBe(true)
  })

  it('trips the global minute limit at 200 across IPs', () => {
    const c = clock()
    const limiter = createLimiter(c.now)
    for (let i = 0; i < 200; i++) expect(limiter.take(`d-${i}`, `ip-${i}`).ok).toBe(true)
    expect(limiter.take('d-x', 'ip-x')).toEqual({ ok: false, reason: 'minute_limit' })
    c.advance(MINUTE)
    expect(limiter.take('d-x', 'ip-x').ok).toBe(true)
  })

  it('trips the daily limit at 6000 and resets after a day', () => {
    const c = clock()
    const limiter = createLimiter(c.now)
    for (let i = 0; i < 6000; i++) {
      if (i > 0 && i % 200 === 0) c.advance(MINUTE)
      expect(limiter.take(`d-${i}`, `ip-${i}`).ok).toBe(true)
    }
    c.advance(MINUTE)
    expect(limiter.take('d-x', 'ip-x')).toEqual({ ok: false, reason: 'daily_limit' })
    c.advance(24 * HOUR)
    expect(limiter.take('d-x', 'ip-x').ok).toBe(true)
  })

  it('does not count a refused call against the other limits', () => {
    const c = clock()
    const limiter = createLimiter(c.now, {
      perDevicePerHour: 1,
      perIpPerHour: 2,
      perIpPerMinute: 2,
      globalPerMinute: 100,
      perDay: 100,
    })
    expect(limiter.take('a', 'ip').ok).toBe(true)
    expect(limiter.take('a', 'ip').ok).toBe(false) // device refused, ip stays at 1
    expect(limiter.take('b', 'ip').ok).toBe(true)
  })

  it('drops expired windows so the maps do not grow without bound', () => {
    const c = clock()
    const limiter = createLimiter(c.now)
    for (let i = 0; i < 50; i++) limiter.take(`d-${i}`, `ip-${i}`)
    expect(limiter.size()).toEqual({ devices: 50, ips: 50 })
    c.advance(HOUR + 1)
    limiter.take('fresh', 'fresh-ip')
    expect(limiter.size()).toEqual({ devices: 1, ips: 1 })
  })
})

describe('clientIp', () => {
  const headers = (h: Record<string, string>) => (name: string) => h[name]

  it('prefers CF-Connecting-IP', () => {
    expect(clientIp(headers({ 'CF-Connecting-IP': '1.1.1.1', 'X-Forwarded-For': '2.2.2.2' }))).toBe('1.1.1.1')
  })
  it('falls back to the first X-Forwarded-For entry', () => {
    expect(clientIp(headers({ 'X-Forwarded-For': ' 2.2.2.2, 3.3.3.3' }))).toBe('2.2.2.2')
  })
  it('falls back to unknown', () => {
    expect(clientIp(headers({}))).toBe('unknown')
  })
  it('accepts IPv6 addresses', () => {
    expect(clientIp(headers({ 'CF-Connecting-IP': '2001:db8::1' }))).toBe('2001:db8::1')
    expect(clientIp(headers({ 'X-Forwarded-For': '::ffff:192.0.2.1, 10.0.0.1' }))).toBe('::ffff:192.0.2.1')
  })
  it('treats a spoofed value that is not an IP as unknown', () => {
    expect(clientIp(headers({ 'CF-Connecting-IP': 'random-key-1234' }))).toBe('unknown')
    expect(clientIp(headers({ 'X-Forwarded-For': 'evil<script>, 1.1.1.1' }))).toBe('unknown')
    expect(clientIp(headers({ 'X-Forwarded-For': '1'.repeat(46) }))).toBe('unknown')
    expect(clientIp(headers({ 'CF-Connecting-IP': 'not an ip', 'X-Forwarded-For': '2.2.2.2' }))).toBe('unknown')
  })
})
