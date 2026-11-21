// Reads and validates the environment once, at boot. A bad value stops the server
// before it serves a request, which is easier to notice than a broken route.
import { readFileSync } from 'node:fs'
import { z } from 'zod'
import pkg from '../package.json'

const Env = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3333),
  HOST: z.string().default('0.0.0.0'),
  STATIC_DIR: z.string().default('dist'),
  // Without a key the verdict route answers with canned lines. Nothing breaks (D12).
  ANTHROPIC_API_KEY: z.string().optional(),
  VERDICT_MODEL: z.string().default('claude-haiku-5-5'),
  VERDICT_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  // Without a token the room reset route is disabled.
  ROOM_ADMIN_TOKEN: z.string().min(16).optional(),
  APP_VERSION: z.string().optional(),
  GIT_SHA: z.string().optional(),
})

export type Config = {
  port: number
  host: string
  staticDir: string
  anthropicApiKey: string | undefined
  verdictModel: string
  verdictEnabled: boolean
  roomAdminToken: string | undefined
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
    verdictEnabled: parsed.VERDICT_ENABLED,
    roomAdminToken: parsed.ROOM_ADMIN_TOKEN,
    version: parsed.APP_VERSION ?? pkg.version,
    sha: parsed.GIT_SHA ?? shaFromFile() ?? 'dev',
  }
}
