// Reads and validates the environment once, at boot. A bad value stops the server
// before it serves a request, which is easier to notice than a broken route.
import { readFileSync } from 'node:fs'
import { z } from 'zod'
import { canonicalIp } from './client-ip'
import pkg from '../package.json'

export const VERDICT_MODELS = ['claude-haiku-5-5', 'claude-sonnet-5-5'] as const
export const ROOM_NAME_MODES = ['typed', 'generated'] as const
export type RoomNameMode = (typeof ROOM_NAME_MODES)[number]

const Env = z.object({
  TRUSTED_PROXY_IPS: z.string().optional().transform((raw, ctx) => {
    if (!raw) return []
    const ips: string[] = []
    for (const part of raw.split(',')) {
      const ip = canonicalIp(part.trim())
      if (!ip) {
        ctx.addIssue({ code: 'custom', message: 'TRUSTED_PROXY_IPS requires exact IP addresses' })
        return z.NEVER
      }
      ips.push(ip)
    }
    return ips
  }),
  VERDICT_DAILY_CALL_LIMIT: z.coerce.number().int().min(0).max(6000).default(0),
  PORT: z.coerce.number().int().min(1).max(65535).default(3333),
  HOST: z.string().default('0.0.0.0'),
  STATIC_DIR: z.string().default('dist'),
  // Without a key the verdict route answers with canned lines. Nothing breaks (D12).
  ANTHROPIC_API_KEY: z.string().optional(),
  // Allowlist: a dearer model would multiply spend on the shared key and break the 150-token budget.
  VERDICT_MODEL: z
    .enum(VERDICT_MODELS, { error: `VERDICT_MODEL must be one of: ${VERDICT_MODELS.join(', ')}` })
    .default('claude-haiku-5-5'),
  VERDICT_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  // Without a token the room reset route is disabled.
  ROOM_ADMIN_TOKEN: z.string().min(16).optional(),
  // The panic switch: `generated` ignores every typed name and shows only generated nicknames.
  ROOM_NAMES: z
    .enum(ROOM_NAME_MODES, { error: `ROOM_NAMES must be one of: ${ROOM_NAME_MODES.join(', ')}` })
    .default('typed'),
  // Optional durable mirror for the room board. Without it the board lives in memory only.
  // Not validated beyond being a string: a bad URL degrades to memory only, it never stops the boot.
  REDIS_URL: z.string().optional(),
  APP_VERSION: z.string().optional(),
  GIT_SHA: z.string().optional(),
})

export type Config = {
  port: number
  host: string
  staticDir: string
  anthropicApiKey: string | undefined
  verdictModel: (typeof VERDICT_MODELS)[number]
  trustedProxyIps: string[]
  verdictDailyCallLimit: number
  verdictEnabled: boolean
  roomAdminToken: string | undefined
  roomNames: RoomNameMode
  redisUrl: string | undefined
  version: string
  sha: string
}

function shaFromFile(): string | undefined {
  try {
    return readFileSync('.git-sha', 'utf8').trim() || undefined
  } catch {
    return undefined
  }
}

const blankToUndefined = (value: string | undefined) => (value && value.trim() !== '' ? value : undefined)

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const cleaned = Object.fromEntries(Object.entries(env).map(([k, v]) => [k, blankToUndefined(v)]))
  const parsed = Env.parse(cleaned)
  return {
    port: parsed.PORT,
    host: parsed.HOST,
    staticDir: parsed.STATIC_DIR,
    anthropicApiKey: parsed.ANTHROPIC_API_KEY,
    verdictModel: parsed.VERDICT_MODEL,
    trustedProxyIps: parsed.TRUSTED_PROXY_IPS,
    verdictDailyCallLimit: parsed.VERDICT_DAILY_CALL_LIMIT,
    verdictEnabled: parsed.VERDICT_ENABLED,
    roomAdminToken: parsed.ROOM_ADMIN_TOKEN,
    roomNames: parsed.ROOM_NAMES,
    redisUrl: parsed.REDIS_URL,
    version: parsed.APP_VERSION ?? pkg.version,
    // The revision baked into the image identifies the code, including an unknown build.
    sha: shaFromFile() ?? parsed.GIT_SHA ?? 'dev',
  }
}
