// Supabase DB row shapes returned by nested .select() queries

export interface DbExerciseWeek {
  id: string
  week_number: number
  set_count: number
  target_weight: number | null
  target_reps: number
}

export interface DbExercise {
  id: string
  name: string
  notes: string | null
  order_index: number
  rest_seconds: number
  exercise_weeks: DbExerciseWeek[]
}

export interface DbProgramDay {
  id: string
  day_index: number
  label: string | null
  order_index: number
  exercises: DbExercise[]
}

export interface DbClientProgram {
  id: string
  start_date: string  // ISO date "YYYY-MM-DD"
  program: {
    id: string
    name: string
    program_days: DbProgramDay[]
  }
}

export interface DbSetLog {
  id: string
  exercise_id: string
  set_index: number
  actual_weight: number | null
  actual_reps: number | null
  done: boolean
}

export interface DbWorkoutSession {
  id: string
  program_day_id: string
  week_number: number
  set_logs: DbSetLog[]
}
