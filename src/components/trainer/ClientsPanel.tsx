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
    // Refresh members
    const updated = await getGymMembers(supabase, gymId)
    setMembers(updated)
    setSearchQuery('')
    setSearchResults([])
    setAddingMember(false)
  }

  async function handleRemoveMember(membershipId: string, name: string) {
    if (!confirm(`Remove ${name} from your gym?`)) return
    const supabase = createClient()
    await removeGymMember(supabase, membershipId)
    setMembers((prev) => prev.filter((m) => m.membershipId !== membershipId))
  }

  function openAssignModal(member: GymMember) {
    setAssignModal(member)
    setAssignProgramId(member.activeProgram?.program?.id ?? '')
    // Default start date: next Monday
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
          <div key={i} className="h-16 rounded-lg bg-gray-100" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {members.length} client{members.length !== 1 ? 's' : ''}
        </p>
        {!addingMember && (
          <button
            onClick={() => setAddingMember(true)}
            className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
          >
            + Add client
          </button>
        )}
      </div>

      {/* Add client search */}
      {addingMember && (
        <div className="rounded-lg border border-gray-200 p-4 space-y-3">
          <p className="text-sm font-medium">Find client by name or email</p>
          <div className="relative">
            <input
              type="text"
              placeholder="Search clients…"
              autoFocus
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
            />
            {searching && (
              <span className="absolute right-3 top-2.5 text-xs text-gray-400">Searching…</span>
            )}
          </div>

          {addError && (
            <p className="text-xs text-red-600">{addError}</p>
          )}

          {searchResults.length > 0 && (
            <ul className="divide-y divide-gray-100 rounded-md border border-gray-200 overflow-hidden">
              {searchResults.map((client) => {
                const alreadyMember = members.some((m) => m.client.id === client.id)
                return (
                  <li key={client.id} className="flex items-center justify-between px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{client.full_name || client.email}</p>
                      {client.full_name && (
                        <p className="text-xs text-gray-400">{client.email}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleAddMember(client)}
                      disabled={alreadyMember}
                      className="text-xs rounded-md border border-black px-2 py-1 hover:bg-black hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {alreadyMember ? 'Already added' : 'Add'}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {searchQuery.trim() && !searching && searchResults.length === 0 && (
            <p className="text-xs text-gray-400">No clients found. They must sign up first.</p>
          )}

          <button
            onClick={() => {
              setAddingMember(false)
              setSearchQuery('')
              setSearchResults([])
              setAddError(null)
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Members list */}
      {members.length === 0 && !addingMember && (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
          <p className="text-sm text-gray-500">No clients yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            Add clients by searching for their email or name above.
          </p>
        </div>
      )}

      {members.map((member) => {
        const displayName = member.client.full_name || member.client.email
        return (
          <div key={member.membershipId} className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{displayName}</p>
                {member.client.full_name && (
                  <p className="text-xs text-gray-400 truncate">{member.client.email}</p>
                )}
                <div className="mt-1.5">
                  {member.activeProgram ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      {member.activeProgram.program.name} · from{' '}
                      {member.activeProgram.start_date}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                      No program assigned
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => openAssignModal(member)}
                  className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium hover:border-gray-500"
                >
                  {member.activeProgram ? 'Change program' : 'Assign program'}
                </button>
                <button
                  onClick={() => handleRemoveMember(member.membershipId, displayName)}
                  className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-500 hover:border-red-400"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )
      })}

      {/* Assign program modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="font-semibold text-base">
              Assign program to {assignModal.client.full_name || assignModal.client.email}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Program</label>
                <select
                  value={assignProgramId}
                  onChange={(e) => setAssignProgramId(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                >
                  <option value="">Select a program…</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Start date (week 1 Monday)</label>
                <input
                  type="date"
                  value={assignStartDate}
                  onChange={(e) => setAssignStartDate(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAssignProgram}
                disabled={!assignProgramId || !assignStartDate || assigning}
                className="flex-1 rounded-md bg-black py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {assigning ? 'Assigning…' : 'Assign'}
              </button>
              <button
                onClick={() => setAssignModal(null)}
                className="flex-1 rounded-md border border-gray-300 py-2 text-sm hover:border-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
