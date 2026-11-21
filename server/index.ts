import { serve } from '@hono/node-server'
import { createApp } from './app'
import { loadConfig } from './config'

const config = loadConfig()
const app = createApp(config)

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
      model: config.verdictModel,
    }),
  )
})

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
