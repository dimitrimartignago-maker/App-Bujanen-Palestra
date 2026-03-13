import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getMondayOfWeek } from '@/lib/workout'

const DAY_MS = 86_400_000

function formatRange(weekOffset: number): string {
  const monday = getMondayOfWeek(weekOffset)
  const sunday = new Date(monday.getTime() + 6 * DAY_MS)
  const fmt = (d: Date) =>
    d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  const year = sunday.getFullYear()
  return `${fmt(monday)} — ${fmt(sunday)} ${year}`
}

interface Props {
  weekOffset: number
  onChange: (offset: number) => void
}

export default function WeekSelector({ weekOffset, onChange }: Props) {
  const label =
    weekOffset === 0 ? 'Questa settimana' : weekOffset === -1 ? 'Settimana scorsa' : weekOffset === 1 ? 'Prossima settimana' : null

  return (
    <div className="flex items-center justify-between gap-4">
      <button
        onClick={() => onChange(weekOffset - 1)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-dim text-muted hover:border-white/20 hover:text-white transition-colors"
        aria-label="Settimana precedente"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="text-center">
        {label && (
          <p className="text-xs font-semibold uppercase tracking-widest text-accent font-display">
            {label}
          </p>
        )}
        <p className="text-sm font-medium text-white">{formatRange(weekOffset)}</p>
      </div>

      <button
        onClick={() => onChange(weekOffset + 1)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-dim text-muted hover:border-white/20 hover:text-white transition-colors"
        aria-label="Prossima settimana"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
