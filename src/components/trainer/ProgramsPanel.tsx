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
  const [createError, setCreateError] = useState<string | null>(null)
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
    setCreateError(null)
    const supabase = createClient()
    const { program, error } = await createProgram(supabase, trainerId, creatingName)
    if (program) {
      setPrograms((prev) => [
        { id: program.id, name: program.name, created_at: new Date().toISOString(), dayCount: 0, assignmentCount: 0 },
        ...prev,
      ])
      setExpandedProgram(program.id)
      setCreatingName('')
      setShowCreate(false)
    } else {
      setCreateError(error ?? 'Impossibile creare il programma. Riprova.')
    }
    setCreating(false)
  }

  async function handleDeleteProgram(id: string, name: string) {
    if (!confirm(`Eliminare il programma "${name}"? Questa azione è irreversibile.`)) return
    const supabase = createClient()
    await deleteProgram(supabase, id)
    setPrograms((prev) => prev.filter((p) => p.id !== id))
    if (expandedProgram === id) setExpandedProgram(null)
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-surface-2" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {programs.length} programm{programs.length !== 1 ? 'i' : 'a'}
        </p>
        {!showCreate && (
          <button onClick={() => setShowCreate(true)} className="btn-primary text-xs px-3 py-1.5">
            + Nuovo programma
          </button>
        )}
      </div>

      {showCreate && (
        <div className="card p-4 space-y-3">
          <p className="text-sm font-medium text-white">Nuovo programma</p>
          <input
            type="text"
            placeholder="Nome programma"
            autoFocus
            value={creatingName}
            onChange={(e) => setCreatingName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateProgram()
              if (e.key === 'Escape') setShowCreate(false)
            }}
            className="input"
          />
          {createError && (
            <p className="rounded-lg bg-red-950/30 border border-red-900/50 px-3 py-2 text-sm text-red-400">
              {createError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleCreateProgram}
              disabled={!creatingName.trim() || creating}
              className="btn-primary text-sm px-4 py-2"
            >
              {creating ? 'Creazione…' : 'Crea'}
            </button>
            <button
              onClick={() => {
                setShowCreate(false)
                setCreatingName('')
                setCreateError(null)
              }}
              className="btn-ghost text-sm px-4 py-2"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {programs.length === 0 && !showCreate && (
        <div className="rounded-lg border border-dashed border-dim py-12 text-center">
          <p className="text-sm text-muted">Nessun programma ancora.</p>
          <p className="text-xs text-muted/60 mt-1">Crea il tuo primo programma per iniziare.</p>
        </div>
      )}

      {programs.map((program) => (
        <div key={program.id} className="card overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-surface-2 transition-colors"
            onClick={() =>
              setExpandedProgram((prev) => (prev === program.id ? null : program.id))
            }
          >
            <div>
              <p className="font-medium text-sm text-white">{program.name}</p>
              <p className="text-xs text-muted mt-0.5">
                {program.dayCount} giorn{program.dayCount !== 1 ? 'i' : 'o'} ·{' '}
                {program.assignmentCount} client{program.assignmentCount !== 1 ? 'i' : 'e'} assegnat{program.assignmentCount !== 1 ? 'i' : 'o'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteProgram(program.id, program.name)
                }}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Elimina
              </button>
              <span className="text-muted text-xs">
                {expandedProgram === program.id ? '▲' : '▼'}
              </span>
            </div>
          </div>

          {expandedProgram === program.id && (
            <div className="px-4 pb-4 border-t border-dim">
              <ProgramEditor programId={program.id} programName={program.name} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
