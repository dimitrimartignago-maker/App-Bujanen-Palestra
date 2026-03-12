'use client'

import { useState, useCallback, useRef } from 'react'
import type { WeekPlan, SetLog, SetEntry, SessionCache } from '@/types/workout'
import {
  fetchWeekData,
  upsertSession,
  upsertSetLog,
  setLogKey,
  getWeekNumber,
  getMondayISO,
} from '@/lib/workout'
import { createClient } from '@/lib/supabase/client'
import WeekSelector from './WeekSelector'
import DayTabs from './DayTabs'
import ExerciseCard from './ExerciseCard'

function todayDayIndex(): number {
  const d = new Date().getDay() // 0=Sun
  return d === 0 ? 6 : d - 1
}

interface Props {
  userId: string
  startDate: string
  initialPlan: WeekPlan
  initialSetLog: SetLog
}

export default function WorkoutSchedule({ userId, startDate, initialPlan, initialSetLog }: Props) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [activeDayIndex, setActiveDayIndex] = useState(todayDayIndex)

  // Cached plans and logs per weekOffset key
  const [plans, setPlans] = useState<Record<number, WeekPlan>>({ 0: initialPlan })
  const [setLogs, setSetLogs] = useState<Record<number, SetLog>>({ 0: initialSetLog })
  const [sessions, setSessions] = useState<SessionCache>({})

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const currentPlan = plans[weekOffset]
  const currentLog = setLogs[weekOffset] ?? {}

  // ── Week navigation ────────────────────────────────────────

  const handleWeekChange = useCallback(async (offset: number) => {
    setWeekOffset(offset)

    const cached = plans[offset]
    if (cached) {
      const days = cached.days.map((d) => d.dayIndex)
      if (days.length > 0 && !days.includes(activeDayIndex)) setActiveDayIndex(days[0])
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const result = await fetchWeekData(supabase, userId, offset)
      if (result) {
        setPlans((prev) => ({ ...prev, [offset]: result.plan }))
        setSetLogs((prev) => ({ ...prev, [offset]: result.setLog }))
        const days = result.plan.days.map((d) => d.dayIndex)
        if (days.length > 0 && !days.includes(activeDayIndex)) setActiveDayIndex(days[0])
      }
    } finally {
      setLoading(false)
    }
  }, [plans, activeDayIndex, userId])

  // ── Set change + auto-save ─────────────────────────────────

  const handleSetChange = useCallback(
    (
      programDayId: string,
      dayIndex: number,
      programExerciseId: string,
      setIndex: number,
      field: keyof SetEntry,
      value: string | boolean
    ) => {
      const key = setLogKey(weekOffset, dayIndex, programExerciseId, setIndex)

      // Optimistic UI update
      setSetLogs((prev) => {
        const weekLog = prev[weekOffset] ?? {}
        return {
          ...prev,
          [weekOffset]: {
            ...weekLog,
            [key]: {
              weight: weekLog[key]?.weight ?? '',
              reps: weekLog[key]?.reps ?? '',
              done: weekLog[key]?.done ?? false,
              [field]: value,
            },
          },
        }
      })

      // Debounced DB write: immediate for `done`, 600 ms for text inputs
      clearTimeout(debounceRefs.current[key])
      const delay = field === 'done' ? 0 : 600
      debounceRefs.current[key] = setTimeout(async () => {
        const supabase = createClient()
        const weekNumber = getWeekNumber(startDate, weekOffset)
        if (!weekNumber) return

        setSaving(true)
        try {
          // Resolve or create session for this day
          const sessionCacheKey = `${weekOffset}-${dayIndex}`
          let sessionId = sessions[sessionCacheKey]

          if (!sessionId) {
            const planDay = plans[weekOffset]?.days.find((d) => d.programDayId === programDayId)
            sessionId = planDay?.sessionId ?? ''
          }

          if (!sessionId) {
            const clientProgramId = plans[weekOffset]?.clientProgramId
            if (!clientProgramId) return
            const newId = await upsertSession(
              supabase,
              clientProgramId,
              programDayId,
              weekNumber,
              getMondayISO(weekOffset)
            )
            if (!newId) return
            sessionId = newId
            setSessions((prev) => ({ ...prev, [sessionCacheKey]: newId }))
            setPlans((prev) => {
              const plan = prev[weekOffset]
              if (!plan) return prev
              return {
                ...prev,
                [weekOffset]: {
                  ...plan,
                  days: plan.days.map((d) =>
                    d.programDayId === programDayId ? { ...d, sessionId: newId } : d
                  ),
                },
              }
            })
          }

          // Read latest entry from state for the DB write
          setSetLogs((prev) => {
            const entry = prev[weekOffset]?.[key]
            if (entry) upsertSetLog(supabase, sessionId, programExerciseId, setIndex, entry)
            return prev
          })
        } finally {
          setSaving(false)
        }
      }, delay)
    },
    [weekOffset, startDate, sessions, plans]
  )

  // ── Render ─────────────────────────────────────────────────

  const daysWithWorkout = currentPlan?.days.map((d) => d.dayIndex) ?? []
  const dayWorkout = currentPlan?.days.find((d) => d.dayIndex === activeDayIndex) ?? null

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <div className="relative">
        <WeekSelector weekOffset={weekOffset} onChange={handleWeekChange} />
        {saving && (
          <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            Saving…
          </span>
        )}
      </div>

      <DayTabs
        activeDayIndex={activeDayIndex}
        daysWithWorkout={daysWithWorkout}
        onChange={setActiveDayIndex}
      />

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : currentPlan?.weekNumber === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-4xl">📅</span>
          <p className="mt-3 font-medium text-gray-700">Program not started yet</p>
          <p className="mt-1 text-sm text-gray-400">
            Your program begins on{' '}
            {new Date(startDate).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            .
          </p>
        </div>
      ) : dayWorkout ? (
        <div className="space-y-4">
          {dayWorkout.exercises.map((exercise) => {
            const entries = exercise.sets.map((set) => {
              const k = setLogKey(weekOffset, activeDayIndex, exercise.id, set.setIndex)
              return currentLog[k] ?? { weight: '', reps: '', done: false }
            })
            return (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                setEntries={entries}
                onSetChange={(setIndex, field, value) =>
                  handleSetChange(
                    dayWorkout.programDayId,
                    activeDayIndex,
                    exercise.id,
                    setIndex,
                    field,
                    value
                  )
                }
              />
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-4xl">🛋️</span>
          <p className="mt-3 font-medium text-gray-700">Rest day</p>
          <p className="mt-1 text-sm text-gray-400">No workout scheduled for this day.</p>
        </div>
      )}
    </div>
  )
}
