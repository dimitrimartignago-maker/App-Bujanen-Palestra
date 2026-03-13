import type { SupabaseClient } from '@supabase/supabase-js'
import type { WeekPlan, DayWorkout, Exercise, WorkoutSet, SetLog, SetEntry } from '@/types/workout'
import type { DbClientProgram, DbWorkoutSession, DbExercise } from '@/types/db'

// ── Date helpers ─────────────────────────────────────────────

const DAY_MS = 86_400_000

/** Returns the Monday (00:00 local) of the week at `weekOffset` from today. */
export function getMondayOfWeek(weekOffset: number): Date {
  const now = new Date()
  const day = now.getDay() // 0 = Sun
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now.getTime() + diffToMonday * DAY_MS + weekOffset * 7 * DAY_MS)
  monday.setHours(0, 0, 0, 0)
  return monday
}

/** Returns ISO date string "YYYY-MM-DD" for the Monday of the given weekOffset. */
export function getMondayISO(weekOffset: number): string {
  return getMondayOfWeek(weekOffset).toISOString().slice(0, 10)
}

/**
 * Converts weekOffset into a 1-based week number relative to the program's start_date.
 * Returns null if the selected week is before the program started.
 */
export function getWeekNumber(startDate: string, weekOffset: number): number | null {
  // Parse as local date to avoid UTC-midnight shift in timezones east of UTC.
  const [y, m, d] = startDate.split('-').map(Number)
  const start = new Date(y, m - 1, d) // local midnight, no timezone offset
  const monday = getMondayOfWeek(weekOffset)
  const diffDays = Math.round((monday.getTime() - start.getTime()) / DAY_MS)
  const weekNumber = Math.floor(diffDays / 7) + 1
  return weekNumber >= 1 ? weekNumber : null
}

// ── Data builders ─────────────────────────────────────────────

/**
 * Picks the exercise_week prescription for a given weekNumber.
 * Falls back to the latest week_number <= weekNumber (allows re-use of week 1 indefinitely).
 */
function resolveExerciseWeek(exercise: DbExercise, weekNumber: number) {
  const candidates = exercise.exercise_weeks.filter((w) => w.week_number <= weekNumber)
  if (candidates.length === 0) return exercise.exercise_weeks[0] ?? null
  return candidates.reduce((best, w) => (w.week_number > best.week_number ? w : best))
}

/**
 * Converts a DbClientProgram + sessions into a WeekPlan + SetLog for the given weekOffset.
 */
export function buildWeekData(
  cp: DbClientProgram,
  weekOffset: number,
  weekNumber: number,
  sessions: DbWorkoutSession[]
): { plan: WeekPlan; setLog: SetLog } {
  const sessionByDayId = new Map(sessions.map((s) => [s.program_day_id, s]))
  const setLog: SetLog = {}

  const days: DayWorkout[] = cp.program.program_days
    .slice()
    .sort((a, b) => a.order_index - b.order_index || a.day_index - b.day_index)
    .map((day) => {
      const session = sessionByDayId.get(day.id) ?? null

      const exercises: Exercise[] = day.exercises
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .reduce<Exercise[]>((acc, ex) => {
          const prescription = resolveExerciseWeek(ex, weekNumber)
          if (!prescription) return acc

          const sets: WorkoutSet[] = Array.from({ length: prescription.set_count }, (_, i) => ({
            id: `${ex.id}-${i}`,
            setIndex: i,
            targetWeight: prescription.target_weight,
            targetReps: prescription.target_reps,
          }))

          // Pre-populate set log from DB
          if (session) {
            const logsForExercise = session.set_logs.filter(
              (l) => l.exercise_id === ex.id
            )
            for (const log of logsForExercise) {
              const key = setLogKey(weekOffset, day.day_index, ex.id, log.set_index)
              setLog[key] = {
                weight: log.actual_weight !== null ? String(log.actual_weight) : '',
                reps: log.actual_reps !== null ? String(log.actual_reps) : '',
                done: log.done,
              }
            }
          }

          const exercise: Exercise = {
            id: ex.id,
            name: ex.name,
            restSeconds: ex.rest_seconds,
            sets,
            ...(ex.notes ? { notes: ex.notes } : {}),
          }
          acc.push(exercise)
          return acc
        }, [])

      return {
        dayIndex: day.day_index,
        programDayId: day.id,
        sessionId: session?.id ?? null,
        exercises,
      }
    })
    .filter((d) => d.exercises.length > 0)

  const plan: WeekPlan = {
    weekOffset,
    weekNumber,
    clientProgramId: cp.id,
    days,
  }

  return { plan, setLog }
}

/** Canonical SetLog key used throughout the app. */
export function setLogKey(
  weekOffset: number,
  dayIndex: number,
  exerciseId: string,
  setIndex: number
): string {
  return `${weekOffset}-${dayIndex}-${exerciseId}-${setIndex}`
}

// ── Supabase queries ──────────────────────────────────────────

/**
 * Fetches the active client program structure. Returns null if none assigned.
 * Works with both server and browser Supabase clients.
 */
async function fetchClientProgram(
  supabase: SupabaseClient,
  userId: string
): Promise<DbClientProgram | null> {
  const { data, error } = await supabase
    .from('client_programs')
    .select(
      `id, start_date,
       program:programs (
         id, name,
         program_days (
           id, day_index, label, order_index,
           exercises (
             id, name, notes, order_index, rest_seconds,
             exercise_weeks ( id, week_number, set_count, target_weight, target_reps )
           )
         )
       )`
    )
    .eq('client_id', userId)
    .eq('is_active', true)
    .single()

  if (error || !data) return null
  return data as unknown as DbClientProgram
}

/** Fetches all workout_sessions (with set_logs) for a given client_program + week. */
async function fetchSessions(
  supabase: SupabaseClient,
  clientProgramId: string,
  weekNumber: number
): Promise<DbWorkoutSession[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select(
      `id, program_day_id, week_number,
       set_logs ( id, exercise_id, set_index, actual_weight, actual_reps, done )`
    )
    .eq('client_program_id', clientProgramId)
    .eq('week_number', weekNumber)

  if (error || !data) return []
  return data as unknown as DbWorkoutSession[]
}

/**
 * Main entry point: fetches everything needed to render a week.
 * Returns null if the user has no active program.
 */
export async function fetchWeekData(
  supabase: SupabaseClient,
  userId: string,
  weekOffset: number
): Promise<{ plan: WeekPlan; setLog: SetLog; startDate: string } | null> {
  const cp = await fetchClientProgram(supabase, userId)
  if (!cp) return null

  const weekNumber = getWeekNumber(cp.start_date, weekOffset)
  if (weekNumber === null) {
    // Week is before program start — return an empty plan
    return {
      plan: {
        weekOffset,
        weekNumber: 0,
        clientProgramId: cp.id,
        days: [],
      },
      setLog: {},
      startDate: cp.start_date,
    }
  }

  const sessions = await fetchSessions(supabase, cp.id, weekNumber)
  const { plan, setLog } = buildWeekData(cp, weekOffset, weekNumber, sessions)

  return { plan, setLog, startDate: cp.start_date }
}

// ── Mutations ─────────────────────────────────────────────────

/**
 * Upserts a workout_session row. Returns the session id.
 * Uses ON CONFLICT so it's safe to call multiple times.
 */
export async function upsertSession(
  supabase: SupabaseClient,
  clientProgramId: string,
  programDayId: string,
  weekNumber: number,
  date: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .upsert(
      { client_program_id: clientProgramId, program_day_id: programDayId, week_number: weekNumber, date },
      { onConflict: 'client_program_id,program_day_id,week_number' }
    )
    .select('id')
    .single()

  if (error || !data) return null
  return data.id as string
}

/**
 * Upserts a single set_log row.
 * Saves actual_weight/actual_reps as null when the input is empty.
 */
export async function upsertSetLog(
  supabase: SupabaseClient,
  sessionId: string,
  exerciseId: string,
  setIndex: number,
  entry: SetEntry
): Promise<void> {
  await supabase.from('set_logs').upsert(
    {
      workout_session_id: sessionId,
      exercise_id: exerciseId,
      set_index: setIndex,
      actual_weight: entry.weight !== '' ? parseFloat(entry.weight) : null,
      actual_reps: entry.reps !== '' ? parseInt(entry.reps, 10) : null,
      done: entry.done,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'workout_session_id,exercise_id,set_index' }
  )
}
