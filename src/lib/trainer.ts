import { SupabaseClient } from '@supabase/supabase-js'

// ============================================================
// Types
// ============================================================

export interface Gym {
  id: string
  name: string
  trainer_id: string
}

export interface ClientProfile {
  id: string
  email: string
  full_name: string | null
}

export interface GymMember {
  membershipId: string
  client: ClientProfile
  activeProgram: {
    id: string
    start_date: string
    program: { id: string; name: string }
  } | null
}

export interface TrainerProgram {
  id: string
  name: string
  created_at: string
  dayCount: number
  assignmentCount: number
}

export interface ExerciseWeek {
  id: string
  week_number: number
  set_count: number
  target_weight: number | null
  target_reps: number
}

export interface ProgramExercise {
  id: string
  name: string
  notes: string | null
  order_index: number
  rest_seconds: number
  exercise_weeks: ExerciseWeek[]
}

export interface ProgramDay {
  id: string
  day_index: number
  label: string | null
  order_index: number
  exercises: ProgramExercise[]
}

// ============================================================
// Gym
// ============================================================

export async function getGym(
  supabase: SupabaseClient,
  trainerId: string
): Promise<Gym | null> {
  const { data } = await supabase
    .from('gyms')
    .select('id, name, trainer_id')
    .eq('trainer_id', trainerId)
    .maybeSingle()
  return data
}

export async function createGym(
  supabase: SupabaseClient,
  trainerId: string,
  name: string
): Promise<Gym | null> {
  const { data } = await supabase
    .from('gyms')
    .insert({ name: name.trim(), trainer_id: trainerId })
    .select('id, name, trainer_id')
    .single()
  return data
}

// ============================================================
// Clients / Gym memberships
// ============================================================

export async function getGymMembers(
  supabase: SupabaseClient,
  gymId: string
): Promise<GymMember[]> {
  const { data: memberships } = await supabase
    .from('gym_memberships')
    .select('id, client_id')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: true })

  if (!memberships || memberships.length === 0) return []

  const clientIds = memberships.map((m) => m.client_id)

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', clientIds)

  const { data: activePrograms } = await supabase
    .from('client_programs')
    .select('id, client_id, start_date, program:programs(id, name)')
    .in('client_id', clientIds)
    .eq('is_active', true)

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))
  const programMap = new Map(
    (activePrograms ?? []).map((cp) => {
      const program = Array.isArray(cp.program) ? cp.program[0] : cp.program
      return [
        cp.client_id,
        { id: cp.id, start_date: cp.start_date, program: program as { id: string; name: string } },
      ]
    })
  )

  return memberships.map((m) => ({
    membershipId: m.id,
    client: profileMap.get(m.client_id) ?? { id: m.client_id, email: '', full_name: null },
    activeProgram: programMap.get(m.client_id) ?? null,
  }))
}

export async function searchClients(
  supabase: SupabaseClient,
  query: string
): Promise<ClientProfile[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('role', 'client')
    .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(10)
  return data ?? []
}

export async function addGymMember(
  supabase: SupabaseClient,
  gymId: string,
  clientId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('gym_memberships')
    .insert({ gym_id: gymId, client_id: clientId })
  if (error) {
    if (error.code === '23505') return { error: 'Client is already in your gym.' }
    return { error: error.message }
  }
  return { error: null }
}

export async function removeGymMember(
  supabase: SupabaseClient,
  membershipId: string
): Promise<void> {
  await supabase.from('gym_memberships').delete().eq('id', membershipId)
}

export async function assignProgram(
  supabase: SupabaseClient,
  clientId: string,
  programId: string,
  startDate: string
): Promise<{ error: string | null }> {
  // Deactivate all existing active programs for this client
  await supabase
    .from('client_programs')
    .update({ is_active: false })
    .eq('client_id', clientId)
    .eq('is_active', true)

  const { error } = await supabase.from('client_programs').insert({
    client_id: clientId,
    program_id: programId,
    start_date: startDate,
    is_active: true,
  })

  if (error) return { error: error.message }
  return { error: null }
}

// ============================================================
// Programs
// ============================================================

export async function getTrainerPrograms(
  supabase: SupabaseClient,
  trainerId: string
): Promise<TrainerProgram[]> {
  const { data } = await supabase
    .from('programs')
    .select('id, name, created_at, program_days(id), client_programs(id)')
    .eq('created_by', trainerId)
    .order('created_at', { ascending: false })

  if (!data) return []

  return data.map((p: any) => ({
    id: p.id,
    name: p.name,
    created_at: p.created_at,
    dayCount: p.program_days?.length ?? 0,
    assignmentCount: p.client_programs?.length ?? 0,
  }))
}

export async function createProgram(
  supabase: SupabaseClient,
  trainerId: string,
  name: string
): Promise<{ id: string; name: string } | null> {
  const { data } = await supabase
    .from('programs')
    .insert({ name: name.trim(), created_by: trainerId })
    .select('id, name')
    .single()
  return data
}

export async function deleteProgram(
  supabase: SupabaseClient,
  programId: string
): Promise<void> {
  await supabase.from('programs').delete().eq('id', programId)
}

// ============================================================
// Program Days
// ============================================================

export async function getProgramDays(
  supabase: SupabaseClient,
  programId: string
): Promise<ProgramDay[]> {
  const { data } = await supabase
    .from('program_days')
    .select(`
      id, day_index, label, order_index,
      exercises (
        id, name, notes, order_index, rest_seconds,
        exercise_weeks (id, week_number, set_count, target_weight, target_reps)
      )
    `)
    .eq('program_id', programId)
    .order('day_index')

  if (!data) return []

  return data.map((d: any) => ({
    id: d.id,
    day_index: d.day_index,
    label: d.label,
    order_index: d.order_index,
    exercises: (d.exercises ?? [])
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((e: any) => ({
        id: e.id,
        name: e.name,
        notes: e.notes,
        order_index: e.order_index,
        rest_seconds: e.rest_seconds ?? 90,
        exercise_weeks: (e.exercise_weeks ?? []).sort(
          (a: any, b: any) => a.week_number - b.week_number
        ),
      })),
  }))
}

export async function addProgramDay(
  supabase: SupabaseClient,
  programId: string,
  dayIndex: number,
  label: string
): Promise<ProgramDay | null> {
  const { data } = await supabase
    .from('program_days')
    .insert({
      program_id: programId,
      day_index: dayIndex,
      label: label.trim() || null,
    })
    .select('id, day_index, label, order_index')
    .single()
  if (!data) return null
  return { ...data, exercises: [] }
}

export async function removeProgramDay(
  supabase: SupabaseClient,
  dayId: string
): Promise<void> {
  await supabase.from('program_days').delete().eq('id', dayId)
}

// ============================================================
// Exercises
// ============================================================

export async function addExercise(
  supabase: SupabaseClient,
  dayId: string,
  name: string,
  notes: string,
  restSeconds: number = 90
): Promise<ProgramExercise | null> {
  const { data: existing } = await supabase
    .from('exercises')
    .select('order_index')
    .eq('program_day_id', dayId)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextIndex = existing && existing.length > 0 ? existing[0].order_index + 1 : 0

  const { data } = await supabase
    .from('exercises')
    .insert({
      program_day_id: dayId,
      name: name.trim(),
      notes: notes.trim() || null,
      order_index: nextIndex,
      rest_seconds: restSeconds,
    })
    .select('id, name, notes, order_index, rest_seconds')
    .single()

  if (!data) return null
  return { ...data, exercise_weeks: [] }
}

export async function updateExerciseRestSeconds(
  supabase: SupabaseClient,
  exerciseId: string,
  restSeconds: number
): Promise<void> {
  await supabase
    .from('exercises')
    .update({ rest_seconds: restSeconds })
    .eq('id', exerciseId)
}

export async function removeExercise(
  supabase: SupabaseClient,
  exerciseId: string
): Promise<void> {
  await supabase.from('exercises').delete().eq('id', exerciseId)
}

export async function updateExercise(
  supabase: SupabaseClient,
  exerciseId: string,
  name: string,
  notes: string
): Promise<void> {
  await supabase
    .from('exercises')
    .update({ name: name.trim(), notes: notes.trim() || null })
    .eq('id', exerciseId)
}

// ============================================================
// Exercise Weeks
// ============================================================

export async function upsertExerciseWeek(
  supabase: SupabaseClient,
  exerciseId: string,
  weekNumber: number,
  setCount: number,
  targetReps: number,
  targetWeight: number | null
): Promise<ExerciseWeek | null> {
  const { data } = await supabase
    .from('exercise_weeks')
    .upsert(
      {
        exercise_id: exerciseId,
        week_number: weekNumber,
        set_count: setCount,
        target_reps: targetReps,
        target_weight: targetWeight,
      },
      { onConflict: 'exercise_id,week_number' }
    )
    .select('id, week_number, set_count, target_weight, target_reps')
    .single()
  return data
}

export async function removeExerciseWeek(
  supabase: SupabaseClient,
  weekId: string
): Promise<void> {
  await supabase.from('exercise_weeks').delete().eq('id', weekId)
}
