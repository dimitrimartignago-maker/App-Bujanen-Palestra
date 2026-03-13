import type { SupabaseClient } from '@supabase/supabase-js'
import { getMondayOfWeek } from './workout'

// ── Types ─────────────────────────────────────────────────────

export type ExerciseStatus = 'fatto' | 'parziale' | 'non_fatto'

export interface ExerciseProgress {
  exerciseId: string
  name: string
  status: ExerciseStatus
  doneSets: number
  totalSets: number
}

export interface DayProgress {
  dayId: string
  dayIndex: number
  label: string | null
  completionPct: number
  exercises: ExerciseProgress[]
}

export interface WeekProgress {
  weekNumber: number
  mondayISO: string
  completionPct: number
  days: DayProgress[]
}

export interface ProgramProgress {
  clientProgramId: string
  programName: string
  startDate: string
  weeks: WeekProgress[]
  overallPct: number
}

// ── Helpers ───────────────────────────────────────────────────

/** Computes the Monday ISO date for week N (1-based) of a program. */
function weekMonday(startDate: string, weekNumber: number): string {
  const start = new Date(startDate)
  start.setDate(start.getDate() + (weekNumber - 1) * 7)
  return start.toISOString().slice(0, 10)
}

/** Picks the exercise_week prescription valid for `weekNumber` (latest <= weekNumber). */
function resolveSetCount(exerciseWeeks: { week_number: number; set_count: number }[], weekNumber: number): number {
  const candidates = exerciseWeeks.filter((w) => w.week_number <= weekNumber)
  if (candidates.length === 0) {
    return exerciseWeeks[0]?.set_count ?? 0
  }
  return candidates.reduce((best, w) => (w.week_number > best.week_number ? w : best)).set_count
}

/** How many weeks to show: from week 1 up to the current week (inclusive). */
function currentWeekNumber(startDate: string): number {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const todayMonday = getMondayOfWeek(0)
  const diffDays = Math.round((todayMonday.getTime() - start.getTime()) / 86_400_000)
  const week = Math.floor(diffDays / 7) + 1
  return Math.max(1, week)
}

// ── Main fetch ─────────────────────────────────────────────────

export async function fetchProgramProgress(
  supabase: SupabaseClient,
  clientId: string
): Promise<ProgramProgress | null> {
  // 1. Active client_program with full structure
  const { data: cp } = await supabase
    .from('client_programs')
    .select(`
      id, start_date,
      program:programs (
        id, name,
        program_days (
          id, day_index, label, order_index,
          exercises (
            id, name, order_index,
            exercise_weeks (week_number, set_count)
          )
        )
      )
    `)
    .eq('client_id', clientId)
    .eq('is_active', true)
    .maybeSingle()

  if (!cp) return null

  const program = Array.isArray(cp.program) ? cp.program[0] : cp.program
  if (!program) return null

  // 2. All sessions for this client_program
  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('id, program_day_id, week_number')
    .eq('client_program_id', cp.id)

  // 3. All set_logs for those sessions
  const sessionIds = (sessions ?? []).map((s) => s.id)
  const { data: setLogs } = sessionIds.length > 0
    ? await supabase
        .from('set_logs')
        .select('workout_session_id, exercise_id, done')
        .in('workout_session_id', sessionIds)
    : { data: [] }

  // Index: sessionId → Map<exerciseId, doneCount>
  const doneBySession = new Map<string, Map<string, number>>()
  for (const log of setLogs ?? []) {
    if (!doneBySession.has(log.workout_session_id)) {
      doneBySession.set(log.workout_session_id, new Map())
    }
    const exMap = doneBySession.get(log.workout_session_id)!
    exMap.set(log.exercise_id, (exMap.get(log.exercise_id) ?? 0) + (log.done ? 1 : 0))
  }

  // Index: dayId+weekNumber → sessionId
  const sessionKey = (dayId: string, weekNum: number) => `${dayId}:${weekNum}`
  const sessionIndex = new Map<string, string>()
  for (const s of sessions ?? []) {
    sessionIndex.set(sessionKey(s.program_day_id, s.week_number), s.id)
  }

  // Sort days
  const days = [...(program.program_days ?? [])].sort(
    (a: any, b: any) => a.day_index - b.day_index
  )

  const maxWeek = currentWeekNumber(cp.start_date)
  const weeks: WeekProgress[] = []

  for (let wn = 1; wn <= maxWeek; wn++) {
    const dayProgresses: DayProgress[] = []
    let weekTotalSets = 0
    let weekDoneSets = 0

    for (const day of days) {
      const exercises = [...(day.exercises ?? [])].sort(
        (a: any, b: any) => a.order_index - b.order_index
      )

      const sessionId = sessionIndex.get(sessionKey(day.id, wn))
      const exDoneMap = sessionId ? (doneBySession.get(sessionId) ?? new Map()) : new Map()

      const exProgresses: ExerciseProgress[] = exercises.map((ex: any) => {
        const totalSets = resolveSetCount(ex.exercise_weeks ?? [], wn)
        const doneSets = exDoneMap.get(ex.id) ?? 0
        const status: ExerciseStatus =
          doneSets === 0 ? 'non_fatto' : doneSets >= totalSets ? 'fatto' : 'parziale'
        return { exerciseId: ex.id, name: ex.name, status, doneSets, totalSets }
      })

      const dayTotal = exProgresses.reduce((s, e) => s + e.totalSets, 0)
      const dayDone = exProgresses.reduce((s, e) => s + e.doneSets, 0)
      const completionPct = dayTotal > 0 ? Math.round((dayDone / dayTotal) * 100) : 0

      weekTotalSets += dayTotal
      weekDoneSets += dayDone

      dayProgresses.push({
        dayId: day.id,
        dayIndex: day.day_index,
        label: day.label,
        completionPct,
        exercises: exProgresses,
      })
    }

    weeks.push({
      weekNumber: wn,
      mondayISO: weekMonday(cp.start_date, wn),
      completionPct: weekTotalSets > 0 ? Math.round((weekDoneSets / weekTotalSets) * 100) : 0,
      days: dayProgresses,
    })
  }

  const allTotal = weeks.reduce((s, w) => s + w.days.reduce((d, day) => d + day.exercises.reduce((e, ex) => e + ex.totalSets, 0), 0), 0)
  const allDone = weeks.reduce((s, w) => s + w.days.reduce((d, day) => d + day.exercises.reduce((e, ex) => e + ex.doneSets, 0), 0), 0)

  return {
    clientProgramId: cp.id,
    programName: program.name,
    startDate: cp.start_date,
    weeks: weeks.reverse(), // most recent first
    overallPct: allTotal > 0 ? Math.round((allDone / allTotal) * 100) : 0,
  }
}

// ── Reset ──────────────────────────────────────────────────────

export async function resetProgramData(
  supabase: SupabaseClient,
  clientProgramId: string
): Promise<void> {
  // Deleting workout_sessions cascades to set_logs
  await supabase
    .from('workout_sessions')
    .delete()
    .eq('client_program_id', clientProgramId)
}
