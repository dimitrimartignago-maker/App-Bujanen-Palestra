'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  getTrainerBulletins,
  createBulletin,
  deleteBulletin,
  type BulletinWithClient,
} from '@/lib/bulletins'
import { getGymMembers, type GymMember } from '@/lib/trainer'

interface Props {
  trainerId: string
  gymId: string
}

export default function BulletinsPanel({ trainerId, gymId }: Props) {
  const [bulletins, setBulletins] = useState<BulletinWithClient[]>([])
  const [members, setMembers] = useState<GymMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [targetClientId, setTargetClientId] = useState<string>('') // '' = global
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      getTrainerBulletins(supabase, trainerId),
      getGymMembers(supabase, gymId),
    ]).then(([b, m]) => {
      setBulletins(b)
      setMembers(m)
      setLoading(false)
    })
  }, [trainerId, gymId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    setSubmitting(true)
    const supabase = createClient()
    const bulletin = await createBulletin(
      supabase,
      trainerId,
      title,
      body,
      targetClientId || null
    )
    if (bulletin) {
      const targetMember = members.find((m) => m.client.id === targetClientId)
      setBulletins((prev) => [
        {
          ...bulletin,
          clientEmail: targetMember?.client.email ?? null,
        },
        ...prev,
      ])
    }
    setTitle('')
    setBody('')
    setTargetClientId('')
    setShowForm(false)
    setSubmitting(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this bulletin?')) return
    const supabase = createClient()
    await deleteBulletin(supabase, id)
    setBulletins((prev) => prev.filter((b) => b.id !== id))
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-gray-100" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {bulletins.length} bulletin{bulletins.length !== 1 ? 's' : ''}
        </p>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
          >
            + New bulletin
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-gray-200 p-4 space-y-3"
        >
          <p className="text-sm font-medium">New bulletin</p>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Recipient</label>
            <select
              value={targetClientId}
              onChange={(e) => setTargetClientId(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
            >
              <option value="">All clients (global)</option>
              {members.map((m) => (
                <option key={m.client.id} value={m.client.id}>
                  {m.client.full_name || m.client.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Title</label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Gym closed Monday"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Message</label>
            <textarea
              required
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message here…"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!title.trim() || !body.trim() || submitting}
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting ? 'Publishing…' : 'Publish'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setTitle('')
                setBody('')
                setTargetClientId('')
              }}
              className="rounded-md px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {bulletins.length === 0 && !showForm && (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
          <p className="text-sm text-gray-500">No bulletins yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            Publish a bulletin to notify your clients.
          </p>
        </div>
      )}

      {bulletins.map((b) => (
        <div key={b.id} className="rounded-lg border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm">{b.title}</p>
                {b.client_id ? (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                    → {b.clientEmail ?? 'Client'}
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    Global
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{b.body}</p>
              <p className="mt-2 text-xs text-gray-400">{formatDate(b.created_at)}</p>
            </div>
            <button
              onClick={() => handleDelete(b.id)}
              className="flex-shrink-0 text-xs text-red-400 hover:text-red-600"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
