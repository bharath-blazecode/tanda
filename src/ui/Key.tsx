import type { ButtonHTMLAttributes, ReactNode } from 'react'
/** The main button: paper-coloured, thick bottom edge, travels down when pressed.
 *  `quiet`: outlined, for secondary actions. `lit`: inverted, for Choice Tap. */
export function Key({
  children,
  quiet = false,
  lit = false,
  className = '',
  type = 'button',
  ...rest
}: { children: ReactNode; quiet?: boolean; lit?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`k-key${quiet ? ' k-key--quiet' : ''}${lit ? ' k-key--lit' : ''} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  )
}

/** A row of Keys. `cols` 2 for a pair, 3 for a trio. */
export function Keys({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return <div className={`k-keys k-keys--${cols}`}>{children}</div>
}
