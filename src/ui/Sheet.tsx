import type { ReactNode } from 'react';

/** Paper inside the housing, for screens that are words rather than a trace.
 *  Text on paper is left-aligned, like a receipt. */
export function Sheet({ children, className = '', grow = false }: { children: ReactNode; className?: string; grow?: boolean }) {
  return <div className={`k-sheet ${className}`.trim()} style={grow ? { flex: 1 } : undefined}>{children}</div>;
}
