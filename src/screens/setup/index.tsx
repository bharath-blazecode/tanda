// CARD 6. Permissions (docs/04-screens-spec.md, section 2).
// One tap to turn on motion sensors, with the reason. Android and desktop never see this screen.
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ensurePermission, type MotionPermission } from '../../sensors/motion'
import { Housing, Key, Label, Plate, Sheet } from '../../ui'

type Phase = 'idle' | 'requesting' | MotionPermission

export function Setup() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('idle')

  const ask = async () => {
    setPhase('requesting')
    const result = await ensurePermission()
    if (result === 'granted') {
      // A short pause so the screen does not flash past before the person reads it.
      setTimeout(() => navigate('/baseline'), 400)
    }
    setPhase(result)
  }

  const denied = phase === 'denied'
  const unavailable = phase === 'unsupported' || phase === 'insecure'

  return (
    <Housing>
      <Plate small serial={'Setup\n1 of 2'} />

      <Sheet grow>
        <Label paper>Before we start</Label>
        <h2>This instrument needs to feel you move.</h2>
        <p>
          One tap lets it read your phone&rsquo;s motion sensors, so it can record how much your body
          sways when you stand still.
        </p>

        {denied && (
          <p className="k-small">
            Your phone is remembering a no for this tab. Close this tab, open the link again, and tap
            Allow.
          </p>
        )}
        {unavailable && (
          <p className="k-small">
            This browser will not hand over motion. You can still do the tapping test.
          </p>
        )}

        <p className="k-small">Your readings stay on this phone. No account, nothing to sign.</p>
      </Sheet>

      {phase !== 'granted' && (
        <Key onClick={ask} disabled={phase === 'requesting'}>
          {phase === 'requesting' ? 'Asking' : denied ? 'Ask again' : 'Allow motion'}
        </Key>
      )}

      <Key quiet onClick={() => navigate('/baseline')}>
        Continue with one test
      </Key>
    </Housing>
  )
}
