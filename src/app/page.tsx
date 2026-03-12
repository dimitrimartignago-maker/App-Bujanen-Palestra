import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const role = user.user_metadata?.role as string | undefined
  if (role === 'trainer') redirect('/trainer')
  if (role === 'client') redirect('/client')

  // Fallback — authenticated but no recognized role
  redirect('/login')
}
