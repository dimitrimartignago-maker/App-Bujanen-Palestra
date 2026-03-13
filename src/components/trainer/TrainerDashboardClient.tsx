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
    <div className="min-h-screen bg-bg lg:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-56 lg:shrink-0 border-r border-dim bg-surface min-h-screen">
        <div className="px-5 py-6 border-b border-dim">
          <h1 className="text-lg font-bold font-display text-white leading-tight">{gymName}</h1>
          <p className="text-xs text-muted mt-1">{trainerName}</p>
        </div>

        <nav className="flex flex-col gap-1 p-3 flex-1">
          {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted hover:text-white hover:bg-surface-2'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-dim">
          <LogoutButton />
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden">
        <header className="sticky top-0 z-10 border-b border-dim bg-surface">
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <h1 className="text-base font-bold font-display text-white">{gymName}</h1>
              <p className="text-xs text-muted">{trainerName}</p>
            </div>
            <LogoutButton />
          </div>

          <div className="px-4">
            <nav className="flex gap-6" aria-label="Tabs">
              {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-accent text-accent'
                      : 'border-transparent text-muted hover:text-white'
                  }`}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </nav>
          </div>
        </header>
      </div>

      {/* Content */}
      <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8 max-w-3xl">
        {activeTab === 'clients' && <ClientsPanel gymId={gymId} trainerId={trainerId} />}
        {activeTab === 'programs' && <ProgramsPanel trainerId={trainerId} />}
        {activeTab === 'bulletins' && <BulletinsPanel trainerId={trainerId} gymId={gymId} />}
      </main>
    </div>
  )
}
