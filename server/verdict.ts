// CARD 8, "The bird's voice". This file is a stub that satisfies the contract.
// The real version calls Claude, enforces the limits and filters the output.
// See docs/05-architecture.md ("Server limits", "Voice") and DECISIONS.md D8 to D12.
//
// Rules that hold for the stub and the real thing:
// - Always answer 200 with a line. Over the limit, on an error, or with the kill switch on,
//   the source is 'canned'.
// - The request carries numbers and closed enums only. No free text reaches Claude.
// - Only this file may read config.anthropicApiKey.
import { Hono } from 'hono'
import { VerdictRequest, type VerdictResponse } from '../shared/contracts'
import type { Config } from './config'

export function verdictRoutes(_config: Config) {
  const routes = new Hono()

  routes.post('/verdict', async (c) => {
    const parsed = VerdictRequest.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json({ error: 'bad_request' }, 400)

    const body: VerdictResponse = {
      line: 'Nothing to report. I have bins to attend to.',
      source: 'canned',
    }
    return c.json(body)
  })

  return routes
}
