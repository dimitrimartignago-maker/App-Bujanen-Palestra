'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  getTrainerPrograms,
  createProgram,
  deleteProgram,
  type TrainerProgram,
} from '@/lib/trainer'
import ProgramEditor from './ProgramEditor'

interface Props {
  trainerId: string
}

export default function ProgramsPanel({ trainerId }: Props) {
  const [programs, setPrograms] = useState<TrainerProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingName, setCreatingName] = useState('')
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    getTrainerPrograms(supabase, trainerId).then((data) => {
      setPrograms(data)
      setLoading(false)
    })
  }, [trainerId])

  async function handleCreateProgram() {
    if (!creatingName.trim()) return
    setCreating(true)
    const supabase = createClient()
    const program = await createProgram(supabase, trainerId, creatingName)
    if (program) {
      setPrograms((prev) => [
        { id: program.id, name: program.name, created_at: new Date().toISOString(), dayCount: 0, assignmentCount: 0 },
        ...prev,
      ])
      setExpandedProgram(program.id)
    }
    setCreatingName('')
    setShowCreate(false)
    setCreating(false)
  }

  async function handleDeleteProgram(id: string, name: string) {
    if (!confirm(`Delete program "${name}"? This cannot be undone.`)) return
    const supabase = createClient()
    await deleteProgram(supabase, id)
    setPrograms((prev) => prev.filter((p) => p.id !== id))
    if (expandedProgram === id) setExpandedProgram(null)
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-gray-100" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {programs.length} program{programs.length !== 1 ? 's' : ''}
        </p>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
          >
            + New program
          </button>
        )}
      </div>

      {showCreate && (
        <div className="rounded-lg border border-gray-200 p-4 space-y-3">
          <p className="text-sm font-medium">New program</p>
          <input
            type="text"
            placeholder="Program name"
            autoFocus
            value={creatingName}
            onChange={(e) => setCreatingName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateProgram()
              if (e.key === 'Escape') setShowCreate(false)
            }}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreateProgram}
              disabled={!creatingName.trim() || creating}
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button
              onClick={() => {
                setShowCreate(false)
                setCreatingName('')
              }}
              className="rounded-md px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {programs.length === 0 && !showCreate && (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
          <p className="text-sm text-gray-500">No programs yet.</p>
          <p className="text-xs text-gray-400 mt-1">Create your first program to get started.</p>
        </div>
      )}

      {programs.map((program) => (
        <div key={program.id} className="rounded-lg border border-gray-200">
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
            onClick={() =>
              setExpandedProgram((prev) => (prev === program.id ? null : program.id))
            }
          >
            <div>
              <p className="font-medium text-sm">{program.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {program.dayCount} day{program.dayCount !== 1 ? 's' : ''} ·{' '}
                {program.assignmentCount} client{program.assignmentCount !== 1 ? 's' : ''} assigned
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteProgram(program.id, program.name)
                }}
                className="text-xs text-red-400 hover:text-red-600"
              >
                Delete
              </button>
              <span className="text-gray-400 text-xs">
                {expandedProgram === program.id ? '▲' : '▼'}
              </span>
            </div>
          </div>

          {expandedProgram === program.id && (
            <div className="px-4 pb-4">
              <ProgramEditor programId={program.id} programName={program.name} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
