import { describe, expect, it } from 'vitest'
import { loadConfig } from './config'

describe('loadConfig VERDICT_MODEL', () => {
  it('defaults to haiku and accepts sonnet', () => {
    expect(loadConfig({}).verdictModel).toBe('claude-haiku-5-5')
    expect(loadConfig({ VERDICT_MODEL: 'claude-sonnet-5-5' }).verdictModel).toBe('claude-sonnet-5-5')
  })

  it('refuses to boot with a model outside the allowlist', () => {
    for (const model of ['claude-opus-5-5', 'claude-haiku-5-5-latest', 'gpt-whatever']) {
      expect(() => loadConfig({ VERDICT_MODEL: model })).toThrow(/VERDICT_MODEL must be one of/)
    }
  })
})

describe('loadConfig ROOM_NAMES', () => {
  it('defaults to typed and accepts generated', () => {
    expect(loadConfig({}).roomNames).toBe('typed')
    expect(loadConfig({ ROOM_NAMES: '' }).roomNames).toBe('typed')
    expect(loadConfig({ ROOM_NAMES: 'generated' }).roomNames).toBe('generated')
  })

  it('refuses to boot with any other value', () => {
    for (const value of ['Generated', 'off', 'true', 'none']) {
      expect(() => loadConfig({ ROOM_NAMES: value })).toThrow(/ROOM_NAMES must be one of/)
    }
  })
})

describe('proxy and paid-call policies', () => {
  it('defaults to zero paid calls and no trusted peers', () => {
    expect(loadConfig({})).toMatchObject({ verdictDailyCallLimit: 0, trustedProxyIps: [] })
  })
  it('canonicalizes configured peers and rejects ambiguous network rules', () => {
    expect(loadConfig({ TRUSTED_PROXY_IPS: '192.0.2.2, 2001:0DB8::1' }).trustedProxyIps)
      .toEqual(['192.0.2.2', '2001:db8::1'])
    expect(() => loadConfig({ TRUSTED_PROXY_IPS: '0.0.0.0/0' })).toThrow()
  })
  it('rejects quotas outside the original global ceiling', () => {
    for (const invalid of ['-1', '6001', '1.5']) {
      expect(() => loadConfig({ VERDICT_DAILY_CALL_LIMIT: invalid })).toThrow()
    }
  })
})
