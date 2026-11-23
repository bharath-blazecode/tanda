// CARD 8, "The bird's voice". POST /api/verdict: one short Claude line for the ticket, or a canned one.
// See docs/05-architecture.md ("Server limits", "Voice") and DECISIONS.md D8 to D12.
//
// - Always answer 200 with a line for a valid body. Kill switch, no key, over a limit, timeout,
//   API error or an unusable reply all give source 'canned' (D12).
// - The request carries numbers and closed enums only. No free text reaches Claude (D9).
// - Only this file may read config.anthropicApiKey. Logs carry { msg, source, reason } and nothing else.
import Anthropic from '@anthropic-ai/sdk'
import { Hono } from 'hono'
import { VerdictRequest, type VerdictResponse } from '../shared/contracts'
import { STEADY_WITH_ALCOHOL_LINES, cannedLine } from '../src/engine/canned'
import type { Config } from './config'
import { requestClientIp } from './client-ip'
import { LIMITS, createLimiter, type Limiter } from './limits'
import { SYSTEM_PROMPT, buildUserMessage, filterLine } from './prompt'

// Well under the client's 4 s so the phone gets our answer, even a canned one, on slow venue wifi.
const CLAUDE_TIMEOUT_MS = 3000
const MAX_TOKENS = 150

type ClaudeReply = Pick<Anthropic.Message, 'content' | 'stop_reason'>

// The slice of the SDK client this route uses, so tests can pass a fake without a key or network.
export type ClaudeClient = {
  messages: {
    create(
      body: Anthropic.MessageCreateParamsNonStreaming,
      options?: { signal?: AbortSignal; timeout?: number; maxRetries?: number },
    ): PromiseLike<ClaudeReply>
  }
}

export type VerdictDeps = {
  client?: ClaudeClient
  now?: () => number
  timeoutMs?: number
  random?: () => number
  log?: (entry: { msg: string; source: VerdictResponse['source']; reason: string }) => void
}

// D8 asks for thinking off. Haiku 5.5 accepts 'disabled' at low effort; Sonnet 5.5 only turns it off
// with 'between_tools'; Opus 5.5 cannot turn it off at all, so it just runs at low effort.
function thinkingFor(model: string): Anthropic.ThinkingConfigParam | undefined {
  if (model.startsWith('claude-haiku')) return { type: 'disabled' }
  if (model.startsWith('claude-sonnet-5-5')) return { type: 'between_tools' }
  return undefined
}

export function buildParams(model: string, req: VerdictRequest): Anthropic.MessageCreateParamsNonStreaming {
  const thinking = thinkingFor(model)
  return {
    model,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(req) }],
    output_config: { effort: 'low' },
    ...(thinking ? { thinking } : {}),
  }
}

type Outcome = { line: string } | { reason: string }

async function askClaude(client: ClaudeClient, model: string, req: VerdictRequest, timeoutMs: number): Promise<Outcome> {
  const controller = new AbortController()
  let timedOut = false
  let timer: ReturnType<typeof setTimeout> | undefined
  // The race guarantees the deadline even if the SDK (or a fake) ignores the abort signal.
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true
      controller.abort()
      reject(new Error('timeout'))
    }, timeoutMs)
  })

  let reply: ClaudeReply
  try {
    reply = await Promise.race([
      client.messages.create(buildParams(model, req), {
        signal: controller.signal,
        timeout: timeoutMs,
        maxRetries: 0,
      }),
      deadline,
    ])
  } catch (error) {
    if (timedOut || error instanceof Anthropic.APIConnectionTimeoutError) return { reason: 'timeout' }
    if (error instanceof Anthropic.RateLimitError) return { reason: 'upstream_rate_limit' }
    if (error instanceof Anthropic.APIError) return { reason: `api_error_${error.status ?? 'none'}` }
    return { reason: 'error' }
  } finally {
    clearTimeout(timer)
  }

  // A refusal or a reply cut off at max_tokens is not a line we want on a ticket.
  if (!reply || !Array.isArray(reply.content)) return { reason: 'invalid_reply' }
  if (reply.stop_reason !== 'end_turn' && reply.stop_reason !== 'stop_sequence') {
    return { reason: 'incomplete_reply' }
  }
  if (reply.content.some(block => !block || block.type !== 'text' || typeof block.text !== 'string'))
    return { reason: 'invalid_reply' }
  const text = reply.content
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join(' ')
  const line = filterLine(text, { alcohol: req.drinks.alcohol > 0 })
  return line ? { line } : { reason: 'filtered' }
}

export function verdictRoutes(config: Config, deps: VerdictDeps = {}) {
  const routes = new Hono()
  const limiter: Limiter = createLimiter(deps.now ?? Date.now, { ...LIMITS, perDay: config.verdictDailyCallLimit })
  const timeoutMs = deps.timeoutMs ?? CLAUDE_TIMEOUT_MS
  const random = deps.random ?? Math.random
  const log = deps.log ?? ((entry) => console.log(JSON.stringify(entry)))
  const apiKey = config.anthropicApiKey
  const client: ClaudeClient | undefined =
    deps.client ?? (apiKey ? new Anthropic({ apiKey, maxRetries: 0, timeout: timeoutMs }) : undefined)

  routes.post('/verdict', async (c) => {
    const parsed = VerdictRequest.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json({ error: 'bad_request' }, 400)
    const req = parsed.data

    const pick = Math.floor(random() * 1000)
    const reply = (line: string, reason: string) => {
      log({ msg: 'verdict', source: 'canned', reason })
      const body: VerdictResponse = { line, source: 'canned' }
      return c.json(body)
    }
    const canned = (reason: string) =>
      reply(
        cannedLine(req.verdict, req.mode, pick, { handicap: req.handicap, alcohol: req.drinks.alcohol, reference: req.reference }),
        reason,
      )

    // Steady with alcohol is the one screen where a reassuring line would be dangerous, so Claude
    // never writes it: the fixed non-clearance lines answer, in either mode.
    if (req.verdict === 'steady' && req.drinks.alcohol > 0) {
      return reply(STEADY_WITH_ALCOHOL_LINES[pick % STEADY_WITH_ALCOHOL_LINES.length], 'steady_alcohol')
    }

    if (!config.verdictEnabled) return canned('disabled')
    if (!apiKey || !client) return canned('no_key')

    const allowed = limiter.take(req.deviceId, requestClientIp(c, config.trustedProxyIps))
    if (!allowed.ok) return canned(allowed.reason)

    const outcome = await askClaude(client, config.verdictModel, req, timeoutMs)
    if ('reason' in outcome) return canned(outcome.reason)

    log({ msg: 'verdict', source: 'claude', reason: 'ok' })
    const body: VerdictResponse = { line: outcome.line, source: 'claude' }
    return c.json(body)
  })

  return routes
}
