/** The boxed, fixed-wording line. Safety copy is never funny and never changes,
 *  so this component takes no props that alter its words. */
export const SAFETY_TEXT = 'Not a driving test. If you are going anywhere, get a ride or a friend.'
export function SafetyLine() {
  return <p className="k-safety">{SAFETY_TEXT}</p>
}
