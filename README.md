# KACHKA

**Wired or wobbly?** Log a drink. Stand still, then tap fast. A bin chicken will judge how far you have drifted from your own normal.

A mobile-first **body drift recorder**, built by **Las Nubes** (Spanish for **“The Clouds”**) at the Tanda AI Hackathon 2026 in Brisbane. Your phone is the instrument; a printed receipt is the result.

**[Try Kachka](https://kachka.fun)** · [Run locally](#run-locally) · [Documentation](docs/README.md) · [Why Kachka?](#why-kachka)

## Why Kachka?

**KACHKA** is pronounced **KATCH-ka**, with the stress on the first syllable. In Russian, *качка* means the rolling and pitching of a ship. In Ukrainian, *качка* means a duck. Our instrument measures sway, and a bird signs the receipt: the name does both jobs.

```text
DR. KACHKA
Body drift recorder · Model BC-2
Peer-reviewed by a bin chicken
```

> “Kachka is what Russian sailors call it when the ship won't hold still. It's also Ukrainian for duck. We measure one and we're signed off by the other.”

Read the full [naming story](docs/13-the-name.md) for the pronunciation, mascot and instrument identity.

> A toy, not a test. For adults. Kachka is not a medical or legal measurement and must never be used to decide whether to drive. If you are going anywhere after drinking, get a ride or a friend.

## The idea

A coffee, a drink, a long day: you might feel different, but what changed? Kachka starts with **your own baseline**, then compares later readings against it. It measures change in a few phone-based tasks, rather than comparing you with somebody else's “normal.”

The experience borrows from an old scientific instrument: a dark green casing, graph paper, physical-looking keys and a thermal-paper receipt. **Dr. Kachka**, our bin chicken, supplies the deadpan commentary.

### From your normal to your receipt

1. **Record your normal.** Take a short standing and/or tapping test. If you have already had something, the baseline is labelled accordingly.
2. **Log what you have had.** Coffee, energy drink, beer, wine or spirit, in one tap.
3. **Run another check.** Compare body sway and tapping speed/accuracy with your baseline. Add a camera pulse reading if you want to try it.
4. **Read the receipt.** See the change, a **Steady / Wired / Tipsy / Wobbly** stamp, a line from the bird and a practical nudge. Save the receipt as an image, or share it where your browser supports image sharing.

**The sensors measure the change; the drink log gives that change a label.** These labels are not a measurement of what is in your body. A Steady result is never clearance to drive.

## A look inside

<table>
  <tr>
    <th>Meet the instrument</th>
    <th>Try Choice Tap</th>
    <th>Get your receipt</th>
  </tr>
  <tr>
    <td valign="top"><img src="docs/screenshots/landing.png" alt="Kachka landing screen with graph paper, the Wired or wobbly introduction and Start and Quick demo buttons" width="260" /></td>
    <td valign="top"><img src="docs/screenshots/choice-tap.png" alt="Choice Tap test with four squares and one illuminated target" width="260" /></td>
    <td valign="top"><img src="docs/screenshots/receipt.png" alt="Sample receipt with illustrative traces, changes from baseline, a Tipsy stamp, the bin chicken and a get-a-ride safety message" width="260" /></td>
  </tr>
</table>

Screenshots show the running app at a mobile viewport. The receipt uses **sample data** from the app's preview screen, not a real person's reading. [Capture details](docs/screenshots/README.md).

## What is built

| Part | What it does |
|---|---|
| **Stand Still** | Uses phone motion data to measure sway during a ten-second standing test. |
| **Choice Tap** | Measures reaction time and accuracy across four squares, with two warm-ups and eight scored taps. |
| **Camera pulse** | An optional finger-on-camera pulse estimate. It contributes only when the baseline also has pulse data, and cannot determine a verdict by itself. |
| **Drink log and caffeine curve** | Records drinks on the device and draws an illustrative caffeine estimate from the log, using the dose and half-life assumptions it shows. It is arithmetic on what you logged, not a measurement of you. |
| **Receipt** | Prints the baseline comparison, verdict, bird animation and commentary; supports saving and browser-dependent sharing. |
| **The Room** | A shared board of names, live activity and results. Drink logs are not posted to it. |
| **Demo modes** | A quick entry from the landing screen, plus an optional challenge using your other hand or a spin where motion is available. |

The quick demo skips recording a personal baseline. It compares against fixed example numbers, chosen on build day and not drawn from any study, offers each test once with skip controls, and labels the result **Simulated** and **Example reference, not your baseline** on the screen, after a reload and on a saved receipt. It never writes those numbers into your personal baseline. The example has standing and tapping values only, so a camera pulse reading is shown but not compared. The wearable ring and motion magnifier discussed in early plans are not part of the current app flow.

## How it works

**React + TypeScript + Vite** render the app. A local, rule-based scoring engine compares sensor metrics with the saved baseline. A **Hono** server provides the room board and the optional Claude commentary endpoint.

Claude writes the short line on the ticket; **it does not decide the verdict or the safety advice**. Without an API key, or when the service fails, the app uses a built-in line instead. The instrument still works.

Baseline readings and drink history are stored in the browser's `localStorage`. The verdict request sends numeric summaries and fixed categories to the server; when Claude is enabled, selected summaries are passed to it for the commentary. Joining the room sends your display name, activity and result to the shared board. The room screen is off until you turn it on, and turning it off takes you off the board. The Privacy screen lists what stays on the phone and what leaves it. There are no user accounts.

## Run locally

Requires **Node.js 22 or newer** and npm.

```bash
npm ci --no-audit --no-fund
npm run dev
```

Vite serves the web app on port **5173** and proxies `/api` to the Hono server on **3333**. Open `/lab` for links to individual instruments and screens; `/result?preview` shows sample receipts.

```bash
npm run check   # TypeScript check and unit tests
npm run build   # Client in dist/; server in dist-server/
npm start       # Serve the built app and API together on port 3333
```

Stop the development server before using `npm start` on the same port. `GET /api/health` reports server health.

### Optional server configuration

The default local workflow needs **no API key or Redis service**. [.env.example](.env.example) documents the settings. The server reads its process environment; the npm commands do not automatically load a `.env` file. Export values securely in your shell or configure them in your hosting environment.

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Enables server-side Claude commentary. Leave unset for built-in lines. |
| `VERDICT_MODEL` | `claude-haiku-5-5` by default; `claude-sonnet-5-5` is also supported. |
| `VERDICT_ENABLED` | Set to `false` to use built-in commentary for every request. |
| `REDIS_URL` | Optional room-board persistence across restarts. Without it, the board lives in memory. |
| `ROOM_ADMIN_TOKEN` | Optional token of at least 16 characters for the room reset endpoint. Unset disables that endpoint. |
| `ROOM_NAMES` | `typed` by default; `generated` substitutes generated nicknames on the room board. |

Keep credentials in server-side environment settings. Never commit them or put them in the browser bundle.

### Phone and browser notes

- Use **HTTPS on a real phone** for motion and camera access. iOS motion permission must begin with a user tap.
- When motion data is unavailable, the app can use Choice Tap. A run needs at least one scored standing or tapping test; pulse alone is not enough.
- Camera pulse is experimental and depends on the camera, lighting and a still finger. It is optional and skippable.
- Image sharing depends on browser support; saving the receipt is the alternative.
- A desktop screenshot or unit test cannot establish that a phone's sensors work. Test physical devices separately.

## Explore the project

- [Architecture, contracts and scoring](docs/05-architecture.md)
- [Screen specifications](docs/04-screens-spec.md)
- [Seismograph design system](docs/design/DESIGN.md)
- [Product and engineering decisions](DECISIONS.md)
- [Full documentation index](docs/README.md)
- [Hackathon event and planning archive](docs/archive/hackathon-2026.md)

Some specifications preserve earlier plans. The source and later decisions show what is implemented today; the archive is context, not a current release checklist.
