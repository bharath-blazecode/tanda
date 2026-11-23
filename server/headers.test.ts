import { Hono } from 'hono'
import { browserHeaders } from './headers'
import { expect, it } from 'vitest'
import { createApp } from './app'
import { loadConfig } from './config'

const app = createApp(loadConfig({}))

it.each(['/api/health', '/api/room', '/api/unknown'])('applies browser controls and prevents caching on %s', async path => {
  const { headers } = await app.request(path)
  expect(headers.get('cache-control')).toBe('no-store')
  expect(headers.get('content-security-policy')).toContain("frame-ancestors 'none'")
  expect(headers.get('content-security-policy')).toContain("script-src 'self';")
  expect(headers.get('permissions-policy')).toContain('camera=(self)')
  expect(headers.get('permissions-policy')).toContain('microphone=()')
  expect(headers.get('referrer-policy')).toBe('no-referrer')
  expect(headers.get('x-content-type-options')).toBe('nosniff')
})

it('revalidates non-API routes including the app shell', async () => {
  const { headers } = await app.request('/')
  expect(headers.get('cache-control')).toBe('no-cache')
})

it('caches a built asset across navigations and revalidates an HTML fallback under assets', async () => {
  const staticApp = new Hono()
  staticApp.use('*', browserHeaders)
  staticApp.get('/assets/index-a19b82Zx.css', c => c.body('body {}', 200, { 'content-type': 'text/css' }))
  staticApp.get('*', c => c.html('<title>App</title>'))
  expect((await staticApp.request('/assets/index-a19b82Zx.css')).headers.get('cache-control')).toContain('immutable')
  expect((await staticApp.request('/assets/oldfn-a19b82Zx.css')).headers.get('cache-control')).toBe('no-cache')
})
