---
name: phone
description: Open the local dev build on a real phone over HTTPS, using a cloudflared quick tunnel. Use when someone needs to test motion sensors, the camera, touch timing or iOS permissions, or says "test on my phone", "open it on the iPhone", "tunnel".
---

# Testing on a real phone

Motion sensors and the camera only work on HTTPS, and iPhone only grants motion access from a tap. A
desktop browser tells you almost nothing about cards 3, 4 and 13. This gets the dev build onto a phone in
about a minute, with hot reload.

## Steps

1. Start the app if it is not running: `npm run dev` (web on 5173, API on 3333).
2. Start a tunnel in a second terminal:

   ```bash
   cloudflared tunnel --url http://localhost:5173
   ```

   If `cloudflared` is missing: `brew install cloudflared` (macOS) or see Cloudflare's install page.
3. It prints a URL ending in `.trycloudflare.com`. Open it on the phone. `vite.config.ts` already allows
   that host.
4. Go to `/lab` and open the piece under test.

## What to check on the phone

- **iPhone Safari and Android Chrome both.** They differ on permissions, audio and sensor rounding.
- **With wifi off**, on mobile data, at least once.
- **Opened from inside Slack**, because that is how the room will get the link. In-app browsers often
  block sensors: the app must offer "Open in Safari / Chrome".
- For motion: log the sample rate and a few raw values. Chrome on Android rounds acceleration to
  0.1 m/s² and rotation rate to 0.1 deg/s.

## Rules

- A tunnel is for development only. Never put a tunnel URL in the QR code or the pitch.
- The tunnel URL changes every time it starts. Do not commit it.
- Stop the tunnel when done (Ctrl-C).
