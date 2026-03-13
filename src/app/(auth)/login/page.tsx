'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    console.log('[login] signInWithPassword result:', {
      userId: data.user?.id,
      email: data.user?.email,
      user_metadata: data.user?.user_metadata,
      hasSession: !!data.session,
      accessToken: data.session?.access_token?.slice(0, 20) + '…',
    })

    const role = data.user?.user_metadata?.role as string | undefined
    console.log('[login] role:', role, '→ navigating to:', role === 'trainer' ? '/trainer' : role === 'client' ? '/client' : '/')

    if (role === 'trainer') {
      window.location.href = '/trainer'
    } else if (role === 'client') {
      window.location.href = '/client'
    } else {
      window.location.href = '/'
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="font-display text-4xl font-bold uppercase tracking-wider text-accent">
            Bujanen
          </h1>
          <p className="mt-1 text-sm text-muted">Accedi al tuo account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-950/40 border border-red-900/50 px-3 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? 'Accesso…' : 'Accedi'}
          </button>
        </form>

        <p className="text-center text-sm text-muted">
          Non hai un account?{' '}
          <Link href="/signup" className="text-accent hover:opacity-80 font-medium">
            Registrati
          </Link>
        </p>
      </div>
    </div>
  )
}
