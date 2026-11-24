import { pathToFileURL } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'

export async function verifyRevision(origin, expected, { attempts = 40, delay = 15000, request = fetch } = {}) {
  if (!/^[0-9a-f]{40}$/.test(expected)) throw new Error('Expected a full lowercase commit SHA')
  const url = new URL('/api/health', origin)
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await request(url, {
        cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000),
      })
      if (res.ok && res.headers.get('cache-control')?.split(/,\s*/).includes('no-store') &&
          res.headers.get('content-type')?.startsWith('application/json')) {
        const body = await res.json()
        if (body?.status === 'ok' && [expected, expected.slice(0, 12)].includes(body.sha)) return
      }
    } catch {
      // An interrupted rollout may temporarily have no healthy upstream.
    }
    if (attempt < attempts) await sleep(delay)
  }
  throw new Error('Public health did not confirm the requested revision with no-store. Inspect Dokploy deployment and routing.')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await verifyRevision(process.argv[2], process.argv[3])
  console.log('Public health reports the requested revision.')
}
