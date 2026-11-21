import type { ButtonHTMLAttributes, ReactNode } from 'react';

/** The main button: paper-coloured, thick bottom edge, travels down when pressed.
 *  `quiet` variant: outlined, for secondary actions. */
export function Key({
  children,
  quiet = false,
  className = '',
  type = 'button',
  ...rest
}: { children: ReactNode; quiet?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={`k-key${quiet ? ' k-key--quiet' : ''} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}

/** A row of Keys. `cols` 2 for a pair, 3 for a trio. */
export function Keys({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return <div className={`k-keys k-keys--${cols}`}>{children}</div>;
}
