'use client'

import { useState, useCallback } from 'react'
import type { SetLog, SetEntry } from '@/types/workout'
import { getWeekPlan } from '@/lib/mock-workout'
import WeekSelector from './WeekSelector'
import DayTabs from './DayTabs'
import ExerciseCard from './ExerciseCard'

// Default today's day index (0=Mon…6=Sun), clamped to Mon–Fri
function todayIndex(): number {
  const d = new Date().getDay() // 0=Sun
  if (d === 0) return 6 // Sunday → show Sunday tab
  return d - 1
}

export default function WorkoutSchedule() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [activeDayIndex, setActiveDayIndex] = useState(todayIndex)
  const [setLog, setSetLog] = useState<SetLog>({})

  const plan = getWeekPlan(weekOffset)
  const daysWithWorkout = plan.days.map((d) => d.dayIndex)
  const dayWorkout = plan.days.find((d) => d.dayIndex === activeDayIndex) ?? null

  const handleWeekChange = useCallback((offset: number) => {
    setWeekOffset(offset)
    // Switch to first workout day of the new week if current day has no workout
    const newPlan = getWeekPlan(offset)
    const newDays = newPlan.days.map((d) => d.dayIndex)
    if (newDays.length > 0 && !newDays.includes(activeDayIndex)) {
      setActiveDayIndex(newDays[0])
    }
  }, [activeDayIndex])

  const handleSetChange = useCallback(
    (
      exerciseId: number,
      setIndex: number,
      field: keyof SetEntry,
      value: string | boolean
    ) => {
      const key = `${weekOffset}-${activeDayIndex}-${exerciseId}-${setIndex}`
      setSetLog((prev) => ({
        ...prev,
        [key]: {
          weight: prev[key]?.weight ?? '',
          reps: prev[key]?.reps ?? '',
          done: prev[key]?.done ?? false,
          [field]: value,
        },
      }))
    },
    [weekOffset, activeDayIndex]
  )

  function getSetEntries(exerciseId: number, setCount: number): SetEntry[] {
    return Array.from({ length: setCount }, (_, i) => {
      const key = `${weekOffset}-${activeDayIndex}-${exerciseId}-${i}`
      return setLog[key] ?? { weight: '', reps: '', done: false }
    })
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
      {/* Week selector */}
      <WeekSelector weekOffset={weekOffset} onChange={handleWeekChange} />

      {/* Day tabs */}
      <DayTabs
        activeDayIndex={activeDayIndex}
        daysWithWorkout={daysWithWorkout}
        onChange={setActiveDayIndex}
      />

      {/* Content */}
      {dayWorkout ? (
        <div className="space-y-4">
          {dayWorkout.exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              setEntries={getSetEntries(exercise.id, exercise.sets.length)}
              onSetChange={(setIndex, field, value) =>
                handleSetChange(exercise.id, setIndex, field, value)
              }
            />
          ))}
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
