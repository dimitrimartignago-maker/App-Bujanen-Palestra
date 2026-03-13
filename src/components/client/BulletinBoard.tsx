'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getClientBulletins, markAllRead, type Bulletin } from '@/lib/bulletins'

interface Props {
  clientId: string
  onUnreadChange?: (count: number) => void
}

export default function BulletinBoard({ clientId, onUnreadChange }: Props) {
  const [bulletins, setBulletins] = useState<Bulletin[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const supabase = createClient()
    const data = await getClientBulletins(supabase, clientId)
    setBulletins(data)
    const unread = data.filter((b) => !b.read).length
    onUnreadChange?.(unread)
    setLoading(false)

    // Mark all as read after displaying
    const unreadIds = data.filter((b) => !b.read).map((b) => b.id)
    if (unreadIds.length > 0) {
      await markAllRead(supabase, unreadIds, clientId)
      setBulletins((prev) => prev.map((b) => ({ ...b, read: true })))
      onUnreadChange?.(0)
    }
  }, [clientId, onUnreadChange])

  useEffect(() => {
    load()
  }, [load])

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="px-4 py-6 space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-surface-2" />
        ))}
      </div>
    )
  }

  if (bulletins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <span className="text-4xl">📋</span>
        <p className="mt-4 text-lg font-semibold font-display text-white">Nessun messaggio</p>
        <p className="mt-1 text-sm text-muted">
          Il tuo trainer non ha ancora pubblicato comunicazioni.
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 max-w-client mx-auto space-y-3">
      {bulletins.map((bulletin) => (
        <div
          key={bulletin.id}
          className={`card p-4 transition-colors ${
            !bulletin.read ? 'border-accent/50 ring-1 ring-accent/20' : ''
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {!bulletin.read && (
                  <span className="h-2 w-2 flex-shrink-0 rounded-full bg-red-500" />
                )}
                <p className="font-semibold text-sm leading-snug text-white font-display">{bulletin.title}</p>
              </div>
              <p className="mt-2 text-sm text-muted whitespace-pre-wrap leading-relaxed">
                {bulletin.body}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">{formatDate(bulletin.created_at)}</p>
        </div>
      ))}
    </div>
  )
}
