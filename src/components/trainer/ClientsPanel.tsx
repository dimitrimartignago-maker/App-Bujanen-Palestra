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
  getClientPersonalPrograms,
  createPersonalProgram,
  updatePersonalProgramStart,
  type GymMember,
  type ClientProfile,
  type TrainerProgram,
  type ClientPersonalProgram,
} from '@/lib/trainer'
import ProgramEditor from './ProgramEditor'

interface Props {
  gymId: string
  trainerId: string
}

function nextMonday(): string {
  const today = new Date()
  const daysUntilMonday = (8 - today.getDay()) % 7 || 7
  const d = new Date(today)
  d.setDate(today.getDate() + daysUntilMonday)
  return d.toISOString().slice(0, 10)
}

export default function ClientsPanel({ gymId, trainerId }: Props) {
  // ── Members list ─────────────────────────────────────────────
  const [members, setMembers] = useState<GymMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ClientProfile[]>([])
  const [searching, setSearching] = useState(false)
  const [addingMember, setAddingMember] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Client profile view ───────────────────────────────────────
  const [selectedMember, setSelectedMember] = useState<GymMember | null>(null)
  const [personalPrograms, setPersonalPrograms] = useState<ClientPersonalProgram[]>([])
  const [loadingPersonal, setLoadingPersonal] = useState(false)
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null)

  // New personal program form
  const [showNewProgram, setShowNewProgram] = useState(false)
  const [newProgName, setNewProgName] = useState('')
  const [newProgDate, setNewProgDate] = useState(nextMonday)
  const [creatingProg, setCreatingProg] = useState(false)
  const [createProgError, setCreateProgError] = useState<string | null>(null)

  // ── Template assign modal (inside profile view) ───────────────
  const [templates, setTemplates] = useState<TrainerProgram[]>([])
  const [assignModal, setAssignModal] = useState(false)
  const [assignProgramId, setAssignProgramId] = useState('')
  const [assignStartDate, setAssignStartDate] = useState(nextMonday)
  const [assigning, setAssigning] = useState(false)

  // ── Initial load ──────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    getGymMembers(supabase, gymId).then((m) => {
      setMembers(m)
      setLoading(false)
    })
  }, [gymId])

  // ── Load personal programs when a member is selected ──────────
  useEffect(() => {
    if (!selectedMember) return
    setLoadingPersonal(true)
    const supabase = createClient()
    getClientPersonalPrograms(supabase, selectedMember.client.id).then((p) => {
      setPersonalPrograms(p)
      setLoadingPersonal(false)
    })
  }, [selectedMember])

  // Load templates lazily when the assign modal is opened
  async function openAssignModal() {
    if (templates.length === 0) {
      const supabase = createClient()
      const t = await getTrainerPrograms(supabase, trainerId)
      setTemplates(t)
    }
    setAssignProgramId('')
    setAssignStartDate(nextMonday())
    setAssignModal(true)
  }

  // ── Member list handlers ──────────────────────────────────────
  function handleSearchChange(query: string) {
    setSearchQuery(query)
    setAddError(null)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!query.trim()) { setSearchResults([]); return }
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
    if (error) { setAddError(error); return }
    const updated = await getGymMembers(supabase, gymId)
    setMembers(updated)
    setSearchQuery('')
    setSearchResults([])
    setAddingMember(false)
  }

  async function handleRemoveMember(member: GymMember) {
    const name = member.client.full_name || member.client.email
    if (!confirm(`Rimuovere ${name} dalla palestra?`)) return
    const supabase = createClient()
    await removeGymMember(supabase, member.membershipId)
    setMembers((prev) => prev.filter((m) => m.membershipId !== member.membershipId))
    if (selectedMember?.membershipId === member.membershipId) setSelectedMember(null)
  }

  // ── Profile view handlers ─────────────────────────────────────
  async function handleCreatePersonalProgram() {
    if (!newProgName.trim() || !selectedMember) return
    setCreatingProg(true)
    setCreateProgError(null)
    const supabase = createClient()
    const { program, clientProgramId, error } = await createPersonalProgram(
      supabase, trainerId, selectedMember.client.id, newProgName, newProgDate
    )
    if (!program) {
      setCreateProgError(error ?? 'Impossibile creare il programma.')
      setCreatingProg(false)
      return
    }

    const newProg: ClientPersonalProgram = {
      id: program.id,
      name: program.name,
      created_at: new Date().toISOString(),
      dayCount: 0,
      startDate: newProgDate,
      isActive: true,
    }
    // Deactivate other programs in local state, add new one
    setPersonalPrograms((prev) => [newProg, ...prev.map((p) => ({ ...p, isActive: false }))])
    // Update the member's activeProgram badge in the list
    if (clientProgramId) {
      setMembers((prev) => prev.map((m) =>
        m.membershipId === selectedMember.membershipId
          ? { ...m, activeProgram: { id: clientProgramId, start_date: newProgDate, program: { id: program.id, name: program.name } } }
          : m
      ))
    }
    setExpandedProgram(program.id)
    setNewProgName('')
    setNewProgDate(nextMonday())
    setShowNewProgram(false)
    setCreatingProg(false)
  }

  async function handleStartDateChange(programId: string, startDate: string) {
    if (!selectedMember || !startDate) return
    const supabase = createClient()
    await updatePersonalProgramStart(supabase, selectedMember.client.id, programId, startDate)
    setPersonalPrograms((prev) =>
      prev.map((p) => p.id === programId ? { ...p, startDate } : p)
    )
  }

  async function handleActivateProgram(programId: string, startDate: string | null) {
    if (!selectedMember) return
    const date = startDate ?? nextMonday()
    const supabase = createClient()
    await assignProgram(supabase, selectedMember.client.id, programId, date)
    setPersonalPrograms((prev) =>
      prev.map((p) => ({ ...p, isActive: p.id === programId, startDate: p.id === programId ? date : p.startDate }))
    )
    const prog = personalPrograms.find((p) => p.id === programId)
    if (prog) {
      setMembers((prev) => prev.map((m) =>
        m.membershipId === selectedMember.membershipId
          ? { ...m, activeProgram: { id: programId, start_date: date, program: { id: prog.id, name: prog.name } } }
          : m
      ))
    }
  }

  async function handleAssignTemplate() {
    if (!selectedMember || !assignProgramId || !assignStartDate) return
    setAssigning(true)
    const supabase = createClient()
    const { error } = await assignProgram(supabase, selectedMember.client.id, assignProgramId, assignStartDate)
    if (!error) {
      // Deactivate all personal programs in local state
      setPersonalPrograms((prev) => prev.map((p) => ({ ...p, isActive: false })))
      const tpl = templates.find((t) => t.id === assignProgramId)
      if (tpl) {
        setMembers((prev) => prev.map((m) =>
          m.membershipId === selectedMember.membershipId
            ? { ...m, activeProgram: { id: assignProgramId, start_date: assignStartDate, program: { id: tpl.id, name: tpl.name } } }
            : m
        ))
      }
      setAssignModal(false)
    }
    setAssigning(false)
  }

  // ── Loading state ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-surface-2" />
        ))}
      </div>
    )
  }

  // ── Profile view ──────────────────────────────────────────────
  if (selectedMember) {
    const { client } = selectedMember
    const displayName = client.full_name || client.email
    const hasActivePersonal = personalPrograms.some((p) => p.isActive)
    const activeTemplate = !hasActivePersonal ? selectedMember.activeProgram : null

    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSelectedMember(null); setPersonalPrograms([]); setExpandedProgram(null) }}
            className="text-sm text-muted hover:text-white transition-colors"
          >
            ← Clienti
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">{displayName}</p>
            {client.full_name && <p className="text-xs text-muted truncate">{client.email}</p>}
          </div>
          <button
            onClick={() => handleRemoveMember(selectedMember)}
            className="btn-danger text-xs px-2.5 py-1 flex-shrink-0"
          >
            Rimuovi
          </button>
        </div>

        {/* Personal programs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white font-display">Programmi personali</p>
            {!showNewProgram && (
              <button
                onClick={() => { setShowNewProgram(true); setNewProgDate(nextMonday()) }}
                className="btn-primary text-xs px-3 py-1.5"
              >
                + Nuovo programma
              </button>
            )}
          </div>

          {/* New program inline form */}
          {showNewProgram && (
            <div className="card p-4 space-y-3">
              <input
                type="text"
                placeholder="Nome programma"
                autoFocus
                value={newProgName}
                onChange={(e) => setNewProgName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreatePersonalProgram(); if (e.key === 'Escape') setShowNewProgram(false) }}
                className="input"
              />
              <div className="space-y-1">
                <label className="text-xs text-muted">Data inizio (settimana 1)</label>
                <input
                  type="date"
                  value={newProgDate}
                  onChange={(e) => setNewProgDate(e.target.value)}
                  className="input"
                />
              </div>
              {createProgError && (
                <p className="text-xs text-red-400">{createProgError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleCreatePersonalProgram}
                  disabled={!newProgName.trim() || creatingProg}
                  className="btn-primary text-sm px-4 py-2"
                >
                  {creatingProg ? 'Creazione…' : 'Crea'}
                </button>
                <button
                  onClick={() => { setShowNewProgram(false); setNewProgName(''); setCreateProgError(null) }}
                  className="btn-ghost text-sm px-4 py-2"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}

          {loadingPersonal && (
            <div className="space-y-2 animate-pulse">
              <div className="h-14 rounded-lg bg-surface-2" />
              <div className="h-14 rounded-lg bg-surface-2" />
            </div>
          )}

          {!loadingPersonal && personalPrograms.length === 0 && (
            <div className="rounded-lg border border-dashed border-dim py-8 text-center">
              <p className="text-sm text-muted">Nessun programma personale.</p>
              <p className="text-xs text-muted/60 mt-1">
                Crea un programma su misura per {displayName}.
              </p>
            </div>
          )}

          {personalPrograms.map((prog) => (
            <div key={prog.id} className="card overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white">{prog.name}</span>
                    {prog.isActive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                        Attivo
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted">Dal</span>
                    <input
                      type="date"
                      value={prog.startDate ?? ''}
                      onChange={(e) => handleStartDateChange(prog.id, e.target.value)}
                      className="rounded border border-dim bg-surface-2 px-1.5 py-0.5 text-xs text-white focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!prog.isActive && (
                    <button
                      onClick={() => handleActivateProgram(prog.id, prog.startDate)}
                      className="btn-ghost text-xs px-2.5 py-1"
                    >
                      Attiva
                    </button>
                  )}
                  <button
                    onClick={() => setExpandedProgram((prev) => (prev === prog.id ? null : prog.id))}
                    className="text-muted hover:text-white text-xs transition-colors"
                  >
                    {expandedProgram === prog.id ? '▲' : '▼'}
                  </button>
                </div>
              </div>
              {expandedProgram === prog.id && (
                <div className="border-t border-dim px-4 pb-4">
                  <ProgramEditor programId={prog.id} programName={prog.name} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Template section */}
        <div className="border-t border-dim pt-4 space-y-2">
          <p className="text-xs font-medium text-muted uppercase tracking-wide">Programma template</p>
          {activeTemplate ? (
            <p className="text-sm text-muted">
              Attivo:{' '}
              <span className="text-white font-medium">{activeTemplate.program.name}</span>
              {' · dal '}{activeTemplate.start_date}
            </p>
          ) : (
            <p className="text-xs text-muted">Nessun template assegnato.</p>
          )}
          <button onClick={openAssignModal} className="btn-ghost text-xs px-3 py-1.5">
            {activeTemplate ? 'Cambia template' : 'Assegna template'}
          </button>
        </div>

        {/* Template assign modal */}
        {assignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-sm card p-6 space-y-4">
              <h3 className="font-semibold text-base font-display text-white">
                Assegna template a {displayName}
              </h3>
              {hasActivePersonal && (
                <p className="text-xs text-amber-400 bg-amber-950/30 border border-amber-900/40 rounded-lg px-3 py-2">
                  Nota: il programma personale attivo verrà disattivato.
                </p>
              )}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-white mb-1.5">Template</label>
                  <select
                    value={assignProgramId}
                    onChange={(e) => setAssignProgramId(e.target.value)}
                    className="input"
                  >
                    <option value="">Seleziona un template…</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1.5">
                    Data inizio (lunedì settimana 1)
                  </label>
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
                  onClick={handleAssignTemplate}
                  disabled={!assignProgramId || !assignStartDate || assigning}
                  className="btn-primary flex-1 py-2"
                >
                  {assigning ? 'Assegnazione…' : 'Assegna'}
                </button>
                <button onClick={() => setAssignModal(false)} className="btn-ghost flex-1 py-2">
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Members list view ─────────────────────────────────────────
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
          {addError && <p className="text-xs text-red-400">{addError}</p>}
          {searchResults.length > 0 && (
            <ul className="divide-y divide-dim rounded-lg border border-dim overflow-hidden">
              {searchResults.map((client) => {
                const alreadyMember = members.some((m) => m.client.id === client.id)
                return (
                  <li key={client.id} className="flex items-center justify-between px-3 py-2 bg-surface-2">
                    <div>
                      <p className="text-sm font-medium text-white">{client.full_name || client.email}</p>
                      {client.full_name && <p className="text-xs text-muted">{client.email}</p>}
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
            onClick={() => { setAddingMember(false); setSearchQuery(''); setSearchResults([]); setAddError(null) }}
            className="text-sm text-muted hover:text-white"
          >
            Annulla
          </button>
        </div>
      )}

      {members.length === 0 && !addingMember && (
        <div className="rounded-lg border border-dashed border-dim py-12 text-center">
          <p className="text-sm text-muted">Nessun client ancora.</p>
          <p className="text-xs text-muted/60 mt-1">Aggiungi client cercando per email o nome.</p>
        </div>
      )}

      {members.map((member) => {
        const displayName = member.client.full_name || member.client.email
        return (
          <div
            key={member.membershipId}
            className="card p-4 cursor-pointer hover:bg-surface-2 transition-colors"
            onClick={() => setSelectedMember(member)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-white truncate">{displayName}</p>
                {member.client.full_name && (
                  <p className="text-xs text-muted truncate">{member.client.email}</p>
                )}
                <div className="mt-1.5">
                  {member.activeProgram ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                      {member.activeProgram.program.name} · dal {member.activeProgram.start_date}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
                      Nessun programma
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setSelectedMember(member)}
                  className="btn-ghost text-xs px-2.5 py-1"
                >
                  Apri
                </button>
                <button
                  onClick={() => handleRemoveMember(member)}
                  className="btn-danger text-xs px-2.5 py-1"
                >
                  Rimuovi
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
