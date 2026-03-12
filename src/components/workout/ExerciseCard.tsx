import type { Exercise, SetEntry } from '@/types/workout'

interface Props {
  exercise: Exercise
  setEntries: SetEntry[]
  onSetChange: (setIndex: number, field: keyof SetEntry, value: string | boolean) => void
}

export default function ExerciseCard({ exercise, setEntries, onSetChange }: Props) {
  const completedCount = setEntries.filter((s) => s.done).length

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <h3 className="font-semibold text-gray-900">{exercise.name}</h3>
          {exercise.notes && (
            <p className="mt-0.5 text-xs text-gray-400">{exercise.notes}</p>
          )}
        </div>
        <span className="text-xs font-medium text-gray-400 whitespace-nowrap">
          {completedCount}/{exercise.sets.length} sets
        </span>
      </div>

      {/* Sets table */}
      <div className="px-4 py-3 space-y-2">
        {/* Column headers */}
        <div className="grid grid-cols-[28px_1fr_80px_64px_36px] gap-2 text-xs font-medium uppercase tracking-wide text-gray-400">
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
                isDone ? 'bg-green-50' : 'bg-gray-50'
              }`}
            >
              {/* Set number */}
              <span className={`text-sm font-medium ${isDone ? 'text-green-600' : 'text-gray-500'}`}>
                {idx + 1}
              </span>

              {/* Target */}
              <span className="text-xs text-gray-400">
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
                className={`w-full rounded-md border px-2 py-1 text-sm text-center outline-none transition-colors ${
                  isDone
                    ? 'border-green-200 bg-green-50 text-green-800'
                    : 'border-gray-200 bg-white focus:border-black'
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
                className={`w-full rounded-md border px-2 py-1 text-sm text-center outline-none transition-colors ${
                  isDone
                    ? 'border-green-200 bg-green-50 text-green-800'
                    : 'border-gray-200 bg-white focus:border-black'
                }`}
              />

              {/* Done checkbox */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => onSetChange(idx, 'done', !isDone)}
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                    isDone
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-gray-300 hover:border-green-400'
                  }`}
                  aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
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
