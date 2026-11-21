// CARD 6. Permissions (docs/04-screens-spec.md, section 2).
// One tap to turn on motion sensors, with the reason.
//
// Two states here matter more than they look:
// - Android and desktop have no permission API, so this screen must not show a prompt that does
//   nothing. It proves the sensor works by listening for one sample, then gets out of the way.
// - A permission can be granted and still deliver nothing. That is what an in-app browser does,
//   and the room gets this link through Slack, so it is the likeliest way a judge gets stuck.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { ensurePermission, subscribe, type MotionPermission } from '../../sensors/motion'
import { Housing, Key, Label, Plate, Sheet } from '../../ui'

type Phase = 'checking' | 'idle' | 'requesting' | 'no-samples' | MotionPermission

/** How long to wait for the first sample before deciding nothing is coming. */
const FIRST_SAMPLE_MS = 1000

/** A pause after success, so the screen does not flash past before it can be read. */
const HANDOVER_MS = 400

function hasPermissionApi(): boolean {
  const ctor = globalThis.DeviceMotionEvent as (typeof DeviceMotionEvent & { requestPermission?: unknown }) | undefined
  return typeof ctor?.requestPermission === 'function'
}

export function Setup() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('checking')
  const [copied, setCopied] = useState(false)
  const timers = useRef<number[]>([])

  useEffect(
    () => () => {
      for (const t of timers.current) window.clearTimeout(t)
    },
    [],
  )

  /** Resolves once a sample arrives, or false if none does. A granted permission is not proof. */
  const waitForSample = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        let settled = false
        const stop = subscribe(() => {
          if (settled) return
          settled = true
          stop()
          resolve(true)
        })
        timers.current.push(
          window.setTimeout(() => {
            if (settled) return
            settled = true
            stop()
            resolve(false)
          }, FIRST_SAMPLE_MS),
        )
      }),
    [],
  )

  const handOver = useCallback(() => {
    timers.current.push(window.setTimeout(() => navigate('/baseline'), HANDOVER_MS))
  }, [navigate])

  // Android and desktop ask nothing. Listen for one sample and move on if it arrives.
  useEffect(() => {
    let cancelled = false
    if (hasPermissionApi()) {
      setPhase('idle')
      return
    }
    void waitForSample().then((ok) => {
      if (cancelled) return
      if (ok) {
        setPhase('granted')
        handOver()
      } else {
        setPhase('no-samples')
      }
    })
    return () => {
      cancelled = true
    }
  }, [waitForSample, handOver])

  const ask = async () => {
    setPhase('requesting')
    const result = await ensurePermission()
    if (result !== 'granted') {
      setPhase(result)
      return
    }
    // Granted is not the same as working.
    const ok = await waitForSample()
    setPhase(ok ? 'granted' : 'no-samples')
    if (ok) handOver()
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const denied = phase === 'denied'
  const unavailable = phase === 'unsupported' || phase === 'insecure'
  const stuck = phase === 'no-samples'

  return (
    <Housing>
      <Plate small serial={'Setup\n1 of 2'} />

      <Sheet grow>
        <Label paper>Before we start</Label>

        {stuck ? (
          <>
            <h2>This browser is holding the sensors back.</h2>
            <p>
              Open the link in Safari or Chrome instead. Apps that show pages inside themselves often
              keep motion to themselves.
            </p>
            <p className="k-small">{copied ? 'Link copied.' : window.location.origin}</p>
          </>
        ) : (
          <>
            <h2>This instrument needs to feel you move.</h2>
            <p>
              One tap lets it read your phone&rsquo;s motion sensors, so it can record how much your
              body sways when you stand still.
            </p>
            {denied && (
              <p className="k-small">
                Your phone is remembering a no for this tab. Close this tab, open the link again, and
                tap Allow.
              </p>
            )}
            {unavailable && (
              <p className="k-small">
                This browser will not hand over motion. You can still do the tapping test.
              </p>
            )}
          </>
        )}

        <p className="k-small">Your readings stay on this phone. No account, nothing to sign.</p>
      </Sheet>

      {stuck && <Key onClick={copyLink}>{copied ? 'Copied' : 'Copy the link'}</Key>}

      {(phase === 'idle' || phase === 'requesting' || denied) && (
        <Key onClick={ask} disabled={phase === 'requesting'}>
          {phase === 'requesting' ? 'Asking' : denied ? 'Ask again' : 'Allow motion'}
        </Key>
      )}

      {phase !== 'checking' && phase !== 'granted' && (
        <Key quiet onClick={() => navigate('/baseline')}>
          Continue with one test
        </Key>
      )}
    </Housing>
  )
}
