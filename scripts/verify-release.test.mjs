import assert from 'node:assert/strict'
import test from 'node:test'
import { verifyRevision } from './verify-release.mjs'

const sha = 'abcdef0123456789abcdef0123456789abcdef01'
const origin = 'https://example.invalid'
const response = (rev, cache = 'no-store') => Response.json({ status: 'ok', sha: rev }, { headers: { 'Cache-Control': cache } })

test('waits past an old image for a matching baked SHA', async () => {
  const revisions = ['1234567890ab', sha.slice(0, 12)]
  await verifyRevision(origin, sha, { attempts: 2, delay: 0, request: async (url, options) => {
    assert.equal(url.href, origin + '/api/health')
    assert.equal(options.redirect, 'error')
    return response(revisions.shift())
  } })
  assert.equal(revisions.length, 0)
})
test('rejects redirects, error pages, short SHAs and cacheable health replies', async () => {
  for (const result of [Response.redirect(origin), new Response('<html>ok</html>'), response(''), response(sha.slice(0, 7)), response(sha, 'public')]) {
    await assert.rejects(verifyRevision(origin, sha, { attempts: 1, request: async () => result }), /did not confirm/)
  }
})
