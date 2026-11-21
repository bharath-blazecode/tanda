// The client IP used as a rate-limit key by /api/verdict and /api/room.
// Headers are caller-controlled when a request skips the proxy, so only something shaped like an
// IPv4 or IPv6 address is kept: a caller cannot mint arbitrary limiter keys or store huge ones.
export type HeaderReader = (name: string) => string | undefined

const MAX_IP_CHARS = 45 // the longest textual IPv6 form, IPv4-mapped included
const IP_SHAPE = /^[0-9a-fA-F.:]+$/

// Cloudflare sets CF-Connecting-IP to the real client; X-Forwarded-For is the fallback for other proxies.
export function clientIp(header: HeaderReader): string {
  const raw = header('CF-Connecting-IP')?.trim() || header('X-Forwarded-For')?.split(',')[0]?.trim()
  if (!raw || raw.length > MAX_IP_CHARS || !IP_SHAPE.test(raw)) return 'unknown'
  return raw
}
