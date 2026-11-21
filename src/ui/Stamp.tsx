/** The verdict. Red, rotated 7 degrees, double frame, worn ink. The only red in the app.
 *  Needs <InkFilter /> rendered once near the app root. */
export function Stamp({ verdict, note }: { verdict: string; note?: string }) {
  return (
    <div className="k-stamp" role="img" aria-label={`Verdict: ${verdict}${note ? `. ${note}` : ''}`}>
      {verdict}
      {note && <small>{note}</small>}
    </div>
  )
}
