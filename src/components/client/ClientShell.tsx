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
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Bentornato</p>
            <p className="truncate max-w-[180px] text-sm font-semibold text-gray-900">{name}</p>
          </div>
          <LogoutButton />
        </div>

        {/* Tabs */}
        <div className="mx-auto max-w-lg px-4">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'schedule'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Scheda
            </button>

            <button
              onClick={() => setActiveTab('progressi')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'progressi'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Progressi
            </button>

            <button
              onClick={() => setActiveTab('bacheca')}
              className={`relative pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'bacheca'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
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
            <p className="mt-4 text-lg font-semibold text-gray-800">Nessun programma assegnato</p>
            <p className="mt-1 text-sm text-gray-400">
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
