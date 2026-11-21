import { Logo } from './Logo'
import { Label } from './Label'
/** The nameplate row: mark and name on the left, serial text on the right, a rule under it.
 *  The name comes from one constant so the whole app renames in one place. */
export const APP_NAME = 'Kachka'
export function Plate({
  name = APP_NAME,
  serial,
  small = false,
}: {
  name?: string
  /** Right-hand serial text. Use \n for a second line, e.g. "Body drift recorder\nModel BC-2". */
  serial?: string
  small?: boolean
}) {
  return (
    <div className={`k-plate${small ? ' k-plate--small' : ''}`}>
      <div className="k-plate__brand">
        <span className="k-plate__mark"><Logo /></span>
        <div className="k-plate__name">{name}</div>
      </div>
      {serial && (
        <Label className="k-plate__serial">
          {serial.split('\n').map((line, i) => (
            <span key={i}>{i > 0 && <br />}{line}</span>
          ))}
        </Label>
      )}
    </div>
  )
}
