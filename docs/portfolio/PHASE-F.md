# Phase F · Choosing what goes on the public board

Base: PR #61 merge `41f801479f004ac5462d2f829581be9a712ba3e7`. Branch: `feat/phase-f-social`. The ordinary test, demo, caffeine and receipt journeys require no social participation.

## Product decision

| Approach | What a participant gets | Tradeoff |
| --- | --- | --- |
| Improve the public projector | Watch without joining, share live activity by choice, preview one recent ticket and decide whether it belongs on the board. | Reuses the existing controls, server and retention limits. Public nicknames and ticket words can still identify people. Selected. |
| Temporary private group | Restrict viewing to invited friends. | Requires server-enforced membership, separate owner and participant credentials, unpredictable expiring invitations, revocation, replay handling, moderation and coordinated state across instances. Today's public read endpoint and browser handle cannot provide that boundary. Deferred. |
| Receipt sharing alone | Send an image directly to chosen recipients through the operating system. | Useful and already built. The app cannot recall the image. This leaves the existing public rankings and uncertain-withdrawal problem unresolved. Retained as a separate choice. |

## Participant experience

- **Watch.** The projector is read-only. Its QR and keyboard-accessible link open Privacy on the same origin. Opening either page grants nothing. The board shows live activity and up to five recent tickets in chronological order. Each ticket says **Simulated** or **Personal reading**. Both former leaderboards are retired. The fixed no-driving notice appears without asking anyone to disclose alcohol use.
- **Join.** The original Landing appearance is preserved. Only activating its existing room toggle opens an audience confirmation. Privacy explains that anyone with access to the public room can watch. Consent is specific to the current document. Turning it off revokes it locally immediately, invalidates the stored grant and signals other tabs. Reload, loss of matching grant or unavailable storage leaves reporting off.
- **Share a ticket.** Viewing a result sends no ticket, even with live sharing enabled. In Privacy, a recent ticket has a separate action showing nickname, word, score and simulated/personal status. The client re-reads consent, identity, freshness and the previewed values at activation. Changed values require a new review. A score is visible in that preview and in the compatible public API, but the projector displays no numeric score. Sharing never includes the guessed demo handicap. The server ignores automatic result posts from older clients that lack the explicit ticket intent.
- **Leave or erase.** Turning off room sharing requests removal of presence and ticket. Privacy offers removal even after reload, when the local grant is already off. The current tab lets its previously issued reports finish or time out before sending withdrawal. On a failed Start over withdrawal, Kachka erases the local personal record and v1 rollback copy, retains the random handle with an optional v2 retry flag, and keeps room participation disabled. After a confirmed retry, it retires the handle while preserving any new local entries. A concurrent Start over cannot overwrite a replacement identity. A failed browser data write or removal produces a local error. Clearing site data externally before retry can destroy the only usable handle.

## Privacy and security review

| Boundary | What crosses it and for how long | Limits |
| --- | --- | --- |
| Browser consent and local storage | The existing v2 record stays local. The optional `roomRemovalPending: true` flag records an unfinished Start over. There is no contact collection or new identifier. | A nickname is a display alias. A local handle can be lost or copied. Device ID possession is bearer-like control over the existing public entry and does not authenticate a human. |
| Live presence | Device handle, nickname and coarse stage reach the server after opt-in. The live store is process memory only, capped at 1,000 devices, with 45 s expiry. Public output omits handles. | Opening the projector never reports presence. Shared devices and networks can conflate users or encounter limits. |
| Result submission | The new client sends explicit intent, device handle, nickname, word, score and mode. The server assigns time and applies the existing name policy and throttles. One result per device, capped at 2,000, retained logically up to 12 h. | Intent distinguishes the official clients' workflows. A caller can fabricate a reading or intent. There is no verified identity, sensor attestation or fitness-to-drive inference. A 204 may also mean throttled, so the UI says the request was sent. |
| Public read | Existing response schema remains readable. The feed explicitly projects nickname, word, score, mode and time. Both legacy ranking arrays are empty. Presence adds public nickname, stage and change time. | A viewer can copy what is public, including the feed score. The projector clears cached participants on a failed poll or hidden tab. A five-second request deadline and a fresh poll on return bound normal stale display. A frozen device or screenshot is outside server control. |
| Removal and Redis | Withdrawal uses the existing handle. With a configured mirror, a 204 requires deletion acknowledgement. Uncertainty returns 503. Reads use memory. The optional Redis hash has a renewable 12 h inactivity TTL in addition to per-entry logical expiry. | Deletion covers this running service and its configured mirror. It cannot recall images, third-party copies, backups or provider logs. A subsequent write from another holder of a handle can create a row again. Multi-replica consistency remains unsupported. |

No public endpoint, permission scope, external service, analytics, dependency or paid AI call was added. The existing body limits, name policy and generated-name option, trusted-proxy boundary, per-IP/device quotas, protected admin reset and Redis validation continue to apply. Tests exercise invalid requests, name handling, omitted IDs, suppression of old automatic posts, changed previews, duplicate throttling, stale reads and mirror failures. The previous [threat model](THREAT-MODEL.md) and [operator runbook](PHASE-C.md) provide the infrastructure context.

## Visual evidence

The two viewports used Chromium with reduced motion and synthetic names. The QR displays the corresponding loopback test origin.

| Screen | Mobile, 390 × 844 | Desktop, 1280 × 900 |
| --- | --- | --- |
| Room | [Before](screenshots/phase-f/before-mobile-room.png) · [After](screenshots/phase-f/after-mobile-room.png) | [Before](screenshots/phase-f/before-desktop-room.png) · [After](screenshots/phase-f/after-desktop-room.png) |
| Privacy, sharing off | [Before](screenshots/phase-f/before-mobile-privacy.png) · [After](screenshots/phase-f/after-mobile-privacy.png) | [Before](screenshots/phase-f/before-desktop-privacy.png) · [After](screenshots/phase-f/after-desktop-privacy.png) |
| Deliberate ticket choice | [Mobile](screenshots/phase-f/after-mobile-ticket-choice.png) | [Desktop](screenshots/phase-f/after-desktop-ticket-choice.png) |

The final matched-fixture comparison against PR #61 found byte-identical initial Landing images, rendered ticket text, ticket screenshots and downloaded PNGs at both viewport sizes. All four animated verdicts matched at 320, 1100 and 1800 ms. An earlier strict image run varied by a few pixels at the rounded outer edge of mobile Landing. Repeated captures also matched exactly, without altering the comparison tolerance. The receipt renderer, jokes, stamp, original CSS, animations, chart selector, safety and export code have no source diff.

## Verification and reproduction

- `npm run check` passed TypeScript and 687 tests in 51 files. `npm run build` produced client and Node server bundles with the existing Vite chunk-size warning.
- All 141 tests in the targeted 10-file suite passed. The suite covers room routes, limits, presence, state, mirror, local consent, reporter logic, network ordering, projector polling and concurrent erasure. Run `npx vitest run server/{room,room-mirror,room-presence,room-throttle,state}.test.ts src/store/local.test.ts src/api/room.test.ts src/screens/{room/board,privacy/erase}.test.ts src/room-reporter-logic.test.ts` in Bash.
- `social.cjs before|after OUTPUT_DIR` verifies the projector and Privacy at both widths. It uses fixture public reads for reproducible screenshots and the real local API for publishing and withdrawal. It covers viewing without posting, connectivity loss and recovery, stale ticket preview, failed send and retry, keyboard send, an unconfirmed erase, reload, confirmed retry and handle rotation.
- `flows.cjs '' privacy` passed 18/18, including cancelling public consent, explicit simulated posting, cross-tab revocation, failed storage writes and selective receipt fields. `extra.cjs` passed 18/18, including real PNG download, simulated Web Share handoff, denied storage, 320 px reflow and CSP. The example journey passed 11/11 and the caffeine flow passed 16/16.
- For protected visual comparisons, run `creative.cjs before OUTPUT_DIR` against the PR #61 build, then `creative.cjs after OUTPUT_DIR` against Phase F. `creative-motion.cjs` compares the four original animated verdicts. Use Node for the CJS scripts in `scripts/browser-checks/`, with `KACHKA_TEST_ORIGIN` set to the loopback production build and `CHROMIUM_PATH` to system Chromium. The animation comparison also needs `KACHKA_REFERENCE_ORIGIN` for the original build.
- A disposable, authenticated Redis 7.4 container with AOF and two synthetic devices passed a positive key TTL check, outage withdrawal 503, recovery retry 204, Redis restart and cold application hydration. Only the control ticket survived. This exercise used a dedicated local volume. No production records or settings were inspected.

## Deployment and rollback

1. In Dokploy open the Kachka service, check the deployment revision and running replicas, and report only the SHA and count. Use one active instance for these process-local room guarantees.
2. In its Environment view check whether `REDIS_URL` is configured, without copying its value. If enabled, verify authenticated private networking, persistence and backup handling in the Redis service. Use an isolated staging volume and two invented devices for restart/withdrawal checks. Check that the removed entry stays gone while the control returns after a cold boot.
3. In Cloudflare and Traefik verify that public room reads bypass caches, `Cache-Control: no-store` reaches clients, and forwarding headers match the trusted last hop. Treat edge or application logs containing identifiers or payloads as sensitive. Confirm the room name mode matches the event operator's choice.
4. Review CI for the branch tip and the screenshots before approving the main merge. The workflow requests Dokploy deployment after successful main CI. No new environment variable or Redis migration is required.
5. Downgrading the server reinstates the previous ranking and automatic-post behaviour for compatible older clients. Downgrading the UI may ignore the optional pending-removal flag. Complete outstanding withdrawals before rollback where possible. The stored handle and existing v2 fields remain readable.

The physical-phone sensor pilot, reported Stand Still timeouts, native share sheet, screen readers, production operations and Australian privacy/legal review stay on the Phase G checklist.
