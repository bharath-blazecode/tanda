// Builds the Hono app. Kept separate from index.ts so tests can call routes without a port.
import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import type { Health } from '../shared/contracts'
import type { Config } from './config'
import { roomRoutes } from './room'
import { verdictRoutes } from './verdict'

export function createApp(config: Config) {
  const app = new Hono()

  app.get('/api/health', (c) => {
    const body: Health = { status: 'ok', version: config.version, sha: config.sha }
    return c.json(body)
  })

  app.route('/api', verdictRoutes(config))
  app.route('/api', roomRoutes(config))

  // Unknown API paths answer JSON, never the SPA shell.
  app.all('/api/*', (c) => c.json({ error: 'not_found' }, 404))

  // The built SPA, then index.html for every client-side route.
  app.use('*', serveStatic({ root: config.staticDir }))
  app.get('*', serveStatic({ root: config.staticDir, path: 'index.html' }))

  return app
}
