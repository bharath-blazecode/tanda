// Add or edit one drink with its serving detail. Every number shows where it came from, and nothing
// is filled in that the person did not give: an empty volume stays unknown, an alcohol entry with no
// label detail stays a count. The logic lives in form.ts; this file only lays it out.
import { useState } from 'react'
import type { Drink, DrinkKind } from '../../../shared/contracts'
import { ALCOHOL_KINDS, CAFFEINE_KINDS } from '../../engine/serving'
import { Field, Key, Keys, Label, Segmented, Sheet, Toggle } from '../../ui'
import { caffeineModes, drinkFromForm, explainDrink, formFor, type CaffeineMode, type DrinkForm, type Fraction } from './form'
import { DRINK_LABELS, DRINK_ORDER } from './presets'

const MODE_LABELS: Record<CaffeineMode, string> = {
  default: 'App default',
  serving: 'mg in the serving',
  per100ml: 'mg per 100 mL',
  unknown: 'Not sure',
}

const FRACTIONS: { value: Fraction; label: string }[] = [
  { value: '1', label: 'All' },
  { value: '0.75', label: 'Three quarters' },
  { value: '0.5', label: 'Half' },
  { value: '0.25', label: 'A quarter' },
]

export function DrinkEditor({
  existing,
  initialKind = 'coffee',
  newId,
  onSave,
  onCancel,
  onRemove,
}: {
  existing?: Drink
  initialKind?: DrinkKind
  /** Called once, for a new entry's ID. */
  newId: () => string
  onSave: (drink: Drink) => void
  onCancel: () => void
  onRemove?: () => void
}) {
  const [now] = useState(Date.now)
  const [form, setForm] = useState<DrinkForm>(() => formFor(initialKind, now, existing))
  const [id] = useState(() => existing?.id ?? newId())
  const [tried, setTried] = useState(false)
  const set = <K extends keyof DrinkForm>(key: K, value: DrinkForm[K]) => setForm((f) => ({ ...f, [key]: value }))

  const base = { id, loggedAt: existing?.loggedAt ?? now, ...(existing?.legacy ? { legacy: true as const } : {}) }
  const result = drinkFromForm(form, base, Date.now())
  const errors = tried && !result.ok ? result.errors : {}
  const preview = result.ok ? explainDrink(result.drink) : []
  const caffeinated = CAFFEINE_KINDS.has(form.kind)
  const alcoholic = ALCOHOL_KINDS.has(form.kind)
  const modes = caffeineModes(form.kind)

  const save = () => {
    setTried(true)
    if (result.ok) onSave(result.drink)
  }

  return (
    <>
      <Sheet grow>
        <Label paper>{existing ? 'Edit this drink' : 'Add with details'}</Label>
        <Segmented
          legend="What"
          value={form.kind}
          options={DRINK_ORDER.map((kind) => ({ value: kind, label: DRINK_LABELS[kind] }))}
          onChange={(kind) =>
            setForm((f) => ({
              ...f,
              kind,
              // Switching kind keeps the time and serving, and resets a caffeine choice that no longer applies.
              caffeineMode: caffeineModes(kind).includes(f.caffeineMode) ? f.caffeineMode : caffeineModes(kind)[0],
            }))
          }
        />

        <Field
          label="When you had it"
          type="datetime-local"
          value={form.when}
          max={formFor(form.kind, Date.now()).when}
          onChange={(e) => set('when', e.target.value)}
          hint={errors.when ?? 'The time you drank it, not the time you are typing.'}
          aria-invalid={errors.when ? true : undefined}
        />
        <Toggle paper checked={form.approx} onChange={(on) => set('approx', on)} label="That time is a rough guess" />

        <Field
          label="Product or how it was made (optional)"
          value={form.name}
          maxLength={40}
          onChange={(e) => set('name', e.target.value)}
          hint={errors.name ?? 'For example: long black, double shot. Stays on this phone.'}
        />

        <Field
          label="Serving size (optional)"
          unit="mL"
          inputMode="decimal"
          value={form.servingMl}
          onChange={(e) => set('servingMl', e.target.value)}
          hint={errors.servingMl ?? 'The can, cup or glass as served. Leave empty if you do not know.'}
          aria-invalid={errors.servingMl ? true : undefined}
        />
        <Segmented legend="How much of it you drank" value={form.fraction} options={FRACTIONS} onChange={(v) => set('fraction', v)} />

        {caffeinated && (
          <>
            <Segmented
              legend="Caffeine"
              value={form.caffeineMode}
              options={modes.map((m) => ({ value: m, label: MODE_LABELS[m] }))}
              onChange={(m) => set('caffeineMode', m)}
            />
            {errors.caffeineMode && <p className="k-small">{errors.caffeineMode}</p>}
            {(form.caffeineMode === 'serving' || form.caffeineMode === 'per100ml') && (
              <>
                <Field
                  label={form.caffeineMode === 'serving' ? 'Caffeine in the serving' : 'Caffeine per 100 mL'}
                  unit={form.caffeineMode === 'serving' ? 'mg' : 'mg / 100 mL'}
                  inputMode="decimal"
                  value={form.caffeineValue}
                  onChange={(e) => set('caffeineValue', e.target.value)}
                  hint={errors.caffeineValue ?? 'Packaged drinks print this on the label. Cafe coffee varies with size, shots and beans.'}
                  aria-invalid={errors.caffeineValue ? true : undefined}
                />
                <Segmented
                  legend="Where the number came from"
                  value={form.caffeineSource}
                  options={[
                    { value: 'label', label: 'The label' },
                    { value: 'estimate', label: 'My estimate' },
                  ]}
                  onChange={(v) => set('caffeineSource', v)}
                />
              </>
            )}
          </>
        )}

        {alcoholic && (
          <>
            <p className="k-small">
              Optional. An Australian standard drink is 10 g of alcohol, and labels print how many the container holds.
              Without this, the entry stays a count.
            </p>
            <Field
              label="Standard drinks on the label"
              inputMode="decimal"
              value={form.labelStandardDrinks}
              onChange={(e) => set('labelStandardDrinks', e.target.value)}
              hint={errors.labelStandardDrinks ?? 'For the whole container as sold.'}
              aria-invalid={errors.labelStandardDrinks ? true : undefined}
            />
            <Field
              label="Strength"
              unit="% ABV"
              inputMode="decimal"
              value={form.abv}
              onChange={(e) => set('abv', e.target.value)}
              hint={errors.abv ?? 'Used with the serving size when there is no standard-drink number.'}
              aria-invalid={errors.abv ? true : undefined}
            />
            <Segmented
              legend="Where the strength came from"
              value={form.alcoholSource}
              options={[
                { value: 'label', label: 'The label' },
                { value: 'estimate', label: 'My estimate' },
              ]}
              onChange={(v) => set('alcoholSource', v)}
            />
          </>
        )}

        <Field
          label="Note (optional)"
          value={form.note}
          maxLength={140}
          onChange={(e) => set('note', e.target.value)}
          hint={errors.note ?? 'Stays on this phone.'}
        />

        <div role="status" aria-live="polite">
          {preview.map((line) => (
            <p key={line} className="k-small">
              {line}
            </p>
          ))}
        </div>
        {existing?.legacy && (
          <p className="k-small">Logged before serving detail existed. Anything you add here is your own detail.</p>
        )}
      </Sheet>
      <Keys>
        <Key onClick={save}>Save</Key>
        <Key quiet onClick={onCancel}>
          Cancel
        </Key>
      </Keys>
      {onRemove && (
        <Key quiet onClick={onRemove}>
          Remove this drink
        </Key>
      )}
    </>
  )
}
