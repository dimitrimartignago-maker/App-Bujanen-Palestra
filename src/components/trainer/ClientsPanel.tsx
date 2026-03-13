'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  getGymMembers,
  searchClients,
  addGymMember,
  removeGymMember,
  assignProgram,
  getTrainerPrograms,
  type GymMember,
  type ClientProfile,
  type TrainerProgram,
} from '@/lib/trainer'

interface Props {
  gymId: string
  trainerId: string
}

export default function ClientsPanel({ gymId, trainerId }: Props) {
  const [members, setMembers] = useState<GymMember[]>([])
  const [programs, setPrograms] = useState<TrainerProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ClientProfile[]>([])
  const [searching, setSearching] = useState(false)
  const [addingMember, setAddingMember] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [assignModal, setAssignModal] = useState<GymMember | null>(null)
  const [assignProgramId, setAssignProgramId] = useState('')
  const [assignStartDate, setAssignStartDate] = useState('')
  const [assigning, setAssigning] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      getGymMembers(supabase, gymId),
      getTrainerPrograms(supabase, trainerId),
    ]).then(([m, p]) => {
      setMembers(m)
      setPrograms(p)
      setLoading(false)
    })
  }, [gymId, trainerId])

  function handleSearchChange(query: string) {
    setSearchQuery(query)
    setAddError(null)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      const supabase = createClient()
      const results = await searchClients(supabase, query)
      setSearchResults(results)
      setSearching(false)
    }, 350)
  }

  async function handleAddMember(client: ClientProfile) {
    setAddError(null)
    const supabase = createClient()
    const { error } = await addGymMember(supabase, gymId, client.id)
    if (error) {
      setAddError(error)
      return
    }
    const updated = await getGymMembers(supabase, gymId)
    setMembers(updated)
    setSearchQuery('')
    setSearchResults([])
    setAddingMember(false)
  }

  async function handleRemoveMember(membershipId: string, name: string) {
    if (!confirm(`Rimuovere ${name} dalla palestra?`)) return
    const supabase = createClient()
    await removeGymMember(supabase, membershipId)
    setMembers((prev) => prev.filter((m) => m.membershipId !== membershipId))
  }

  function openAssignModal(member: GymMember) {
    setAssignModal(member)
    setAssignProgramId(member.activeProgram?.program?.id ?? '')
    const today = new Date()
    const daysUntilMonday = (8 - today.getDay()) % 7 || 7
    const nextMonday = new Date(today)
    nextMonday.setDate(today.getDate() + daysUntilMonday)
    setAssignStartDate(nextMonday.toISOString().slice(0, 10))
  }

  async function handleAssignProgram() {
    if (!assignModal || !assignProgramId || !assignStartDate) return
    setAssigning(true)
    const supabase = createClient()
    const { error } = await assignProgram(
      supabase,
      assignModal.client.id,
      assignProgramId,
      assignStartDate
    )
    if (!error) {
      const updated = await getGymMembers(supabase, gymId)
      setMembers(updated)
      setAssignModal(null)
    }
    setAssigning(false)
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-surface-2" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {members.length} client{members.length !== 1 ? 'i' : 'e'}
        </p>
        {!addingMember && (
          <button onClick={() => setAddingMember(true)} className="btn-primary text-xs px-3 py-1.5">
            + Aggiungi client
          </button>
        )}
      </div>

      {/* Add client search */}
      {addingMember && (
        <div className="card p-4 space-y-3">
          <p className="text-sm font-medium text-white">Cerca per nome o email</p>
          <div className="relative">
            <input
              type="text"
              placeholder="Cerca client…"
              autoFocus
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="input"
            />
            {searching && (
              <span className="absolute right-3 top-2.5 text-xs text-muted">Ricerca…</span>
            )}
          </div>

          {addError && (
            <p className="text-xs text-red-400">{addError}</p>
          )}

          {searchResults.length > 0 && (
            <ul className="divide-y divide-dim rounded-lg border border-dim overflow-hidden">
              {searchResults.map((client) => {
                const alreadyMember = members.some((m) => m.client.id === client.id)
                return (
                  <li key={client.id} className="flex items-center justify-between px-3 py-2 bg-surface-2">
                    <div>
                      <p className="text-sm font-medium text-white">{client.full_name || client.email}</p>
                      {client.full_name && (
                        <p className="text-xs text-muted">{client.email}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleAddMember(client)}
                      disabled={alreadyMember}
                      className={alreadyMember ? 'btn-ghost text-xs px-2 py-1 opacity-40' : 'btn-primary text-xs px-2 py-1'}
                    >
                      {alreadyMember ? 'Già aggiunto' : 'Aggiungi'}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {searchQuery.trim() && !searching && searchResults.length === 0 && (
            <p className="text-xs text-muted">Nessun client trovato. Deve prima registrarsi.</p>
          )}

          <button
            onClick={() => {
              setAddingMember(false)
              setSearchQuery('')
              setSearchResults([])
              setAddError(null)
            }}
            className="text-sm text-muted hover:text-white"
          >
            Annulla
          </button>
        </div>
      )}

      {/* Members list */}
      {members.length === 0 && !addingMember && (
        <div className="rounded-lg border border-dashed border-dim py-12 text-center">
          <p className="text-sm text-muted">Nessun client ancora.</p>
          <p className="text-xs text-muted/60 mt-1">
            Aggiungi client cercando per email o nome.
          </p>
        </div>
      )}

      {members.map((member) => {
        const displayName = member.client.full_name || member.client.email
        return (
          <div key={member.membershipId} className="card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-sm text-white truncate">{displayName}</p>
                {member.client.full_name && (
                  <p className="text-xs text-muted truncate">{member.client.email}</p>
                )}
                <div className="mt-1.5">
                  {member.activeProgram ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                      {member.activeProgram.program.name} · dal{' '}
                      {member.activeProgram.start_date}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
                      Nessun programma
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => openAssignModal(member)} className="btn-ghost text-xs px-2.5 py-1">
                  {member.activeProgram ? 'Cambia' : 'Assegna'}
                </button>
                <button
                  onClick={() => handleRemoveMember(member.membershipId, displayName)}
                  className="btn-danger text-xs px-2.5 py-1"
                >
                  Rimuovi
                </button>
              </div>
            </div>
          </div>
        )
      })}

      {/* Assign program modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm card p-6 space-y-4">
            <h3 className="font-semibold text-base font-display text-white">
              Assegna programma a {assignModal.client.full_name || assignModal.client.email}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">Programma</label>
                <select
                  value={assignProgramId}
                  onChange={(e) => setAssignProgramId(e.target.value)}
                  className="input"
                >
                  <option value="">Seleziona un programma…</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1.5">Data inizio (lunedì settimana 1)</label>
                <input
                  type="date"
                  value={assignStartDate}
                  onChange={(e) => setAssignStartDate(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAssignProgram}
                disabled={!assignProgramId || !assignStartDate || assigning}
                className="btn-primary flex-1 py-2"
              >
                {assigning ? 'Assegnazione…' : 'Assegna'}
              </button>
              <button onClick={() => setAssignModal(null)} className="btn-ghost flex-1 py-2">
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
