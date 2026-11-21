// Builds the Hono app. Kept separate from index.ts so tests can call routes without a port.
import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import { bodyLimit } from 'hono/body-limit'
import type { Health } from '../shared/contracts'
import type { Config } from './config'
import { roomRoutes } from './room'
import type { RoomStore } from './state'
import { verdictRoutes } from './verdict'

export const MAX_BODY_BYTES = 4096

export type AppDeps = {
  // Injected at boot when the room is mirrored to Redis; otherwise a plain in-memory store.
  store?: RoomStore
}

export function createApp(config: Config, deps: AppDeps = {}) {
  const app = new Hono()

  // Every API body is a few numbers and enums; anything larger is junk we should not even parse.
  app.use(
    '/api/*',
    bodyLimit({ maxSize: MAX_BODY_BYTES, onError: (c) => c.json({ error: 'payload_too_large' }, 413) }),
  )

  app.get('/api/health', (c) => {
    const body: Health = { status: 'ok', version: config.version, sha: config.sha }
    return c.json(body)
  })

  app.route('/api', verdictRoutes(config))
  app.route('/api', roomRoutes(config, deps.store))

  // Unknown API paths answer JSON, never the SPA shell.
  app.all('/api/*', (c) => c.json({ error: 'not_found' }, 404))

  // The built SPA, then index.html for every client-side route.
  app.use('*', serveStatic({ root: config.staticDir }))
  app.get('*', serveStatic({ root: config.staticDir, path: 'index.html' }))

  return app
}
