'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createGym } from '@/lib/trainer'

interface Props {
  trainerId: string
}

export default function GymSetup({ trainerId }: Props) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { gym, error: gymError } = await createGym(supabase, trainerId, name)

    if (!gym) {
      setError(gymError ?? 'Impossibile creare la palestra. Riprova.')
      setLoading(false)
      return
    }

    window.location.reload()
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-bg">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold font-display text-white tracking-tight">
            Benvenuto in<br />
            <span className="text-accent">Bujanen Palestra</span>
          </h1>
          <p className="mt-3 text-sm text-muted">
            Dai un nome alla tua palestra per iniziare.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="gym-name" className="block text-sm font-medium text-white mb-1.5">
              Nome palestra
            </label>
            <input
              id="gym-name"
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. Iron Temple"
              className="input"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-950/30 border border-red-900/50 px-3 py-2 text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="btn-primary w-full"
          >
            {loading ? 'Creazione…' : 'Crea palestra'}
          </button>
        </form>
      </div>
    </div>
  )
}
