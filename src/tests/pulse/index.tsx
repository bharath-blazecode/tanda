// CARD 13. The optional third step: a fingertip over the rear camera (D46).
// It prints one row, "Pulse: 74 bpm". It is skippable in one tap, and a failed reading is an
// ordinary outcome that never marks a result partial and never decides a verdict.
// No variability figure is shown: D46 checked that claim and it does not hold at this frame rate.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Key, Label, Rows, Sheet } from '../../ui'
import { sampleFrame, startCamera, stopCamera, tryTorch, type CameraPermission } from '../../sensors/camera'
import {
  CAPTURE_SECONDS,
  SETTLE_SECONDS,
  analyzePulseAttempts,
  type PulseAnalysis,
  type PulseAttempt,
  type PulseSample,
} from './analyze'
import './pulse.css'

/** Only a clear reading carries a rate onward. Skipped, unreadable and rough readings carry null. */
type Props = { onDone: (bpm: number | null) => void; label?: string }

type Phase = 'intro' | 'asking' | 'blocked' | 'settling' | 'reading' | 'result'

/** Coverage has to hold this long before the clock starts, so a passing shadow does not start it. */
const COVER_HOLD_MS = 500
const TOTAL_MS = (SETTLE_SECONDS + CAPTURE_SECONDS) * 1000
/** How many points the live trace keeps. Cosmetic only; the rate is read from every sample. */
const TRACE_POINTS = 140

const BLOCKED_REASON: Record<CameraPermission, string> = {
  granted: '',
  denied: 'No camera access. You can turn it on in your browser settings, or skip this step.',
  unsupported: 'This browser will not give us the camera. Skip this step.',
  insecure: 'The camera needs a secure connection. Skip this step.',
  'no-camera': 'No rear camera found. Skip this step.',
}

const FAILURE_TEXT: Record<Exclude<PulseAnalysis['reason'], 'ok'>, string> = {
  'too-short': 'That was too short to read. Try again, or skip.',
  'not-covered': 'The lens was not covered for long enough. Cover it completely, then try again.',
  'no-rhythm': 'No steady rhythm in that one. Hold still, press gently, then try again.',
}

export function PulseTest({ onDone, label = 'Optional · Pulse' }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [blocked, setBlocked] = useState<string>('')
  const [covered, setCovered] = useState(false)
  const [litTorch, setLitTorch] = useState(false)
  const [left, setLeft] = useState(SETTLE_SECONDS + CAPTURE_SECONDS)
  const [result, setResult] = useState<PulseAnalysis | null>(null)
  const [trace, setTrace] = useState<number[]>([])

  const video = useRef<HTMLVideoElement | null>(null)
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const frame = useRef<number | null>(null)
  const samples = useRef<PulseSample[]>([])
  // Retry context belongs to this pulse step only, never to the person's stored reading.
  const attempts = useRef<PulseAttempt[]>([])
  const generation = useRef(0)
  const coveredSince = useRef<number | null>(null)
  const startedAt = useRef<number | null>(null)
  const presentedFrame = useRef<number | null>(null)
  const phaseRef = useRef<Phase>('intro')

  const setPhaseBoth = useCallback((next: Phase) => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  const teardown = useCallback(() => {
    generation.current += 1
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    stopCamera(stream.current)
    stream.current = null
    if (video.current) video.current.srcObject = null
  }, [])

  // Hard requirement: the camera light must go out when this component leaves the screen.
  useEffect(() => () => {
    teardown()
    attempts.current = []
    samples.current = []
  }, [teardown])

  const finish = useCallback(() => {
    const now = performance.now()
    teardown()
    attempts.current = [...attempts.current, { samples: samples.current, endedAt: now }].slice(-2)
    const analysis = analyzePulseAttempts(attempts.current, now)
    setResult(analysis)
    setPhaseBoth('result')
  }, [teardown, setPhaseBoth])

  const tick = useCallback((run: number) => {
    if (run !== generation.current) return
    frame.current = null
    const element = video.current
    const sheet = canvas.current
    if (!element || !sheet) return
    const now = performance.now()

    // A stalled camera must still finish the timed capture. Repeated frames do not count as
    // new measurements, but the clock keeps running while we wait for the next real frame.
    if (phaseRef.current === 'reading' && startedAt.current !== null) {
      const elapsed = now - startedAt.current
      setLeft(Math.max(0, Math.ceil((TOTAL_MS - elapsed) / 1000)))
      if (elapsed >= TOTAL_MS) {
        finish()
        return
      }
    }

    const presented = element.getVideoPlaybackQuality?.().totalVideoFrames
    if (presented !== undefined) {
      if (presented === presentedFrame.current) {
        frame.current = requestAnimationFrame(() => tick(run))
        return
      }
      presentedFrame.current = presented
    }
    const sample = sampleFrame(element, sheet, now)

    if (sample) {
      setCovered(sample.covered)

      if (phaseRef.current === 'settling') {
        if (sample.covered) {
          if (coveredSince.current === null) coveredSince.current = now
          if (now - coveredSince.current >= COVER_HOLD_MS) {
            samples.current = []
            startedAt.current = now
            setPhaseBoth('reading')
          }
        } else {
          coveredSince.current = null
        }
      }

      if (phaseRef.current === 'reading') {
        // All three channels: green usually carries the clearest pulse even though the lens
        // looks red, and analyze picks whichever reads best.
        samples.current.push({
          t: sample.t,
          red: sample.red,
          green: sample.green,
          blue: sample.blue,
          covered: sample.covered,
        })
        setTrace((old) => [...old, sample.red].slice(-TRACE_POINTS))
      }
    }
    frame.current = requestAnimationFrame(() => tick(run))
  }, [finish, setPhaseBoth])

  const begin = useCallback(async () => {
    teardown()
    const run = generation.current
    setResult(null)
    setTrace([])
    setCovered(false)
    setLitTorch(false)
    setBlocked('')
    samples.current = []
    coveredSince.current = null
    startedAt.current = null
    presentedFrame.current = null
    setLeft(SETTLE_SECONDS + CAPTURE_SECONDS)
    setPhaseBoth('asking')

    const opened = await startCamera()
    if (run !== generation.current) {
      if ('stream' in opened) stopCamera(opened.stream)
      return
    }
    if ('error' in opened) {
      setBlocked(BLOCKED_REASON[opened.error])
      setPhaseBoth('blocked')
      return
    }
    stream.current = opened.stream
    const element = video.current
    if (element) {
      element.srcObject = opened.stream
      try {
        await element.play()
      } catch {
        // Autoplay can refuse even a muted stream; the frames still arrive.
      }
    }
    if (run !== generation.current) {
      stopCamera(opened.stream)
      return
    }
    const torch = await tryTorch(opened.stream)
    if (run !== generation.current) {
      stopCamera(opened.stream)
      return
    }
    setLitTorch(torch)
    setPhaseBoth('settling')
    frame.current = requestAnimationFrame(() => tick(run))
  }, [teardown, tick, setPhaseBoth])

  const complete = useCallback((bpm: number | null) => {
    teardown()
    attempts.current = []
    samples.current = []
    onDone(bpm)
  }, [teardown, onDone])

  const skip = useCallback(() => {
    setPhaseBoth('intro')
    complete(null)
  }, [complete, setPhaseBoth])

  // The trace is drawn against its own window, so a dim iPhone frame looks the same as a bright one.
  const low = trace.length ? Math.min(...trace) : 0
  const high = trace.length ? Math.max(...trace) : 1
  const span = high - low || 1
  const points = trace
    .map((v, i) => `${(i / Math.max(1, TRACE_POINTS - 1)) * 100},${28 - ((v - low) / span) * 24 - 2}`)
    .join(' ')

  return (
    <div className="pulse">
      {/* Machinery, not decoration: both stay in the tree so the stream has somewhere to go. */}
      <video ref={video} className="k-pulse__video" playsInline muted autoPlay />
      <canvas ref={canvas} className="k-pulse__canvas" />

      {phase === 'intro' && (
        <>
          <Sheet grow>
            <Label paper>{label}</Label>
            <h2>Pulse</h2>
            <p>Cover the rear camera with the pad of one fingertip. Rest your hand on something.</p>
            <Rows
              items={[
                ['Takes', `${SETTLE_SECONDS + CAPTURE_SECONDS} seconds`],
                ['This step', 'Optional'],
              ]}
            />
          </Sheet>
          <Key onClick={begin}>Start</Key>
          <Key quiet onClick={skip}>
            Skip
          </Key>
        </>
      )}

      {phase === 'asking' && (
        <>
          <Sheet grow>
            <Label paper>{label}</Label>
            <p>Asking for the camera.</p>
          </Sheet>
          <Key quiet onClick={skip}>
            Skip
          </Key>
        </>
      )}

      {phase === 'blocked' && (
        <>
          <Sheet grow>
            <Label paper>{label}</Label>
            <h2>No reading</h2>
            <p>{blocked}</p>
          </Sheet>
          <Key onClick={skip}>Skip</Key>
        </>
      )}

      {phase === 'settling' && (
        <>
          <Sheet grow>
            <Label paper>{label}</Label>
            <h2>{covered ? 'Hold it there' : 'Cover the lens'}</h2>
            <p>
              {covered
                ? 'Keep still. The clock starts once it is steady.'
                : 'The pad of one fingertip, over the whole lens.'}
            </p>
            {!litTorch && <Label paper>No torch on this phone, so find good light.</Label>}
          </Sheet>
          <Key quiet onClick={skip}>
            Skip
          </Key>
        </>
      )}

      {phase === 'reading' && (
        <>
          <Sheet grow>
            <Label paper>{label}</Label>
            <svg className="k-pulse__trace" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
              <polyline points={points} />
            </svg>
            <h2>{covered ? `${left}s` : 'Cover the lens'}</h2>
            <p role="status" aria-live="polite">
              {covered ? 'Reading.' : 'Keep the lens covered or this one will not count.'}
            </p>
          </Sheet>
          <Key quiet onClick={skip}>
            Skip
          </Key>
        </>
      )}

      {phase === 'result' && result && result.reason === 'ok' && (
        <>
          <Sheet grow>
            <Label paper>{label}</Label>
            <h2>{result.rough ? 'About ' : ''}{result.bpm} bpm</h2>
            <p>
              {result.combined
                ? 'An approximate pulse from the usable parts of both readings.'
                : result.rough
                  ? 'An approximate pulse from a weak signal.'
                  : 'Average over the reading.'}
            </p>
            {result.rough && <p>This estimate is not used to score your result. Try again for a clearer reading, or continue.</p>}
          </Sheet>
          <Key onClick={() => complete(result.rough ? null : result.bpm)}>Next</Key>
          <Key quiet onClick={begin}>
            Again
          </Key>
        </>
      )}

      {phase === 'result' && result && result.reason !== 'ok' && (
        <>
          <Sheet grow>
            <Label paper>{label}</Label>
            <h2>No reading</h2>
            <p>{FAILURE_TEXT[result.reason]}</p>
            {/* The numbers behind the failure. A pulse can only be debugged on the phone it
                failed on, and "no reading" alone tells nobody anything. */}
            <Rows
              items={[
                ['Lens covered', `${Math.round(result.coveredFraction * 100)}%`],
                ['Rhythm found', result.confidence.toFixed(2)],
                ['Frames', `${result.samples} in ${Math.round(result.seconds)}s`],
                // Near zero means the camera flattened the signal, not that there is no pulse.
                ['Signal', `${result.modulation.toFixed(2)}%`],
              ]}
            />
          </Sheet>
          <Key onClick={begin}>Try again</Key>
          <Key quiet onClick={skip}>
            Skip
          </Key>
        </>
      )}
    </div>
  )
}
