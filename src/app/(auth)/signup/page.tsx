'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Role = 'trainer' | 'client'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('client')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    console.log('[signup] signUp result:', {
      userId: data.user?.id,
      email: data.user?.email,
      user_metadata: data.user?.user_metadata,
      hasSession: !!data.session,
      // null session means email confirmation is required
      accessToken: data.session?.access_token?.slice(0, 20) + '…',
    })

    // If email confirmation is disabled, user is immediately active
    const userRole = data.user?.user_metadata?.role as string | undefined
    console.log('[signup] userRole:', userRole, '→ navigating to:', userRole === 'trainer' ? '/trainer' : '/client')
    window.location.href = userRole === 'trainer' ? '/trainer' : '/client'
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="font-display text-4xl font-bold uppercase tracking-wider text-accent">
            Bujanen
          </h1>
          <p className="mt-1 text-sm text-muted">Crea il tuo account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role selector */}
          <div>
            <span className="block text-xs font-medium uppercase tracking-widest text-muted mb-2">
              Sono un…
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(['client', 'trainer'] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`rounded-lg border-2 px-4 py-3 text-sm font-semibold capitalize transition-colors ${
                    role === r
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-dim text-muted hover:border-white/20 hover:text-white'
                  }`}
                >
                  {r === 'client' ? 'Cliente' : 'Trainer'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="full-name" className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">
              Nome completo
            </label>
            <input
              id="full-name"
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
            />
          </div>

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
              autoComplete="new-password"
              minLength={6}
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
            {loading ? 'Creazione…' : 'Crea account'}
          </button>
        </form>

        <p className="text-center text-sm text-muted">
          Hai già un account?{' '}
          <Link href="/login" className="text-accent hover:opacity-80 font-medium">
            Accedi
          </Link>
        </p>
      </div>
    </div>
  )
}
