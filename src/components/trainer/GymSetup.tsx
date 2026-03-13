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
    const gym = await createGym(supabase, trainerId, name)

    if (!gym) {
      setError('Failed to create gym. Please try again.')
      setLoading(false)
      return
    }

    // Full reload to re-render trainer page with the new gym
    window.location.reload()
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Welcome to Bujanen Palestra</h1>
          <p className="mt-2 text-sm text-gray-500">
            First, give your gym a name to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="gym-name" className="block text-sm font-medium">
              Gym name
            </label>
            <input
              id="gym-name"
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Iron Temple"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create gym'}
          </button>
        </form>
      </div>
    </div>
  )
}
