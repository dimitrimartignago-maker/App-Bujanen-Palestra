export interface WorkoutSet {
  id: number
  targetWeight: number | null // kg, null = bodyweight
  targetReps: number
}

export interface Exercise {
  id: number
  name: string
  notes?: string
  sets: WorkoutSet[]
}

export interface DayWorkout {
  /** 0 = Monday … 6 = Sunday */
  dayIndex: number
  exercises: Exercise[]
}

export interface WeekPlan {
  weekOffset: number // 0 = current week, -1 = prev, +1 = next
  days: DayWorkout[]
}

// Mutable state tracked in the UI
export interface SetEntry {
  weight: string
  reps: string
  done: boolean
}

/** key: `${weekOffset}-${dayIndex}-${exerciseId}-${setId}` */
export type SetLog = Record<string, SetEntry>
