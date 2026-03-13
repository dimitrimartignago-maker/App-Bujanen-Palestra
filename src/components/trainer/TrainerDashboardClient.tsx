'use client'

import { useState } from 'react'
import LogoutButton from '@/components/LogoutButton'
import ClientsPanel from './ClientsPanel'
import ProgramsPanel from './ProgramsPanel'
import BulletinsPanel from './BulletinsPanel'

type Tab = 'clients' | 'programs' | 'bulletins'

const TAB_LABELS: Record<Tab, string> = {
  clients: 'Clienti',
  programs: 'Programmi',
  bulletins: 'Bacheca',
}

interface Props {
  gymId: string
  gymName: string
  trainerId: string
  trainerName: string
}

export default function TrainerDashboardClient({ gymId, gymName, trainerId, trainerName }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('clients')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{gymName}</h1>
            <p className="text-xs text-gray-400 mt-0.5">Benvenuto, {trainerName}</p>
          </div>
          <LogoutButton />
        </div>

        {/* Tabs */}
        <div className="mx-auto max-w-3xl px-4">
          <nav className="flex gap-6" aria-label="Tabs">
            {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-4 py-6">
        {activeTab === 'clients' && <ClientsPanel gymId={gymId} trainerId={trainerId} />}
        {activeTab === 'programs' && <ProgramsPanel trainerId={trainerId} />}
        {activeTab === 'bulletins' && <BulletinsPanel trainerId={trainerId} gymId={gymId} />}
      </main>
    </div>
  )
}
