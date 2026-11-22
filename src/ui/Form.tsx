// Form controls in the instrument's materials: native inputs underneath, so keyboard, screen reader
// and autofill behaviour come from the browser rather than from us.
import { useId, type InputHTMLAttributes, type ReactNode } from 'react'

/** A labelled switch. A native checkbox, drawn as an engraved toggle; `paper` for use on a sheet. */
export function Toggle({
  checked,
  onChange,
  label,
  hint,
  paper = false,
  disabled = false,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  hint?: ReactNode
  paper?: boolean
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className={`k-toggle${paper ? ' k-toggle--paper' : ''}`}>
      <input
        id={id}
        type="checkbox"
        className="k-toggle__box"
        checked={checked}
        disabled={disabled}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(event) => onChange(event.target.checked)}
      />
      <label htmlFor={id} className="k-toggle__label">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="k-toggle__hint">
          {hint}
        </p>
      )}
    </div>
  )
}

/** One choice from a few, as a row of keys. A native radio group, so arrow keys move between them. */
export function Segmented<T extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: ReactNode
  value: T | null
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  const name = useId()
  return (
    <fieldset className="k-segmented">
      <legend className="k-label k-label--paper">{legend}</legend>
      <div className="k-segmented__row">
        {options.map((option) => (
          <label key={option.value} className={`k-segmented__item${value === option.value ? ' is-on' : ''}`}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** A labelled paper field. `unit` is printed after the input, e.g. "mL" or "mg". */
export function Field({
  label,
  hint,
  unit,
  ...input
}: { label: ReactNode; hint?: ReactNode; unit?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <div className="k-field">
      <label htmlFor={id} className="k-label k-label--paper">
        {label}
      </label>
      <div className="k-field__row">
        <input id={id} className="k-field__input" aria-describedby={hint ? `${id}-hint` : undefined} {...input} />
        {unit && <span className="k-field__unit">{unit}</span>}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="k-field__hint">
          {hint}
        </p>
      )}
    </div>
  )
}
