import { serve } from '@hono/node-server'
import { createApp } from './app'
import { loadConfig } from './config'
import { prepareRoom } from './room-mirror'

async function main() {
  const config = loadConfig()
  // Without REDIS_URL this is memory only; with it, boot waits at most 2 seconds to refill the board.
  const room = await prepareRoom(config)
  const app = createApp(config, { store: room.store })

  const server = serve({ fetch: app.fetch, port: config.port, hostname: config.host }, (info) => {
    // Names and flags only. Never log a secret.
    console.log(
      JSON.stringify({
        msg: 'kachka listening',
        port: info.port,
        version: config.version,
        sha: config.sha,
        verdictEnabled: config.verdictEnabled,
        hasApiKey: Boolean(config.anthropicApiKey),
        hasRedis: Boolean(config.redisUrl),
        model: config.verdictModel,
      }),
    )
  })

  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
      // Best effort: room.close() is capped and never rejects.
      void room.close()
      server.close(() => process.exit(0))
    })
  }
}

main().catch((err) => {
  // Only a bad config reaches here, as before; fail loudly so the deploy is noticed.
  console.error(err)
  process.exit(1)
})
