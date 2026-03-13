const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

interface Props {
  activeDayIndex: number
  daysWithWorkout: number[]
  onChange: (dayIndex: number) => void
}

export default function DayTabs({ activeDayIndex, daysWithWorkout, onChange }: Props) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {DAY_LABELS.map((label, i) => {
        const hasWorkout = daysWithWorkout.includes(i)
        const isActive = activeDayIndex === i
        return (
          <button
            key={i}
            onClick={() => onChange(i)}
            className={`relative flex min-w-[48px] flex-col items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-accent text-bg'
                : hasWorkout
                ? 'bg-surface-2 text-white hover:bg-dim'
                : 'text-muted hover:text-white'
            }`}
          >
            {label}
            {hasWorkout && (
              <span
                className={`mt-1 h-1.5 w-1.5 rounded-full ${
                  isActive ? 'bg-bg' : 'bg-accent'
                }`}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
