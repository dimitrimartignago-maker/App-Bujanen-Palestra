import type { Exercise, SetEntry } from '@/types/workout'

interface Props {
  exercise: Exercise
  setEntries: SetEntry[]
  onSetChange: (setIndex: number, field: keyof SetEntry, value: string | boolean) => void
}

export default function ExerciseCard({ exercise, setEntries, onSetChange }: Props) {
  const completedCount = setEntries.filter((s) => s.done).length

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-dim">
        <div>
          <h3 className="font-semibold text-white font-display">{exercise.name}</h3>
          {exercise.notes && (
            <p className="mt-0.5 text-xs text-muted">{exercise.notes}</p>
          )}
        </div>
        <span className="text-xs font-medium text-muted whitespace-nowrap">
          {completedCount}/{exercise.sets.length} set
        </span>
      </div>

      {/* Sets table */}
      <div className="px-4 py-3 space-y-2">
        {/* Column headers */}
        <div className="grid grid-cols-[28px_1fr_80px_64px_36px] gap-2 text-xs font-medium uppercase tracking-wide text-muted">
          <span>Set</span>
          <span>Target</span>
          <span>kg</span>
          <span>Reps</span>
          <span className="text-center">✓</span>
        </div>

        {exercise.sets.map((set, idx) => {
          const entry = setEntries[idx] ?? { weight: '', reps: '', done: false }
          const isDone = entry.done

          return (
            <div
              key={set.id}
              className={`grid grid-cols-[28px_1fr_80px_64px_36px] items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
                isDone ? 'bg-accent/10' : 'bg-surface-2'
              }`}
            >
              {/* Set number */}
              <span className={`text-sm font-medium ${isDone ? 'text-accent' : 'text-muted'}`}>
                {idx + 1}
              </span>

              {/* Target */}
              <span className="text-xs text-muted">
                {set.targetWeight !== null ? `${set.targetWeight} kg` : 'BW'} × {set.targetReps}
              </span>

              {/* Weight input */}
              <input
                type="number"
                min={0}
                step={0.5}
                placeholder={set.targetWeight !== null ? String(set.targetWeight) : '—'}
                value={entry.weight}
                onChange={(e) => onSetChange(idx, 'weight', e.target.value)}
                className={`w-full rounded-md border px-2 py-1 text-sm text-center outline-none transition-colors bg-surface-2 text-white ${
                  isDone ? 'border-accent/40' : 'border-dim focus:border-accent'
                }`}
              />

              {/* Reps input */}
              <input
                type="number"
                min={0}
                step={1}
                placeholder={String(set.targetReps)}
                value={entry.reps}
                onChange={(e) => onSetChange(idx, 'reps', e.target.value)}
                className={`w-full rounded-md border px-2 py-1 text-sm text-center outline-none transition-colors bg-surface-2 text-white ${
                  isDone ? 'border-accent/40' : 'border-dim focus:border-accent'
                }`}
              />

              {/* Done checkbox */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => onSetChange(idx, 'done', !isDone)}
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                    isDone
                      ? 'border-accent bg-accent text-bg'
                      : 'border-dim hover:border-accent'
                  }`}
                  aria-label={isDone ? 'Segna incompleto' : 'Segna completo'}
                >
                  {isDone && (
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
