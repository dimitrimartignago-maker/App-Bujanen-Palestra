import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/LogoutButton'
import WorkoutSchedule from '@/components/workout/WorkoutSchedule'

export default async function ClientDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const role = user.user_metadata?.role as string | undefined
  if (role !== 'client') redirect('/trainer')

  const name = user.user_metadata?.full_name || user.email

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Welcome back</p>
            <p className="truncate max-w-[180px] text-sm font-semibold text-gray-900">{name}</p>
          </div>
          <LogoutButton />
        </div>
      </header>

      {/* Workout schedule */}
      <WorkoutSchedule />
    </div>
  )
}
