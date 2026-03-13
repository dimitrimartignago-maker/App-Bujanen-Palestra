import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  // Chiamata asincrona corretta per Next.js 15
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Se l'utente non è loggato, vai al login
  if (!user) {
    redirect('/login')
  }

  // Controllo dei ruoli basato sui metadati di Supabase
  const role = user.user_metadata?.role as string | undefined
  
  if (role === 'trainer') {
    redirect('/trainer')
  }
  
  if (role === 'client') {
    redirect('/client')
  }

  // Se è autenticato ma non ha un ruolo riconosciuto
  redirect('/login?error=no_role')
}
