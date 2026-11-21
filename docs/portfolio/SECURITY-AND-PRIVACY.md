# Kachka security, privacy and engineering handoff

Prepared for Astra Ultra on 22 November 2026 (Australia/Brisbane). This is an evidence-based planning memo, not a security scan or release sign-off. No active attacks, live credential tests or repository changes were performed for this memo.

## Baseline and evidence limits

The inspected checkout is `b3d93a6` on `docs/astra-ultra-portfolio-handoff`. The pulse work is now a separate, unmerged commit `5ca2b58` on `fix/pulse-stability-and-retry`. Do not describe its camera lifecycle guards, retry logic or passing tests as already shipped on main. Recheck the chosen implementation baseline before acting on this handoff.

Source evidence establishes what the app implements. It does not establish the live Cloudflare policy, origin reachability, production Redis authentication/TLS, provider billing configuration, deployed HTTP headers, backup contents or whether an old venue password is still active. No current deployment was probed.

The known historical Wi-Fi credential was checked without printing it. It is absent from current tracked files but remains in nine historical blobs across `README.md`, `docs/01-hackathon-brief.md` and `docs/07-instruments.md`. This exact-value check covered all 101 locally available commits and 448 file blobs. It was not a fresh general secret scan.

## Current system and controls

| Area | Observed source evidence | Consequence for the next design |
|---|---|---|
| API boundary | `server/app.ts:16-40` caps API bodies at 4096 bytes, exposes health, mounts verdict and room routes, returns JSON for unknown API paths and serves the built SPA | Keep schema and body limits. Define separate limits for any future uploads or exports rather than silently raising this global cap |
| Anonymous room | `server/room.ts:75-125` accepts bounded client device IDs, names, scores, verdicts and stages. GET room, result posts and presence posts have no account authentication | This is an anonymous public-board design, not proof of an auth bypass. A device ID is neither an account nor evidence that a sensor reading is genuine |
| Admin reset | `server/room.ts:36-39,116-124` requires a configured token, hashes both values and uses timing-safe comparison. Unset token disables reset | Preserve constant-time comparison. Replace a long-lived shared token with accountable admin sessions if administration grows |
| IP identification | `server/client-ip.ts:10-14` accepts a bounded IPv4/IPv6-shaped CF-Connecting-IP or first X-Forwarded-For value | Shape validation bounds input size. It does not prove header authenticity. Exploitability depends on whether untrusted traffic can supply these headers to the origin |
| Abuse limits | `server/limits.ts:5-11` has per-device, per-IP, minute and daily counters. `server/room-throttle.ts` bounds device/IP maps and adds a 15-second result gap | Existing controls materially limit one process. They are not durable, account-bound or a distributed spending guarantee |
| Board retention | `server/state.ts:21-27,74-82` keeps at most 2000 results and expires entries after 12 hours when snapshots are processed. Presence is capped at 1000 devices and expires after 45 seconds in `server/room-presence.ts:5-9` | Keep these distinctions visible. An in-memory expiry policy is not a complete promise about durable deletion, local storage, mirrors, logs or backups |
| Redis mirror | `server/room-mirror.ts:149-189` revalidates entries, applies the name policy, rejects future/old data and guards stale pulls during reset. `server/redis.ts:49-61` uses HGETALL, HSET, HDEL and DEL with no native TTL | Useful validation and resilience already exist. Deletion durability, multi-instance races, storage-level expiry and a stalled consumer require explicit design and tests |
| AI endpoint | `server/verdict.ts:17-18,62-102,115-145` enforces a three-second deadline, 150 output tokens, no SDK retries, validated inputs, rate limits and filtered/canned fallbacks | Keep the model outside verdict, safety and authorization decisions. Add an enforceable durable cost/concurrency budget before broad public use |
| Model data | `server/prompt.ts:53-85` sends selected drift labels, verdict, mode, confidence, drink totals, local hour and optional handicap. It omits device ID and nickname | The feature sends potentially sensitive derived context to a third party. Describe this accurately without claiming that every personal datum stays on the phone |
| Browser data | `src/store/local.ts:5-53` stores the record under `bc:v1` with no explicit expiry. It includes a random device ID, nickname, baseline, drinks and last result | Local storage is accessible to same-origin script and other users of the browser profile. It must never become the home for auth credentials or service keys |
| Sharing consent | `src/screens/landing/index.tsx:29-49` sets room sharing true for both Start and Quick demo. `src/room-reporter.tsx:46-76` gates uploads on that flag | Copy saying a user already opted in is stronger than this interaction proves. Make board membership a clear choice. Named Tipsy/Wired results can reveal drinking-related inferences even though raw drink logs are absent |
| Camera | `src/sensors/camera.ts:48-73` requests rear video with audio false. Frame statistics stay in client memory and no camera upload route was found. Main's pulse UI does not yet include the separate lifecycle fixes | Merge/review the camera cancellation fix before relying on its guarantees. Preserve minimal local processing and stop every track on exit or cancelled async setup |
| Rendering | Room names pass `server/room-names.ts` and nickname sanitation. The inspected UI uses React text rendering and canvas text. No innerHTML or dangerouslySetInnerHTML sink was found in the source search | Sanitizing names is useful moderation. Context-safe rendering is the XSS boundary. Avoid introducing raw HTML, arbitrary link URLs or unsafe Markdown rendering later |
| Build and delivery | CI uses npm ci, checks and build with contents read permission. Deployment runs after checks on push to main. Docker runtime uses the node user and copies only built artifacts and the SHA | These are useful controls, not evidence of branch protection, image integrity or production isolation. Pin/review supply-chain inputs and inspect the resulting artifact |

## Immediate decisions and prioritized verification

### P0: publication and product boundaries

1. Ask the venue owner to confirm the historical network password is retired or rotated before treating public source history as cleared. A file-deletion PR does not remove old blobs. History rewriting is a separate owner-approved operation with a recovery plan, coordinated clones and review of tags, branches, forks, pull requests, caches and release artifacts. Do not force-push or delete history as part of this handoff.
2. Run a maintained secret detector over current files and all intended public refs. Review fixture hits manually. Inspect Actions logs, attachments, screenshots, build caches, releases and any separate deploy mirror. Those locations were not covered by the current exact-value check. Keep values out of reports.
3. Define the product boundary as a toy that reports task-relative changes. A result must never grant medical, legal or driving clearance. Keep simulated and rough readings visibly distinguished. Do not use a score, pulse estimate or model sentence as an authorization or trust signal.
4. Resolve whether the future site has a public party board, private friend rooms, or both. Specify read/write/reshare rules before choosing a database. Do not quietly carry anonymous board assumptions into a private social feature.

### P1: before broad public traffic or any private social data

- Verify origin isolation and the exact trusted proxy chain. Record who overwrites forwarded headers, which direct-origin paths are blocked and how multiple proxies are handled. Test realistic shared venue NAT traffic, unknown IPs, IPv6 normalization and forged CF/XFF values in local integration tests. A string shaped like an IP must not become trusted merely because it parses.
- Add atomic, durable rate and cost reservations shared by all instances. Budget by bounded input/output cost and concurrency, reconcile provider usage, and retain ceilings through restarts and scaling. Protect fairness behind shared NAT. Keep provider project spend limits, alerts and a kill switch. The current 12/device/hour, 2000/IP/hour, 150/IP/minute, 200 global/minute and 6000/day are request ceilings, not a verified dollar budget. Client-generated IDs can be rotated.
- Decide which public mutations remain anonymous. For sensitive user data, derive the actor from a verified server session and authorize the specific object and action on every request. Client device ID, display name, a URL ID and a submitted owner_id are not proof of ownership. Rate-limit failures and administration without relying on an attacker-controlled identity.
- Define public-room consent and withdrawal. Show exactly which name, activity and result are shared. Let a person choose a pseudonym and private mode before any presence heartbeat. Provide an effective way to stop sharing and remove their server-side entry without resetting everybody's board.
- Add observable, bounded security events without raw payloads, names, drink histories, camera samples, credentials, invite tokens or model prompts. Check proxy, CDN and CI logging as well as application logs.

### P2: resilience, delivery and operational checks

- Document Redis as trusted infrastructure, not a destination accepted from request bodies. Require production authentication, narrow key/command permissions, network isolation and TLS where appropriate. Verify deployment values through status and behavior without exposing the connection string. Invalid Redis degrades to memory today, so alert on loss of durability rather than presenting it as persisted.
- Test expiry and deletion during failed HDEL/DEL, delayed HSET, reset with in-flight hydration, process restarts and multiple app instances. The existing generation guard blocks one stale read path but does not by itself establish a durable deletion contract. Decide on native TTL, scheduled cleanup and tombstones/versioning as required by that contract.
- Keep CI secrets unavailable to untrusted pull requests. Review branch protection and production deployment authorization. Pin Actions and base images to reviewed immutable revisions where practical. Update them deliberately. Inspect final OCI layers and build caches for source history, environment files and keys. The gitsha build stage copies the checkout, including Git metadata, even though the runtime stage copies only .git-sha.
- Add dependency/security update automation and an SBOM/artifact inventory. A frozen lockfile improves reproducibility but does not establish that dependencies are free of vulnerabilities. No dependency advisory assessment was performed for this memo.

## Future friends, authentication, invites and moderation

Choose these behaviors explicitly and turn them into authorization tests.

- Use a mature auth/session system or provider rather than inventing credentials. For browser sessions, prefer secure HttpOnly cookies with deliberate SameSite, expiry, rotation, logout and revocation behavior. Validate issuer, audience, signature, expiry and token purpose when using OAuth/OIDC. Do not store reusable access/refresh tokens in localStorage.
- Model owner, member, friend, invitee, moderator and blocked relationships on the server. Deny by default. Define pending, accepted, removed and blocked states and whether either party can revoke immediately. Prevent unilateral friendship creation and stale-token access after blocking or membership revocation.
- Scope invite capabilities narrowly. Use high-entropy, short-lived, single-use tokens with hashed server-side storage and atomic redemption. Bind what is being joined and by whom. Keep invite tokens out of analytics, error logs and referrers. Treat link previews and automatic scanners as readers, not consent to redeem an invitation.
- If using PostgreSQL/Supabase, enable and test RLS on every personal table and storage bucket. Policies should derive ownership/membership from the verified principal. Cover reads, inserts, updates, deletes, RPCs, exports, realtime channels and attachments. Keep service-role credentials on the server and avoid routinely bypassing RLS for end-user requests.
- Test an A/B/C principal matrix. A owns a reading, B is an accepted friend, C is unrelated. Include removed friends, blocked users, moderators, anonymous sessions, tampered object IDs, batch requests and revoked invites. A valid session plus a guessed UUID must not grant another person's data.
- Define block and report behavior across discovery, search, feeds, invitations, presence, messages, notifications and previously shared content. Rate-limit reporting and invitation creation. Moderation needs an audit trail and a documented policy for retaining minimal abuse evidence, not unrestricted access to everybody's health-like history.
- Default private readings to the owner. Sharing should preview the exact fields, audience and lifetime. Prefer derived summaries over raw sensor samples. A saved/shared PNG is an external copy that the app cannot reliably revoke. Its name, timestamp and verdict can remain sensitive even without the drink log.
- Establish retention for local data, server records, Redis, logs, exports, caches and backups separately. Provide export and deletion flows with clear scope. A local Start over action must not imply removal from Redis, a friend's download or backups. Decide whether any retained moderation record is an exception and make that policy explicit.
- Determine applicable privacy obligations and the intended adult audience before collecting accounts or expanding health-related inferences. Do not call the system anonymous if nicknames, stable identifiers or relationship graphs can identify people.

## Browser security requirements with current UI constraints

`server/app.ts` has no application security-header middleware. Production headers may exist at Cloudflare or the origin proxy, so absence in this file is not proof that the deployed site lacks them. Obtain a read-only header inventory on the actual deployment before choosing enforcement points.

| Threat | Proposed mitigation | Constraint and acceptance test |
|---|---|---|
| Script injection or dependency compromise exfiltrating browser records | Production CSP with default-src self, script-src self or a properly generated nonce/hash design, object-src none, base-uri none and connect-src limited to required origins | The app uses external bundled scripts and same-origin APIs. Do not allow script unsafe-inline or unsafe-eval merely to silence failures. Vite development HMR needs a separate development policy. Test complete production flows before enforcing |
| Styles blocked by an overstrict policy | Separate style-src-elem from style-src-attr | React components and SVGs use inline style props. A nonce on a style element does not automatically authorize style attributes. Begin with a narrowly documented style-attribute allowance if required, then migrate to classes or verified hashes. Do not break the existing design to claim a strict CSP |
| Third-party font leakage | font-src self with local font artifacts | `src/main.tsx:1-5` imports @fontsource packages. Runtime fonts are local. Archived prototypes using Google Fonts are not evidence that the shipped app needs Google domains |
| Framing and deceptive taps | frame-ancestors none, with X-Frame-Options DENY as legacy support if appropriate | Confirm that no supported embedding use case exists. This fits a stand-alone sensor app better than permission-heavy embedding |
| Device permission overreach | Permissions-Policy camera self, microphone none, geolocation none, accelerometer self and gyroscope self as supported | Camera is video-only. Do not disable motion accidentally. Check actual iPhone and Android permission flows and graceful absence behavior |
| MIME confusion, downgrade and referrer disclosure | X-Content-Type-Options nosniff, deliberate Referrer-Policy and HSTS at a verified HTTPS edge | Add includeSubDomains or preload only after every affected subdomain is ready. Choose no-referrer on invite flows if appropriate and still keep tokens out of logs and browser-visible redirects |
| Private API data cached as public content | Cache-Control no-store on personal/auth/invite responses and a documented public-board cache policy | Keep long-lived immutable caching for hashed static assets separate. Test CDN behavior, authenticated variants, logout and shared browsers |

Use Content-Security-Policy-Report-Only first, collect redacted violations, verify the production bundle, then enforce. Receipt images use canvas and blob downloads. Grant data/blob image or media sources only where an actual supported flow requires them. Exercise Save receipt, native Share, SVG marks, local fonts, camera playback, motion, audio beeps and SPA deep links. Minimize report payloads because URLs and document paths can contain sensitive data.

CORS is not authorization. No cookie-based account session is present today, so missing CSRF middleware is not by itself a demonstrated authenticated CSRF bug. If future routes use cookies, implement CSRF defenses with Origin/Fetch Metadata checks and an appropriate token strategy, alongside SameSite. Reject unsupported content types and define exact cross-origin policy. A browser-only restriction does not stop direct API abuse.

## Suggested verification sequence and exit evidence

1. Freeze the intended commit, configuration and data-flow diagram. Mark public, private, admin and third-party boundaries. Record whether the pulse fix is merged.
2. Write an authorization/data-retention matrix before implementing friends. Select a documented ASVS 5.0.0 scope and level. Treat it as test requirements, not an automatic claim of compliance.
3. Extend existing app, limits, room, mirror, prompt and camera tests rather than replacing them. Include body-limit streaming cases, malformed inputs, clock windows, shared-NAT fairness, concurrent budget reservations and reset/deletion races.
4. Add browser tests for consent before the first heartbeat, withdrawal, no camera/microphone upload, camera cancellation, approximate pulse not entering the score, malicious names rendered as text, CSP report/enforce modes and saved-image privacy.
5. For any new auth/friends feature, run the A/B/C matrix against the API and database policies, including storage, realtime and export paths. Test revoked relationships after existing sessions and caches have already been created.
6. Inspect actual headers, proxy trust, Redis transport, logging, CI permissions and provider spend caps in an authorized staging deployment. Use bounded read-only checks and local tests. Perform active abuse/security testing only under a separate explicit scope.
7. Keep a short evidence ledger with commands, target revision, dates, pass/fail/skipped outcomes, unresolved questions and owners. A green build proves neither medical accuracy nor private-data authorization.

## Official sources actually retrieved

All sources below were fetched successfully with HTTP 200 from the official OWASP GitHub repositories through raw.githubusercontent.com during this task. No account authentication was used. Access confirms the cited content was read, not that Kachka complies with it.

- [ASVS project README](https://raw.githubusercontent.com/OWASP/ASVS/master/README.md), 11286 bytes. It identifies ASVS 5.0.0 as the latest stable release.
- [ASVS 5.0.0 release requirements CSV](https://raw.githubusercontent.com/OWASP/ASVS/v5.0.0/5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.csv), 105100 bytes and 345 requirements. Relevant examples include V8.2.2 on explicit object/data permissions, V9.2.2 on token purpose and V10.3.2 on delegated token claims. Do not map old ASVS 4.x IDs onto this release.
- [Authorization Cheat Sheet](https://raw.githubusercontent.com/OWASP/CheatSheetSeries/master/cheatsheets/Authorization_Cheat_Sheet.md), 31021 bytes. Supports deny-by-default and permission checks on every request.
- [Content Security Policy Cheat Sheet](https://raw.githubusercontent.com/OWASP/CheatSheetSeries/master/cheatsheets/Content_Security_Policy_Cheat_Sheet.md), 18946 bytes. Supports report-only rollout and deliberate nonce/hash/source policies.
- [Session Management Cheat Sheet](https://raw.githubusercontent.com/OWASP/CheatSheetSeries/master/cheatsheets/Session_Management_Cheat_Sheet.md), 57688 bytes. Supports deliberate session transport, secure cookies, rotation and revocation requirements.
- [HTML5 Security Cheat Sheet](https://raw.githubusercontent.com/OWASP/CheatSheetSeries/master/cheatsheets/HTML5_Security_Cheat_Sheet.md), 16739 bytes. Covers local-storage exposure and cross-origin boundaries.
- [Cross-Site Request Forgery Prevention Cheat Sheet](https://raw.githubusercontent.com/OWASP/CheatSheetSeries/master/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.md), 53866 bytes. Distinguishes cookie-authenticated CSRF and defenses using tokens, Origin and Fetch Metadata.
