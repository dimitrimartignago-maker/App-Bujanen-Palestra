'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  createProgram,
  addProgramDay,
  addExercise,
  upsertExerciseWeek,
} from '@/lib/trainer'

// ── Types matching the API response ────────────────────────────

interface ImportedWeek {
  weekNumber: number
  setCount: number
  targetReps: number
  targetWeight: number
}

interface ImportedExercise {
  name: string
  notes: string
  restSeconds: number
  weeks: ImportedWeek[]
}

interface ImportedDay {
  dayIndex: number
  label: string
  exercises: ImportedExercise[]
}

interface ImportedProgram {
  name: string
  days: ImportedDay[]
}

// ── Props ───────────────────────────────────────────────────────

interface Props {
  trainerId: string
  onClose: () => void
  onSaved: (programId: string, programName: string) => void
}

// ── Component ───────────────────────────────────────────────────

type Step = 'upload' | 'loading' | 'review' | 'saving'

const DAY_LABELS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']

export default function PdfImportModal({ trainerId, onClose, onSaved }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [program, setProgram] = useState<ImportedProgram | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Upload / Claude call ───────────────────────────────────────

  async function handleFile(file: File) {
    if (file.type !== 'application/pdf') {
      setError('Seleziona un file PDF.')
      return
    }
    setError(null)
    setStep('loading')

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch('/api/import-pdf', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Errore durante l\'elaborazione del PDF.')
        setStep('upload')
        return
      }
      setProgram(json as ImportedProgram)
      setStep('review')
    } catch {
      setError('Errore di rete. Riprova.')
      setStep('upload')
    }
  }

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }, [])

  // ── Save to DB ─────────────────────────────────────────────────

  async function handleSave() {
    if (!program) return
    setStep('saving')
    setError(null)

    const supabase = createClient()
    const { program: created, error: createErr } = await createProgram(
      supabase,
      trainerId,
      program.name
    )
    if (!created) {
      setError(createErr ?? 'Impossibile creare il programma.')
      setStep('review')
      return
    }

    for (const day of program.days) {
      const newDay = await addProgramDay(supabase, created.id, day.dayIndex, day.label)
      if (!newDay) continue

      for (const ex of day.exercises) {
        const newEx = await addExercise(supabase, newDay.id, ex.name, ex.notes, ex.restSeconds)
        if (!newEx) continue

        for (const w of ex.weeks) {
          await upsertExerciseWeek(
            supabase,
            newEx.id,
            w.weekNumber,
            w.setCount,
            w.targetReps,
            w.targetWeight === 0 ? null : w.targetWeight
          )
        }
      }
    }

    onSaved(created.id, created.name)
  }

  // ── Editing helpers ────────────────────────────────────────────

  function setName(name: string) {
    setProgram((p) => p ? { ...p, name } : p)
  }

  function setDay(di: number, patch: Partial<ImportedDay>) {
    setProgram((p) => {
      if (!p) return p
      const days = p.days.map((d, i) => i === di ? { ...d, ...patch } : d)
      return { ...p, days }
    })
  }

  function setExercise(di: number, ei: number, patch: Partial<ImportedExercise>) {
    setProgram((p) => {
      if (!p) return p
      const days = p.days.map((d, i) => {
        if (i !== di) return d
        const exercises = d.exercises.map((e, j) => j === ei ? { ...e, ...patch } : e)
        return { ...d, exercises }
      })
      return { ...p, days }
    })
  }

  function setWeek(di: number, ei: number, wi: number, patch: Partial<ImportedWeek>) {
    setProgram((p) => {
      if (!p) return p
      const days = p.days.map((d, i) => {
        if (i !== di) return d
        const exercises = d.exercises.map((e, j) => {
          if (j !== ei) return e
          const weeks = e.weeks.map((w, k) => k === wi ? { ...w, ...patch } : w)
          return { ...e, weeks }
        })
        return { ...d, exercises }
      })
      return { ...p, days }
    })
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-surface border border-dim overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-dim flex-shrink-0">
          <h2 className="font-semibold text-white font-display">Importa programma da PDF</h2>
          <button onClick={onClose} className="text-muted hover:text-white text-xl leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── Upload step ── */}
          {(step === 'upload') && (
            <>
              <p className="text-sm text-muted">
                Carica il PDF del programma. Claude estrarrà automaticamente giorni, esercizi e progressione.
              </p>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer py-12 transition-colors ${
                  dragging ? 'border-accent bg-accent/5' : 'border-dim hover:border-accent/60'
                }`}
              >
                <span className="text-3xl">📄</span>
                <p className="text-sm text-white font-medium">Trascina il PDF qui</p>
                <p className="text-xs text-muted">oppure clicca per selezionare</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={onFileInput}
                />
              </div>
              {error && (
                <p className="rounded-lg bg-red-950/30 border border-red-900/50 px-3 py-2 text-sm text-red-400">
                  {error}
                </p>
              )}
            </>
          )}

          {/* ── Loading step ── */}
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              <p className="text-sm text-white font-medium">Claude sta analizzando il PDF…</p>
              <p className="text-xs text-muted">Può richiedere qualche secondo</p>
            </div>
          )}

          {/* ── Review step ── */}
          {(step === 'review' || step === 'saving') && program && (
            <>
              <div className="space-y-1">
                <label className="text-xs text-muted font-medium">Nome programma</label>
                <input
                  className="input w-full"
                  value={program.name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={step === 'saving'}
                />
              </div>

              <p className="text-xs text-muted pt-1">
                Verifica i dati estratti e modifica se necessario prima di salvare.
              </p>

              {program.days.map((day, di) => (
                <div key={di} className="card overflow-hidden">
                  {/* Day header */}
                  <div className="px-4 py-3 bg-surface-2 flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <select
                        value={day.dayIndex}
                        onChange={(e) => setDay(di, { dayIndex: parseInt(e.target.value) })}
                        disabled={step === 'saving'}
                        className="rounded border border-dim bg-surface px-2 py-1 text-xs text-white focus:border-accent focus:outline-none"
                      >
                        {DAY_LABELS.map((l, i) => (
                          <option key={i} value={i}>{l}</option>
                        ))}
                      </select>
                      <input
                        className="flex-1 rounded border border-dim bg-surface px-2 py-1 text-xs text-white placeholder:text-muted focus:border-accent focus:outline-none"
                        value={day.label}
                        onChange={(e) => setDay(di, { label: e.target.value })}
                        disabled={step === 'saving'}
                        placeholder="Label giorno"
                      />
                    </div>
                    <span className="text-xs text-muted flex-shrink-0">
                      {day.exercises.length} eserc.
                    </span>
                  </div>

                  {/* Exercises */}
                  <div className="divide-y divide-dim">
                    {day.exercises.map((ex, ei) => (
                      <div key={ei} className="px-4 py-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            className="flex-1 rounded border border-dim bg-surface-2 px-2 py-1 text-sm text-white focus:border-accent focus:outline-none font-medium"
                            value={ex.name}
                            onChange={(e) => setExercise(di, ei, { name: e.target.value })}
                            disabled={step === 'saving'}
                          />
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-xs text-muted">riposo</span>
                            <input
                              type="number"
                              min={0}
                              step={15}
                              className="w-16 rounded border border-dim bg-surface-2 px-1 py-1 text-xs text-white text-center focus:border-accent focus:outline-none"
                              value={ex.restSeconds}
                              onChange={(e) => setExercise(di, ei, { restSeconds: parseInt(e.target.value) || 0 })}
                              disabled={step === 'saving'}
                            />
                            <span className="text-xs text-muted">s</span>
                          </div>
                        </div>
                        {ex.notes && (
                          <input
                            className="w-full rounded border border-dim bg-surface-2 px-2 py-1 text-xs text-muted focus:border-accent focus:outline-none focus:text-white"
                            value={ex.notes}
                            onChange={(e) => setExercise(di, ei, { notes: e.target.value })}
                            disabled={step === 'saving'}
                            placeholder="Note"
                          />
                        )}

                        {/* Week table */}
                        <table className="w-full text-xs mt-1">
                          <thead>
                            <tr className="text-muted">
                              <th className="text-left py-0.5 pr-2 font-medium w-12">Sett</th>
                              <th className="text-left py-0.5 pr-2 font-medium w-12">Serie</th>
                              <th className="text-left py-0.5 pr-2 font-medium w-12">Reps</th>
                              <th className="text-left py-0.5 font-medium w-20">Peso (kg)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ex.weeks.map((w, wi) => (
                              <tr key={wi} className="border-t border-dim/50">
                                <td className="py-1 pr-2">
                                  <input
                                    type="number" min={1}
                                    className="w-10 rounded border border-dim bg-surface-2 px-1 py-0.5 text-center text-white focus:border-accent focus:outline-none"
                                    value={w.weekNumber}
                                    onChange={(e) => setWeek(di, ei, wi, { weekNumber: parseInt(e.target.value) || 1 })}
                                    disabled={step === 'saving'}
                                  />
                                </td>
                                <td className="py-1 pr-2">
                                  <input
                                    type="number" min={1}
                                    className="w-10 rounded border border-dim bg-surface-2 px-1 py-0.5 text-center text-white focus:border-accent focus:outline-none"
                                    value={w.setCount}
                                    onChange={(e) => setWeek(di, ei, wi, { setCount: parseInt(e.target.value) || 1 })}
                                    disabled={step === 'saving'}
                                  />
                                </td>
                                <td className="py-1 pr-2">
                                  <input
                                    type="number" min={1}
                                    className="w-10 rounded border border-dim bg-surface-2 px-1 py-0.5 text-center text-white focus:border-accent focus:outline-none"
                                    value={w.targetReps}
                                    onChange={(e) => setWeek(di, ei, wi, { targetReps: parseInt(e.target.value) || 1 })}
                                    disabled={step === 'saving'}
                                  />
                                </td>
                                <td className="py-1">
                                  <input
                                    type="number" min={0}
                                    className="w-16 rounded border border-dim bg-surface-2 px-1 py-0.5 text-center text-white focus:border-accent focus:outline-none"
                                    value={w.targetWeight}
                                    onChange={(e) => setWeek(di, ei, wi, { targetWeight: parseFloat(e.target.value) || 0 })}
                                    disabled={step === 'saving'}
                                    placeholder="PC"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {error && (
                <p className="rounded-lg bg-red-950/30 border border-red-900/50 px-3 py-2 text-sm text-red-400">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {(step === 'review' || step === 'saving') && (
          <div className="flex gap-2 px-5 py-4 border-t border-dim flex-shrink-0">
            <button
              onClick={handleSave}
              disabled={step === 'saving' || !program?.name.trim()}
              className="btn-primary flex-1 py-2"
            >
              {step === 'saving' ? 'Salvataggio…' : 'Salva programma'}
            </button>
            <button
              onClick={() => { setStep('upload'); setProgram(null); setError(null) }}
              disabled={step === 'saving'}
              className="btn-ghost px-4 py-2"
            >
              Ricomincia
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
