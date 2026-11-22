# Kachka threat model

Prepared 22 November 2026 against `main` at `b3d93a6`, then updated for the controls added on this
branch (section 7). It is a design review with local reproductions. It is not a penetration test, an
audit, or a compliance assessment. OWASP material was used as a review aid only.

Three kinds of statement are kept apart:

- **Confirmed in source:** read in the code at the stated path.
- **Reproduced locally:** run against a local process on this machine, with the command or test named.
- **Deployment assumption:** depends on the live site, Cloudflare, Dokploy or Redis, none of which
  were probed. Each needs evidence from the owner.

## 1. Assets

| Asset | Where it lives | Sensitivity |
|---|---|---|
| Drink log, baseline, last ticket | Browser `localStorage` | Personal. Drink logs and Tipsy or Wired labels are health-like inferences |
| Display name | Browser, then the room board when sharing is on | Can identify someone in a room |
| Device ID | Browser, server memory, Redis hash field names | A random key, not an identity. Lets anyone holding it overwrite or withdraw that device's board entry |
| Anthropic API key | Server environment only (`server/config.ts`, read in `server/verdict.ts`) | High. Spend and abuse |
| Room admin token | Server environment only | Medium. Clears the whole board |
| Redis URL with password | Server environment only | Medium |
| Deploy webhook URL | GitHub Actions secret | Medium. Can redeploy |
| Camera frames and motion samples | Browser memory during capture | Personal. Never sent in the inspected paths |

## 2. Actors

- A person using the app on their own phone.
- Someone else in the room who can see the projector, or who later borrows the phone.
- An anonymous internet client calling the API directly, possibly scripted.
- A malicious or compromised dependency in the browser bundle or the server bundle.
- An operator with server, Redis or CI access.
- Anthropic, as a processor of the commentary request.

## 3. Trust boundaries and data flows

```
phone browser ──HTTPS──> Cloudflare ──> Dokploy origin (Hono, Node 22) ──> Anthropic API
     │                                         │
     └── localStorage (bc:v1, bc:v2)           └── Redis (optional room mirror)
GitHub Actions ──webhook──> Dokploy (deploys main after checks)
```

| Boundary | Crossing | Data | Lifetime |
|---|---|---|---|
| Browser to API | `POST /api/verdict` | Numbers and closed enums only, plus device ID for limits | Not stored. Logged as `{msg, source, reason}` |
| Browser to API | `POST /api/room/result`, `/presence` | Device ID, name, verdict, score, mode, stage | 12 h and 2000 entries for results, 45 s for presence |
| Browser to API | `POST /api/room/withdraw` (this branch) | Device ID | Removes that device's result, live row and mirror field |
| API to Anthropic | Messages API | Verdict, tier, mode, drift bands, caffeine mg, alcohol count, local hour, handicap. No device ID, no name | Anthropic's API retention policy applies. Not verified here |
| API to Redis | HSET, HDEL, HGETALL, DEL | Device ID as field, RoomEntry JSON as value | No native TTL. Pruned on read after 12 h |
| Projector | `GET /api/room` | Names, verdicts, scores, stages. No device IDs, no drinks | Polled every 1.5 s |

## 4. Controls confirmed in source

| Control | Where |
|---|---|
| 4096-byte body cap on every API route, JSON 413 | `server/app.ts:16-24` |
| Zod validation of every request body, closed enums | `shared/contracts.ts`, each route |
| No free text reaches Claude. Device ID and name are omitted from the prompt | `server/prompt.ts:53-85` |
| Output filter on Claude's line, stricter with alcohol logged. Steady with alcohol never goes to Claude | `server/prompt.ts`, `server/verdict.ts:120-123` |
| Three-second deadline, 150 tokens, no SDK retries, canned fallback | `server/verdict.ts` |
| Per-device, per-IP, global minute and daily caps on Claude calls (memory) | `server/limits.ts` |
| Per-IP post and heartbeat limits, per-device result gap, new-device quota per IP, capped maps | `server/room.ts`, `server/room-throttle.ts` |
| Name sanitising with a hate-term list and a generated fallback; `ROOM_NAMES=generated` panic switch | `shared/nicknames.ts`, `server/room-names.ts` |
| React text rendering. No `innerHTML` or `dangerouslySetInnerHTML` in `src`, `server` or `shared` | Source search, 22 Nov |
| Redis treated as untrusted on read: entries revalidated, renamed by the live rule, future and stale entries dropped | `server/room-mirror.ts` |
| Constant-time admin token comparison; reset disabled without a token | `server/room.ts` |
| CI runs with `contents: read`; deploy only after checks on `main` | `.github/workflows/ci.yml` |
| Runtime image runs as `node` and copies only built output | `Dockerfile` |

## 5. Weaknesses reproduced locally

| # | Weakness | How it was reproduced | Severity and dependency |
|---|---|---|---|
| W1 | A forged `X-Forwarded-For` picks the per-IP limiter key | `roomRoutes` with a limit of 2: three posts from one forwarded IP gave `204, 204, 429`. Three posts with rotating forwarded IPs gave `204, 204, 204` (scratch script, tsx) | Depends on whether the origin accepts traffic that did not pass through Cloudflare. `server/client-ip.ts` checks the shape of the value, not where it came from |
| W2 | Requests with no forwarding header all share the key `unknown` | Same script: three header-less posts gave `204, 204, 429` | One client can spend everyone's bucket if the origin is reachable directly |
| W3 | No security headers and no `Cache-Control` on the origin | `curl -sI localhost:3333/` and `/api/room` returned only content type, length, date and keep-alive | Cloudflare may add headers. A read-only header inventory of the live site is needed before choosing where to set them |
| W4 | Knowing a device ID lets a caller overwrite that device's board entry | Posting with an existing device ID replaced the row | Low. Device IDs never appear on the board or in the prompt. By design, one entry per device |
| W5 | Opening the result screen posts to the board whenever the stored flag is on, and both landing paths turned the flag on | Seeded record with sharing on: opening `/result` put "Sample Ibis" on the local board | Fixed on this branch: sharing is off until chosen (section 7) |
| W6 | Start over cleared the phone but left the board entry for up to 12 h | Read and traced | Fixed on this branch: withdrawal endpoint, called before local deletion (section 7) |

Not reproduced, and not claimed: stored XSS through names (the sanitiser turned
`<img src=x onerror=alert(1)>` into the text `img srcx onerror`, and React renders text), and any
bypass of the body limit (5000 bytes gave 413).

## 6. Deployment assumptions needing evidence

1. **Origin isolation.** Is the Dokploy origin reachable without Cloudflare? If yes, W1 and W2 are live.
   Evidence: firewall rules or an authenticated origin pull configuration.
2. **Who sets forwarding headers.** Does Cloudflare overwrite `CF-Connecting-IP` and append to
   `X-Forwarded-For`? Does anything between Cloudflare and Node rewrite them?
3. **Headers at the edge.** A read-only `curl -sI https://kachka.fun/` and `/api/room` inventory.
4. **Redis.** Authentication, TLS, network isolation, and whether the instance is shared.
5. **Provider spend.** Anthropic workspace spend limit and alerting. The in-memory caps are request
   counts that reset on every deploy, not a budget.
6. **Single instance.** All limits and the room live in one process. More than one replica would
   split them.
7. **Historical secret.** A venue Wi-Fi password remains in old Git blobs. It must be confirmed
   rotated before that history is exposed. No scan proves the absence of every secret. This branch
   does not rewrite history.

## 7. Controls added on this branch

| Control | Where | Tested by |
|---|---|---|
| Room sharing starts off, is a visible choice on Landing and on the Privacy screen, and records migrated from v1 restart with it off | `src/screens/landing`, `src/screens/privacy`, `src/store/local.ts` | `src/store/local.test.ts`; browser run: toggle off by default, no presence or result request while off |
| `POST /api/room/withdraw` removes the device's result and live row, deletes the mirror field, and refuses a stale mirror read that would bring it back. A newer post after withdrawal is accepted. Answers 204 whether or not an entry existed. Rate limited like a result post | `server/room.ts`, `server/state.ts`, `server/room-presence.ts`, `server/room-mirror.ts` | `server/room.test.ts`, `server/room-mirror.test.ts`, `server/state.test.ts` |
| Turning sharing off withdraws at once and stops heartbeats | `src/screens/privacy` | Browser run: withdraw request sent, entry gone from `GET /api/room`, no heartbeat over the next 16 s |
| Start over asks for confirmation, withdraws first, then clears `bc:v2` and the `bc:v1` rollback copy, and says which of the two succeeded | `src/screens/privacy/erase.ts` | Browser run; `src/store/local.test.ts` |
| Claude commentary can be switched off; no `/api/verdict` request is made when it is | `src/screens/check` | Browser run with a request log |
| A saved or shared receipt leaves the name and the drink log off unless chosen, shows a text preview of the image, and always keeps provenance tags, the reference and the safety line | `src/screens/result` | `src/screens/result/receipt-image.test.ts`; browser run |
| The Privacy screen lists what stays on the phone, what goes to the server, and what goes to Anthropic, matching the request fields in `server/prompt.ts` | `src/screens/privacy` | Read against source; no automated check of the wording |

Not done here, and still open: W1 to W4, security headers and CSP (section 8), durable rate and cost
limits, and an owner-run secret scan of the history before it is exposed.

## 8. Before any durable social data

The device ID cannot authorise access to private records, and nothing on this branch treats it as if
it could. Before friends, circles or invites exist, all of these must be designed, built and tested:
authenticated ownership with a maintained session system, server-side authorization on every object
and action, schema constraints and migrations, secure cookies with CSRF defences, high-entropy
single-use expiring invitations stored hashed, replay protection, enumeration resistance,
revocation, account recovery, block and report, and per-user export and deletion across memory,
Redis, logs and backups. The handoff branch's `SECURITY-AND-PRIVACY.md` has a fuller list. Until
then, social features stay out.

## 9. CSP notes for a later stage

A Content Security Policy was reviewed, not shipped, because enforcing an untested policy risks
breaking the instrument. Constraints found in source:

- 52 React `style={{...}}` props in `src` need `style-src-attr 'unsafe-inline'` or a migration to
  classes. A nonce does not cover style attributes.
- The stamp uses an inline SVG filter (`src/ui/InkFilter.tsx`, `url(#k-ink)`). This is same-document
  and needs no extra source.
- Receipts are drawn on a canvas and downloaded through a `blob:` URL (`share.ts`), so `img-src` may
  need `blob:` and `data:` only if a preview image is added.
- Fonts are bundled (`@fontsource`), so `font-src 'self'` suffices.
- The camera uses `getUserMedia`; a `Permissions-Policy` must keep `camera=(self)`,
  `accelerometer=(self)` and `gyroscope=(self)`.
- `index.html` has no inline script in production; Vite emits external modules, so
  `script-src 'self'` should hold. Development needs a separate policy for HMR.

A candidate starting point to test in Report-Only mode first:
`default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`.
It has not been run against the full flow. Record the result before enforcing.
