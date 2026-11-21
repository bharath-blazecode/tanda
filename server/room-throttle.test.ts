import { describe, expect, it } from 'vitest'
import { createRoomThrottle, NEW_DEVICE_WINDOW_MS, RESULT_GAP_MS } from './room-throttle'

const T0 = 1_763_700_000_000

describe('createRoomThrottle', () => {
  it('accepts one result per device every 15 seconds', () => {
    const t = createRoomThrottle()
    expect(t.takeResult('device-a', T0)).toBe(true)
    expect(t.takeResult('device-a', T0 + RESULT_GAP_MS - 1)).toBe(false)
    expect(t.takeResult('device-b', T0 + 1)).toBe(true)
    expect(t.takeResult('device-a', T0 + RESULT_GAP_MS)).toBe(true)
  })

  it('admits a capped number of new devices per IP per window, and seen ones always', () => {
    const t = createRoomThrottle({ newDevicesPerIp: 2 })
    expect(t.admit('ip-1', 'device-a', T0)).toBe(true)
    expect(t.admit('ip-1', 'device-b', T0)).toBe(true)
    expect(t.admit('ip-1', 'device-c', T0)).toBe(false)
    // Refused devices are not remembered as seen, so they stay refused.
    expect(t.admit('ip-1', 'device-c', T0 + 1)).toBe(false)
    expect(t.admit('ip-1', 'device-a', T0 + 1)).toBe(true)
    // A seen device on another IP is not a new identity there.
    expect(t.admit('ip-2', 'device-b', T0 + 1)).toBe(true)
    expect(t.admit('ip-2', 'device-d', T0 + 1)).toBe(true)
    expect(t.admit('ip-1', 'device-c', T0 + NEW_DEVICE_WINDOW_MS)).toBe(true)
  })

  it('keeps its maps bounded by expiry and by cap', () => {
    const t = createRoomThrottle({ maxDevices: 50, maxIps: 20 })
    for (let i = 0; i < 1_000; i++) {
      t.admit(`ip-${i}`, `device-${i}`, T0 + i)
      t.takeResult(`device-${i}`, T0 + i)
    }
    expect(t.size()).toEqual({ seen: 50, ips: 20, results: 50 })
    const later = T0 + NEW_DEVICE_WINDOW_MS + 10_000
    t.admit('ip-x', 'device-x', later)
    t.takeResult('device-x', later)
    expect(t.size()).toEqual({ seen: 1, ips: 1, results: 1 })
  })
})
