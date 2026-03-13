import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getGym } from '@/lib/trainer'
import GymSetup from '@/components/trainer/GymSetup'
import TrainerDashboardClient from '@/components/trainer/TrainerDashboardClient'

export default async function TrainerDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const role = user.user_metadata?.role as string | undefined
  if (role !== 'trainer') redirect('/client')

  const gym = await getGym(supabase, user.id)

  if (!gym) {
    return <GymSetup trainerId={user.id} />
  }

  return (
    <TrainerDashboardClient
      gymId={gym.id}
      gymName={gym.name}
      trainerId={user.id}
      trainerName={user.user_metadata?.full_name || user.email || 'Trainer'}
    />
  )
}
