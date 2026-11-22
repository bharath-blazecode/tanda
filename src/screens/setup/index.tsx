// CARD 6. Permissions (docs/04-screens-spec.md, section 2).
// One tap to turn on motion sensors, with the reason.
//
// Two states here matter more than they look:
// - Android and desktop have no permission API, so this screen must not show a prompt that does
//   nothing. It proves the sensor works by listening for one sample, then gets out of the way.
// - A permission can be granted and still deliver nothing. That is what an in-app browser does,
//   and the room gets this link through Slack, so it is the likeliest way a judge gets stuck.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import {
  detectMotion,
  motionSupport,
  setMotionAvailability,
  type MotionPermission,
} from '../../sensors/motion'
import { Housing, Key, Label, Plate, Sheet } from '../../ui'

type Phase = 'checking' | 'idle' | 'requesting' | 'no-samples' | MotionPermission

/** A pause after success, so the screen does not flash past before it can be read. */
const HANDOVER_MS = 400

/** Brave is the one browser that says no to motion without asking, so only it gets the hint. */
function isBrave(): boolean {
  return 'brave' in globalThis.navigator
}

export function Setup() {
  const navigate = useNavigate()
  const location = useLocation()
  // Where Setup hands over: the quick demo goes to an example check, everything else to a baseline.
  // A boolean, so the callbacks below keep a stable identity across renders.
  const toExample = (location.state as { next?: unknown } | null)?.next === 'example'
  const goNext = useCallback(
    () => (toExample ? navigate('/check', { state: { reference: 'example' } }) : navigate('/baseline')),
    [navigate, toExample],
  )
  const [phase, setPhase] = useState<Phase>('checking')
  const [copied, setCopied] = useState(false)
  const timers = useRef<number[]>([])

  useEffect(
    () => () => {
      for (const t of timers.current) window.clearTimeout(t)
    },
    [],
  )

  const handOver = useCallback(() => {
    timers.current.push(window.setTimeout(goNext, HANDOVER_MS))
  }, [goNext])

  // detectMotion records the outcome for Baseline and Check; this only picks what to show.
  const settle = useCallback(
    (result: MotionPermission | 'no-data') => {
      setPhase(result === 'no-data' ? 'no-samples' : result)
      if (result === 'granted') handOver()
    },
    [handOver],
  )

  // Android and desktop ask nothing. Listen for one usable sample and move on if it arrives.
  useEffect(() => {
    let cancelled = false
    if (motionSupport() === 'needs-tap') {
      setPhase('idle')
      return
    }
    void detectMotion().then((result) => {
      if (!cancelled) settle(result)
    })
    return () => {
      cancelled = true
    }
  }, [settle])

  // Runs inside the tap, so iOS can show its prompt. Granted is not the same as working.
  const ask = () => {
    setPhase(motionSupport() === 'needs-tap' ? 'requesting' : 'checking')
    void detectMotion().then(settle)
  }

  const oneTest = () => {
    setMotionAvailability('unavailable')
    goNext()
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
            <h2>This browser is not sending motion data.</h2>
            <p>You can still do the tapping test. Your reading will be marked partial.</p>
            {isBrave() && (
              <p className="k-small">
                Brave blocks motion sensors for every site, and its Shields switch does not change
                that. To turn them on: menu, Settings, Site settings, Motion sensors, allow. Then
                come back and tap Try again.
              </p>
            )}
            <p className="k-small">
              Or open the link in another browser, like Safari or Chrome. Apps that show pages
              inside themselves often keep motion to themselves.
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
              <>
                <p className="k-small">
                  Your phone is remembering a no for this tab. Close this tab, open the link again,
                  and tap Allow.
                </p>
                {/* Brave says no without ever asking, so the tab trick does not help there. */}
                {isBrave() && (
                  <p className="k-small">
                    Brave blocks motion sensors for every site, and its Shields switch does not change
                    that. To turn them on: menu, Settings, Site settings, Motion sensors, allow.
                  </p>
                )}
              </>
            )}
            {unavailable && (
              <p className="k-small">
                This browser will not hand over motion. You can still do the tapping test.
              </p>
            )}
          </>
        )}

        <p className="k-small">
          Motion and camera readings are worked out on this phone. The raw samples are never uploaded. No account.
        </p>
      </Sheet>

      {(phase === 'idle' || phase === 'requesting') && (
        <Key onClick={ask} disabled={phase === 'requesting'}>
          {phase === 'requesting' ? 'Asking' : 'Allow motion'}
        </Key>
      )}

      {/* Always a way forward. Once motion has failed, it is the main key, not a footnote. */}
      {phase !== 'granted' && (
        <Key quiet={phase === 'checking' || phase === 'idle' || phase === 'requesting'} onClick={oneTest}>
          Continue with one test
        </Key>
      )}

      {(stuck || denied) && (
        <Key quiet onClick={ask}>
          {denied ? 'Ask again' : 'Try again'}
        </Key>
      )}

      {stuck && (
        <Key quiet onClick={copyLink}>
          {copied ? 'Copied' : 'Copy the link'}
        </Key>
      )}
    </Housing>
  )
}
