'use client'

import { useState } from 'react'
import type { WeekPlan, SetLog } from '@/types/workout'
import LogoutButton from '@/components/LogoutButton'
import WorkoutSchedule from '@/components/workout/WorkoutSchedule'
import BulletinBoard from './BulletinBoard'
import ProgressView from './ProgressView'

type Tab = 'schedule' | 'progressi' | 'bacheca'

interface Props {
  userId: string
  name: string
  startDate: string | null
  initialPlan: WeekPlan | null
  initialSetLog: SetLog | null
  initialUnread: number
}

export default function ClientShell({
  userId,
  name,
  startDate,
  initialPlan,
  initialSetLog,
  initialUnread,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('schedule')
  const [unread, setUnread] = useState(initialUnread)

  return (
    <div className="min-h-screen bg-bg">
      {/* Top nav */}
      <header className="sticky top-0 z-10 border-b border-dim bg-surface">
        <div className="mx-auto max-w-client px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">Bentornato</p>
            <p className="truncate max-w-[180px] text-sm font-semibold text-white font-display">{name}</p>
          </div>
          <LogoutButton />
        </div>

        {/* Tabs */}
        <div className="mx-auto max-w-client px-4">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'schedule'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-white'
              }`}
            >
              Scheda
            </button>

            <button
              onClick={() => setActiveTab('progressi')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'progressi'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-white'
              }`}
            >
              Progressi
            </button>

            <button
              onClick={() => setActiveTab('bacheca')}
              className={`relative pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'bacheca'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-white'
              }`}
            >
              Bacheca
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-3 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Content */}
      {activeTab === 'schedule' && (
        startDate && initialPlan ? (
          <WorkoutSchedule
            userId={userId}
            startDate={startDate}
            initialPlan={initialPlan}
            initialSetLog={initialSetLog ?? {}}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <span className="text-4xl">🏋️</span>
            <p className="mt-4 text-lg font-semibold font-display text-white">Nessun programma assegnato</p>
            <p className="mt-1 text-sm text-muted">
              Il tuo trainer non ha ancora assegnato un programma.
            </p>
          </div>
        )
      )}
      {activeTab === 'progressi' && <ProgressView clientId={userId} />}
      {activeTab === 'bacheca' && (
        <BulletinBoard clientId={userId} onUnreadChange={setUnread} />
      )}
    </div>
  )
}
