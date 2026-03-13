'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  getProgramDays,
  addProgramDay,
  removeProgramDay,
  addExercise,
  removeExercise,
  updateExerciseRestSeconds,
  upsertExerciseWeek,
  removeExerciseWeek,
  type ProgramDay,
  type ProgramExercise,
  type ExerciseWeek,
} from '@/lib/trainer'

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Props {
  programId: string
  programName: string
}

interface WeekRow {
  weekNumber: number
  setCount: number
  targetReps: number
  targetWeight: string // string for input
  id?: string
}

function weekRowFromDb(ew: ExerciseWeek): WeekRow {
  return {
    weekNumber: ew.week_number,
    setCount: ew.set_count,
    targetReps: ew.target_reps,
    targetWeight: ew.target_weight != null ? String(ew.target_weight) : '',
    id: ew.id,
  }
}

interface ExerciseFormState {
  name: string
  notes: string
  restSeconds: number
}

export default function ProgramEditor({ programId, programName }: Props) {
  const [days, setDays] = useState<ProgramDay[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [activeDay, setActiveDay] = useState<number>(0) // day_index 0-6
  const [addingExercise, setAddingExercise] = useState<string | null>(null) // dayId
  const [exerciseForm, setExerciseForm] = useState<ExerciseFormState>({ name: '', notes: '', restSeconds: 90 })
  const [weekRows, setWeekRows] = useState<Record<string, WeekRow[]>>({}) // exerciseId → rows
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const data = await getProgramDays(supabase, programId)
    setDays(data)

    // Pre-populate weekRows from loaded data
    const rows: Record<string, WeekRow[]> = {}
    for (const day of data) {
      for (const ex of day.exercises) {
        rows[ex.id] = ex.exercise_weeks.map(weekRowFromDb)
      }
    }
    setWeekRows(rows)
    setLoaded(true)
    setLoading(false)
  }, [programId])

  // Load on first render of the expanded editor
  if (!loaded && !loading) {
    load()
  }

  const currentDay = days?.find((d) => d.day_index === activeDay)

  async function handleAddDay() {
    if (!days) return
    const supabase = createClient()
    const label = DAY_LABELS[activeDay]
    const newDay = await addProgramDay(supabase, programId, activeDay, label)
    if (newDay) {
      setDays([...days, newDay].sort((a, b) => a.day_index - b.day_index))
    }
  }

  async function handleRemoveDay(dayId: string) {
    if (!confirm('Remove this training day and all its exercises?')) return
    const supabase = createClient()
    await removeProgramDay(supabase, dayId)
    setDays((prev) => prev?.filter((d) => d.id !== dayId) ?? [])
  }

  async function handleAddExercise(dayId: string) {
    if (!exerciseForm.name.trim()) return
    setSaving(true)
    const supabase = createClient()
    const ex = await addExercise(supabase, dayId, exerciseForm.name, exerciseForm.notes, exerciseForm.restSeconds)
    if (ex) {
      setDays((prev) =>
        prev?.map((d) =>
          d.id === dayId ? { ...d, exercises: [...d.exercises, ex] } : d
        ) ?? []
      )
      setWeekRows((prev) => ({ ...prev, [ex.id]: [] }))
    }
    setExerciseForm({ name: '', notes: '', restSeconds: 90 })
    setAddingExercise(null)
    setSaving(false)
  }

  async function handleSaveRestSeconds(dayId: string, exerciseId: string, seconds: number) {
    const supabase = createClient()
    await updateExerciseRestSeconds(supabase, exerciseId, seconds)
    setDays((prev) =>
      prev?.map((d) =>
        d.id === dayId
          ? {
              ...d,
              exercises: d.exercises.map((e) =>
                e.id === exerciseId ? { ...e, rest_seconds: seconds } : e
              ),
            }
          : d
      ) ?? []
    )
  }

  async function handleRemoveExercise(dayId: string, exerciseId: string) {
    if (!confirm('Remove this exercise?')) return
    const supabase = createClient()
    await removeExercise(supabase, exerciseId)
    setDays((prev) =>
      prev?.map((d) =>
        d.id === dayId
          ? { ...d, exercises: d.exercises.filter((e) => e.id !== exerciseId) }
          : d
      ) ?? []
    )
  }

  function addWeekRow(exerciseId: string) {
    const existing = weekRows[exerciseId] ?? []
    const nextWeek = existing.length > 0 ? existing[existing.length - 1].weekNumber + 1 : 1
    setWeekRows((prev) => ({
      ...prev,
      [exerciseId]: [
        ...existing,
        { weekNumber: nextWeek, setCount: 3, targetReps: 10, targetWeight: '' },
      ],
    }))
  }

  function updateWeekRow(exerciseId: string, idx: number, field: keyof WeekRow, value: string | number) {
    setWeekRows((prev) => {
      const rows = [...(prev[exerciseId] ?? [])]
      rows[idx] = { ...rows[idx], [field]: value }
      return { ...prev, [exerciseId]: rows }
    })
  }

  async function saveWeekRow(exerciseId: string, idx: number) {
    const row = weekRows[exerciseId]?.[idx]
    if (!row) return
    const supabase = createClient()
    const weight = row.targetWeight !== '' ? parseFloat(row.targetWeight) : null
    if (isNaN(weight as number) && weight !== null) return

    const saved = await upsertExerciseWeek(
      supabase,
      exerciseId,
      row.weekNumber,
      row.setCount,
      row.targetReps,
      weight
    )
    if (saved) {
      setWeekRows((prev) => {
        const rows = [...(prev[exerciseId] ?? [])]
        rows[idx] = weekRowFromDb(saved)
        return { ...prev, [exerciseId]: rows }
      })
    }
  }

  async function removeWeekRow(exerciseId: string, idx: number) {
    const row = weekRows[exerciseId]?.[idx]
    if (!row) return
    if (row.id) {
      const supabase = createClient()
      await removeExerciseWeek(supabase, row.id)
    }
    setWeekRows((prev) => {
      const rows = [...(prev[exerciseId] ?? [])]
      rows.splice(idx, 1)
      return { ...prev, [exerciseId]: rows }
    })
  }

  if (loading) {
    return (
      <div className="mt-4 space-y-2 animate-pulse">
        <div className="h-8 bg-gray-100 rounded w-full" />
        <div className="h-32 bg-gray-100 rounded w-full" />
      </div>
    )
  }

  return (
    <div className="mt-4 border-t pt-4">
      {/* Day tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {DAY_SHORT.map((label, i) => {
          const hasDay = days?.some((d) => d.day_index === i)
          return (
            <button
              key={i}
              onClick={() => setActiveDay(i)}
              className={`flex-shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeDay === i
                  ? 'bg-black text-white'
                  : hasDay
                  ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {label}
              {hasDay && <span className="ml-1 text-[10px] opacity-60">●</span>}
            </button>
          )
        })}
      </div>

      {/* Selected day content */}
      <div className="mt-3">
        {!currentDay ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 mb-3">{DAY_LABELS[activeDay]} — no training</p>
            <button
              onClick={handleAddDay}
              className="rounded-md border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900"
            >
              + Add {DAY_LABELS[activeDay]} training
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-700">{DAY_LABELS[activeDay]}</h4>
              <button
                onClick={() => handleRemoveDay(currentDay.id)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Remove day
              </button>
            </div>

            {/* Exercises */}
            {currentDay.exercises.length === 0 && (
              <p className="text-xs text-gray-400 italic">No exercises yet.</p>
            )}

            {currentDay.exercises.map((ex) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                dayId={currentDay.id}
                weekRows={weekRows[ex.id] ?? []}
                expanded={expandedExercise === ex.id}
                onToggle={() =>
                  setExpandedExercise((prev) => (prev === ex.id ? null : ex.id))
                }
                onRemoveExercise={() => handleRemoveExercise(currentDay.id, ex.id)}
                onAddWeekRow={() => addWeekRow(ex.id)}
                onUpdateWeekRow={(idx, field, value) => updateWeekRow(ex.id, idx, field, value)}
                onSaveWeekRow={(idx) => saveWeekRow(ex.id, idx)}
                onRemoveWeekRow={(idx) => removeWeekRow(ex.id, idx)}
                onSaveRestSeconds={(s) => handleSaveRestSeconds(currentDay.id, ex.id, s)}
              />
            ))}

            {/* Add exercise */}
            {addingExercise === currentDay.id ? (
              <div className="rounded-md border border-gray-200 p-3 space-y-2">
                <input
                  type="text"
                  placeholder="Exercise name"
                  autoFocus
                  value={exerciseForm.name}
                  onChange={(e) => setExerciseForm((f) => ({ ...f, name: e.target.value }))}
                  className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-black focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Notes (optional)"
                  value={exerciseForm.notes}
                  onChange={(e) => setExerciseForm((f) => ({ ...f, notes: e.target.value }))}
                  className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-black focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 whitespace-nowrap">Rest (sec)</label>
                  <input
                    type="number"
                    min={0}
                    step={15}
                    value={exerciseForm.restSeconds}
                    onChange={(e) => setExerciseForm((f) => ({ ...f, restSeconds: parseInt(e.target.value) || 0 }))}
                    className="w-20 rounded border border-gray-300 px-2 py-1.5 text-sm text-center focus:border-black focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddExercise(currentDay.id)}
                    disabled={!exerciseForm.name.trim() || saving}
                    className="rounded bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Add'}
                  </button>
                  <button
                    onClick={() => {
                      setAddingExercise(null)
                      setExerciseForm({ name: '', notes: '', restSeconds: 90 })
                    }}
                    className="rounded px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingExercise(currentDay.id)}
                className="w-full rounded-md border border-dashed border-gray-300 py-2 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700"
              >
                + Add exercise
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// ExerciseCard
// ──────────────────────────────────────────────────────────────

interface ExerciseCardProps {
  exercise: ProgramExercise
  dayId: string
  weekRows: WeekRow[]
  expanded: boolean
  onToggle: () => void
  onRemoveExercise: () => void
  onAddWeekRow: () => void
  onUpdateWeekRow: (idx: number, field: keyof WeekRow, value: string | number) => void
  onSaveWeekRow: (idx: number) => void
  onRemoveWeekRow: (idx: number) => void
  onSaveRestSeconds: (seconds: number) => void
}

function ExerciseCard({
  exercise,
  weekRows,
  expanded,
  onToggle,
  onRemoveExercise,
  onAddWeekRow,
  onUpdateWeekRow,
  onSaveWeekRow,
  onRemoveWeekRow,
  onSaveRestSeconds,
}: ExerciseCardProps) {
  const [restInput, setRestInput] = useState(String(exercise.rest_seconds))
  return (
    <div className="rounded-md border border-gray-200">
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div>
          <span className="text-sm font-medium">{exercise.name}</span>
          {exercise.notes && (
            <span className="ml-2 text-xs text-gray-400">{exercise.notes}</span>
          )}
          <span className="ml-2 text-xs text-gray-400">
            ({weekRows.length} wk · {exercise.rest_seconds}s rest)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemoveExercise()
            }}
            className="text-xs text-red-400 hover:text-red-600"
          >
            Remove
          </button>
          <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t px-3 py-3 space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">Rest (sec)</label>
            <input
              type="number"
              min={0}
              step={15}
              value={restInput}
              onChange={(e) => setRestInput(e.target.value)}
              onBlur={() => onSaveRestSeconds(parseInt(restInput) || 0)}
              className="w-20 rounded border border-gray-200 px-1 py-0.5 text-center text-xs focus:border-black focus:outline-none"
            />
          </div>
          <p className="text-xs font-medium text-gray-500">Weekly progression</p>

          {weekRows.length > 0 && (
            <table className="w-full text-xs mb-2">
              <thead>
                <tr className="text-gray-400">
                  <th className="text-left py-1 pr-2 font-medium">Wk</th>
                  <th className="text-left py-1 pr-2 font-medium">Sets</th>
                  <th className="text-left py-1 pr-2 font-medium">Reps</th>
                  <th className="text-left py-1 pr-2 font-medium">Weight (kg)</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {weekRows.map((row, idx) => (
                  <tr key={idx} className="border-t border-gray-100">
                    <td className="py-1 pr-2">
                      <input
                        type="number"
                        min={1}
                        value={row.weekNumber}
                        onChange={(e) =>
                          onUpdateWeekRow(idx, 'weekNumber', parseInt(e.target.value) || 1)
                        }
                        onBlur={() => onSaveWeekRow(idx)}
                        className="w-10 rounded border border-gray-200 px-1 py-0.5 text-center focus:border-black focus:outline-none"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        type="number"
                        min={1}
                        value={row.setCount}
                        onChange={(e) =>
                          onUpdateWeekRow(idx, 'setCount', parseInt(e.target.value) || 1)
                        }
                        onBlur={() => onSaveWeekRow(idx)}
                        className="w-12 rounded border border-gray-200 px-1 py-0.5 text-center focus:border-black focus:outline-none"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        type="number"
                        min={1}
                        value={row.targetReps}
                        onChange={(e) =>
                          onUpdateWeekRow(idx, 'targetReps', parseInt(e.target.value) || 1)
                        }
                        onBlur={() => onSaveWeekRow(idx)}
                        className="w-12 rounded border border-gray-200 px-1 py-0.5 text-center focus:border-black focus:outline-none"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        type="text"
                        placeholder="BW"
                        value={row.targetWeight}
                        onChange={(e) =>
                          onUpdateWeekRow(idx, 'targetWeight', e.target.value)
                        }
                        onBlur={() => onSaveWeekRow(idx)}
                        className="w-16 rounded border border-gray-200 px-1 py-0.5 text-center focus:border-black focus:outline-none"
                      />
                    </td>
                    <td className="py-1">
                      <button
                        onClick={() => onRemoveWeekRow(idx)}
                        className="text-red-400 hover:text-red-600 px-1"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <button
            onClick={onAddWeekRow}
            className="text-xs text-gray-500 hover:text-gray-800"
          >
            + Add week
          </button>
        </div>
      )}
    </div>
  )
}
