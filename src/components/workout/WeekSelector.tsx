import { ChevronLeft, ChevronRight } from 'lucide-react'

const DAY_MS = 86_400_000

function getMondayOfWeek(weekOffset: number): Date {
  const now = new Date()
  const day = now.getDay() // 0 = Sun
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now.getTime() + diffToMonday * DAY_MS + weekOffset * 7 * DAY_MS)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function formatRange(weekOffset: number): string {
  const monday = getMondayOfWeek(weekOffset)
  const sunday = new Date(monday.getTime() + 6 * DAY_MS)
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const year = sunday.getFullYear()
  return `${fmt(monday)} — ${fmt(sunday)} ${year}`
}

interface Props {
  weekOffset: number
  onChange: (offset: number) => void
}

export default function WeekSelector({ weekOffset, onChange }: Props) {
  const label =
    weekOffset === 0 ? 'This week' : weekOffset === -1 ? 'Last week' : weekOffset === 1 ? 'Next week' : null

  return (
    <div className="flex items-center justify-between gap-4">
      <button
        onClick={() => onChange(weekOffset - 1)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 hover:bg-gray-100 transition-colors"
        aria-label="Previous week"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="text-center">
        {label && (
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            {label}
          </p>
        )}
        <p className="text-sm font-medium text-gray-800">{formatRange(weekOffset)}</p>
      </div>

      <button
        onClick={() => onChange(weekOffset + 1)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 hover:bg-gray-100 transition-colors"
        aria-label="Next week"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
