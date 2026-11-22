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

## Stable readings and retries

The reporting range is **40 to 180 bpm**, a limit of this camera feature rather than a definition
of a normal pulse. A clear 48 bpm signal is retained. Out-of-range or unsupported signals are
rejected, never rounded up to an average-looking pulse.

The analyzer looks for a real correlation peak before applying that range. It inspects faster
and slower periods as well, so a fast fundamental is not silently replaced by a half-rate
harmonic. Flat channels, sparse frames, non-finite or backwards timestamps, camera gaps over
250 ms and incompatible rates at the beginning and end cannot produce an ordinary reading.
Frames must average at least 12 samples per second. Where the browser exposes presented-frame
counts, the capture loop samples each video frame only once.

**Try again · same finger** can use evidence less than 90 seconds old from the last two captures in this step. Each capture
is analyzed separately; time gaps and separate attempts are never stitched into a continuous
waveform. If both contain a credible contiguous section of at least eight seconds, and their
rates agree within 8 bpm or 10%, those sections can support a rough estimate. Contradictory
sections, stale attempts, and old evidence without usable new data cannot rescue a reading.
A good new standalone reading takes priority over history.

Rough results say **About … bpm**. Retry estimates explain that they use usable sections of both
readings. They are displayed only and do not enter the baseline or verdict calculation. Skip,
Next, backgrounding and leaving the pulse step clear retry history; no raw camera data is persisted or uploaded.
A camera permission response that arrives after cancellation cannot restart the capture.

Synthetic tests cover rate boundaries, out-of-band harmonics, constant/noisy signals, frame
gaps, changing rates and retry recovery. These checks cannot establish accuracy on a physical
phone or replace comparison with a trusted pulse measurement on that device.

The [B1 verification record](../../../docs/portfolio/PULSE-B1.md) gives acquisition compatibility rules and the physical-phone protocol.
