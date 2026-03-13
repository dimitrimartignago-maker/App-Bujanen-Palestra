import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchWeekData } from '@/lib/workout'
import { countUnreadBulletins } from '@/lib/bulletins'
import ClientShell from '@/components/client/ClientShell'

export default async function ClientDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const role = user.user_metadata?.role as string | undefined
  if (role !== 'client') redirect('/trainer')

  const name = user.user_metadata?.full_name || user.email || 'Cliente'

  const [weekData, initialUnread] = await Promise.all([
    fetchWeekData(supabase, user.id, 0),
    countUnreadBulletins(supabase, user.id),
  ])

  return (
    <ClientShell
      userId={user.id}
      name={name}
      startDate={weekData?.startDate ?? null}
      initialPlan={weekData?.plan ?? null}
      initialSetLog={weekData?.setLog ?? null}
      initialUnread={initialUnread}
    />
  )
}
