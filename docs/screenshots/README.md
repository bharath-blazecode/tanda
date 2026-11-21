# README screenshots

These PNGs are captures of the existing Kachka app, not design mockups. They were captured from the documentation branch's base, `861494b` (main, 21 November 2026), using headless Chromium at a **430 × 932 CSS-pixel mobile viewport**, **2× pixel density**, and reduced motion.

| Image | Screen and capture state |
|---|---|
| [landing.png](landing.png) | `/`, with the fictional display name **Las Nubes** entered. The Start and Quick demo controls are visible. |
| [choice-tap.png](choice-tap.png) | `/check`, after starting a check, skipping Stand Still and starting Choice Tap. One target is lit. A synthetic baseline is loaded only into this browser context; no physical sensor measurements are implied. |
| [receipt.png](receipt.png) | `/result?preview`, cropped to the app's existing result shell. This is the explicitly labelled sample-data receipt, including its illustrative traces and safety message. |

The captures contain no API keys, venue credentials or real participant readings. The synthetic browser record has room sharing disabled. They demonstrate the interface, not a physical-phone sensor test, medical accuracy or a live Claude response.

To refresh them, run the app as described in the [README](../../README.md), use a fresh browser context at the same viewport and wait for the local fonts to load. Use a fictional name, keep synthetic data out of the shared room, and retain the receipt's sample-data label and safety message. Save updated images here; no application changes are needed.
