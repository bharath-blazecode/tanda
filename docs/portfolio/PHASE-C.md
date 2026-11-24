# Phase C security and operations review

Reviewed base `85ed2b700de91f7f4f862f1272e27fd571d5ee1f` on `feat/phase-c-security`.
This source and local runtime review supersedes the older threat-model findings on client IP,
headers, Redis reset and paid-call defaults. Deployment settings and user records were outside
the local verification boundary.

## Boundaries and priorities

| Boundary or asset | Confirmed behavior and consequence | Decision |
|---|---|---|
| Browser storage and sensors | Raw pulse and motion stay in the tab. Names, drink history, baseline and ticket persist locally. Anyone with access to that browser can read them. Exports leave the app under the user's control. | Keep local processing. Room grants require a current document grant and a matching storage token. Page exit clears the grant. Opt-out also signals other active tabs where BroadcastChannel is available. Failed withdrawal offers a retry while sharing remains disabled. |
| Browser → public room | Result and presence writes contain an anonymous device ID, nickname and limited result/stage fields. Public reads omit device IDs and drinks. A device ID is a bearer-like handle for overwriting or withdrawing a row. | Keep the opt-in projector ephemeral. Validate contracts, sanitize names, throttle writes, cap state, and require JSON. The administrator's separate reset token is checked in constant time. Accounts and private feeds would require real server-side ownership. |
| Edge → Node | The previous IP helper used the content of a forwarding header without establishing who sent it. A syntactically valid address alone proved nothing about the client's connection. Impact depended on deployment topology. | Use the socket peer by default. Consult a bounded XFF chain from right to left only when the immediate peer is explicitly trusted. Canonicalize IPs. Ignore CF-Connecting-IP. Missing peer shares a conservative bucket. Keep independent device/global call limits and venue-sized IP buckets. |
| App memory → Redis | High privacy priority. Reset previously acknowledged before DEL finished. A configured mirror that could not initialize silently confirmed memory-only deletion. Previous mirror reads could race with state changes. | Await durable withdrawal/reset acknowledgement, return 503 on uncertainty, and suppress stale recovery. Bound field count/value transfer before hydration, validate entries on read, give the hash an inactivity TTL and expire rows logically after 12 hours. Keep one active app instance. |
| Browser → verdict API → Anthropic | Browser sends an ID for limits and a bounded structured summary. The provider receives closed-enum context, drift bands, drink totals, local hour and optional demo context. Names, device IDs, free-text notes and raw signals stay out of the prompt. | Fresh, missing-preference and migrated records default commentary off. Existing valid preferences are preserved, including historical true defaults. Key, enablement and a positive call allowance are required to spend. Optional text is filtered and length-limited. Failed checks return canned copy. Assessment and mandatory safety text remain deterministic. |
| Browser content and shared caches | The origin originally omitted application security headers. Production edge behavior was unknown. | Enforce same-origin scripts/fonts/connects, no framing, no sniffing and no referrer. Permit existing style attributes and same-origin sensors. Disable the schema library's browser JIT. Cache hashed assets, revalidate the shell and set API responses to no-store. |
| CI → Dokploy → container | Deploy URL is a secret. Returning response bodies in CI could disclose upstream diagnostics. Main-only webhook follows tests/build. Image build previously included Git history and repo configuration. | Pin action revisions and base-image digests. Disable checkout credential persistence. Send a bounded HTTPS webhook request and log status only. Missing webhook fails the job. Restrict Docker build inputs. Drain accepted requests before disconnecting Redis. |

**Priorities.** Resolve durable deletion and provider spend controls before inviting public traffic.
Origin identity and cache policy matter at both the application and the actual edge. Host limits,
backups and operator access cannot be established from the application. The existing 4 KiB
body limit, bounded API enums/numbers, rendering of names as text, server-only keys, non-root
runtime and deterministic safety line were confirmed in source. Generic unexpected API errors
now omit exception details. No production traffic generation or private-record inspection was used.

## Tradeoffs and remaining exposure

- In-memory quotas avoid adding a mandatory service. They reset on restart, split across replicas
  and cannot bound a currency spend. Redis-backed shared quotas would be justified before
  scaling horizontally. Per-IP quotas alone penalize shared networks and are weak identity.
  Configure provider-side spend limits separately. The public API can still receive traffic
  from direct clients, and public room reads need edge-level volume control.
- Paid calls have a three-second deadline, no SDK retries and at most 150 output tokens.
  Cancellation limits app wait time. A submitted request can still be billed. Model output
  filtering is heuristic; a permitted joke can still be inappropriate. Only plain text
  reaches the ticket. No real provider call or retention audit was performed.
- The memory-first room remains available during outages. Ordinary posts may be lost. Presence
  expires after 45 seconds. Reads prune expired results; the 12-hour key TTL is renewed by
  writes, so it is not an exact per-row physical deletion timer. Backups, exported images,
  third-party logs and requests already sent are outside the withdrawal operation. A failed
  deletion followed by process loss can allow a durable old entry back until retry/expiry.
  A new or already in-flight post from a stale client may also repopulate a row. The device ID
  protocol cannot revoke all historical client versions. Multiple active instances or restoring
  stale backups can defeat the single-instance consistency assumptions.
- Configure HTTPS/HSTS at the verified TLS terminator. The origin does not infer TLS from a
  client-supplied header. CSP enforcement was tested on the local production build. Cloudflare
  script injection, edge cache overrides, physical sensors and native share delivery need staging.
  Public provider resources and third-party script allowances were unnecessary for the tested flows.
- No independent penetration test, comprehensive dependency audit, secret clearance or legal
  compliance assessment was performed. Confirm the historic venue credential was retired or
  rotated with its owner. Keep its value out of tickets, commits and logs.

## Operator acceptance before merge or deployment

1. **Topology.** In Dokploy inspect the app's replica count, ingress network and connections.
   Require one active application replica with this mirror design. Inspect Cloudflare DNS/proxy,
   origin firewall or authenticated origin access, TLS mode, and Traefik forwarded-header
   configuration. Obtain the actual socket peer addresses and proof that each trusted hop strips
   untrusted values or appends its observed peer. Leave `TRUSTED_PROXY_IPS` empty until verified.
   Include only exact trusted IPs. Avoid trust rules for entire shared Docker networks. Monitor
   429 rates at an expected shared venue load and apply appropriate edge request limits.
2. **Redis.** Inspect the redacted startup flag `hasRedis` and connection health separately.
   The public health API intentionally reports version and revision only. Verify dedicated keyspace,
   private connectivity/TLS, authentication, persistence, failover semantics, backup retention,
   and restoration policy. Restrict the app identity to `kachka:room:v1` and necessary commands
   including EVAL, HKEYS, HLEN, HSTRLEN, HGET, HSET, HDEL, DEL, PTTL and PEXPIRE. Test ACLs
   in staging with synthetic data. On a deletion 503 keep sharing off, repair Redis and retry.
   Avoid restoring expired or withdrawn board data from a backup. No production Redis role, flag
   or provider setting was observed. The environment's CONNECT proxy denied the public health GET.
3. **Anthropic.** Keep `VERDICT_ENABLED=false` and `VERDICT_DAILY_CALL_LIMIT=0` for built-in commentary. In the
   Anthropic Console select the dedicated Kachka workspace, set its supported spend limit under
   Limits, configure billing alerts and verify organization limits. If a hard cap is unavailable,
   leave paid calls disabled pending an approved budget. Set an integer 1–6000 only after setting
   the external cap and receiving budget approval. Paid calls also require explicit enablement and a server-side key. Monitor attempt counts, canned fallback reasons,
   actual billed usage and provider retention/region terms.
4. **Edge and monitoring.** Verify HTTP redirects and TLS/HSTS, delivered CSP, room no-store and
   hashed-asset headers in staging and through Cloudflare. Check permission-based browser flows
   and receipt export on iOS and Android. Set container CPU/memory limits, termination grace above
   10 seconds, log rotation/access and uptime alerts. Track HTTP 429/5xx, mirror errors, restarts
   and webhook outcomes without logging input, prompts, addresses, credentials or withdrawal IDs.
5. **Deployment and rollback.** Protect main and require PR checks. A main push after merge runs
   tests/build then asks Dokploy to deploy. HTTP 2xx confirms webhook acceptance only. Verify
   the running revision and healthy container in Dokploy. For Phase G images built without Git refs, supply the checked-out full SHA via
   the build argument BUILD_REVISION. The baked value takes priority over runtime variables. Retain the prior known-good image and environment config. On failure pause rollout,
   redeploy the prior image and verify health and privacy behavior. Set VERDICT_ENABLED=false
   before rolling back if paid usage is a concern. Keep a failed withdrawal open across rollback.
   There is no database schema migration; the Redis TTL persists. Review pinned dependencies
   and base images regularly and update them with tested commits.
6. **Commercial scope.** Before Australian consumer release, obtain qualified advice on Privacy
   Act coverage, possible health-information status, consent and collection notices, overseas
   disclosures, access/correction, deletion and breach response. Review any therapeutic claims
   and intended purpose with regard to TGA requirements. Assess actual provider contracts and
   retention settings. Future private social features need authenticated sessions, per-object
   authorization, revocation, abuse controls and deletion before collecting durable relationships.
   [OAIC privacy guidance](https://www.oaic.gov.au/privacy) · [TGA software guidance](https://www.tga.gov.au/products/medical-devices/software-and-artificial-intelligence-ai)

## Verification record

- Source and pure control tests cover trust configuration, missing/malformed addresses, IPv4/IPv6,
  shared/global limits, JSON contracts, provider fallback, timeouts, output checks and storage failure.
  Four mirror/deletion expectations and four header expectations failed against the previous behavior.
- Isolated Redis 7.4 with synthetic IDs and AOF passed confirmed withdrawal, outage 503, reset
  failure, retry, Redis restart, cold app hydration, retained control row, native TTL and confirmed reset.
- Local Chromium passed 18 UI/header checks (including real PNG download, simulated share-with-files,
  self-hosted fonts, SVG and zero observed CSP violations), 16 privacy checks including failed
  storage/cross-tab revocation and retry, and four synthetic pulse checks. Motion lifecycle checks
  passed; repeated wall-clock runs also produced legitimate acquisition refusals. One measured
  synthetic dispatch gap was 139 ms. The harness timed out expecting a reading. No thresholds were
  relaxed. A repeatable physical-phone capture remains a staging gate.
- The production build and local container build used the lockfile. Networked npm installation
  initially failed inside Docker. Seeding BuildKit's npm cache from a clean host install allowed
  the same Dockerfile to build. Production runner networking, Actions and Dokploy were not exercised.
