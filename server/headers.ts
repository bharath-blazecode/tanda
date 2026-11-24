import type { MiddlewareHandler } from 'hono'

// Production serves the bundle, fonts, icons and API from the document origin.
// The React interface sizes elements with style attributes. Its stylesheets are local files.
const policy = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "style-src-attr 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self'",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "manifest-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ')

export const browserHeaders: MiddlewareHandler = async (c, next) => {
  await next()
  c.header('Content-Security-Policy', policy)
  c.header('Referrer-Policy', 'no-referrer')
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Permissions-Policy', 'accelerometer=(self), gyroscope=(self), camera=(self), web-share=(self), microphone=(), geolocation=()')
  // Only Vite's content-hashed assets are immutable.
  const builtAsset = /^\/assets\/[^/]+-[\w-]{8}\.(?:js|css|woff2?)$/.test(c.req.path)
  if (builtAsset && /\.(?:js|css)$/.test(c.req.path) && !c.res.headers.has('Vary'))
    c.header('Vary', 'Accept-Encoding')
  let cache = 'no-cache'
  if (c.req.path.startsWith('/api/')) cache = 'no-store'
  else if (builtAsset && c.res.status === 200 && !c.res.headers.get('content-type')?.startsWith('text/html'))
    cache = 'public, max-age=31536000, immutable'
  c.header('Cache-Control', cache)
}
