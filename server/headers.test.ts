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

it('serves negotiated assets, 404s missing chunks and keeps client routes working', async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const { brotliCompressSync, brotliDecompressSync } = await import('node:zlib')
  const root = mkdtempSync(join(tmpdir(), 'kachka-assets-'))
  try {
    const asset = '/assets/index-test1234.js'
    mkdirSync(join(root, 'assets'))
    writeFileSync(join(root, asset), 'export {}')
    writeFileSync(join(root, asset + '.br'), brotliCompressSync('export {}'))
    writeFileSync(join(root, 'index.html'), '<title>Kachka</title>')
    const service = createApp(loadConfig({ STATIC_DIR: root }))
    const encoded = await service.request(asset, { headers: { 'Accept-Encoding': 'gzip, br' } })
    expect(encoded.headers.get('content-encoding')).toBe('br')
    expect(encoded.headers.get('vary')).toBe('Accept-Encoding')
    expect(brotliDecompressSync(Buffer.from(await encoded.arrayBuffer())).toString()).toBe('export {}')
    const plain = await service.request(asset)
    expect(plain.headers.get('vary')).toBe('Accept-Encoding')
    expect(await plain.text()).toBe('export {}')
    expect((await service.request('/assets/expired-12345678.js')).status).toBe(404)
    expect(await (await service.request('/home')).text()).toBe('<title>Kachka</title>')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
