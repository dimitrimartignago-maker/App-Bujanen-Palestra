export interface WorkoutSet {
  id: string           // `${programExerciseId}-${setIndex}`
  setIndex: number
  targetWeight: number | null  // kg, null = bodyweight
  targetReps: number
}

export interface Exercise {
  id: string           // program_exercises.id (UUID)
  name: string
  notes?: string
  restSeconds: number  // rest timer duration after each set
  sets: WorkoutSet[]
}

export interface DayWorkout {
  /** 0 = Monday … 6 = Sunday */
  dayIndex: number
  programDayId: string
  /** null until the client first interacts with this day */
  sessionId: string | null
  exercises: Exercise[]
}

export interface WeekPlan {
  weekOffset: number   // 0 = current week, -1 = prev, +1 = next
  weekNumber: number   // 1-based, computed from client_program.start_date
  clientProgramId: string
  days: DayWorkout[]
}

// ── Mutable UI state ──────────────────────────────────────────

export interface SetEntry {
  weight: string   // actual kg entered by user (string for input binding)
  reps: string     // actual reps entered by user
  done: boolean
}

/**
 * key: `${weekOffset}-${dayIndex}-${programExerciseId}-${setIndex}`
 * Matches across week/day navigations so state persists within the session.
 */
export type SetLog = Record<string, SetEntry>

/** key: `${weekOffset}-${dayIndex}` → workout_sessions.id */
export type SessionCache = Record<string, string>
