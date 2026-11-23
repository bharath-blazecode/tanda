// Builds the Hono app. Kept separate from index.ts so tests can call routes without a port.
import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import { bodyLimit } from 'hono/body-limit'
import type { Health } from '../shared/contracts'
import type { Config } from './config'
import { browserHeaders } from './headers'
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
  app.use('*', browserHeaders)
  app.onError((_error, c) => {
    // Request contents, provider exceptions and connection URLs do not belong in logs.
    console.error(JSON.stringify({ msg: 'unexpected request failure' }))
    return c.json({ error: 'internal_error' }, 500)
  })

  // The browser client sends JSON for these writes. Requiring its media type keeps
  // cross-origin HTML forms from entering these routes without a CORS preflight.
  for (const path of ['/api/verdict', '/api/room/result', '/api/room/presence', '/api/room/withdraw']) {
    app.use(path, async (c, next) => {
      if (c.req.method === 'POST' && c.req.header('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json')
        return c.json({ error: 'json_required' }, 415)
      await next()
    })
  }

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
