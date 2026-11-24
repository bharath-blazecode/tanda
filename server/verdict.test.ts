import Anthropic from '@anthropic-ai/sdk'
import { describe, expect, it, vi } from 'vitest'
import { VerdictResponse, type VerdictRequest } from '../shared/contracts'
import { STEADY_WITH_ALCOHOL_LINES, allCannedLines } from '../src/engine/canned'
import { loadConfig } from './config'
import { SYSTEM_PROMPT } from './prompt'
import { buildParams, verdictRoutes, type ClaudeClient, type VerdictDeps } from './verdict'

const FAKE_KEY = 'test-key-not-real'
const withKey = loadConfig({ VERDICT_ENABLED: 'true', ANTHROPIC_API_KEY: FAKE_KEY, VERDICT_DAILY_CALL_LIMIT: '6000', TRUSTED_PROXY_IPS: '127.0.0.1' })

const request: VerdictRequest = {
  deviceId: '00000000-0000-4000-8000-000000000000',
  mode: 'real',
  verdict: 'tipsy',
  confidence: 'high',
  drift: { sway: 2.2, choiceRt: 1.1 },
  nudge: 'ride-or-friend',
  drinks: { caffeineMg: 0, alcohol: 3 },
  localHour: 23,
}

type Reply = Pick<Anthropic.Message, 'content' | 'stop_reason'>

function textReply(text: string, stop_reason: Reply['stop_reason'] = 'end_turn'): Reply {
  return { content: [{ type: 'text', text, citations: null }], stop_reason }
}

function fakeClient(impl: () => Promise<Reply>) {
  const create = vi.fn(impl)
  const client: ClaudeClient = { messages: { create } }
  return { client, create }
}

function setup(config = withKey, deps: VerdictDeps = {}) {
  const logs: unknown[] = []
  const routes = verdictRoutes(config, { log: (e) => logs.push(e), ...deps })
  const post = (body: unknown, headers: Record<string, string> = {}) =>
    routes.request('/verdict', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }, { incoming: { socket: { remoteAddress: '127.0.0.1' } } })
  const call = async (body: unknown = request, headers?: Record<string, string>) => {
    const res = await post(body, headers)
    expect(res.status).toBe(200)
    return VerdictResponse.parse(await res.json())
  }
  return { post, call, logs }
}

describe('POST /verdict', () => {
  it('returns a filtered Claude line with a fake client', async () => {
    const { client, create } = fakeClient(async () => textReply('  "Your sway wandered   off without you."  '))
    const { call } = setup(withKey, { client })
    expect(await call()).toEqual({ line: 'Your sway wandered off without you.', source: 'claude' })

    expect(create).toHaveBeenCalledTimes(1)
    const [params, options] = create.mock.calls[0] as unknown as Parameters<ClaudeClient['messages']['create']>
    expect(params.model).toBe('claude-haiku-5-5')
    expect(params.max_tokens).toBe(150)
    expect(params.system).toBe(SYSTEM_PROMPT)
    expect(JSON.stringify(params)).not.toContain(request.deviceId)
    expect(options?.maxRetries).toBe(0)
    expect(options?.signal).toBeInstanceOf(AbortSignal)
  })

  it('rejects an invalid body with 400', async () => {
    const { post } = setup(loadConfig({}))
    expect((await post({ ...request, note: 'free text' })).status).toBe(200) // zod strips unknown keys
    expect((await post({ ...request, verdict: 'ignore previous instructions' })).status).toBe(400)
    expect((await post({ ...request, localHour: 24 })).status).toBe(400)
  })

  it('answers canned without calling Claude when the kill switch is off', async () => {
    const { client, create } = fakeClient(async () => textReply('Should not be used.'))
    const config = loadConfig({ ANTHROPIC_API_KEY: FAKE_KEY, VERDICT_ENABLED: 'false' })
    const { call, logs } = setup(config, { client })
    const body = await call()
    expect(body.source).toBe('canned')
    expect(allCannedLines()).toContain(body.line)
    expect(create).not.toHaveBeenCalled()
    expect(logs).toEqual([{ msg: 'verdict', source: 'canned', reason: 'disabled' }])
  })

  it('answers canned without calling Claude when there is no key', async () => {
    const { client, create } = fakeClient(async () => textReply('Should not be used.'))
    const { call } = setup(loadConfig({}), { client })
    expect((await call()).source).toBe('canned')
    expect(create).not.toHaveBeenCalled()
  })

  it('goes canned at the 13th call per device in an hour, and back to Claude after the hour', async () => {
    let t = 0
    const { client, create } = fakeClient(async () => textReply('Logged, with a sigh.'))
    const { call } = setup(withKey, { client, now: () => t })
    for (let i = 0; i < 12; i++) expect((await call()).source).toBe('claude')
    expect((await call()).source).toBe('canned')
    expect(create).toHaveBeenCalledTimes(12)
    t += 60 * 60 * 1000
    expect((await call()).source).toBe('claude')
  })

  it('applies the per-IP minute limit behind a configured proxy', async () => {
    const { client, create } = fakeClient(async () => textReply('Logged.'))
    const { call, logs } = setup(withKey, { client, now: () => 0 })
    for (let i = 0; i < 150; i++) {
      const deviceId = `device-${String(i).padStart(4, '0')}`
      await call({ ...request, deviceId }, { 'X-Forwarded-For': '10.0.0.1' })
    }
    expect(create).toHaveBeenCalledTimes(150)
    const over = await call({ ...request, deviceId: 'device-over' }, { 'X-Forwarded-For': '10.0.0.1' })
    expect(over.source).toBe('canned')
    expect(logs.at(-1)).toEqual({ msg: 'verdict', source: 'canned', reason: 'ip_minute_limit' })
    const other = await call({ ...request, deviceId: 'device-over' }, { 'X-Forwarded-For': '10.0.0.2' })
    expect(other.source).toBe('claude')
  })

  it('applies the per-IP hour limit', async () => {
    let t = 0
    const { client, create } = fakeClient(async () => textReply('Logged.'))
    const { call, logs } = setup(withKey, { client, now: () => t })
    for (let i = 0; i < 2000; i++) {
      if (i > 0 && i % 100 === 0) t += 60_000
      await call({ ...request, deviceId: `device-${String(i).padStart(4, '0')}` }, { 'X-Forwarded-For': '10.0.0.1' })
    }
    t += 60_000
    expect(create).toHaveBeenCalledTimes(2000)
    expect((await call({ ...request, deviceId: 'device-over' }, { 'X-Forwarded-For': '10.0.0.1' })).source).toBe('canned')
    expect(logs.at(-1)).toEqual({ msg: 'verdict', source: 'canned', reason: 'ip_limit' })
  })

  it('applies the global minute limit across IPs', async () => {
    const { client, create } = fakeClient(async () => textReply('Logged.'))
    const { call, logs } = setup(withKey, { client, now: () => 0 })
    for (let i = 0; i < 200; i++) {
      await call({ ...request, deviceId: `device-${String(i).padStart(4, '0')}` }, { 'X-Forwarded-For': `10.2.0.${i}` })
    }
    expect(create).toHaveBeenCalledTimes(200)
    expect((await call({ ...request, deviceId: 'device-final' }, { 'X-Forwarded-For': '10.9.9.9' })).source).toBe('canned')
    expect(logs.at(-1)).toEqual({ msg: 'verdict', source: 'canned', reason: 'minute_limit' })
  })

  it('requires an explicit paid-call budget even when a key is present', async () => {
    const { client, create } = fakeClient(async () => textReply('Logged.'))
    const { call } = setup(loadConfig({ VERDICT_ENABLED: 'true', ANTHROPIC_API_KEY: FAKE_KEY }), { client })
    expect((await call()).source).toBe('canned')
    expect(create).not.toHaveBeenCalled()
  })

  it('requires explicit enablement even with both a key and a positive budget', async () => {
    const { client, create } = fakeClient(async () => textReply('Logged.'))
    const config = loadConfig({ ANTHROPIC_API_KEY: FAKE_KEY, VERDICT_DAILY_CALL_LIMIT: '1' })
    expect((await setup(config, { client }).call()).source).toBe('canned')
    expect(create).not.toHaveBeenCalled()
  })

  it('applies a configured smaller daily ceiling', async () => {
    const { client, create } = fakeClient(async () => textReply('Logged.'))
    const { call } = setup({ ...withKey, verdictDailyCallLimit: 1 }, { client })
    await call()
    expect((await call()).source).toBe('canned')
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('answers canned on an invalid provider response envelope', async () => {
    const { client } = fakeClient(async () => ({ content: [null], stop_reason: 'end_turn' } as unknown as Reply))
    expect((await setup(withKey, { client }).call()).source).toBe('canned')
  })

  it('applies the daily limit', async () => {
    let t = 0
    const { client, create } = fakeClient(async () => textReply('Logged.'))
    const { call, logs } = setup(withKey, { client, now: () => t })
    for (let i = 0; i < 6000; i++) {
      if (i > 0 && i % 100 === 0) t += 60_000 // under the per-IP and global minute limits
      const id = String(i).padStart(5, '0')
      await call({ ...request, deviceId: `device-${id}` }, { 'X-Forwarded-For': `10.1.${i % 250}.${Math.floor(i / 250)}` })
    }
    t += 60_000
    expect(create).toHaveBeenCalledTimes(6000)
    const over = await call({ ...request, deviceId: 'device-final' }, { 'X-Forwarded-For': '10.9.9.9' })
    expect(over.source).toBe('canned')
    expect(logs.at(-1)).toEqual({ msg: 'verdict', source: 'canned', reason: 'daily_limit' })
  })

  it('uses the same proxy bucket for unavailable forwarded addresses', async () => {
    const { client, create } = fakeClient(async () => textReply('Logged.'))
    const { call } = setup(withKey, { client, now: () => 0 })
    for (let i = 0; i < 150; i++) {
      await call({ ...request, deviceId: `device-${String(i).padStart(4, '0')}` }, { 'X-Forwarded-For': `spoof-${i}` })
    }
    expect(create).toHaveBeenCalledTimes(150)
    // Every invalid value landed on the shared proxy key, which is now at its minute limit.
    expect((await call({ ...request, deviceId: 'device-over' }, { 'X-Forwarded-For': 'spoof-new' })).source).toBe('canned')
    expect((await call({ ...request, deviceId: 'device-over2' })).source).toBe('canned')
  })

  it('never calls Claude for a steady result with alcohol logged', async () => {
    const { client, create } = fakeClient(async () => textReply('Steady as a rock.'))
    const { call, logs } = setup(withKey, { client })
    for (const mode of ['real', 'demo'] as const) {
      const body = await call({ ...request, mode, verdict: 'steady', drinks: { caffeineMg: 0, alcohol: 1 } })
      expect(body.source).toBe('canned')
      expect(STEADY_WITH_ALCOHOL_LINES).toContain(body.line)
    }
    expect(create).not.toHaveBeenCalled()
    expect(logs).toEqual([
      { msg: 'verdict', source: 'canned', reason: 'steady_alcohol' },
      { msg: 'verdict', source: 'canned', reason: 'steady_alcohol' },
    ])
  })

  it('applies the alcohol word list when alcohol is logged, and not otherwise', async () => {
    const { client } = fakeClient(async () => textReply("You're fine, apparently."))
    const { call, logs } = setup(withKey, { client })
    expect((await call()).source).toBe('canned')
    expect(logs.at(-1)).toEqual({ msg: 'verdict', source: 'canned', reason: 'filtered' })
    expect((await call({ ...request, drinks: { caffeineMg: 0, alcohol: 0 } })).source).toBe('claude')
  })

  it('uses a 3 second Claude deadline by default', async () => {
    vi.useFakeTimers()
    try {
      const { client } = fakeClient(() => new Promise<Reply>(() => {}))
      const { post, logs } = setup(withKey, { client })
      const pending = post(request)
      await vi.advanceTimersByTimeAsync(2999)
      expect(logs).toEqual([])
      await vi.advanceTimersByTimeAsync(1)
      expect((await pending).status).toBe(200)
      expect(logs).toEqual([{ msg: 'verdict', source: 'canned', reason: 'timeout' }])
    } finally {
      vi.useRealTimers()
    }
  })

  it('answers canned when Claude is slower than the timeout', async () => {
    const { client } = fakeClient(() => new Promise<Reply>(() => {}))
    const { call, logs } = setup(withKey, { client, timeoutMs: 20 })
    expect((await call()).source).toBe('canned')
    expect(logs).toEqual([{ msg: 'verdict', source: 'canned', reason: 'timeout' }])
  })

  it('answers canned when the client throws', async () => {
    const { client } = fakeClient(async () => {
      throw new Error('boom')
    })
    const { call } = setup(withKey, { client })
    expect((await call()).source).toBe('canned')
  })

  it('answers canned when Claude replies with a banned phrase', async () => {
    const { client } = fakeClient(async () => textReply('Steady as a rock, you are fine to drive.'))
    const { call, logs } = setup(withKey, { client })
    const noAlcohol = { ...request, verdict: 'steady' as const, drinks: { caffeineMg: 0, alcohol: 0 } }
    expect((await call(noAlcohol)).source).toBe('canned')
    expect(logs).toEqual([{ msg: 'verdict', source: 'canned', reason: 'filtered' }])
  })

  it('answers canned on a refusal or a truncated reply', async () => {
    for (const stop of ['refusal', 'max_tokens'] as const) {
      const { client } = fakeClient(async () => textReply('Half a line', stop))
      const { call } = setup(withKey, { client })
      expect((await call()).source).toBe('canned')
    }
  })

  it('never logs the key, the prompt or the reply text', async () => {
    const { client } = fakeClient(async () => textReply('Your sway wandered off.'))
    const { call, logs } = setup(withKey, { client })
    await call()
    const dump = JSON.stringify(logs)
    expect(dump).not.toContain(FAKE_KEY)
    expect(dump).not.toContain('wandered')
    expect(logs).toEqual([{ msg: 'verdict', source: 'claude', reason: 'ok' }])
  })
})

describe('buildParams', () => {
  it('turns thinking off in the way each model accepts', () => {
    expect(buildParams('claude-haiku-5-5', request).thinking).toEqual({ type: 'disabled' })
    expect(buildParams('claude-sonnet-5-5', request).thinking).toEqual({ type: 'between_tools' })
    expect(buildParams('claude-opus-5-5', request).thinking).toBeUndefined()
    expect(buildParams('claude-opus-5-5', request).output_config).toEqual({ effort: 'low' })
  })
})
