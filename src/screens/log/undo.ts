// One step back for the drink log. Each change records exactly what it did, so undoing it touches
// only that entry and never restores a stale copy of the whole log.
import type { Drink } from '../../../shared/contracts'

export type UndoOp =
  | { kind: 'added'; id: string }
  | { kind: 'edited'; previous: Drink }
  | { kind: 'removed'; previous: Drink }

export function applyUndo(drinks: readonly Drink[], op: UndoOp): Drink[] {
  switch (op.kind) {
    case 'added':
      return drinks.filter((d) => d.id !== op.id)
    case 'edited':
      return drinks.map((d) => (d.id === op.previous.id ? op.previous : d))
    case 'removed':
      return drinks.some((d) => d.id === op.previous.id) ? [...drinks] : [...drinks, op.previous]
  }
}

export function readUndo(state: unknown): UndoOp | null {
  const op = (state as { undo?: unknown } | null)?.undo as Partial<UndoOp> | undefined
  if (!op || typeof op !== 'object') return null
  if (op.kind === 'added' && typeof op.id === 'string') return { kind: 'added', id: op.id }
  if ((op.kind === 'edited' || op.kind === 'removed') && op.previous && typeof op.previous === 'object') {
    return op as UndoOp
  }
  return null
}

export function undoLabel(op: UndoOp): string {
  return op.kind === 'added' ? 'Undo that drink' : op.kind === 'edited' ? 'Undo the edit' : 'Undo the removal'
}
