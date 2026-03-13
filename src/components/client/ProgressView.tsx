'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  fetchProgramProgress,
  resetProgramData,
  type ProgramProgress,
  type WeekProgress,
  type ExerciseStatus,
} from '@/lib/progress'

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

interface Props {
  clientId: string
}

// ── Status badge ──────────────────────────────────────────────

function StatusBadge({ status }: { status: ExerciseStatus }) {
  const cfg = {
    fatto: 'bg-accent/20 text-accent',
    parziale: 'bg-yellow-900/30 text-yellow-400',
    non_fatto: 'bg-surface-2 text-muted',
  }[status]

  const label = {
    fatto: 'Fatto',
    parziale: 'Parziale',
    non_fatto: 'Non fatto',
  }[status]

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg}`}>{label}</span>
  )
}

// ── Progress bar ──────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  const color =
    pct === 100 ? 'bg-accent' : pct > 0 ? 'bg-yellow-400' : 'bg-dim'
  return (
    <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ── Week card ─────────────────────────────────────────────────

function WeekCard({ week }: { week: WeekProgress }) {
  const [expanded, setExpanded] = useState(false)

  function formatMonday(iso: string) {
    return new Date(iso).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
    })
  }

  const pctColor =
    week.completionPct === 100
      ? 'text-accent'
      : week.completionPct > 0
      ? 'text-yellow-400'
      : 'text-muted'

  return (
    <div className="card overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-2 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Settimana {week.weekNumber}</p>
            <p className="text-xs text-muted">{formatMonday(week.mondayISO)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-24">
            <ProgressBar pct={week.completionPct} />
          </div>
          <span className={`text-sm font-semibold tabular-nums w-9 text-right ${pctColor}`}>
            {week.completionPct}%
          </span>
          <span className="text-muted text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-dim divide-y divide-dim">
          {week.days.map((day) => (
            <div key={day.dayId} className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide">
                  {day.label ?? DAY_NAMES[day.dayIndex]}
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-16">
                    <ProgressBar pct={day.completionPct} />
                  </div>
                  <span className="text-xs text-muted w-8 text-right">
                    {day.completionPct}%
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                {day.exercises.map((ex) => (
                  <div
                    key={ex.exerciseId}
                    className="flex items-center justify-between gap-2"
                  >
                    <p className="text-sm text-white truncate">{ex.name}</p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted tabular-nums">
                        {ex.doneSets}/{ex.totalSets} serie
                      </span>
                      <StatusBadge status={ex.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────

export default function ProgressView({ clientId }: Props) {
  const [progress, setProgress] = useState<ProgramProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)

  const load = useCallback(async () => {
    const supabase = createClient()
    const data = await fetchProgramProgress(supabase, clientId)
    setProgress(data)
    setLoading(false)
  }, [clientId])

  useEffect(() => {
    load()
  }, [load])

  async function handleReset() {
    if (!progress) return
    if (
      !confirm(
        'Sei sicuro di voler azzerare tutti i dati di allenamento? Questa azione non può essere annullata.'
      )
    )
      return

    setResetting(true)
    const supabase = createClient()
    await resetProgramData(supabase, progress.clientProgramId)
    await load()
    setResetting(false)
  }

  if (loading) {
    return (
      <div className="px-4 py-6 max-w-client mx-auto space-y-3 animate-pulse">
        <div className="h-20 rounded-xl bg-surface-2" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-surface-2" />
        ))}
      </div>
    )
  }

  if (!progress) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <span className="text-4xl">📊</span>
        <p className="mt-4 text-lg font-semibold font-display text-white">Nessun programma attivo</p>
        <p className="mt-1 text-sm text-muted">
          Il tuo trainer non ha ancora assegnato un programma.
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 max-w-client mx-auto space-y-4">
      {/* Summary card */}
      <div className="card p-4">
        <p className="text-xs text-muted uppercase tracking-wide font-medium mb-1">
          {progress.programName}
        </p>
        <div className="flex items-end justify-between gap-4">
          <div className="flex-1">
            <ProgressBar pct={progress.overallPct} />
          </div>
          <p
            className={`text-2xl font-bold tabular-nums leading-none font-display ${
              progress.overallPct === 100
                ? 'text-accent'
                : progress.overallPct > 0
                ? 'text-yellow-400'
                : 'text-muted'
            }`}
          >
            {progress.overallPct}%
          </p>
        </div>
        <p className="mt-1 text-xs text-muted">
          Completamento totale · {progress.weeks.length} settiman
          {progress.weeks.length === 1 ? 'a' : 'e'}
        </p>
      </div>

      {/* Week cards */}
      {progress.weeks.map((week) => (
        <WeekCard key={week.weekNumber} week={week} />
      ))}

      {/* Reset button */}
      <div className="pt-4 border-t border-dim">
        <button
          onClick={handleReset}
          disabled={resetting}
          className="btn-danger w-full py-3"
        >
          {resetting ? 'Azzeramento in corso…' : 'Azzera tutti i dati di allenamento'}
        </button>
        <p className="mt-1.5 text-center text-xs text-muted">
          Elimina tutte le sessioni e i log di serie. Irreversibile.
        </p>
      </div>
    </div>
  )
}
