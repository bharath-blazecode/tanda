# Card 13. Pulse from the camera

A fingertip over the rear camera, 18 seconds, one number: `Pulse: 74 bpm`.

## Why autocorrelation and not beat counting

Counting peaks needs each beat to be found correctly. At 30 frames a second a frame is 33 ms,
the signal is a few units of brightness, and one bad frame moves the answer a lot.
Autocorrelation uses the whole capture at once and asks "what period does this repeat at",
so a few bad frames do not matter.

Two details that are easy to get wrong:

- **Take the first strong peak, not the tallest.** A periodic signal autocorrelates at its period
  and again at every multiple of it, and a later peak is often taller. Taking the tallest reports
  half the real rate. There is a test for this, at 120 bpm.
- **The slow filter window must be longer than one beat.** The band-pass subtracts a slow moving
  average to remove drift and finger pressure. At 40 bpm a beat is 1.5 s, so a window shorter than
  that removes the pulse along with the drift.

## What is deliberately not here

No beat-to-beat variability (rMSSD). D46 checked that claim: the validations against ECG used five
minutes, stillness, and either 240 frames a second or purpose-built processing. At 30 frames a
second the frame alone adds about 24 ms of noise to a number that is normally 20 to 60 ms.
It is not computed, so it cannot leak onto the ticket.

## How it counts

Capped at 0.5 against a verdict threshold of 1.5 (`src/engine/classify.ts`), and only when both the
baseline and the check have a pulse. It can tip a borderline reading and can never produce a
verdict on its own. A lower pulse never reduces drift. See D46.

## Failing is normal

`not-covered`, `no-rhythm`, `too-short`, permission denied, no camera: all ordinary outcomes.
The step is skippable in one tap and a failure never marks a result partial.

## Verified

Driven in Chromium against a synthetic 64x64 fingertip video modulated at exactly 72 bpm
(`--use-file-for-fake-video-capture`). Read back 72 bpm, released the camera track on finish and
on skip, and refused the default fake camera as not covered.
