// Limiter identity only. Headers carry no authority unless the socket peer is a configured proxy.
import { isIP } from 'node:net'
import type { Context } from 'hono'

export type HeaderReader = (name: string) => string | undefined

export function canonicalIp(raw: string | undefined): string | undefined {
  if (!raw || raw.length > 45 || raw.includes('%')) return undefined
  const version = isIP(raw)
  if (version === 4) return raw
  if (version !== 6) return undefined
  const address = new URL(`http://[${raw}]`).hostname.slice(1, -1)
  // A dual-stack listener may represent IPv4 peers using mapped IPv6.
  const mapped = /^::ffff:([0-9a-f]+):([0-9a-f]+)$/.exec(address)
  if (!mapped) return address
  const hi = parseInt(mapped[1], 16)
  const lo = parseInt(mapped[2], 16)
  return [hi >> 8, hi & 255, lo >> 8, lo & 255].join('.')
}

export function clientIp(header: HeaderReader, remoteAddress?: string, trusted: readonly string[] = []): string {
  const peer = canonicalIp(remoteAddress)
  if (!peer) return 'unknown'
  if (!trusted.includes(peer)) return peer

  // Each trusted hop must append the observed connecting address or overwrite XFF.
  const chain = header('X-Forwarded-For')
  if (!chain || chain.length > 1024) return peer
  const hops = chain.split(',')
  if (hops.length > 16) return peer
  for (let i = hops.length - 1; i >= 0; i--) {
    const ip = canonicalIp(hops[i].trim())
    if (!ip) return peer
    if (!trusted.includes(ip)) return ip
  }
  return peer
}

export function requestClientIp(c: Context, trusted: readonly string[]): string {
  return clientIp(name => c.req.header(name), c.env?.incoming?.socket?.remoteAddress, trusted)
}
