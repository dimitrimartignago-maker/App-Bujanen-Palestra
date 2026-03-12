import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchWeekData } from '@/lib/workout'
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

  // Fetch current week's data server-side for instant first paint
  const weekData = await fetchWeekData(supabase, user.id, 0)

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

      {weekData ? (
        <WorkoutSchedule
          userId={user.id}
          startDate={weekData.startDate}
          initialPlan={weekData.plan}
          initialSetLog={weekData.setLog}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center px-4">
          <span className="text-4xl">🏋️</span>
          <p className="mt-4 text-lg font-semibold text-gray-800">No program assigned</p>
          <p className="mt-1 text-sm text-gray-400">
            Your trainer hasn&apos;t assigned a program yet. Check back soon.
          </p>
        </div>
      )}
    </div>
  )
}
