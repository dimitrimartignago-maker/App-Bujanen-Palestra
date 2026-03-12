import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/LogoutButton'

export default async function ClientDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const role = user.user_metadata?.role as string | undefined
  if (role !== 'client') redirect('/trainer')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Client Dashboard</h1>
        <p className="mt-2 text-gray-500">Welcome, {user.user_metadata?.full_name || user.email}</p>
        <p className="mt-1 text-xs text-gray-400">Role: client</p>
      </div>
      <LogoutButton />
    </div>
  )
}
