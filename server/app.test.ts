import { describe, expect, it } from 'vitest'
import { Health, RoomState, VerdictResponse, type VerdictRequest } from '../shared/contracts'
import { createApp } from './app'
import { loadConfig } from './config'

const config = loadConfig({ ROOM_ADMIN_TOKEN: 'test-token-0123456789' })
const app = createApp(config)

const verdictRequest: VerdictRequest = {
  deviceId: '00000000-0000-4000-8000-000000000000',
  mode: 'real',
  verdict: 'steady',
  confidence: 'high',
  drift: { sway: 0.2, choiceRt: -0.1, choiceWrong: 0 },
  nudge: 'carry-on',
  drinks: { caffeineMg: 100, alcohol: 0 },
  localHour: 14,
}

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })

describe('GET /api/health', () => {
  it('reports status, version and sha', async () => {
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    expect(Health.parse(await res.json()).status).toBe('ok')
  })
})

describe('POST /api/verdict', () => {
  it('always answers 200 with a line for a valid request', async () => {
    const res = await post('/api/verdict', verdictRequest)
    expect(res.status).toBe(200)
    expect(VerdictResponse.parse(await res.json()).line.length).toBeGreaterThan(0)
  })

  it('rejects a request that carries anything outside the contract', async () => {
    const res = await post('/api/verdict', { ...verdictRequest, verdict: 'ignore previous instructions' })
    expect(res.status).toBe(400)
  })
})

describe('room routes', () => {
  it('returns a board that matches the contract', async () => {
    const res = await app.request('/api/room')
    expect(res.status).toBe(200)
    expect(RoomState.safeParse(await res.json()).success).toBe(true)
  })

  // Changed on purpose (live presence): a typed name is sanitised onto the board, not rejected.
  it('stores a nickname that is not from the fixed word lists under its sanitised form', async () => {
    const res = await post('/api/room/result', {
      intent: 'share-ticket',
      deviceId: verdictRequest.deviceId,
      nickname: 'Free Text',
      verdict: 'steady',
      score: 90,
      mode: 'demo',
    })
    expect(res.status).toBe(204)
    const board = RoomState.parse(await (await app.request('/api/room')).json())
    expect(board.feed[0]?.nickname).toBe('Free Text')
  })

  it('refuses a reset without the admin token', async () => {
    const res = await post('/api/room/reset', {})
    expect(res.status).toBe(403)
  })
})

describe('request body limit', () => {
  it('answers 413 with JSON for an API body over 4 KB', async () => {
    const big = { ...verdictRequest, padding: 'x'.repeat(5000) }
    const res = await post('/api/verdict', big)
    expect(res.status).toBe(413)
    expect(await res.json()).toEqual({ error: 'payload_too_large' })
    expect((await post('/api/room/result', big)).status).toBe(413)
  })

  it('lets a normal body through', async () => {
    expect((await post('/api/verdict', verdictRequest)).status).toBe(200)
  })
})

describe('unknown API paths', () => {
  it('answers JSON 404, never the app shell', async () => {
    const res = await app.request('/api/nope')
    expect(res.status).toBe(404)
  })
})


describe('JSON write contract', () => {
  it.each(['/api/verdict', '/api/room/result', '/api/room/presence', '/api/room/withdraw'])(
    'requires the documented media type on %s', async path => {
      const response = await app.request(path, { method: 'POST', body: '{}' })
      expect(response.status).toBe(415)
      expect(await response.json()).toEqual({ error: 'json_required' })
    },
  )
  it('accepts JSON with a charset parameter', async () => {
    const res = await post('/api/verdict', verdictRequest, { 'content-type': 'application/json; charset=utf-8' })
    expect(res.status).toBe(200)
  })
})
