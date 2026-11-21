// A stand-in for a screen nobody has built yet. Delete the usage when you build the screen.
import type { ReactNode } from 'react'
import { Link } from 'react-router'

type Props = {
  title: string
  card: string // the card on the board that owns this screen
  spec: string // where it is specified
  /** Set on a lab page for a card that is built, so /lab does not claim otherwise. */
  built?: boolean
  children?: ReactNode
}

export function Placeholder({ title, card, spec, built = false, children }: Props) {
  return (
    <main style={{ maxWidth: 420, margin: '0 auto', padding: 'var(--s5) var(--s4)' }}>
      <p style={{ color: 'var(--housing-dim)', margin: 0 }}>{card}</p>
      <h1 style={{ font: '900 36px/1 var(--display)', textTransform: 'uppercase', margin: 'var(--s2) 0' }}>{title}</h1>
      <p>{built ? 'Spec' : 'Not built yet. Spec'}: {spec}</p>
      {children}
      <p>
        <Link to="/lab">Lab</Link> · <Link to="/">Landing</Link>
      </p>
    </main>
  )
}
